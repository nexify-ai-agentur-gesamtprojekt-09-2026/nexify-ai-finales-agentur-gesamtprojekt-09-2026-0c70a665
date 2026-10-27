"""Private self-service domain, not an authentication, payment or LLM adapter.

TrustedBoundary is held by application bootstrap. Its opaque records may only be
minted AFTER real adapters verify identity, vault ownership, payment/usage or paid
plan acceptance. Never deserialize these records from HTTP fields or expose the
factory to a client. Python objects are not a sandbox for hostile in-process code.
No raw provider key, external charge or model request is handled by this module.
Reservation amounts are internal bounds, not verified provider cost estimates.
A live executor must bind a trusted maximum-cost quote to the complete execution
payload/token limits before calling reserve; that adapter is not provided here.
"""
from __future__ import annotations
from contextlib import contextmanager
from dataclasses import dataclass, field
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import time
import uuid


class DomainError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def _text(value, limit=240):
    if not isinstance(value, str) or not value.strip() or len(value) > limit or any(ord(c) < 32 for c in value):
        raise DomainError("invalid_reference")
    try:
        value.encode("utf-8")
    except UnicodeError:
        raise DomainError("invalid_reference") from None
    return value


def _integer(value, minimum=0):
    if type(value) is not int or value < minimum or value > 9_000_000_000_000_000:
        raise DomainError("invalid_integer_amount_or_time")
    return value


def _id():
    return uuid.uuid4().hex


@dataclass(frozen=True)
class Attestation:
    """Opaque internal capability. No dictionary/boolean can stand in for it."""
    kind: str
    data: tuple
    _seal: object = field(repr=False, compare=False)


class TrustedBoundary:
    """Backend-owned adapter boundary; methods assert completed external checks."""
    def __init__(self):
        self._seal = object()

    def _record(self, kind, **values):
        return Attestation(kind, tuple(sorted(values.items())), self._seal)

    def verified_principal(self, *, issuer, subject, email, verified_at, evidence_ref):
        email = _text(email, 254).strip().casefold()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            raise DomainError("invalid_verified_email")
        return self._record("principal", issuer=_text(issuer), subject=_text(subject), email=email,
                            verified_at=_integer(verified_at), evidence_ref=_text(evidence_ref))

    def validated_vault_reference(self, *, account_id, tenant_id, reference, provider, models, valid_until, evidence_ref):
        # The opaque ID resolves inside the actual vault adapter, not in a URL.
        if not isinstance(reference, str) or not re.fullmatch(r"vaultref:[a-f0-9]{32}", reference):
            raise DomainError("opaque_vault_reference_required")
        if not isinstance(models, (tuple, list)) or not models or len(models) > 100:
            raise DomainError("validated_model_allowlist_required")
        return self._record("vault", account_id=_text(account_id), tenant_id=_text(tenant_id), reference=reference,
                            provider=_text(provider), models=tuple(_text(model) for model in models),
                            valid_until=_integer(valid_until), evidence_ref=_text(evidence_ref))

    def approved_managed_binding(self, *, merchant_account, route_contract_ref, terms_ref, allowed_models):
        if not isinstance(allowed_models, (tuple, list)) or not allowed_models:
            raise DomainError("approved_managed_models_required")
        return self._record("managed_binding", merchant_account=_text(merchant_account),
                            route_contract_ref=_text(route_contract_ref), terms_ref=_text(terms_ref),
                            allowed_models=tuple(_text(model) for model in allowed_models))

    def settled_payment(self, *, provider, payment_id, merchant_account, merchant_reference, account_id, tenant_id,
                        amount_cent, currency, purpose, settled_at, evidence_ref):
        return self._record("payment", provider=_text(provider), payment_id=_text(payment_id),
                            merchant_account=_text(merchant_account), merchant_reference=_text(merchant_reference),
                            account_id=_text(account_id), tenant_id=_text(tenant_id), amount_cent=_integer(amount_cent),
                            currency=_text(currency), purpose=_text(purpose), settled_at=_integer(settled_at),
                            evidence_ref=_text(evidence_ref))

    def verified_usage(self, *, reservation_id, tenant_id, actual_cost_micro_eur, price_version, model_id, provider_request_ref, evidence_ref):
        return self._record("usage", reservation_id=_text(reservation_id), tenant_id=_text(tenant_id),
                            actual_cost_micro_eur=_integer(actual_cost_micro_eur), price_version=_text(price_version),
                            model_id=_text(model_id), provider_request_ref=_text(provider_request_ref), evidence_ref=_text(evidence_ref))

    def approved_conversion(self, *, account_id, tenant_id, workspace_id, plan_ref, terms_ref, billing_evidence_ref):
        return self._record("conversion", account_id=_text(account_id), tenant_id=_text(tenant_id),
                            workspace_id=_text(workspace_id), plan_ref=_text(plan_ref), terms_ref=_text(terms_ref),
                            billing_evidence_ref=_text(billing_evidence_ref))


class SelfService:
    def __init__(self, database, *, boundary: TrustedBoundary, policy_path=None, now=None,
                 managed_binding=None, approved_price_versions=(), approved_plan_refs=()):
        if not isinstance(boundary, TrustedBoundary):
            raise DomainError("trusted_boundary_required")
        self.boundary = boundary
        self.database = str(database)
        if self.database == ":memory:":
            raise DomainError("persistent_database_required")
        self.now = now or (lambda: int(time.time()))
        self.policy = json.loads(Path(policy_path or Path(__file__).resolve().parents[2] / "config/selfservice-policy.json").read_text())
        self.duration = _integer(self.policy["trial"]["duration_seconds"], 1)
        self.topup_cent = _integer(self.policy["trial_topup"]["amount_cent"], 1)
        self.currency = self.policy["trial_topup"]["currency"]
        if self.policy["llm"]["free_credit_cent"] != 0 or self.currency != "EUR":
            raise DomainError("unsupported_credit_policy")
        self.price_versions = frozenset(_text(value) for value in approved_price_versions)
        self.plan_refs = frozenset(_text(value) for value in approved_plan_refs)
        self.managed = self._attestation(managed_binding, "managed_binding") if managed_binding is not None else None
        Path(database).parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with self._db() as db:
            db.executescript("""
              PRAGMA journal_mode=WAL;
              CREATE TABLE IF NOT EXISTS ss_account(id TEXT PRIMARY KEY,issuer TEXT NOT NULL,subject TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,verified_at INTEGER NOT NULL,trial_started INTEGER,trial_expires INTEGER,
                paid_plan TEXT,converted_at INTEGER,UNIQUE(issuer,subject));
              CREATE TABLE IF NOT EXISTS ss_tenant(id TEXT PRIMARY KEY,owner TEXT NOT NULL UNIQUE REFERENCES ss_account(id));
              CREATE TABLE IF NOT EXISTS ss_membership(account TEXT REFERENCES ss_account(id),tenant TEXT REFERENCES ss_tenant(id),
                role TEXT NOT NULL CHECK(role='customer'),PRIMARY KEY(account,tenant));
              CREATE TABLE IF NOT EXISTS ss_workspace(id TEXT PRIMARY KEY,tenant TEXT NOT NULL UNIQUE REFERENCES ss_tenant(id),
                activated_at INTEGER,settings TEXT NOT NULL DEFAULT '{}',funding_mode TEXT,current_key TEXT);
              CREATE TABLE IF NOT EXISTS ss_wallet(tenant TEXT PRIMARY KEY REFERENCES ss_tenant(id),balance INTEGER NOT NULL DEFAULT 0 CHECK(balance>=0),
                held INTEGER NOT NULL DEFAULT 0 CHECK(held>=0 AND held<=balance));
              CREATE TABLE IF NOT EXISTS ss_key(id TEXT PRIMARY KEY,account TEXT NOT NULL,tenant TEXT NOT NULL,reference TEXT NOT NULL UNIQUE,
                provider TEXT NOT NULL,models TEXT NOT NULL,valid_until INTEGER NOT NULL,evidence_ref TEXT NOT NULL,revoked_at INTEGER);
              CREATE TABLE IF NOT EXISTS ss_topup(id TEXT PRIMARY KEY,account TEXT NOT NULL UNIQUE,tenant TEXT NOT NULL,merchant_account TEXT NOT NULL,
                merchant_reference TEXT NOT NULL UNIQUE,terms_ref TEXT NOT NULL,route_ref TEXT NOT NULL,status TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS ss_payment(provider TEXT,merchant_account TEXT,payment_id TEXT,intent TEXT NOT NULL UNIQUE,
                binding_hash TEXT NOT NULL,PRIMARY KEY(provider,merchant_account,payment_id));
              CREATE TABLE IF NOT EXISTS ss_reservation(id TEXT PRIMARY KEY,account TEXT NOT NULL,tenant TEXT NOT NULL,request_key TEXT NOT NULL,
                payload_hash TEXT NOT NULL,mode TEXT NOT NULL,key_id TEXT,price_version TEXT NOT NULL,model_id TEXT NOT NULL,
                maximum INTEGER NOT NULL CHECK(maximum>=0),actual INTEGER,state TEXT NOT NULL,attempt_ref TEXT,usage_hash TEXT,
                UNIQUE(tenant,request_key));
              CREATE TABLE IF NOT EXISTS ss_ledger(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,kind TEXT NOT NULL,amount INTEGER NOT NULL,
                reference TEXT NOT NULL UNIQUE);
              CREATE TABLE IF NOT EXISTS ss_usage(provider_request_ref TEXT PRIMARY KEY,reservation_id TEXT NOT NULL UNIQUE,binding_hash TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS ss_conversion(account TEXT PRIMARY KEY REFERENCES ss_account(id),tenant TEXT NOT NULL,
                workspace TEXT NOT NULL,plan_ref TEXT NOT NULL,terms_ref TEXT NOT NULL,billing_evidence_ref TEXT NOT NULL UNIQUE,
                binding_hash TEXT NOT NULL,converted_at INTEGER NOT NULL);
              CREATE TABLE IF NOT EXISTS ss_key_version(key_id TEXT,version INTEGER,binding_snapshot TEXT NOT NULL,
                PRIMARY KEY(key_id,version));
            """)
            columns = {row["name"] for row in db.execute("PRAGMA table_info(ss_reservation)")}
            if "credential_snapshot" not in columns:
                # Pre-snapshot reservations remain NULL and cannot be dispatched.
                db.execute("ALTER TABLE ss_reservation ADD COLUMN credential_snapshot TEXT")
            if "managed_snapshot" not in columns:
                # Never infer historical execution consent from today's route configuration.
                db.execute("ALTER TABLE ss_reservation ADD COLUMN managed_snapshot TEXT")
            key_columns = {row["name"] for row in db.execute("PRAGMA table_info(ss_key)")}
            if "binding_version" not in key_columns:
                db.execute("ALTER TABLE ss_key ADD COLUMN binding_version INTEGER NOT NULL DEFAULT 1")
        Path(database).chmod(0o600)

    @contextmanager
    def _db(self):
        db = sqlite3.connect(self.database, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def _attestation(self, record, kind):
        if type(record) is not Attestation or record._seal is not self.boundary._seal or record.kind != kind:
            raise DomainError("trusted_" + kind + "_required")
        return dict(record.data)

    def _principal(self, db, principal):
        identity = self._attestation(principal, "principal")
        if identity["verified_at"] > _integer(self.now()):
            raise DomainError("future_identity_verification")
        account = db.execute("SELECT * FROM ss_account WHERE issuer=? AND subject=?", (identity["issuer"], identity["subject"])).fetchone()
        if account is None or account["email"] != identity["email"]:
            raise DomainError("registered_identity_required")
        return account

    def _owned(self, db, principal, tenant):
        account = self._principal(db, principal)
        workspace = db.execute("SELECT w.* FROM ss_workspace w JOIN ss_tenant t ON t.id=w.tenant JOIN ss_membership m ON m.tenant=t.id "
                               "WHERE t.id=? AND t.owner=? AND m.account=? AND m.role='customer'", (tenant, account["id"], account["id"])).fetchone()
        if workspace is None:
            raise DomainError("own_customer_workspace_required")
        return account, workspace

    def _view(self, db, account, workspace):
        wallet = db.execute("SELECT balance,held FROM ss_wallet WHERE tenant=?", (workspace["tenant"],)).fetchone()
        keys = [dict(row) for row in db.execute("SELECT id,reference,provider,models,valid_until,revoked_at FROM ss_key WHERE tenant=? ORDER BY id", (workspace["tenant"],))]
        entitlement = "paid" if account["paid_plan"] else "not_started" if account["trial_started"] is None else "trial_active" if self.now() < account["trial_expires"] else "trial_expired"
        return {"account_id": account["id"], "tenant_id": workspace["tenant"], "workspace_id": workspace["id"], "role": "customer",
                "settings": json.loads(workspace["settings"]), "activated_at": workspace["activated_at"], "trial_started_at": account["trial_started"],
                "trial_expires_at": account["trial_expires"], "entitlement": entitlement, "paid_plan_ref": account["paid_plan"],
                "funding_mode": workspace["funding_mode"], "key_references": keys,
                "conversion_receipt": self._conversion_receipt(db, account["id"]),
                "wallet": {"balance_micro_eur": wallet["balance"], "held_micro_eur": wallet["held"]}}

    def _conversion_receipt(self, db, account):
        receipt = db.execute("SELECT * FROM ss_conversion WHERE account=?", (account,)).fetchone()
        return dict(receipt) if receipt else None

    def _credential_snapshot(self, key):
        if key is None:
            return None
        return json.dumps({field: key[field] for field in
                           ("id", "account", "tenant", "reference", "provider", "models", "valid_until", "binding_version")}, sort_keys=True)

    def register(self, principal):
        identity = self._attestation(principal, "principal")
        if identity["verified_at"] > _integer(self.now()):
            raise DomainError("future_identity_verification")
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            existing = db.execute("SELECT * FROM ss_account WHERE issuer=? AND subject=?", (identity["issuer"], identity["subject"])).fetchone()
            if existing:
                if existing["email"] != identity["email"]:
                    raise DomainError("identity_email_change_requires_separate_verification_flow")
                workspace = db.execute("SELECT w.* FROM ss_workspace w JOIN ss_tenant t ON t.id=w.tenant WHERE t.owner=?", (existing["id"],)).fetchone()
                return self._view(db, existing, workspace)
            if db.execute("SELECT 1 FROM ss_account WHERE email=?", (identity["email"],)).fetchone():
                raise DomainError("identity_link_required_no_duplicate_trial")
            account, tenant, workspace = _id(), _id(), _id()
            db.execute("INSERT INTO ss_account(id,issuer,subject,email,verified_at) VALUES(?,?,?,?,?)", (account, identity["issuer"], identity["subject"], identity["email"], identity["verified_at"]))
            db.execute("INSERT INTO ss_tenant VALUES(?,?)", (tenant, account))
            db.execute("INSERT INTO ss_membership VALUES(?,?,'customer')", (account, tenant))
            db.execute("INSERT INTO ss_workspace(id,tenant) VALUES(?,?)", (workspace, tenant))
            db.execute("INSERT INTO ss_wallet(tenant) VALUES(?)", (tenant,))
            return self._view(db, db.execute("SELECT * FROM ss_account WHERE id=?", (account,)).fetchone(), db.execute("SELECT * FROM ss_workspace WHERE id=?", (workspace,)).fetchone())

    def read(self, principal, tenant):
        with self._db() as db:
            return self._view(db, *self._owned(db, principal, tenant))

    def activate_workspace(self, principal, tenant):
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, workspace = self._owned(db, principal, tenant)
            db.execute("UPDATE ss_workspace SET activated_at=COALESCE(activated_at,?) WHERE id=?", (_integer(self.now()), workspace["id"]))
            return self._view(db, account, db.execute("SELECT * FROM ss_workspace WHERE id=?", (workspace["id"],)).fetchone())

    def update_settings(self, principal, tenant, settings):
        if not isinstance(settings, dict) or set(settings) - {"locale", "workspace_name", "timezone"}:
            raise DomainError("settings_scope_invalid")
        for value in settings.values():
            _text(value, 120)
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, workspace = self._owned(db, principal, tenant)
            db.execute("UPDATE ss_workspace SET settings=? WHERE id=?", (json.dumps(settings, sort_keys=True), workspace["id"]))
            return self._view(db, account, db.execute("SELECT * FROM ss_workspace WHERE id=?", (workspace["id"],)).fetchone())

    def bind_byok(self, principal, tenant, attested_key):
        key = self._attestation(attested_key, "vault")
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, workspace = self._owned(db, principal, tenant)
            if key["account_id"] != account["id"] or key["tenant_id"] != tenant or key["valid_until"] <= self.now():
                raise DomainError("vault_ownership_or_validity_mismatch")
            existing = db.execute("SELECT * FROM ss_key WHERE reference=?", (key["reference"],)).fetchone()
            if existing and (existing["tenant"] != tenant or existing["revoked_at"] is not None):
                raise DomainError("vault_reference_rebinding_forbidden")
            identifier = existing["id"] if existing else _id()
            models = json.dumps(key["models"])
            changed = existing is not None and (existing["provider"], existing["models"], existing["valid_until"]) != (key["provider"], models, key["valid_until"])
            if existing:
                db.execute("INSERT OR IGNORE INTO ss_key_version VALUES(?,?,?)", (identifier, existing["binding_version"], self._credential_snapshot(existing)))
            db.execute("INSERT INTO ss_key(id,account,tenant,reference,provider,models,valid_until,evidence_ref) VALUES(?,?,?,?,?,?,?,?) "
                       "ON CONFLICT(reference) DO UPDATE SET provider=excluded.provider,models=excluded.models,valid_until=excluded.valid_until,evidence_ref=excluded.evidence_ref,binding_version=ss_key.binding_version+?",
                       (identifier, account["id"], tenant, key["reference"], key["provider"], models, key["valid_until"], key["evidence_ref"], int(changed)))
            current = db.execute("SELECT * FROM ss_key WHERE id=?", (identifier,)).fetchone()
            db.execute("INSERT OR IGNORE INTO ss_key_version VALUES(?,?,?)", (identifier, current["binding_version"], self._credential_snapshot(current)))
            db.execute("UPDATE ss_workspace SET funding_mode='byok',current_key=? WHERE id=?", (identifier, workspace["id"]))
            return self._view(db, account, db.execute("SELECT * FROM ss_workspace WHERE id=?", (workspace["id"],)).fetchone())

    def begin_trial_topup(self, principal, tenant):
        if self.managed is None:
            raise DomainError("approved_operational_managed_route_required")
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, workspace = self._owned(db, principal, tenant)
            if workspace["activated_at"] is None:
                raise DomainError("workspace_activation_required")
            if account["paid_plan"] or account["trial_expires"] is not None and self.now() >= account["trial_expires"]:
                raise DomainError("initial_trial_purchase_only")
            old = db.execute("SELECT * FROM ss_topup WHERE account=?", (account["id"],)).fetchone()
            if old:
                if old["status"] == "settled":
                    raise DomainError("initial_trial_topup_already_used")
                return dict(old)
            identifier = _id()
            db.execute("INSERT INTO ss_topup VALUES(?,?,?,?,?,?,?,'pending')", (identifier, account["id"], tenant, self.managed["merchant_account"], "trial-" + identifier, self.managed["terms_ref"], self.managed["route_contract_ref"]))
            result = dict(db.execute("SELECT * FROM ss_topup WHERE id=?", (identifier,)).fetchone())
            return result

    def confirm_trial_topup(self, receipt):
        payment = self._attestation(receipt, "payment")
        binding = hashlib.sha256(json.dumps({key: value for key, value in payment.items() if key != "evidence_ref"}, sort_keys=True).encode()).hexdigest()
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            old = db.execute("SELECT * FROM ss_payment WHERE provider=? AND merchant_account=? AND payment_id=?", (payment["provider"], payment["merchant_account"], payment["payment_id"])).fetchone()
            if old:
                if old["binding_hash"] != binding:
                    raise DomainError("payment_replay_binding_conflict")
                return {"state": "credited", "intent_id": old["intent"], "replayed": True}
            intent = db.execute("SELECT * FROM ss_topup WHERE merchant_reference=?", (payment["merchant_reference"],)).fetchone()
            if intent is None or intent["status"] != "pending":
                raise DomainError("pending_topup_intent_required")
            if (payment["merchant_account"] != intent["merchant_account"] or payment["account_id"] != intent["account"] or payment["tenant_id"] != intent["tenant"]
                    or payment["amount_cent"] != self.topup_cent or payment["currency"] != self.currency or payment["purpose"] != "trial_topup" or payment["settled_at"] > self.now()):
                raise DomainError("payment_binding_mismatch")
            credit = self.topup_cent * 10000
            db.execute("INSERT INTO ss_payment VALUES(?,?,?,?,?)", (payment["provider"], payment["merchant_account"], payment["payment_id"], intent["id"], binding))
            db.execute("UPDATE ss_wallet SET balance=balance+? WHERE tenant=?", (credit, intent["tenant"]))
            db.execute("INSERT INTO ss_ledger VALUES(?,?,?,?,?)", (_id(), intent["tenant"], "trial_purchase", credit, "payment:" + intent["id"]))
            db.execute("UPDATE ss_topup SET status='settled' WHERE id=?", (intent["id"],))
            return {"state": "credited", "intent_id": intent["id"], "replayed": False}

    def select_managed_funding(self, principal, tenant):
        if self.managed is None:
            raise DomainError("approved_operational_managed_route_required")
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, workspace = self._owned(db, principal, tenant)
            self._managed_purchase(db, workspace)
            db.execute("UPDATE ss_workspace SET funding_mode='managed_trial_credit' WHERE id=?", (workspace["id"],))
            return self._view(db, account, db.execute("SELECT * FROM ss_workspace WHERE id=?", (workspace["id"],)).fetchone())

    def start_trial(self, principal, tenant):
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, workspace = self._owned(db, principal, tenant)
            if account["trial_started"] is not None:
                return self._view(db, account, workspace)
            if account["paid_plan"] is not None:
                raise DomainError("trial_not_applicable_to_paid_account")
            if workspace["activated_at"] is None:
                raise DomainError("workspace_activation_required")
            self._funding(db, workspace)
            now = _integer(self.now())
            db.execute("UPDATE ss_account SET trial_started=?,trial_expires=? WHERE id=?", (now, now + self.duration, account["id"]))
            return self._view(db, db.execute("SELECT * FROM ss_account WHERE id=?", (account["id"],)).fetchone(), workspace)

    def _managed_purchase(self, db, workspace):
        purchase = db.execute("SELECT * FROM ss_topup WHERE tenant=? AND status='settled'",
                              (workspace["tenant"],)).fetchone()
        if purchase is None:
            raise DomainError("confirmed_trial_purchase_required")
        if self.managed is None or (purchase["merchant_account"], purchase["route_ref"], purchase["terms_ref"]) != (
                self.managed["merchant_account"], self.managed["route_contract_ref"], self.managed["terms_ref"]):
            raise DomainError("managed_purchase_binding_changed")
        return json.dumps({field: purchase[field] for field in
                           ("id", "account", "tenant", "merchant_account", "route_ref", "terms_ref")}, sort_keys=True)

    def _funding(self, db, workspace, model_id=None):
        if workspace["funding_mode"] == "byok":
            key = db.execute("SELECT * FROM ss_key WHERE id=? AND tenant=? AND revoked_at IS NULL", (workspace["current_key"], workspace["tenant"])).fetchone()
            if key is None or key["valid_until"] <= self.now() or model_id is not None and model_id not in json.loads(key["models"]):
                raise DomainError("validated_byok_unavailable_no_platform_fallback")
            return key
        if workspace["funding_mode"] == "managed_trial_credit" and self.managed is not None:
            self._managed_purchase(db, workspace)
            if model_id is not None and model_id not in self.managed["allowed_models"]:
                raise DomainError("managed_model_not_approved")
            return None
        raise DomainError("explicit_validated_funding_required")

    def reserve(self, principal, tenant, *, request_key, maximum_micro_eur, model_id, price_version):
        _text(request_key); _text(model_id); _text(price_version); maximum = _integer(maximum_micro_eur)
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, workspace = self._owned(db, principal, tenant)
            body = {"maximum": maximum, "model_id": model_id, "price_version": price_version}
            binding = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
            old = db.execute("SELECT * FROM ss_reservation WHERE tenant=? AND request_key=?", (tenant, request_key)).fetchone()
            if old:
                if old["payload_hash"] != binding:
                    raise DomainError("reservation_replay_conflict")
                return dict(old)
            if not account["paid_plan"] and (account["trial_expires"] is None or self.now() >= account["trial_expires"]):
                raise DomainError("suite_entitlement_required")
            key = self._funding(db, workspace, model_id)
            mode = workspace["funding_mode"]
            if mode == "byok":
                if maximum != 0:
                    raise DomainError("byok_cannot_reserve_company_money")
            else:
                if price_version not in self.price_versions:
                    raise DomainError("approved_price_version_required")
                if maximum <= 0:
                    raise DomainError("positive_cost_reservation_required")
                changed = db.execute("UPDATE ss_wallet SET held=held+? WHERE tenant=? AND balance-held>=?", (maximum, tenant, maximum)).rowcount
                if changed != 1:
                    raise DomainError("insufficient_funded_balance")
            identifier = _id()
            db.execute("INSERT INTO ss_reservation(id,account,tenant,request_key,payload_hash,mode,key_id,price_version,model_id,maximum,credential_snapshot,managed_snapshot,state) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'reserved')",
                       (identifier, account["id"], tenant, request_key, binding, mode, key["id"] if key else None, price_version, model_id, maximum, self._credential_snapshot(key),
                        self._managed_purchase(db, workspace) if mode == "managed_trial_credit" else None))
            return dict(db.execute("SELECT * FROM ss_reservation WHERE id=?", (identifier,)).fetchone())

    def claim_execution(self, principal, tenant, reservation_id, *, attempt_ref):
        _text(attempt_ref)
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, workspace = self._owned(db, principal, tenant)
            row = db.execute("SELECT * FROM ss_reservation WHERE id=? AND tenant=? AND account=?", (reservation_id, tenant, account["id"])).fetchone()
            if row is None or row["state"] != "reserved":
                raise DomainError("execution_already_claimed_or_unavailable")
            if not account["paid_plan"] and self.now() >= account["trial_expires"]:
                raise DomainError("no_new_execution_after_trial_expiry")
            current_key = self._funding(db, workspace, row["model_id"])
            if row["mode"] == "managed_trial_credit" and row["price_version"] not in self.price_versions:
                raise DomainError("approved_price_version_required")
            if row["mode"] == "managed_trial_credit" and row["managed_snapshot"] != self._managed_purchase(db, workspace):
                raise DomainError("reservation_managed_binding_changed")
            # Existing BYOK reservation must never switch credentials underneath it.
            if row["mode"] != workspace["funding_mode"] or row["mode"] == "byok" and row["key_id"] != workspace["current_key"]:
                raise DomainError("reservation_funding_changed")
            if row["mode"] == "byok" and row["credential_snapshot"] != self._credential_snapshot(current_key):
                raise DomainError("reservation_credential_binding_changed")
            db.execute("UPDATE ss_reservation SET state='dispatched',attempt_ref=? WHERE id=?", (attempt_ref, reservation_id))
            return dict(db.execute("SELECT * FROM ss_reservation WHERE id=?", (reservation_id,)).fetchone())

    def cancel_reserved(self, principal, tenant, reservation_id):
        """Release an unused hold, never a dispatched or unknown provider outcome."""
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, _ = self._owned(db, principal, tenant)
            row = db.execute("SELECT * FROM ss_reservation WHERE id=? AND tenant=? AND account=?", (reservation_id, tenant, account["id"])).fetchone()
            if row is None or row["state"] not in {"reserved", "cancelled"}:
                raise DomainError("undispatched_reservation_required")
            if row["state"] == "reserved":
                if row["mode"] == "managed_trial_credit":
                    db.execute("UPDATE ss_wallet SET held=held-? WHERE tenant=?", (row["maximum"], tenant))
                db.execute("UPDATE ss_reservation SET state='cancelled' WHERE id=?", (reservation_id,))
            return dict(db.execute("SELECT * FROM ss_reservation WHERE id=?", (reservation_id,)).fetchone())

    def mark_outcome_unknown(self, principal, tenant, reservation_id):
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, _ = self._owned(db, principal, tenant)
            changed = db.execute("UPDATE ss_reservation SET state='unknown' WHERE id=? AND tenant=? AND account=? AND state IN ('dispatched','unknown')", (reservation_id, tenant, account["id"])).rowcount
            if changed != 1:
                raise DomainError("dispatched_reservation_required")

    def settle(self, usage):
        record = self._attestation(usage, "usage")
        binding = hashlib.sha256(json.dumps({key: value for key, value in record.items() if key != "evidence_ref"}, sort_keys=True).encode()).hexdigest()
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM ss_reservation WHERE id=? AND tenant=?", (record["reservation_id"], record["tenant_id"])).fetchone()
            if row is None or record["model_id"] != row["model_id"] or record["price_version"] != row["price_version"]:
                raise DomainError("usage_binding_mismatch")
            if row["state"] == "settled":
                if row["usage_hash"] != binding:
                    raise DomainError("settlement_replay_conflict")
                return dict(row)
            actual = record["actual_cost_micro_eur"]
            if row["state"] not in {"dispatched", "unknown"} or actual > row["maximum"]:
                raise DomainError("bounded_dispatched_usage_required")
            already_used = db.execute("SELECT reservation_id FROM ss_usage WHERE provider_request_ref=?", (record["provider_request_ref"],)).fetchone()
            if already_used:
                raise DomainError("provider_usage_already_bound")
            if row["mode"] == "managed_trial_credit":
                db.execute("UPDATE ss_wallet SET balance=balance-?,held=held-? WHERE tenant=?", (actual, row["maximum"], row["tenant"]))
                db.execute("INSERT INTO ss_ledger VALUES(?,?,?,?,?)", (_id(), row["tenant"], "usage", -actual, "usage:" + row["id"]))
            elif actual != 0:
                raise DomainError("byok_cannot_charge_company_money")
            db.execute("INSERT INTO ss_usage VALUES(?,?,?)", (record["provider_request_ref"], row["id"], binding))
            db.execute("UPDATE ss_reservation SET state='settled',actual=?,usage_hash=? WHERE id=?", (actual, binding, row["id"]))
            return dict(db.execute("SELECT * FROM ss_reservation WHERE id=?", (row["id"],)).fetchone())

    def revoke_byok(self, principal, tenant, key_id):
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, _ = self._owned(db, principal, tenant)
            if db.execute("UPDATE ss_key SET revoked_at=COALESCE(revoked_at,?) WHERE id=? AND tenant=? AND account=?", (_integer(self.now()), key_id, tenant, account["id"])).rowcount != 1:
                raise DomainError("own_vault_reference_required")

    def convert(self, principal, tenant, approval):
        approved = self._attestation(approval, "conversion")
        if approved["plan_ref"] not in self.plan_refs:
            raise DomainError("approved_paid_suite_plan_required")
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            account, workspace = self._owned(db, principal, tenant)
            if (approved["account_id"], approved["tenant_id"], approved["workspace_id"]) != (account["id"], tenant, workspace["id"]):
                raise DomainError("conversion_binding_mismatch")
            if account["paid_plan"] and account["paid_plan"] != approved["plan_ref"]:
                raise DomainError("separate_plan_change_required")
            binding = hashlib.sha256(json.dumps(approved, sort_keys=True).encode()).hexdigest()
            existing = db.execute("SELECT * FROM ss_conversion WHERE account=?", (account["id"],)).fetchone()
            if existing:
                if existing["binding_hash"] != binding:
                    raise DomainError("separate_conversion_terms_or_billing_change_required")
                return self._view(db, account, workspace)
            if account["paid_plan"]:
                raise DomainError("legacy_conversion_receipt_required")
            if db.execute("SELECT 1 FROM ss_conversion WHERE billing_evidence_ref=?", (approved["billing_evidence_ref"],)).fetchone():
                raise DomainError("billing_evidence_already_bound")
            converted_at = _integer(self.now())
            db.execute("INSERT INTO ss_conversion VALUES(?,?,?,?,?,?,?,?)", (account["id"], tenant, workspace["id"],
                       approved["plan_ref"], approved["terms_ref"], approved["billing_evidence_ref"], binding, converted_at))
            db.execute("UPDATE ss_account SET paid_plan=?,converted_at=COALESCE(converted_at,?) WHERE id=?", (approved["plan_ref"], converted_at, account["id"]))
            return self._view(db, db.execute("SELECT * FROM ss_account WHERE id=?", (account["id"],)).fetchone(), workspace)
