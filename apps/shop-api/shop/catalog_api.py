import re

from fastapi import APIRouter, HTTPException, Query

from . import pricing
from .db import db

router = APIRouter(prefix="/api/shop")
PUBLIC_FIELDS = {"_id": 1, "sku": 1, "ean": 1, "name": 1, "images": 1, "stock": 1, "purchase_cents": 1, "category_id": 1, "category_ids": 1, "imported_at": 1}


def present(product, markup, full=False):
    item = {"id": product["_id"], "sku": product.get("sku"), "ean": product.get("ean"), "name": product["name"],
            "image": (product.get("images") or [None])[0], "stock": product.get("stock", 0), "in_stock": product.get("stock", 0) > 0,
            "price_cents": pricing.sell_cents(product["purchase_cents"], markup), "currency": "EUR", "vat_included": True,
            "vat_percent": str(pricing.config.VAT_PERCENT), "category_id": product.get("category_id")}
    if full:
        item.update({"images": product.get("images") or [], "description": product.get("description") or "",
                     "details": product.get("details") or {}, "fitment_status": "not_checked",
                     "source": "BigBuy", "imported_at": product.get("imported_at"), "bigbuy_id": product.get("bigbuy_id")})
    return item


@router.get("/status")
async def catalog_status():
    last = await db.imports.find_one({"status": "done"}, sort=[("finished_at", -1)])
    return {"products": await db.products.count_documents({"active": True}), "last_import_at": last and last.get("finished_at"), "source": "BigBuy"}


@router.get("/categories")
async def categories():
    counts = {row["_id"]: row["n"] async for row in db.products.aggregate([{"$match": {"active": True}}, {"$unwind": "$category_ids"}, {"$group": {"_id": "$category_ids", "n": {"$sum": 1}}}])}
    rows = [c async for c in db.categories.find({})]
    return {"categories": sorted([{"id": c["_id"], "name": c["name"], "root": c.get("root", False), "count": counts.get(c["_id"], 0)} for c in rows if counts.get(c["_id"])], key=lambda c: (not c["root"], c["name"]))}


@router.get("/products")
async def products(q: str = Query("", max_length=120), category: int | None = None, page: int = Query(1, ge=1, le=10000), page_size: int = Query(24, ge=1, le=60)):
    query = {"active": True}
    term = q.strip()
    if term:
        pattern = re.escape(term)
        query["$or"] = [{"name": {"$regex": pattern, "$options": "i"}}, {"sku": {"$regex": "^" + pattern, "$options": "i"}}, {"ean": term}]
    if category is not None:
        query["category_ids"] = category
    total = await db.products.count_documents(query)
    markup = (await pricing.settings(db))["markup_percent"]
    cursor = db.products.find(query, PUBLIC_FIELDS).sort([("stock", -1), ("name", 1)]).skip((page - 1) * page_size).limit(page_size)
    items = [present(p, markup) async for p in cursor]
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": max(1, -(-total // page_size)), "q": term, "category": category}


@router.get("/products/{product_id}")
async def product(product_id: str):
    doc = await db.products.find_one({"_id": product_id, "active": True})
    if not doc:
        raise HTTPException(404, {"error": "product_not_found"})
    category = await db.categories.find_one({"_id": doc.get("category_id")})
    item = present(doc, (await pricing.settings(db))["markup_percent"], full=True)
    item["category_name"] = category and category["name"]
    return item
