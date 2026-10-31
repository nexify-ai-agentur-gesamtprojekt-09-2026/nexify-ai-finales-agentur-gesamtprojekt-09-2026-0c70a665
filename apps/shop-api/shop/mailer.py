"""Outbox mailer (Resend): one outbox document per event key, idempotent; failures never touch orders/requests."""
import asyncio
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from dotenv import dotenv_values
from pymongo.errors import DuplicateKeyError

from .db import db, now_iso

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
        await db.outbox.insert_one({"_id": event_key, "to": to, "subject": subject, "html": html, "text": text, "reply_to": reply_to,
                                    "status": "wartend", "attempts": 0, "created_at": now_iso()})
    except DuplicateKeyError:
        return await db.outbox.find_one({"_id": event_key}, {"html": 0, "text": 0})
    return await deliver(event_key)


async def deliver(event_key):
    claim_id = secrets.token_hex(16)
    claim = await db.outbox.find_one_and_update({"_id": event_key, "$or": [{"status": {"$in": ["wartend", "zurückgestellt"]}}, {"status": "fehlgeschlagen", "retry_safe": True}], "attempts": {"$lt": MAX_ATTEMPTS}},
                                                {"$set": {"status": "wird_vorbereitet", "claimed_at": now_iso(), "claim_id": claim_id}})
    if not claim:
        return await db.outbox.find_one({"_id": event_key}, {"html": 0, "text": 0})
    key, origin, cap = setting("RESEND_API_KEY"), sender(), setting("MAIL_DAILY_CAP")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not key or not origin:
        return await _finish(event_key, claim_id, "fehlgeschlagen", "not_configured", count=True)
    if cap.isdigit() and await db.outbox.count_documents({"status": "gesendet", "sent_at": {"$gte": today}}) >= int(cap):
        return await _finish(event_key, claim_id, "zurückgestellt", "daily_cap_reached", count=False)
    payload = {"from": origin, "to": [claim["to"]], "subject": claim["subject"], "html": claim["html"], "text": claim["text"]}
    if claim.get("reply_to"):
        payload["reply_to"] = claim["reply_to"]
    # A stale preparation can be reclaimed. Only its current owner may start I/O.
    started = await db.outbox.find_one_and_update(
        {"_id": event_key, "status": "wird_vorbereitet", "claim_id": claim_id},
        {"$set": {"status": "wird_gesendet", "claimed_at": now_iso()}})
    if not started:
        return await db.outbox.find_one({"_id": event_key}, {"html": 0, "text": 0})
    try:
        async with httpx.AsyncClient(timeout=20, transport=transport) as client:
            response = await client.post("https://api.resend.com/emails", json=payload,
                                         headers={"Authorization": "Bearer " + key, "Idempotency-Key": event_key[:256]})
    except httpx.HTTPError:
        return await _finish(event_key, claim_id, "abgleich_erforderlich", "transport_outcome_unknown", count=True)
    if response.status_code in (200, 201):
        await db.outbox.update_one({"_id": event_key, "status": "wird_gesendet", "claim_id": claim_id}, {"$set": {"status": "gesendet", "sent_at": now_iso(), "provider_id": response.json().get("id")}, "$inc": {"attempts": 1}})
        return await db.outbox.find_one({"_id": event_key}, {"html": 0, "text": 0})
    # A server error or timeout response does not prove that the provider did not accept it.
    uncertain = response.status_code >= 500 or response.status_code in (408, 409, 429)
    return await _finish(event_key, claim_id, "abgleich_erforderlich" if uncertain else "fehlgeschlagen", "provider_http_%d" % response.status_code, count=True)


async def _finish(event_key, claim_id, status, error, count):
    update = {"$set": {"status": status, "last_error": error, "updated_at": now_iso(), "retry_safe": status == "fehlgeschlagen"}}
    if count:
        update["$inc"] = {"attempts": 1}
    await db.outbox.update_one({"_id": event_key, "claim_id": claim_id, "status": {"$in": ["wird_vorbereitet", "wird_gesendet"]}}, update)
    return await db.outbox.find_one({"_id": event_key}, {"html": 0, "text": 0})


async def retry_pending():
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=CLAIM_LEASE_SECONDS)).isoformat()
    # Preparation has not reached the provider; a conditional transition fences the old worker.
    await db.outbox.update_many({"status": "wird_vorbereitet", "claimed_at": {"$lt": cutoff}},
                                {"$set": {"status": "wartend", "last_error": "preparation_lease_expired"}})
    # Sending may already have succeeded, including legacy claims with no timestamp.
    await db.outbox.update_many({"status": "wird_gesendet", "$or": [{"claimed_at": {"$lt": cutoff}}, {"claimed_at": {"$exists": False}}]},
                                {"$set": {"status": "abgleich_erforderlich", "last_error": "delivery_outcome_unknown"}})
    keys = [d["_id"] async for d in db.outbox.find({"$or": [{"status": {"$in": ["zurückgestellt", "wartend"]}}, {"status": "fehlgeschlagen", "retry_safe": True}], "attempts": {"$lt": MAX_ATTEMPTS}}, {"_id": 1}).limit(50)]
    for key in keys:
        await deliver(key)
    return len(keys)


async def retry_loop():
    while True:
        await asyncio.sleep(300)
        try:
            await retry_pending()
        except Exception:
            pass
