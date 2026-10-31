from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from pymongo import ReturnDocument

from . import auth, bigbuy_import, config, mail_templates, mailer, pricing, revolut
from .db import db, now_iso

router = APIRouter(prefix="/api/admin")


class SettingsIn(BaseModel):
    markup_percent: str = Field(max_length=10)
    shipping_cents: int = Field(ge=0, le=100000)


class ImportIn(BaseModel):
    environment: str = "production"


@router.get("/settings")
async def read_settings(ident=Depends(auth.require_admin)):
    s = await pricing.settings(db)
    return {"markup_percent": str(s["markup_percent"]), "shipping_cents": s["shipping_cents"], "vat_percent": str(config.VAT_PERCENT),
            "updated_at": s["updated_at"], "updated_by": s["updated_by"], "revolut_mode": config.revolut_mode(),
            "price_released": s["price_released"], "price_release": s["price_release"],
            "webhook_registered": bool(await db.revolut_webhooks.find_one({"_id": config.revolut_mode()}, {"_id": 1}))}


@router.put("/settings")
async def write_settings(body: SettingsIn, ident=Depends(auth.require_admin)):
    try:
        markup = pricing.parse_markup(body.markup_percent.replace(",", "."))
    except ValueError:
        raise HTTPException(422, {"error": "markup_invalid", "fields": {"markup_percent": "invalid"}}) from None
    await db.settings.update_one({"_id": "shop"}, {"$set": {"markup_percent": str(markup), "shipping_cents": body.shipping_cents,
                                                            "updated_at": now_iso(), "updated_by": ident.user_id}}, upsert=True)
    return await read_settings(ident)


@router.post("/price-release")
async def release_prices(ident=Depends(auth.require_admin)):
    s = await pricing.settings(db)
    release = {"markup_percent": str(s["markup_percent"]), "released_at": now_iso(), "released_by": ident.user_id}
    await db.settings.update_one({"_id": "shop"}, {"$set": {"price_release": release, "markup_percent": str(s["markup_percent"])}}, upsert=True)
    await db.price_releases.insert_one({**release, "action": "release"})
    return await read_settings(ident)


@router.get("/import")
async def import_status(ident=Depends(auth.require_admin)):
    runs = [r async for r in db.imports.find({}).sort("started_at", -1).limit(10)]
    for r in runs:
        r["id"] = r.pop("_id")
    return {"runs": runs, "active_products": await db.products.count_documents({"active": True})}


@router.post("/import", status_code=202)
async def start_import(body: ImportIn, ident=Depends(auth.require_admin)):
    if body.environment not in ("production", "sandbox", "ftp"):
        raise HTTPException(422, {"error": "environment_invalid"})
    run_id = await bigbuy_import.start_import(db, body.environment, ident.user_id)
    if not run_id:
        raise HTTPException(409, {"error": "import_running"})
    return {"run_id": run_id, "status": "running"}


@router.post("/revolut/webhook")
async def register_webhook(ident=Depends(auth.require_admin)):
    try:
        doc = await revolut.ensure_webhook(db)
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
    rows = db.orders.find({}, {"lines": 0}).sort("created_at", -1).limit(200)
    orders = []
    async for o in rows:
        mails = [m async for m in db.outbox.find({"_id": {"$regex": "^order_(paid|status):[a-z:_]*" + o["_id"]}}, {"status": 1, "subject": 1, "attempts": 1})]
        orders.append({"id": o["_id"], "number": o["number"], "status": o["status"], "fulfilment": o.get("fulfilment") or ("bezahlt" if o["status"] == "bezahlt" else None),
                       "total_cents": o["total_cents"], "email": o["address"].get("email"), "created_at": o["created_at"], "paid_at": o.get("paid_at"),
                       "tracking_number": o.get("tracking_number"), "carrier": o.get("carrier"), "mails": mails})
    return {"orders": orders}


@router.post("/orders/{order_id}/status")
async def set_order_status(order_id: str, body: StatusIn, ident=Depends(auth.require_admin)):
    order = await db.orders.find_one({"_id": order_id})
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
    changed = await db.orders.find_one_and_update({"_id": order_id, "fulfilment": order.get("fulfilment")}, {"$set": update}, return_document=ReturnDocument.AFTER)
    if not changed:
        raise HTTPException(409, {"error": "concurrent_change"})
    if body.status in ("in_bearbeitung", "versendet"):
        subject, html, text = mail_templates.order_status(changed, body.status)
        await mailer.enqueue("order_status:%s:%s" % (body.status, order_id), changed["address"].get("email", ""), subject, html, text)
    return {"id": order_id, "fulfilment": body.status}


@router.get("/outbox")
async def outbox(ident=Depends(auth.require_admin)):
    rows = [m async for m in db.outbox.find({}, {"html": 0, "text": 0}).sort("created_at", -1).limit(100)]
    for m in rows:
        m["id"] = m.pop("_id")
    return {"mails": rows}


@router.post("/outbox/retry")
async def outbox_retry(ident=Depends(auth.require_admin)):
    return {"retried": await mailer.retry_pending()}
