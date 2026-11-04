"""Quote drafts (Angebotsentwurf) for signed-in accounts, ported from apps/agent-gateway.

A draft records the visitor's project description, renders a small text-only PDF and can be
mailed to the account's own address plus the internal inbox through the existing outbox.
It never contains prices: price, taxes, final scope and provider details stay "zur Freigabe"
until the owner releases them (AGENTS.md: prices only from the approved sources).
"""
import hashlib
import re
import secrets
import textwrap
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field

from . import mail_templates, mailer
from .accounts_api import session_user
from .db import db, now_iso

router = APIRouter(prefix="/api/quotes")
HOURLY_LIMIT = 10
LOCALES = ("de", "nl", "fr", "en")
DRAFT_STATE = "draft_price_review_required"
QUOTE_ID = re.compile(r"[a-f0-9]{32}")
# Stored in the provisioned `requests` collection (kind quote_draft): the shop namespace has a
# fixed, validated collection set, so no new collection or index is introduced.
KIND = "quote_draft"


class QuoteIn(BaseModel):
    title: str = Field(max_length=160)
    details: str = Field(max_length=3000)
    locale: str = Field("de", max_length=2)


async def require_user(request):
    user = await session_user(request)
    if not user:
        raise HTTPException(401, {"error": "authentication_required", "sign_in_path": "/anmelden"})
    return user


def public_quote(doc):
    return {"id": doc["id"], "title": doc["title"], "details": doc["details"], "locale": doc["locale"],
            "state": doc["state"], "created_at": doc["created_at"], "sent_at": doc.get("sent_at"),
            "download_url": "/api/quotes/%s/pdf" % doc["id"]}


def make_pdf(quote):
    """Small real PDF, fixed font and bounded text; never embeds markup or JavaScript."""
    rows = ["NeXify AI - Angebotsentwurf", "ENTWURF - NICHT VERBINDLICH", "", quote["title"], "", "Leistungsumfang / Ihr Vorhaben"]
    for paragraph in quote["details"].splitlines():
        rows.extend(textwrap.wrap(paragraph, width=88) or [""])
    rows += ["", "Nicht enthalten: noch gemeinsam abzugrenzen.", "Zeitrahmen und Abhaengigkeiten: noch nicht vereinbart.",
             "Preise, Steuern, finaler Umfang und Anbieterangaben: zur Freigabe.",
             "Keine zahlungspflichtige Annahme. Dieser Entwurf ist keine Rechnung.", "Referenz: " + quote["id"]]
    pages = [rows[i:i + 44] for i in range(0, len(rows), 44)]
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>", b"", b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]
    page_refs = []
    for group in pages:
        page_id, stream_id = len(objects) + 1, len(objects) + 2
        page_refs.append(f"{page_id} 0 R")
        content = "BT /F1 11 Tf 50 790 Td 16 TL\n"
        for row in group:
            escaped = row.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            content += "(" + escaped + ") Tj T*\n"
        content += "ET"
        stream = content.encode("cp1252", "replace")
        objects.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents {stream_id} 0 R >>".encode())
        objects.append(b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream")
    objects[1] = ("<< /Type /Pages /Kids [" + " ".join(page_refs) + "] /Count " + str(len(pages)) + " >>").encode()
    output, offsets = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"), [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = len(output)
    output.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode())
    output.extend(f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return bytes(output)


async def own_quote(user, quote_id):
    if not QUOTE_ID.fullmatch(quote_id):
        raise HTTPException(404, {"error": "quote_not_found"})
    doc = await db.requests.find_one({"kind": KIND, "id": quote_id, "owner": user["user_id"]})
    if not doc:
        raise HTTPException(404, {"error": "quote_not_found"})
    return doc


@router.post("", status_code=201)
async def create_quote(body: QuoteIn, request: Request, idempotency_key: str | None = Header(default=None)):
    user = await require_user(request)
    title, details, errors = body.title.strip(), body.details.strip(), {}
    if len(title) < 3:
        errors["title"] = "too_short"
    if len(details) < 10:
        errors["details"] = "too_short"
    if body.locale not in LOCALES:
        errors["locale"] = "unsupported"
    if errors:
        raise HTTPException(422, {"error": "quote_invalid", "fields": errors})
    if not isinstance(idempotency_key, str) or not re.fullmatch(r"[A-Za-z0-9_-]{16,128}", idempotency_key):
        raise HTTPException(400, {"error": "idempotency_key_required"})
    key = "quote:" + hashlib.sha256((user["user_id"] + ":" + idempotency_key).encode()).hexdigest()
    existing = await db.requests.find_one({"_id": key})
    if existing:
        if (existing["title"], existing["details"], existing["locale"]) != (title, details, body.locale):
            raise HTTPException(409, {"error": "idempotency_key_reused"})
        return public_quote(existing)
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    if await db.requests.count_documents({"kind": KIND, "owner": user["user_id"], "created_at": {"$gte": since}}) >= HOURLY_LIMIT:
        raise HTTPException(429, {"error": "quote_rate_limited"})
    doc = {"_id": key, "kind": KIND, "id": secrets.token_hex(16), "owner": user["user_id"], "title": title, "details": details,
           "locale": body.locale, "state": DRAFT_STATE, "created_at": now_iso()}
    await db.requests.insert_one(doc)
    return public_quote(doc)


@router.get("")
async def list_quotes(request: Request):
    user = await require_user(request)
    docs = await db.requests.find({"kind": KIND, "owner": user["user_id"]}).sort("created_at", -1).to_list(20)
    return {"items": [public_quote(doc) for doc in docs]}


@router.get("/{quote_id}/pdf")
async def quote_pdf(quote_id: str, request: Request):
    user = await require_user(request)
    doc = await own_quote(user, quote_id)
    return Response(make_pdf(doc), media_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="NeXify-Angebotsentwurf.pdf"', "Cache-Control": "private, no-store"})


@router.post("/{quote_id}/send")
async def send_quote(quote_id: str, request: Request):
    """Mail the draft to the account's own address and the internal inbox (never to a typed-in address)."""
    user = await require_user(request)
    doc = await own_quote(user, quote_id)
    subject, html, text = mail_templates.quote_draft(doc)
    customer = await mailer.enqueue("quote-customer:" + doc["id"], user["email"], subject, html, text)
    subject, html, text = mail_templates.internal_quote(doc, user["email"])
    await mailer.enqueue("quote-internal:" + doc["id"], mailer.setting("MAIL_INTERNAL_TO"), subject, html, text, reply_to=user["email"])
    delivery = (customer or {}).get("status", "not_configured")
    # Only a confirmed provider hand-off counts as sent; queued, deferred or failed mail does not.
    update = {"delivery_status": delivery}
    if delivery == "gesendet" and not doc.get("sent_at"):
        update["sent_at"] = doc["sent_at"] = now_iso()
    await db.requests.update_one({"_id": doc["_id"]}, {"$set": update})
    return {"quote": public_quote(doc), "delivery": delivery}
