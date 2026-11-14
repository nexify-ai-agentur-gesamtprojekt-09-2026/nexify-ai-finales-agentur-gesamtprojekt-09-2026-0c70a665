"""Provider-neutral processing of inbound payment events.

Order of work for one delivery:
  1. signature port verifies the raw body            -> otherwise rejected, nothing stored
  2. provider port turns the body into a neutral Event -> otherwise rejected, nothing stored
  3. journal entry under the unique (provider, event_id) -> a repeat has exactly one effect
  4. provider port confirms the event by read-back    -> the delivered content alone is not trusted
  5. ONE transaction: subscription + entitlements + audit + journal status -> never a half state
Failures that may heal are retried a bounded number of times; everything else, and exhausted retries,
end in the dead-letter state for a human. Logs and journal carry identifiers, fixed codes and a digest only.
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
from contextlib import contextmanager
from dataclasses import asdict
from typing import Callable, Mapping, Protocol

from .subscription import CAPABILITIES, Event, PlanConfig, Subscription, TransitionError, derive_entitlements, transition

MAX_ATTEMPTS = 5          # technical retry bound, same order as the existing mail outbox
MAX_BODY_BYTES = 64 * 1024
RETRYABLE = frozenset({"provider_unavailable", "confirmation_pending", "organisation_unknown", "store_unavailable", "activation_sink_unavailable"})


class Rejected(Exception):
    """Delivery is not accepted at all (not journalled). `code` is fixed text."""
    def __init__(self, code: str, status: int = 400):
        self.code, self.status = code, status
        super().__init__(code)


class Temporary(Exception):
    """A dependency could not answer; the same event may be retried."""
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def _digest(event: Event) -> str:
    """Identity of a delivery is its normalised content: provider-specific extra fields (which may hold
    personal data) are neither stored nor compared, and a webhook that arrives after reconciliation
    already produced the same event is a plain duplicate."""
    return hashlib.sha256(json.dumps(asdict(event), sort_keys=True).encode()).hexdigest()


class SignatureVerifier(Protocol):
    def verify(self, body: bytes, headers: Mapping[str, str]) -> bool: ...


class PaymentProvider(Protocol):
    """Port. Implementations wrap one provider; none exists in this repository besides the test stand-in."""
    name: str

    def parse(self, body: bytes) -> Event: ...                 # raises Rejected
    def confirm(self, event: Event) -> bool: ...                # read-back; raises Temporary
    def read_back(self, organisation_id: str) -> Event | None: ...  # reconciliation; raises Temporary


class ActivationSink(Protocol):
    """Called inside the transaction when a subscription becomes active; must be idempotent per evidence_ref."""
    def activated(self, organisation_id: str, plan_ref: str, evidence_ref: str) -> None: ...


class SqliteBillingStore:
    """Local, transactional store with the shape of db/foundation/002 (subscription, entitlement, billing_event,
    audit_event). For tests and local runs; the production adapter for PostgreSQL is not part of this change."""

    def __init__(self, database=":memory:"):
        self.db = sqlite3.connect(database, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
          CREATE TABLE IF NOT EXISTS organisation(id TEXT PRIMARY KEY);
          CREATE TABLE IF NOT EXISTS subscription(organisation_id TEXT PRIMARY KEY REFERENCES organisation(id), state TEXT NOT NULL,
            plan_ref TEXT, period_end INTEGER, past_due_since INTEGER, trial_used INTEGER NOT NULL DEFAULT 0, last_event_at INTEGER,
            version INTEGER NOT NULL DEFAULT 0);
          CREATE TABLE IF NOT EXISTS entitlement(organisation_id TEXT NOT NULL, capability TEXT NOT NULL, granted INTEGER NOT NULL,
            valid_until INTEGER, source_state TEXT NOT NULL, subscription_version INTEGER NOT NULL, PRIMARY KEY(organisation_id, capability));
          CREATE TABLE IF NOT EXISTS billing_event(provider TEXT NOT NULL, event_id TEXT NOT NULL, organisation_id TEXT, kind TEXT NOT NULL,
            occurred_at INTEGER NOT NULL, received_at INTEGER NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
            last_error_code TEXT, payload_digest TEXT NOT NULL, event_json TEXT NOT NULL, PRIMARY KEY(provider, event_id));
          CREATE TABLE IF NOT EXISTS audit_event(organisation_id TEXT NOT NULL, at INTEGER NOT NULL, action TEXT NOT NULL, target_ref TEXT NOT NULL);
        """)

    @contextmanager
    def transaction(self):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            yield self
        except BaseException:
            self.db.execute("ROLLBACK")
            raise
        self.db.execute("COMMIT")

    def close(self):
        self.db.close()

    def add_organisation(self, organisation_id):
        with self.transaction():
            self.db.execute("INSERT OR IGNORE INTO organisation VALUES(?)", (organisation_id,))
            self.db.execute("INSERT OR IGNORE INTO subscription(organisation_id,state) VALUES(?, 'none')", (organisation_id,))

    def journal_get(self, provider, event_id):
        row = self.db.execute("SELECT * FROM billing_event WHERE provider=? AND event_id=?", (provider, event_id)).fetchone()
        return dict(row) if row else None

    def journal_insert(self, event: Event, digest, received_at):
        self.db.execute("INSERT INTO billing_event(provider,event_id,organisation_id,kind,occurred_at,received_at,status,payload_digest,event_json) VALUES(?,?,?,?,?,?,?,?,?)",
                        (event.provider, event.event_id, event.organisation_id, event.kind, event.occurred_at, received_at, "received", digest,
                         json.dumps(asdict(event), sort_keys=True)))

    def journal_mark(self, provider, event_id, status, error=None, attempt=False):
        self.db.execute("UPDATE billing_event SET status=?, last_error_code=?, attempts=attempts+? WHERE provider=? AND event_id=?",
                        (status, error, 1 if attempt else 0, provider, event_id))

    def journal_open(self, limit=50):
        rows = self.db.execute("SELECT * FROM billing_event WHERE status IN ('received','retry') ORDER BY occurred_at, received_at LIMIT ?", (limit,))
        return [dict(row) for row in rows]

    def subscription_get(self, organisation_id):
        row = self.db.execute("SELECT * FROM subscription WHERE organisation_id=?", (organisation_id,)).fetchone()
        if not row:
            return None
        values = dict(row)
        values["trial_used"] = bool(values["trial_used"])
        return Subscription(**values)

    def subscription_put(self, sub: Subscription, expected_version):
        changed = self.db.execute("UPDATE subscription SET state=?,plan_ref=?,period_end=?,past_due_since=?,trial_used=?,last_event_at=?,version=? WHERE organisation_id=? AND version=?",
                                  (sub.state, sub.plan_ref, sub.period_end, sub.past_due_since, int(sub.trial_used), sub.last_event_at, sub.version,
                                   sub.organisation_id, expected_version)).rowcount
        if changed != 1:
            raise Temporary("store_unavailable")  # concurrent writer: retry on fresh state

    def entitlements_put(self, sub: Subscription, grants):
        for capability in CAPABILITIES:
            grant = grants[capability]
            self.db.execute("INSERT INTO entitlement VALUES(?,?,?,?,?,?) ON CONFLICT(organisation_id,capability) DO UPDATE SET granted=excluded.granted,"
                            "valid_until=excluded.valid_until,source_state=excluded.source_state,subscription_version=excluded.subscription_version",
                            (sub.organisation_id, capability, int(grant.granted), grant.valid_until, sub.state, sub.version))

    def entitlements_get(self, organisation_id):
        return {row["capability"]: dict(row) for row in self.db.execute("SELECT * FROM entitlement WHERE organisation_id=?", (organisation_id,))}

    def audit(self, organisation_id, at, action, target_ref):
        self.db.execute("INSERT INTO audit_event VALUES(?,?,?,?)", (organisation_id, at, action, target_ref))


class EventProcessor:
    def __init__(self, *, store, provider: PaymentProvider, verifier: SignatureVerifier, config: PlanConfig,
                 now: Callable[[], int], log: Callable[[dict], None] = lambda record: None, activation_sink: ActivationSink | None = None):
        self.store, self.provider, self.verifier, self.config = store, provider, verifier, config
        self.now, self.log, self.sink = now, log, activation_sink

    def _log(self, outcome, event=None, code=None):
        record = {"component": "suite.billing", "provider": self.provider.name, "outcome": outcome}
        if event is not None:
            record.update(event_id=event.event_id, kind=event.kind, organisation_id=event.organisation_id)
        if code:
            record["code"] = code
        self.log(record)

    def receive(self, body: bytes, headers: Mapping[str, str]) -> dict:
        """Entry for one delivery. Returns {"status": ..., "code": ...}; raises Rejected for unacceptable input."""
        if not isinstance(body, (bytes, bytearray)) or len(body) > MAX_BODY_BYTES:
            self._log("rejected", code="body_invalid")
            raise Rejected("body_invalid", 413 if isinstance(body, (bytes, bytearray)) else 400)
        if self.verifier.verify(bytes(body), headers) is not True:
            self._log("rejected", code="signature_invalid")
            raise Rejected("signature_invalid", 401)
        try:
            event = self.provider.parse(bytes(body))
        except Rejected as error:
            self._log("rejected", code=error.code)
            raise
        if event.provider != self.provider.name:
            self._log("rejected", code="provider_mismatch")
            raise Rejected("provider_mismatch")
        digest = _digest(event)
        with self.store.transaction() as tx:
            known = tx.journal_get(event.provider, event.event_id)
            if known is None:
                tx.journal_insert(event, digest, self.now())
        if known is not None:
            if known["payload_digest"] != digest:
                self._log("rejected", event, "event_id_reused_with_other_content")
                raise Rejected("event_id_reused_with_other_content", 409)
            if known["status"] not in ("received", "retry"):
                self._log("duplicate", event)
                return {"status": known["status"], "code": "duplicate", "duplicate": True}
        return self._apply(event)

    def _apply(self, event: Event) -> dict:
        try:
            if self.provider.confirm(event) is not True:
                raise Temporary("confirmation_pending")
            with self.store.transaction() as tx:
                current = tx.subscription_get(event.organisation_id)
                if current is None:
                    raise Temporary("organisation_unknown")
                if current.last_event_at is not None and event.occurred_at < current.last_event_at:
                    # Arrived after a newer event was applied: recorded, no effect on the state.
                    tx.journal_mark(event.provider, event.event_id, "ignored_stale", attempt=True)
                    status = "ignored_stale"
                else:
                    updated = transition(current, event, self.config)
                    tx.subscription_put(updated, current.version)
                    tx.entitlements_put(updated, derive_entitlements(updated, self.config, self.now()))
                    tx.audit(event.organisation_id, self.now(), "subscription." + updated.state, event.provider + ":" + event.event_id)
                    if self.sink is not None and updated.state == "active" and current.state != "active":
                        try:
                            self.sink.activated(event.organisation_id, updated.plan_ref, event.provider + ":" + event.event_id)
                        except Exception:
                            raise Temporary("activation_sink_unavailable") from None
                    tx.journal_mark(event.provider, event.event_id, "processed", attempt=True)
                    status = "processed"
        except TransitionError as error:
            return self._fail(event, error.code, retryable=False)
        except Temporary as error:
            return self._fail(event, error.code, retryable=error.code in RETRYABLE)
        except Exception:
            # Unknown failure inside the transaction: everything was rolled back; never log the exception text.
            return self._fail(event, "store_unavailable", retryable=True)
        self._log(status, event)
        return {"status": status, "code": status}

    def _fail(self, event, code, retryable):
        with self.store.transaction() as tx:
            row = tx.journal_get(event.provider, event.event_id)
            exhausted = row["attempts"] + 1 >= MAX_ATTEMPTS
            status = "retry" if retryable and not exhausted else "dead"
            tx.journal_mark(event.provider, event.event_id, status, error=code, attempt=True)
        self._log(status, event, code)
        return {"status": status, "code": code}

    def process_open(self, limit=50) -> list:
        """Bounded retry run for journalled events that are not finished; oldest event time first."""
        results = []
        for row in self.store.journal_open(limit):
            results.append(self._apply(Event(**json.loads(row["event_json"]))))
        return results

    def reconcile(self, organisation_id: str) -> dict:
        """Ask the provider for the authoritative state when no event arrived. Unknown stays unknown."""
        try:
            event = self.provider.read_back(organisation_id)
        except Temporary as error:
            self._log("reconcile_unavailable", code=error.code)
            return {"status": "unchanged", "code": error.code}
        if event is None:
            return {"status": "unchanged", "code": "nothing_to_reconcile"}
        with self.store.transaction() as tx:
            known = tx.journal_get(event.provider, event.event_id)
            if known is None:
                tx.journal_insert(event, _digest(event), self.now())
        if known is not None and known["status"] not in ("received", "retry"):
            return {"status": known["status"], "code": "duplicate", "duplicate": True}
        return self._apply(event)


def handle_webhook(processor: EventProcessor, body: bytes, headers: Mapping[str, str]) -> tuple:
    """Framework-neutral HTTP mapping: (status code, JSON body). 2xx tells the provider to stop redelivering;
    'retry' answers 503 so that the provider redelivers while our own bounded retry also exists."""
    try:
        result = processor.receive(body, headers)
    except Rejected as error:
        return error.status, {"error": error.code}
    if result["status"] == "retry":
        return 503, {"status": "retry"}
    return 200, {"status": result["status"]}
