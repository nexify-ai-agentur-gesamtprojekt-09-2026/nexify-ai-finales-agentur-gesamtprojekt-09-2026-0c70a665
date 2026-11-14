"""TEST STAND-INS ONLY. No real provider, no network, no stored secret.

These classes implement the ports so the core can be exercised end to end. They must never be wired
into a deployed service: `FixtureVault` keeps material in process memory and `FixtureProvider` accepts
whatever the test declares authoritative.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import secrets

from .billing import Rejected, Temporary
from .subscription import KINDS, Event


class FixtureSignature:
    """HMAC-SHA256 over "<timestamp>.<body>" with a tolerance window, as in the existing shop webhook."""
    def __init__(self, secret: bytes, now, tolerance=300):
        self._secret, self.now, self.tolerance = secret, now, tolerance

    def sign(self, body: bytes, timestamp=None):
        timestamp = str(self.now() if timestamp is None else timestamp)
        mac = hmac.new(self._secret, timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()
        return {"x-fixture-timestamp": timestamp, "x-fixture-signature": mac}

    def verify(self, body, headers):
        timestamp, given = headers.get("x-fixture-timestamp", ""), headers.get("x-fixture-signature", "")
        if not timestamp.isdigit() or abs(self.now() - int(timestamp)) > self.tolerance:
            return False
        expected = hmac.new(self._secret, timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, given)


class FixtureProvider:
    name = "fixture"

    def __init__(self):
        self.authoritative = set()   # event ids the "provider" confirms on read-back
        self.unavailable = False
        self.snapshots = {}          # organisation_id -> Event for reconciliation
        self.confirm_calls = 0

    @staticmethod
    def body(event_id, kind, organisation_id, occurred_at, plan_ref=None, period_end=None, **extra):
        return json.dumps({"id": event_id, "type": kind, "organisation": organisation_id, "occurred_at": occurred_at,
                           "plan": plan_ref, "period_end": period_end, **extra}).encode()

    def parse(self, body):
        try:
            data = json.loads(body)
            event = Event(provider=self.name, event_id=data["id"], kind=data["type"], organisation_id=data["organisation"],
                          occurred_at=data["occurred_at"], plan_ref=data.get("plan"), period_end=data.get("period_end"))
        except (ValueError, KeyError, TypeError):
            raise Rejected("body_unparseable") from None
        if (not isinstance(event.event_id, str) or not 1 <= len(event.event_id) <= 128 or event.kind not in KINDS
                or not isinstance(event.organisation_id, str) or type(event.occurred_at) is not int):
            raise Rejected("event_fields_invalid")
        return event

    def confirm(self, event):
        self.confirm_calls += 1
        if self.unavailable:
            raise Temporary("provider_unavailable")
        return event.event_id in self.authoritative

    def read_back(self, organisation_id):
        if self.unavailable:
            raise Temporary("provider_unavailable")
        return self.snapshots.get(organisation_id)


class FixtureMailer:
    def __init__(self):
        self.sent = []
        self.fail = False

    def send_verification(self, *, to, link, event_key):
        if self.fail:
            raise RuntimeError("fixture mail failure")
        self.sent.append({"to": to, "link": link, "event_key": event_key})


class FixtureVault:
    """Hands out opaque references. Material lives only in this object and is never returned by `describe`."""
    def __init__(self):
        self._material = {}
        self.unavailable = False

    def store(self, *, organisation_id, provider_ref, secret):
        reference = "vaultref:" + secrets.token_hex(16)
        self._material[reference] = (organisation_id, provider_ref, secret)
        return reference

    def resolve(self, *, organisation_id, reference):
        if self.unavailable:
            raise Temporary("vault_unavailable")
        entry = self._material.get(reference)
        if entry is None or not hmac.compare_digest(entry[0], organisation_id):
            return None
        return entry[2]

    def revoke(self, *, organisation_id, reference):
        entry = self._material.get(reference)
        if entry is not None and entry[0] == organisation_id:
            del self._material[reference]
