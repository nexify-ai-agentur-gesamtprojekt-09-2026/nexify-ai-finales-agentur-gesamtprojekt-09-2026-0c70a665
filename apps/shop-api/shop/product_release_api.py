"""Operator view and maintenance of the product publication gate (TK-11). Admin role required throughout.

Reads show why a product is blocked, one code per missing field. Writes only touch the `release` block and
the operator-entered `delivery_time`; no product is ever deleted or deactivated here.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from . import auth, catalog_api, product_release
from .db import db, now_iso

router = APIRouter(prefix="/api/admin/products")
STATUSES = ("all", "released", "blocked", "not_evaluated")
MAX_PAGE_SIZE = 100


class DeliveryTimeIn(BaseModel):
    min_days: int = Field(ge=0, le=product_release.MAX_DELIVERY_DAYS)
    max_days: int = Field(ge=0, le=product_release.MAX_DELIVERY_DAYS)


class ReevaluateIn(BaseModel):
    apply: bool = False
    limit: int = Field(5000, ge=1, le=20000)


def view(doc):
    """Operator row: stored state next to the live recheck, so a stale release is visible."""
    live = catalog_api.release_blockers(doc)
    release = doc.get("release") if isinstance(doc.get("release"), dict) else None
    stored = (release or {}).get("blocked_reasons") or []
    stale = bool(release) and ((release.get("status") == product_release.STATUS_RELEASED) != (not live))
    return {"id": str(doc["_id"]), "sku": doc.get("sku"), "name": doc.get("name"), "active": doc.get("active") is True,
            "release": release, "stored_reasons": stored, "blocked_reasons": product_release.describe(live),
            "public": catalog_api.is_public(doc), "stale": stale, "delivery_time": doc.get("delivery_time")}


async def summary():
    rows = {"released": 0, "blocked": 0}
    for status in rows:
        rows[status] = await db.products.count_documents({"release.status": status})
    not_evaluated = await db.products.count_documents({"release": {"$exists": False}})
    by_reason = {row["_id"]: row["n"] async for row in db.products.aggregate([
        {"$match": {"release.status": product_release.STATUS_BLOCKED}}, {"$unwind": "$release.blocked_reasons"},
        {"$group": {"_id": "$release.blocked_reasons", "n": {"$sum": 1}}}])}
    order = list(product_release.REASONS) + [product_release.NOT_EVALUATED]
    return {**rows, "not_evaluated": not_evaluated, "by_reason": {code: by_reason[code] for code in order if code in by_reason}}


@router.get("/release")
async def release_list(status: str = Query("blocked"), reason: str | None = None, page: int = Query(1, ge=1, le=10000),
                       page_size: int = Query(50, ge=1, le=MAX_PAGE_SIZE), ident=Depends(auth.require_admin)):
    if status not in STATUSES:
        raise HTTPException(422, {"error": "status_invalid", "allowed": list(STATUSES)})
    if reason is not None and reason not in product_release.REASONS and reason != product_release.NOT_EVALUATED:
        raise HTTPException(422, {"error": "reason_invalid", "allowed": list(product_release.REASONS) + [product_release.NOT_EVALUATED]})
    query = {}
    if status == "not_evaluated":
        query["release"] = {"$exists": False}
    elif status != "all":
        query["release.status"] = status
    if reason:
        query["release.blocked_reasons"] = reason
    total = await db.products.count_documents(query)
    rows = db.products.find(query).sort([("_id", 1)]).skip((page - 1) * page_size).limit(page_size)
    return {"items": [view(doc) async for doc in rows], "total": total, "page": page, "page_size": page_size,
            "summary": await summary(), "legal_note": product_release.LEGAL_NOTE, "rules_version": product_release.RULES_VERSION}


async def evaluate(doc, checked_by):
    return catalog_api.release_state(doc, checked_by, now_iso())


def same(old, new):
    keys = ("status", "blocked_reasons", "brand", "rules_version")
    return isinstance(old, dict) and all(old.get(key) == new.get(key) for key in keys)


async def reevaluate(database, *, apply=False, limit=5000, checked_by="operator"):
    """Evaluate stored products against the current rules. Dry run unless apply=True; only `release` is written.

    Idempotent: a product whose state is unchanged is not written. Nothing is deleted, deactivated or filled in.
    """
    counts = {"examined": 0, "would_release": 0, "would_block": 0, "changed": 0, "applied": bool(apply)}
    docs = await database.products.find({}).sort([("_id", 1)]).limit(limit).to_list(limit)
    for doc in docs:
        counts["examined"] += 1
        new = await evaluate(doc, checked_by)
        counts["would_release" if new["status"] == product_release.STATUS_RELEASED else "would_block"] += 1
        if same(doc.get("release"), new):
            continue
        counts["changed"] += 1
        if apply:
            await database.products.update_one({"_id": doc["_id"]}, {"$set": {"release": new}})
    counts["remaining_possible"] = len(docs) >= limit
    return counts


@router.post("/release/reevaluate")
async def release_reevaluate(body: ReevaluateIn, ident=Depends(auth.require_admin)):
    return await reevaluate(db, apply=body.apply, limit=body.limit, checked_by="operator:" + ident.user_id)


@router.get("/{product_id}/release")
async def release_one(product_id: str, ident=Depends(auth.require_admin)):
    doc = await db.products.find_one({"_id": product_id})
    if not doc:
        raise HTTPException(404, {"error": "product_not_found"})
    return {**view(doc), "legal_note": product_release.LEGAL_NOTE}


@router.put("/{product_id}/delivery-time")
async def set_delivery_time(product_id: str, body: DeliveryTimeIn, ident=Depends(auth.require_admin)):
    if body.min_days > body.max_days:
        raise HTTPException(422, {"error": "delivery_time_invalid", "fields": {"max_days": "less_than_min_days"}})
    doc = await db.products.find_one({"_id": product_id})
    if not doc:
        raise HTTPException(404, {"error": "product_not_found"})
    stamp = now_iso()
    delivery = {"min_days": body.min_days, "max_days": body.max_days, "source": "operator", "set_by": ident.user_id, "set_at": stamp}
    doc = {**doc, "delivery_time": delivery}
    await db.products.update_one({"_id": product_id}, {"$set": {"delivery_time": delivery, "release": await evaluate(doc, "operator:" + ident.user_id)}})
    return view(await db.products.find_one({"_id": product_id}))
