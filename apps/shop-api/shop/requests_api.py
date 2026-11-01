"""Public contact requests (prototype: POST /v1/requests -> Posteingang, returns Vorgangsnummer)."""
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

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
    kind: str = Field("contact", pattern="^(contact|partner)$")


async def notify(doc):
    subject, html, text = mail_templates.internal_request(doc)
    outbox = await mailer.enqueue("request:" + doc["number"], mailer.setting("MAIL_INTERNAL_TO"), subject, html, text, reply_to=doc["email"])
    return (outbox or {}).get("status", "not_configured")


@router.post("", status_code=201)
async def create_request(body: RequestIn, request: Request):
    email, errors = body.email.strip().lower(), {}
    if len(body.name.strip()) < 2:
        errors["name"] = "required"
    if not EMAIL.fullmatch(email):
        errors["email"] = "invalid"
    if len(body.message.strip()) < 10:
        errors["message"] = "too_short"
    if body.kind == "partner" and len(body.company.strip()) < 2:
        errors["company"] = "required"
    if not body.consent:
        errors["consent"] = "required"
    if errors:
        raise HTTPException(422, {"error": "request_invalid", "fields": errors})
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    if await db.requests.count_documents({"email": email, "created_at": {"$gte": since}}) >= HOURLY_LIMIT:
        raise HTTPException(429, {"error": "rate_limited", "message": "Zu viele Anfragen. Bitte versuchen Sie es später erneut."})
    number = "NX-%s-%s" % (datetime.now(timezone.utc).strftime("%Y%m%d"), secrets.token_hex(3).upper())
    doc = {"number": number, "name": body.name.strip(), "email": email, "company": body.company.strip(), "message": body.message.strip(),
           "page_path": body.page_path, "kind": body.kind, "status": "eingegangen", "created_at": now_iso()}
    await db.requests.insert_one(doc)
    status = await notify(doc)
    await db.requests.update_one({"number": number}, {"$set": {"notify_status": status}})
    return {"number": number, "status": "eingegangen"}
