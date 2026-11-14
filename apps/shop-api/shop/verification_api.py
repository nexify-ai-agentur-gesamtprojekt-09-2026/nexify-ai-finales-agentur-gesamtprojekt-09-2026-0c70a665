"""E-mail confirmation for accounts (config/selfservice-policy.json: registration.email_verification_required).

Behind two switches, both must be exactly "on": NEXIFY_SUITE and NEXIFY_SUITE_EMAIL_VERIFICATION. Off (the
default) means: no token is created, no mail is queued and both routes answer 404, i.e. today's behaviour.

A token is random, single-use, time-limited and stored only as SHA-256 digest. Delivery is a port
(`VerificationMailer`). The adapter below uses the existing outbox mailer, but only with a dedicated NeXify
sender (NEXIFY_MAIL_FROM); without it nothing is sent rather than sending under the shop's sender name.
"""
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from html import escape
from typing import Protocol

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from . import config, mailer
from .db import db, now_iso

router = APIRouter(prefix="/api/auth")
# Technical parameters, aligned with the existing password reset (60 minutes, single use).
TOKEN_TTL = timedelta(minutes=60)
RESEND_WINDOW = timedelta(hours=1)
RESEND_MAX_PER_WINDOW = 3
RESEND_MIN_INTERVAL = timedelta(seconds=60)
VERIFY_PATH = "/konto/email-bestaetigen"
SUBJECT = "Bitte bestätigen Sie Ihre E-Mail-Adresse"
COMPANY = "NeXify AI FACTORY"
CONTACT = "mail@nexifyai.cloud"


def enabled(env=None):
    values = os.environ if env is None else env
    return values.get("NEXIFY_SUITE") == "on" and values.get("NEXIFY_SUITE_EMAIL_VERIFICATION") == "on"


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def message(link):
    """Short and factual. No offer, no promise, no deadline beyond the technical validity of the link."""
    minutes = int(TOKEN_TTL.total_seconds() // 60)
    lines = ["Guten Tag,",
             "für diese E-Mail-Adresse wurde ein Konto bei %s angelegt. Bitte bestätigen Sie die Adresse über diesen Link:" % COMPANY,
             link,
             "Der Link ist %d Minuten gültig und kann einmal verwendet werden. Wenn Sie kein Konto angelegt haben, können Sie diese Nachricht ignorieren." % minutes,
             "%s\nKontakt: %s" % (COMPANY, CONTACT)]
    text = "\n\n".join(lines)
    html = '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>%s</title></head><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#14191C;">%s</body></html>' % (
        escape(SUBJECT), "".join('<p><a href="%s">%s</a></p>' % (escape(line), escape(line)) if line == link
                                 else "<p>%s</p>" % escape(line).replace("\n", "<br>") for line in lines))
    return SUBJECT, html, text


class VerificationMailer(Protocol):
    async def send_verification(self, *, to: str, link: str, event_key: str) -> str: ...


class OutboxVerificationMailer:
    """Existing delivery path (outbox + Resend) with a NeXify sender. Returns the outbox status."""

    async def send_verification(self, *, to, link, event_key):
        sender = mailer.setting("NEXIFY_MAIL_FROM")
        if not sender:
            return "not_configured"
        subject, html, text = message(link)
        outbox = await mailer.enqueue(event_key, to, subject, html, text, sender=sender)
        return (outbox or {}).get("status") or "unknown"


delivery: VerificationMailer = OutboxVerificationMailer()  # tests replace this with a stand-in


async def ensure_verification_indexes(database=None):
    d = database if database is not None else db
    await d.email_verifications.create_index("token_hash", unique=True)
    await d.email_verifications.create_index("expires_at", expireAfterSeconds=int(RESEND_WINDOW.total_seconds()))


async def issue(user):
    """Create a fresh token for the account's current address and hand the link to the mail port.
    Never raises: a delivery problem must not break registration; the state is recorded instead."""
    if not enabled() or user.get("email_verified") is True:
        return None
    now = datetime.now(timezone.utc)
    token = secrets.token_urlsafe(32)
    # Earlier links stop working: at most one usable token per account.
    await db.email_verifications.update_many({"user_id": user["user_id"], "used": False}, {"$set": {"used": True, "superseded": True}})
    await db.email_verifications.insert_one({"token_hash": digest(token), "user_id": user["user_id"], "email_hash": digest(user["email"]),
                                             "used": False, "created_at": now, "expires_at": now + TOKEN_TTL})
    try:
        status = await delivery.send_verification(to=user["email"], link=config.PUBLIC_ORIGIN + VERIFY_PATH + "?token=" + token,
                                                  event_key="verify:" + digest(token))
    except Exception:
        status = "delivery_failed"
    await db.email_verifications.update_one({"token_hash": digest(token)}, {"$set": {"mail_status": status}})
    return status


class VerifyIn(BaseModel):
    token: str = Field(min_length=20, max_length=128)


@router.post("/verify-email")
async def verify_email(body: VerifyIn):
    if not enabled():
        raise HTTPException(404, {"error": "not_found"})
    invalid = HTTPException(400, {"error": "token_invalid", "message": "Der Link ist ungültig oder abgelaufen."})
    # Claiming the token is one atomic step: a second use, also a concurrent one, finds nothing.
    record = await db.email_verifications.find_one_and_update(
        {"token_hash": digest(body.token), "used": False, "expires_at": {"$gt": datetime.now(timezone.utc)}}, {"$set": {"used": True, "used_at": now_iso()}})
    if not record:
        raise invalid
    user = await db.users.find_one({"user_id": record["user_id"]})
    # The token confirms the address it was sent to, not whatever the account holds now.
    if not user or digest(user["email"]) != record["email_hash"]:
        raise invalid
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"email_verified": True, "email_verified_at": now_iso()}})
    return {"ok": True}


@router.post("/verify-email/resend")
async def resend_verification(request: Request):
    if not enabled():
        raise HTTPException(404, {"error": "not_found"})
    from .accounts_api import session_user
    user = await session_user(request)
    if not user:
        raise HTTPException(401, {"error": "authentication_required"})
    if user.get("email_verified") is True:
        return {"ok": True, "status": "already_verified"}
    now = datetime.now(timezone.utc)
    recent = await db.email_verifications.find({"user_id": user["user_id"], "created_at": {"$gte": now - RESEND_WINDOW}}).sort("created_at", -1).to_list(RESEND_MAX_PER_WINDOW + 1)
    newest = recent[0]["created_at"] if recent else None
    if newest is not None and newest.tzinfo is None:
        newest = newest.replace(tzinfo=timezone.utc)
    if len(recent) >= RESEND_MAX_PER_WINDOW or (newest is not None and now - newest < RESEND_MIN_INTERVAL):
        raise HTTPException(429, {"error": "rate_limited", "message": "Bitte warten Sie, bevor Sie eine weitere Bestätigungsmail anfordern."})
    await issue(user)
    # Same answer whether or not delivery worked; the outbox retries and the state is in the record.
    return {"ok": True, "status": "requested"}
