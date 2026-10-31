from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from . import auth, bigbuy_import, config, pricing, revolut
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
