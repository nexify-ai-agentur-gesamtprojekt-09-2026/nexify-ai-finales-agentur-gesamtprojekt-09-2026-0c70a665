"""Checkout: address/shipping validation, immutable order snapshot, Revolut hosted checkout, webhook + readback."""
import hashlib
import json
import re
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from . import auth, fulfillment, mail_templates, mailer, pricing, revolut
from .cart_api import owner_for, priced
from .config import PUBLIC_ORIGIN
from .db import db, now_iso

router = APIRouter(prefix="/api/shop")
COUNTRIES = {"DE": r"\d{5}", "AT": r"\d{4}", "NL": r"\d{4} ?[A-Za-z]{2}", "BE": r"\d{4}", "LU": r"(L-)?\d{4}"}
PAID, OPEN, FAILED = "bezahlt", "zahlung_offen", "zahlung_nicht_abgeschlossen"
EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


class Address(BaseModel):
    first_name: str = Field("", max_length=80)
    last_name: str = Field("", max_length=80)
    street: str = Field("", max_length=120)
    zip: str = Field("", max_length=12)
    city: str = Field("", max_length=80)
    country: str = Field("DE", max_length=2)
    email: str = Field("", max_length=160)
    phone: str = Field("", max_length=40)


class CheckoutIn(BaseModel):
    address: Address
    shipping_method: str = "standard"
    accept_terms: bool = False
    quote_hash: str = ""


class QuoteIn(BaseModel):
    address: Address | None = None


def address_errors(a: Address):
    errors = {}
    for field in ("first_name", "last_name", "street", "zip", "city", "email"):
        if not getattr(a, field).strip():
            errors[field] = "required"
    if a.country not in COUNTRIES:
        errors["country"] = "unsupported"
    elif a.zip.strip() and not re.fullmatch(COUNTRIES[a.country], a.zip.strip()):
        errors["zip"] = "invalid"
    if a.email.strip() and not EMAIL.fullmatch(a.email.strip()):
        errors["email"] = "invalid"
    return errors


def quote_hash(quote):
    material = [(l["product_id"], l["quantity"], l["unit_cents"]) for l in quote["lines"]] + [quote["shipping_cents"], quote["total_cents"]]
    return hashlib.sha256(json.dumps(material).encode()).hexdigest()


@router.post("/checkout/validate-address")
async def validate_address(address: Address):
    errors = address_errors(address)
    if errors:
        raise HTTPException(422, {"error": "address_invalid", "fields": errors})
    return {"ok": True}


@router.get("/checkout/shipping-options")
async def shipping_options(request: Request, response: Response):
    quote = await priced((await owner_for(request, response, create=False)).owner or "none")
    return {"options": [{"id": "standard", "label": "Standardversand", "price_cents": quote["shipping_cents"] if quote["lines"] else 0}]}


@router.post("/checkout/quote")
async def checkout_quote(request: Request, response: Response, body: QuoteIn | None = None):
    ident = await owner_for(request, response, create=False)
    await require_price_release()
    address = body.address.model_dump() if body and body.address else None
    quote = await priced(ident.owner or "none", address=address)
    if not quote["lines"]:
        raise HTTPException(409, {"error": "cart_empty"})
    return {**quote, "quote_hash": quote_hash(quote)}


async def require_price_release():
    if not (await pricing.settings(db))["price_released"]:
        raise HTTPException(409, {"error": "price_not_released", "message": "Preis noch nicht freigegeben"})


TIMELINE = (("bestellt", "Bestellt", "created_at"), ("bezahlt", "Bezahlt", "paid_at"), ("in_bearbeitung", "In Bearbeitung", "processing_at"),
            ("versendet", "Versendet", "shipped_at"), ("zugestellt", "Zugestellt", "delivered_at"))


def timeline(order):
    return [{"id": key, "label": label, "reached": bool(order.get(field)), "at": order.get(field)} for key, label, field in TIMELINE]


async def send_paid_mails(order):
    try:
        subject, html, text = mail_templates.order_confirmation(order)
        customer = await mailer.enqueue("order_paid:customer:" + order["_id"], order["address"].get("email", ""), subject, html, text)
        subject, html, text = mail_templates.internal_new_order(order)
        internal = await mailer.enqueue("order_paid:internal:" + order["_id"], mailer.setting("MAIL_INTERNAL_TO"), subject, html, text, reply_to=order["address"].get("email", ""))
        if customer is not None and internal is not None:
            await db.orders.update_one({"_id": order["_id"], "status": PAID}, {"$set": {"paid_mail_intents_recorded": True, "paid_mail_recovery_pending": False}})
    except Exception:
        pass  # Leave the marker unset so a later reconciliation can retry safely.


async def recover_paid_mail_intents():
    """Recreate missing idempotent outbox intents, including after a process crash."""
    async for order in db.orders.find({"status": PAID, "paid_mail_recovery_pending": True}):
        await send_paid_mails(order)


def public_order(order):
    return {**{k: order.get(k) for k in ("id", "number", "status", "lines", "subtotal_cents", "shipping_cents", "total_cents", "vat_included_cents",
                                         "vat_percent", "currency", "address", "shipping_method", "created_at", "paid_at", "checkout_url", "payment_state",
                                         "fulfilment", "tracking_number", "carrier")}, "timeline": timeline(order)}


@router.post("/orders")
async def create_order(body: CheckoutIn, request: Request, response: Response, idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=16, max_length=80)):
    ident = await owner_for(request, response, create=False)
    if not ident.owner:
        raise HTTPException(409, {"error": "cart_empty"})
    existing = await db.orders.find_one({"owner": ident.owner, "idempotency_key": idempotency_key})
    if existing:
        return replay(existing)
    await require_price_release()
    errors = address_errors(body.address)
    if errors:
        raise HTTPException(422, {"error": "address_invalid", "fields": errors})
    if not body.accept_terms:
        raise HTTPException(422, {"error": "terms_not_accepted"})
    if body.shipping_method != "standard":
        raise HTTPException(422, {"error": "shipping_method_invalid"})
    quote = await priced(ident.owner, address=body.address.model_dump())
    if not quote["lines"]:
        raise HTTPException(409, {"error": "cart_empty"})
    if quote["changes"] or quote_hash(quote) != body.quote_hash:
        raise HTTPException(409, {"error": "changes_pending", "quote": {**quote, "quote_hash": quote_hash(quote)}})
    order_id = secrets.token_hex(12)
    number = "TK-" + datetime.now(timezone.utc).strftime("%Y%m%d") + "-" + secrets.token_hex(3).upper()
    order = {"_id": order_id, "id": order_id, "number": number, "owner": ident.owner, "user_id": ident.user_id, "idempotency_key": idempotency_key,
             "status": OPEN, "lines": quote["lines"], "subtotal_cents": quote["subtotal_cents"], "shipping_cents": quote["shipping_cents"],
             "total_cents": quote["total_cents"], "vat_included_cents": quote["vat_included_cents"], "vat_percent": quote["vat_percent"],
             "currency": "EUR", "address": body.address.model_dump(), "shipping_method": "standard", "terms_accepted_at": now_iso(),
             "created_at": now_iso(), "revolut_mode": revolut.config.revolut_mode(), "paid_transitions": 0}
    try:
        await db.orders.insert_one(order)
    except DuplicateKeyError:
        return replay(await db.orders.find_one({"owner": ident.owner, "idempotency_key": idempotency_key}))
    try:
        await revolut.ensure_webhook(db)
        created = await revolut.create_order(order["total_cents"], "EUR", number, "TEILEKLAR Bestellung " + number, body.address.email.strip(),
                                             PUBLIC_ORIGIN + "/teileklar/bestellung/" + order_id)
    except revolut.RevolutError as error:
        await db.orders.update_one({"_id": order_id}, {"$set": {"status": FAILED, "payment_error": error.code}})
        raise HTTPException(502, {"error": "payment_provider_unavailable", "order_id": order_id}) from None
    await db.orders.update_one({"_id": order_id}, {"$set": {"revolut_order_id": created["id"], "checkout_url": created.get("checkout_url"), "payment_state": created.get("state")}})
    return {"order_id": order_id, "number": number, "checkout_url": created.get("checkout_url")}


def replay(order):
    if not order.get("checkout_url"):
        raise HTTPException(409, {"error": "order_in_progress" if order["status"] == OPEN else "order_payment_failed", "order_id": order["_id"]})
    return {"order_id": order["_id"], "number": order["number"], "checkout_url": order["checkout_url"]}


async def sync_payment(order):
    """Read the authoritative Revolut state; exactly one atomic transition to paid."""
    if order.get("status") == PAID:
        if order.get("paid_mail_recovery_pending"):
            await send_paid_mails(order)
        return order
    if not order.get("revolut_order_id"):
        return order
    state = (await revolut.retrieve_order(order["revolut_order_id"])).get("state")
    await db.orders.update_one({"_id": order["_id"]}, {"$set": {"payment_state": state}})
    if state == "completed":
        updated = await db.orders.find_one_and_update({"_id": order["_id"], "status": {"$ne": PAID}},
                                                      {"$set": {"status": PAID, "paid_at": now_iso(), "paid_mail_recovery_pending": True}, "$inc": {"paid_transitions": 1}})
        if updated:
            paid_ids = [l["product_id"] for l in order["lines"]]
            await db.carts.update_one({"owner": order["owner"]}, {"$pull": {"items": {"product_id": {"$in": paid_ids}}}})
        current = await db.orders.find_one({"_id": order["_id"]})
        if current and current.get("status") == PAID and current.get("paid_mail_recovery_pending"):
            await send_paid_mails(current)
        try:
            await fulfillment.submit_order(current)
        except Exception:
            pass
    elif state in ("cancelled", "failed") and order.get("status") == OPEN:
        await db.orders.update_one({"_id": order["_id"], "status": OPEN}, {"$set": {"status": FAILED}})
    return await db.orders.find_one({"_id": order["_id"]})


@router.get("/orders/{order_id}")
async def read_order(order_id: str, request: Request):
    ident = await auth.identity(request)
    owners = [o for o in (ident.user_id and "user:" + ident.user_id, ident.guest_id and "guest:" + ident.guest_id) if o]
    order = await db.orders.find_one({"_id": order_id, "owner": {"$in": owners}}) if owners else None
    if not order:
        raise HTTPException(404, {"error": "order_not_found"})
    try:
        order = await sync_payment(order)
    except revolut.RevolutError:
        pass
    return public_order(order)


@router.get("/orders")
async def list_orders(request: Request):
    ident = await auth.identity(request)
    if not ident.user_id:
        raise HTTPException(401, {"error": "authentication_required"})
    rows = db.orders.find({"owner": "user:" + ident.user_id}).sort("created_at", -1).limit(100)
    return {"orders": [{k: o.get(k) for k in ("id", "number", "status", "total_cents", "currency", "created_at", "paid_at")} | {"items": sum(l["quantity"] for l in o["lines"])} async for o in rows]}


@router.post("/webhooks/revolut")
async def revolut_webhook(request: Request, signature: str = Header("", alias="Revolut-Signature"), timestamp: str = Header("", alias="Revolut-Request-Timestamp")):
    raw = await request.body()
    hooks = [h async for h in db.revolut_webhooks.find({})]
    if not any(revolut.verify_signature(raw, timestamp, signature, h.get("signing_secret")) for h in hooks):
        raise HTTPException(401, {"error": "invalid_signature"})
    try:
        event = json.loads(raw)
    except ValueError:
        raise HTTPException(400, {"error": "invalid_json"}) from None
    key = hashlib.sha256(raw).hexdigest()
    try:
        await db.webhook_events.insert_one({"event_key": key, "event": event.get("event"), "order_id": event.get("order_id"), "received_at": now_iso()})
    except DuplicateKeyError:
        pass
    order = await db.orders.find_one({"revolut_order_id": event.get("order_id")}) if event.get("order_id") else None
    if order:
        try:
            await sync_payment(order)
        except revolut.RevolutError:
            raise HTTPException(503, {"error": "readback_unavailable"}) from None
    return Response(status_code=204)
