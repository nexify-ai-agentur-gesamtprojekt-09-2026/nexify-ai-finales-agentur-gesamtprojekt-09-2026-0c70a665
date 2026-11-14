"""Outbox mailer (Resend): one outbox document per event key, idempotent; failures never touch orders/requests."""
import asyncio
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from dotenv import dotenv_values
from . import store
from .db import now_iso

ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"
MAX_ATTEMPTS = 5
CLAIM_LEASE_SECONDS = 300
transport = None  # tests inject httpx.MockTransport


def setting(name):
    value = os.environ.get(name)
    if value is None and ROOT_ENV.exists():
        value = dotenv_values(ROOT_ENV).get(name)
    return (value or "").strip()


def sender():
    full = setting("RESEND_FROM")
    if "<" in full:
        return full
    address = setting("RESEND_FROM_ADDRESS") or full
    return "TEILEKLAR <%s>" % address if address else ""


async def enqueue(event_key, to, subject, html, text, reply_to=""):
    """Queue once per event key and try to deliver immediately."""
    if not to:
        return None
    try:
        await store.outbox.add(event_key, to, subject, html, text, reply_to, now_iso())
    except store.AlreadyExists:
        return await store.outbox.summary(event_key)
    return await deliver(event_key)


async def deliver(event_key):
    claim_id = secrets.token_hex(16)
    claim = await store.outbox.claim(event_key, claim_id, now_iso(), MAX_ATTEMPTS)
    if not claim:
        return await store.outbox.summary(event_key)
    key, origin, cap = setting("RESEND_API_KEY"), sender(), setting("MAIL_DAILY_CAP")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not key or not origin:
        return await _finish(event_key, claim_id, "fehlgeschlagen", "not_configured", count=True)
    if cap.isdigit() and await store.outbox.count_sent_since(today) >= int(cap):
        return await _finish(event_key, claim_id, "zurückgestellt", "daily_cap_reached", count=False)
    payload = {"from": origin, "to": [claim["to"]], "subject": claim["subject"], "html": claim["html"], "text": claim["text"]}
    if claim.get("reply_to"):
        payload["reply_to"] = claim["reply_to"]
    # A stale preparation can be reclaimed. Only its current owner may start I/O.
    if not await store.outbox.start_sending(event_key, claim_id, now_iso()):
        return await store.outbox.summary(event_key)
    try:
        async with httpx.AsyncClient(timeout=20, transport=transport) as client:
            response = await client.post("https://api.resend.com/emails", json=payload,
                                         headers={"Authorization": "Bearer " + key, "Idempotency-Key": event_key[:256]})
    except httpx.HTTPError:
        return await _finish(event_key, claim_id, "abgleich_erforderlich", "transport_outcome_unknown", count=True)
    if response.status_code in (200, 201):
        await store.outbox.mark_sent(event_key, claim_id, now_iso(), response.json().get("id"))
        return await store.outbox.summary(event_key)
    # No provider rejection contract is established here; do not guess it is retry-safe.
    return await _finish(event_key, claim_id, "abgleich_erforderlich", "provider_http_%d" % response.status_code, count=True)


async def _finish(event_key, claim_id, status, error, count):
    await store.outbox.finish(event_key, claim_id, status, error, now_iso(), count_attempt=count, retry_safe=status == "fehlgeschlagen")
    return await store.outbox.summary(event_key)


async def retry_pending():
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=CLAIM_LEASE_SECONDS)).isoformat()
    # now_iso() writes UTC strings. Other representations cannot be ordered safely.
    await store.outbox.quarantine_unverifiable_claims()
    # Preparation has not reached the provider; a conditional transition fences the old worker.
    await store.outbox.release_stale_preparations(cutoff)
    # Sending may already have succeeded, including legacy claims with no timestamp.
    await store.outbox.quarantine_stale_sendings(cutoff)
    keys = await store.outbox.deliverable_keys(MAX_ATTEMPTS, 50)
    for key in keys:
        await deliver(key)
    return len(keys)


async def retry_loop():
    while True:
        await asyncio.sleep(300)
        try:
            from .checkout_api import recover_paid_mail_intents
            await recover_paid_mail_intents()
        except Exception:
            pass
        try:
            from .requests_api import recover_request_mail_intents
            await recover_request_mail_intents()
        except Exception:
            pass
        try:
            await retry_pending()
        except Exception:
            pass



async def delivery_status(event_key):
    """Read Resend's last event; acceptance is not delivery. Internal/admin use only."""
    doc = await store.outbox.get(event_key)
    if not doc:
        return None
    provider_id = doc.get("provider_id")
    if provider_id and setting("RESEND_API_KEY"):
        try:
            async with httpx.AsyncClient(timeout=10, transport=transport) as client:
                response = await client.get("https://api.resend.com/emails/" + provider_id,
                                            headers={"Authorization": "Bearer " + setting("RESEND_API_KEY")})
            if response.is_success:
                event = response.json().get("last_event")
                if event in {"sent", "delivered", "delivery_delayed", "bounced", "complained", "opened", "clicked", "failed"}:
                    await store.outbox.record_provider_event(event_key, event, now_iso())
                    doc["provider_event"] = event
        except (httpx.HTTPError, ValueError):
            pass
    return {"id": str(doc["_id"]), "status": doc["status"], "provider_id": provider_id,
            "provider_event": doc.get("provider_event"), "sent_at": doc.get("sent_at")}
