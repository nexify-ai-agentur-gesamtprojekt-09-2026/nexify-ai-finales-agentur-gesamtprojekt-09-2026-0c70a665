from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from . import auth, bigbuy_import, config, fulfillment, mail_templates, mailer, pricing, revolut, store
from .db import db, now_iso  # db geht nur noch unverändert an bigbuy_import.start_import, bis der Import umgestellt ist

router = APIRouter(prefix="/api/admin")


class SettingsIn(BaseModel):
    markup_percent: str = Field(max_length=10)
    shipping_cents: int = Field(ge=0, le=100000)


class ImportIn(BaseModel):
    environment: str = "production"


@router.get("/settings")
async def read_settings(ident=Depends(auth.require_admin)):
    s = await pricing.settings()
    return {"markup_percent": str(s["markup_percent"]), "shipping_cents": s["shipping_cents"], "vat_percent": str(config.VAT_PERCENT),
            "updated_at": s["updated_at"], "updated_by": s["updated_by"], "revolut_mode": config.revolut_mode(),
            "price_released": s["price_released"], "price_release": s["price_release"],
            "webhook_registered": await store.payments.has_webhook_registration(config.revolut_mode())}


@router.put("/settings")
async def write_settings(body: SettingsIn, ident=Depends(auth.require_admin)):
    try:
        markup = pricing.parse_markup(body.markup_percent.replace(",", "."))
    except ValueError:
        raise HTTPException(422, {"error": "markup_invalid", "fields": {"markup_percent": "invalid"}}) from None
    await store.settings.save_pricing(str(markup), body.shipping_cents, now_iso(), ident.user_id)
    return await read_settings(ident)


@router.post("/price-release")
async def release_prices(ident=Depends(auth.require_admin)):
    s = await pricing.settings()
    release = {"markup_percent": str(s["markup_percent"]), "released_at": now_iso(), "released_by": ident.user_id}
    await store.settings.set_price_release(release)
    await store.settings.log_price_release({**release, "action": "release"})
    return await read_settings(ident)


@router.get("/import")
async def import_status(ident=Depends(auth.require_admin)):
    runs = await store.catalog.recent_imports(10)
    for r in runs:
        r["id"] = r.pop("_id")
    return {"runs": runs, "active_products": await store.catalog.count_published()}


@router.post("/import", status_code=202)
async def start_import(body: ImportIn, ident=Depends(auth.require_admin)):
    if body.environment not in ("production", "sandbox", "ftp", "selection"):
        raise HTTPException(422, {"error": "environment_invalid"})
    try:
        run_id = await bigbuy_import.start_import(db, body.environment, ident.user_id)
    except bigbuy_import.BigBuyReadError as error:
        if str(error) == "tenant_publication_contract_unverified":
            raise HTTPException(503, {"error": "tenant_publication_contract_unverified"}) from None
        raise
    if not run_id:
        raise HTTPException(409, {"error": "import_running"})
    return {"run_id": run_id, "status": "running"}


@router.post("/revolut/webhook")
async def register_webhook(ident=Depends(auth.require_admin)):
    try:
        doc = await revolut.ensure_webhook()
    except revolut.RevolutError as error:
        raise HTTPException(502, {"error": error.code}) from None
    return {"mode": doc["_id"], "webhook_id": doc["webhook_id"], "url": doc["url"]}


FLOW = {"in_bearbeitung": ("bezahlt",), "versendet": ("bezahlt", "in_bearbeitung"), "zugestellt": ("versendet",)}
STAMP = {"in_bearbeitung": "processing_at", "versendet": "shipped_at", "zugestellt": "delivered_at"}


class StatusIn(BaseModel):
    status: str = Field(pattern="^(in_bearbeitung|versendet|zugestellt)$")
    tracking_number: str = Field("", max_length=60)
    carrier: str = Field("", max_length=60)


@router.get("/orders")
async def list_orders(ident=Depends(auth.require_admin)):
    orders = []
    for o in await store.orders.recent_without_lines(200):
        mails = await store.outbox.order_mails(o["_id"])
        orders.append({"id": o["_id"], "number": o["number"], "status": o["status"], "fulfilment": o.get("fulfilment") or ("bezahlt" if o["status"] == "bezahlt" else None),
                       "total_cents": o["total_cents"], "email": o["address"].get("email"), "created_at": o["created_at"], "paid_at": o.get("paid_at"),
                       "tracking_number": o.get("tracking_number"), "carrier": o.get("carrier"), "mails": mails,
                       # Supplier hand-over state: an error is visible instead of silently leaving the order "bezahlt".
                       "bigbuy_order_id": o.get("bigbuy_order_id"), "fulfillment_error": o.get("fulfillment_error"),
                       "bigbuy_submit_pending": bool(o.get("bigbuy_submit_pending"))})
    return {"orders": orders}


@router.post("/orders/{order_id}/status")
async def set_order_status(order_id: str, body: StatusIn, ident=Depends(auth.require_admin)):
    order = await store.orders.get(order_id)
    if not order:
        raise HTTPException(404, {"error": "order_not_found"})
    current = order.get("fulfilment") or ("bezahlt" if order["status"] == "bezahlt" else order["status"])
    if order["status"] != "bezahlt" or current not in FLOW[body.status]:
        raise HTTPException(409, {"error": "transition_not_allowed", "current": current})
    if body.status == "versendet" and not body.tracking_number.strip():
        raise HTTPException(422, {"error": "tracking_required", "fields": {"tracking_number": "required"}})
    update = {"fulfilment": body.status, STAMP[body.status]: now_iso(), "status_changed_by": ident.user_id}
    if body.status == "versendet":
        update.update(tracking_number=body.tracking_number.strip(), carrier=body.carrier.strip())
    changed = await store.orders.change_delivery_state(order_id, order.get("fulfilment"), update)
    if not changed:
        raise HTTPException(409, {"error": "concurrent_change"})
    if body.status in ("in_bearbeitung", "versendet"):
        subject, html, text = mail_templates.order_status(changed, body.status)
        await mailer.enqueue("order_status:%s:%s" % (body.status, order_id), changed["address"].get("email", ""), subject, html, text)
    return {"id": order_id, "fulfilment": body.status}


@router.post("/orders/{order_id}/tracking-refresh")
async def refresh_tracking(order_id: str, ident=Depends(auth.require_admin)):
    """Read-only supplier query: pulls BigBuy tracking once; the first number marks the order shipped and mails the customer once."""
    order = await store.orders.get(order_id)
    if not order:
        raise HTTPException(404, {"error": "order_not_found"})
    if not order.get("bigbuy_order_id"):
        raise HTTPException(409, {"error": "not_submitted_to_supplier"})
    await fulfillment.poll_and_update_tracking(order)
    fresh = await store.orders.get(order_id) or order
    return {"id": order_id, "fulfilment": fresh.get("fulfilment"), "tracking_number": fresh.get("tracking_number"), "carrier": fresh.get("carrier")}


@router.get("/outbox")
async def outbox(ident=Depends(auth.require_admin)):
    rows = await store.outbox.recent_summaries(100)
    for m in rows:
        m["id"] = m.pop("_id")
    return {"mails": rows}


@router.post("/outbox/retry")
async def outbox_retry(ident=Depends(auth.require_admin)):
    return {"retried": await mailer.retry_pending()}



class DeliveryStatus(BaseModel):
    id: str
    status: str
    provider_id: str | None = None
    provider_event: str | None = None
    sent_at: str | None = None


@router.get("/outbox/{event_key}/delivery", response_model=DeliveryStatus)
async def outbox_delivery(event_key: str, ident=Depends(auth.require_admin)):
    result = await mailer.delivery_status(event_key)
    if not result:
        raise HTTPException(404, {"error": "mail_not_found"})
    return DeliveryStatus(**result)
