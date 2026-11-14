"""Revolut Merchant API: hosted checkout orders, webhook registration, signature verification."""
import hashlib
import hmac
import os
import time
import uuid

import httpx

from . import config, store
from .db import now_iso

BASES = {"live": "https://merchant.revolut.com", "sandbox": "https://sandbox-merchant.revolut.com"}
WEBHOOK_EVENTS = ["ORDER_COMPLETED", "ORDER_AUTHORISED", "ORDER_CANCELLED", "ORDER_FAILED", "ORDER_PAYMENT_DECLINED", "ORDER_PAYMENT_FAILED"]
TOLERANCE_MS = 5 * 60 * 1000
transport = None  # tests inject httpx.MockTransport; never set in the app


class RevolutError(Exception):
    def __init__(self, code, status=None):
        super().__init__(code)
        self.code, self.status = code, status


async def call(method, path, json=None, idempotency_key=None):
    key = config.revolut_key()
    if not key.startswith("sk_"):
        raise RevolutError("revolut_key_missing")
    headers = {"Authorization": "Bearer " + key, "Revolut-Api-Version": os.environ.get("REVOLUT_API_VERSION", "2026-08-17"), "Accept": "application/json"}
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    try:
        async with httpx.AsyncClient(base_url=BASES[config.revolut_mode()], timeout=20, transport=transport) as client:
            response = await client.request(method, path, json=json, headers=headers)
    except httpx.HTTPError:
        raise RevolutError("revolut_unreachable") from None
    if response.status_code >= 400:
        raise RevolutError("revolut_http_error", response.status_code)
    return response.json() if response.content else {}


def webhook_url():
    return config.PUBLIC_ORIGIN + "/api/shop/webhooks/revolut"


async def ensure_webhook(db=None):
    """db wird nicht mehr gelesen; der Parameter bleibt, bis admin_api umgestellt ist."""
    mode, url = config.revolut_mode(), webhook_url()
    stored = await store.payments.webhook_registration(mode)
    if stored and stored.get("url") == url and stored.get("signing_secret"):
        return stored
    data = await call("GET", "/api/webhooks")
    hooks = data.get("webhooks", []) if isinstance(data, dict) else (data or [])
    existing = next((w for w in hooks if w.get("url") == url), None)
    if existing:
        detail = await call("GET", "/api/webhooks/" + existing["id"])
    else:
        detail = await call("POST", "/api/webhooks", {"url": url, "events": WEBHOOK_EVENTS})
    doc = {"_id": mode, "webhook_id": detail["id"], "url": url, "signing_secret": detail["signing_secret"], "events": detail.get("events"), "stored_at": now_iso()}
    await store.payments.save_webhook_registration(mode, doc)
    return doc


def verify_signature(raw, timestamp, header, secret, now_ms=None):
    if not (raw is not None and timestamp and header and secret) or not timestamp.isdigit():
        return False
    current = now_ms if now_ms is not None else int(time.time() * 1000)
    if abs(current - int(timestamp)) > TOLERANCE_MS:
        return False
    expected = "v1=" + hmac.new(secret.encode(), b"v1." + timestamp.encode() + b"." + raw, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, part.strip()) for part in header.split(",") if part.strip().startswith("v1="))


async def create_order(amount_cents, currency, reference, description, email, redirect_url):
    return await call("POST", "/api/orders", {
        "amount": amount_cents, "currency": currency, "description": description,
        "merchant_order_data": {"reference": reference}, "customer": {"email": email}, "redirect_url": redirect_url},
        idempotency_key=str(uuid.uuid5(uuid.NAMESPACE_URL, 'teileklar-order:' + reference)))


async def retrieve_order(order_id):
    return await call("GET", "/api/orders/" + order_id)
