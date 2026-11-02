"""NeXify inbound: contact, project briefing (draft + submit), appointment wish, partner, care, visibility, TEILEKLAR support.
Success (Vorgangskennung) only after durable persistence. Same Idempotency-Key replays; unknown outcome is recoverable via /status."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from shop import mailer, mail_templates
from shop.accounts_api import session_user
from shop.db import db
from .common import EMAIL, IDEM, now_iso, payload_hash, new_id

router = APIRouter(prefix="/api/requests")
KINDS = {"contact": "NX", "briefing": "NB", "appointment": "NT", "partner": "TP", "care": "NC", "visibility": "NS",
         "tk_support": "TS", "tk_parts": "TA", "oracle": "NO", "api_access": "NA"}
BRAND = {"partner": "teileklar", "tk_support": "teileklar", "tk_parts": "teileklar"}
HOURLY_LIMIT = 8


async def ensure_indexes():
    await db.inbound.create_index("idem_hash", unique=True)
    await db.inbound.create_index([("email", 1), ("created_at", -1)])
    await db.briefing_drafts.create_index("draft_id", unique=True)


class InboundIn(BaseModel):
    kind: str = Field("contact", max_length=20)
    name: str = Field("", max_length=100)
    email: str = Field("", max_length=160)
    company: str = Field("", max_length=120)
    phone: str = Field("", max_length=40)
    purpose: str = Field("", max_length=80)
    message: str = Field("", max_length=6000)
    details: dict = Field(default_factory=dict)
    consent: bool = False
    marketing_opt_in: bool = False
    page_path: str = Field("", max_length=200)


def validate(body: InboundIn):
    errors = {}
    if body.kind not in KINDS:
        errors["kind"] = "invalid"
    if len(body.name.strip()) < 2:
        errors["name"] = "required"
    if not EMAIL.fullmatch(body.email.strip()):
        errors["email"] = "invalid" if body.email.strip() else "required"
    if body.kind in ("contact", "briefing", "partner", "care", "tk_support", "tk_parts", "oracle", "api_access") and len(body.message.strip()) < 10:
        errors["message"] = "too_short" if body.message.strip() else "required"
    if body.kind == "partner" and len(body.company.strip()) < 2:
        errors["company"] = "required"
    if body.kind == "appointment" and not ((body.details or {}).get("preferred") or (body.details or {}).get("x_preferred")):
        errors["preferred"] = "required"
    if not body.consent:
        errors["consent"] = "required"
    return errors


async def notify(doc):
    try:
        mdoc = {**doc, "message": doc.get("message") or "(siehe Details)"}
        subject, html, text = mail_templates.internal_request(mdoc)
        outbox = await mailer.enqueue("inbound:" + doc["number"], mailer.setting("MAIL_INTERNAL_TO"), subject, html, text, reply_to=doc["email"])
        await db.inbound.update_one({"number": doc["number"]}, {"$set": {"notify_status": (outbox or {}).get("status", "nicht_konfiguriert")}})
    except Exception:
        pass  # persisted request stays valid; notification can be retried by the team


def public(doc):
    return {"number": doc["number"], "status": doc["status"], "kind": doc["kind"], "created_at": doc["created_at"], "brand": doc.get("brand", "nexify")}


@router.post("", status_code=201)
async def create(body: InboundIn, request: Request, idempotency_key: str | None = Header(default=None)):
    errors = validate(body)
    if errors:
        raise HTTPException(422, {"error": "request_invalid", "fields": errors})
    if not idempotency_key or not IDEM.fullmatch(idempotency_key):
        raise HTTPException(400, {"error": "idempotency_key_required"})
    email = body.email.strip().lower()
    payload = {**body.model_dump(), "email": email, "name": body.name.strip(), "message": body.message.strip()}
    phash = payload_hash(payload)
    ihash = payload_hash({"k": idempotency_key})
    existing = await db.inbound.find_one({"idem_hash": ihash})
    if existing:
        if existing["payload_hash"] != phash:
            raise HTTPException(409, {"error": "idempotency_conflict", "message": "Diese Übermittlung wurde bereits mit anderem Inhalt gespeichert."})
        return {**public(existing), "replayed": True}
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    if await db.inbound.count_documents({"email": email, "created_at": {"$gte": since}}) >= HOURLY_LIMIT:
        raise HTTPException(429, {"error": "rate_limited", "message": "Zu viele Anfragen in kurzer Zeit. Bitte später erneut versuchen."})
    user = await session_user(request)
    number = "%s-%s-%s" % (KINDS[body.kind], datetime.now(timezone.utc).strftime("%Y%m%d"), ihash[:6].upper())
    doc = {**payload, "idem_hash": ihash, "payload_hash": phash, "number": number, "brand": BRAND.get(body.kind, "nexify"),
           "status": "eingegangen", "qualification": "offen", "owner": "Pascal Courbois", "next_step": "Erstsichtung",
           "user_id": user and user["user_id"], "created_at": now_iso()}
    try:
        await db.inbound.insert_one(doc)
    except DuplicateKeyError:
        existing = await db.inbound.find_one({"idem_hash": ihash})
        return {**public(existing), "replayed": True}
    if body.details.get("draft_id"):
        await db.briefing_drafts.update_one({"draft_id": body.details["draft_id"]}, {"$set": {"submitted_number": number}})
    await notify(doc)
    return public(doc)


@router.get("/status")
async def status(idempotency_key: str = Header(..., alias="Idempotency-Key")):
    """Recovery after timeout: same key reveals whether the submission was stored."""
    doc = await db.inbound.find_one({"idem_hash": payload_hash({"k": idempotency_key})})
    if not doc:
        return {"stored": False}
    return {"stored": True, **public(doc)}


class DraftIn(BaseModel):
    draft_id: str | None = Field(None, max_length=40)
    step: int = Field(0, ge=0, le=10)
    data: dict = Field(default_factory=dict)


@router.put("/briefing-draft")
async def save_draft(body: DraftIn):
    draft_id = body.draft_id or new_id("draft")
    await db.briefing_drafts.update_one({"draft_id": draft_id}, {"$set": {"step": body.step, "data": body.data, "updated_at": now_iso()},
                                                                "$setOnInsert": {"created_at": now_iso()}}, upsert=True)
    return {"draft_id": draft_id, "saved_at": now_iso(), "status": "entwurf"}


@router.get("/briefing-draft/{draft_id}")
async def read_draft(draft_id: str):
    doc = await db.briefing_drafts.find_one({"draft_id": draft_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, {"error": "draft_not_found"})
    return doc


@router.get("/mine")
async def mine(request: Request):
    user = await session_user(request)
    if not user:
        raise HTTPException(401, {"error": "authentication_required"})
    rows = db.inbound.find({"$or": [{"user_id": user["user_id"]}, {"email": user["email"]}]}).sort("created_at", -1).limit(50)
    return {"items": [public(r) | {"next_step": r.get("next_step"), "qualification": r.get("qualification")} async for r in rows]}


@router.get("/admin/all")
async def admin_all(request: Request):
    user = await session_user(request)
    if not user or user.get("role") != "admin":
        raise HTTPException(403, {"error": "admin_required"})
    rows = db.inbound.find({}, {"_id": 0, "idem_hash": 0, "payload_hash": 0}).sort("created_at", -1).limit(200)
    return {"items": [r async for r in rows]}
