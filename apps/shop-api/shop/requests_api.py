"""Public contact requests (prototype: POST /v1/requests -> Posteingang, returns Vorgangsnummer)."""
import re
import hashlib
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from . import mail_templates, mailer
from .db import db, now_iso

router = APIRouter(prefix="/api/requests")
EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
HOURLY_LIMIT = 5


class RequestIn(BaseModel):
    name: str = Field(max_length=100)
    email: str = Field(max_length=160)
    company: str = Field("", max_length=120)
    message: str = Field(max_length=4000)
    consent: bool = False
    page_path: str = Field("", max_length=200)
    kind: str = Field("contact", pattern="^(contact|partner|project|demo|integration|workshop_partner|booking)$")
    service: str = Field("", max_length=80)
    budget: str = Field("", max_length=60)
    timeline: str = Field("", max_length=60)
    phone: str = Field("", max_length=40)


async def notify(doc):
    subject, html, text = mail_templates.internal_request(doc)
    # New records use their unique durable identity; keep the historical outbox key for legacy records.
    event_key = doc["_id"] if doc.get("payload_hash") else "request:" + doc["number"]
    outbox = await mailer.enqueue(event_key, mailer.setting("MAIL_INTERNAL_TO"), subject, html, text, reply_to=doc["email"])
    return (outbox or {}).get("status", "not_configured")


async def _requester(request):
    from .accounts_api import session_user
    user = await session_user(request)
    return user["user_id"] if user else None


class RequestReceipt(BaseModel):
    number: str
    status: str
    notification_status: str


def receipt(doc):
    return RequestReceipt(number=doc["number"], status=doc["status"],
                          notification_status=doc.get("notify_status", "wartend"))


@router.post("", status_code=201, response_model=RequestReceipt)
async def create_request(body: RequestIn, request: Request, idempotency_key: str | None = Header(default=None)):
    email, errors = body.email.strip().lower(), {}
    if len(body.name.strip()) < 2:
        errors["name"] = "required"
    if not EMAIL.fullmatch(email):
        errors["email"] = "invalid"
    if len(body.message.strip()) < 10:
        errors["message"] = "too_short"
    if body.kind in ("partner", "workshop_partner") and len(body.company.strip()) < 2:
        errors["company"] = "required"
    if not body.consent:
        errors["consent"] = "required"
    if errors:
        raise HTTPException(422, {"error": "request_invalid", "fields": errors})
    if not isinstance(idempotency_key, str) or not re.fullmatch(r"[A-Za-z0-9_-]{16,128}", idempotency_key):
        raise HTTPException(400, {"error": "idempotency_key_required"})
    payload = {"name": body.name.strip(), "email": email, "company": body.company.strip(),
               "message": body.message.strip(), "page_path": body.page_path, "kind": body.kind, "consent": True,
               "service": body.service.strip(), "budget": body.budget.strip(), "timeline": body.timeline.strip(), "phone": body.phone.strip()}
    payload_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
    request_id = "request:" + hashlib.sha256(idempotency_key.encode()).hexdigest()
    existing = await db.requests.find_one({"_id": request_id})
    if existing:
        return replay_request(existing, payload_hash)
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    if await db.requests.count_documents({"email": email, "created_at": {"$gte": since}}) >= HOURLY_LIMIT:
        raise HTTPException(429, {"error": "rate_limited", "message": "Zu viele Anfragen. Bitte versuchen Sie es später erneut."})
    number = "NX-%s-%s" % (datetime.now(timezone.utc).strftime("%Y%m%d"), request_id.split(":", 1)[1][:24].upper())
    # Request and durable notification intent are one atomic Mongo document.
    doc = {"_id": request_id, **payload, "payload_hash": payload_hash, "number": number,
           "status": "eingegangen", "stage": "lead", "user_id": await _requester(request), "created_at": now_iso(), "notify_recovery_pending": True, "notify_status": "wartend"}
    try:
        await db.requests.insert_one(doc)
    except DuplicateKeyError:
        existing = await db.requests.find_one({"_id": request_id})
        if not existing:
            raise HTTPException(503, {"error": "request_readback_unavailable"})
        return replay_request(existing, payload_hash)
    await record_notification(doc)
    return receipt(await db.requests.find_one({"_id": request_id}) or doc)


def replay_request(existing, payload_hash):
    if existing.get("payload_hash") != payload_hash:
        raise HTTPException(409, {"error": "idempotency_conflict"})
    return receipt(existing)


async def record_notification(doc):
    try:
        status = await notify(doc)
        if status != "not_configured":
            await db.requests.update_one({"_id": doc["_id"]}, {"$set": {"notify_status": status, "notify_recovery_pending": False}})
    except Exception:
        # Persistence already succeeded. Keep the intent for recovery, never ask for a new request.
        return


async def recover_request_mail_intents():
    docs = [doc async for doc in db.requests.find({"notify_recovery_pending": True}).limit(50)]
    for doc in docs:
        await record_notification(doc)
    return len(docs)
