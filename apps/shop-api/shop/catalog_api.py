import re
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Query
from typing import Literal

from . import pricing
from .db import db

router = APIRouter(prefix="/api/shop")
PUBLIC_FIELDS = {"_id": 1, "sku": 1, "ean": 1, "name": 1, "images": 1, "stock": 1, "purchase_cents": 1, "category_id": 1, "category_ids": 1, "imported_at": 1, "source_partial": 1}

# Exact supplier host observed in the read-only catalogue; no wildcard or proxy.
# Deployment CSP must separately permit this host before images can load.
SUPPLIER_IMAGE_HOSTS = frozenset({"cdnbigbuy.com"})


def supplier_image(value):
    if (not isinstance(value, str) or not value.startswith("https://cdnbigbuy.com/")
            or len(value) > 2048 or re.search(r"[\s\x00-\x1f\x7f\\]", value)):
        return None
    try:
        parsed = urlsplit(value)
        if (parsed.scheme != "https" or parsed.netloc != parsed.hostname
                or parsed.hostname not in SUPPLIER_IMAGE_HOSTS
                or parsed.username or parsed.password or parsed.port
                or parsed.query or parsed.fragment
                or not re.fullmatch(r"/images/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)", parsed.path, re.I)
                or any(part in (".", "..") for part in parsed.path.split("/"))):
            return None
    except ValueError:
        return None
    return value


def present(product, settings, full=False):
    released = settings["price_released"]
    raw_stock = product.get("stock")
    stock = int(raw_stock) if isinstance(raw_stock, int) and not isinstance(raw_stock, bool) and 0 <= raw_stock <= 2**53 - 1 else None
    raw_images = product.get("images")
    images = list(dict.fromkeys(url for value in raw_images if (url := supplier_image(value)))) if isinstance(raw_images, list) else []
    item = {"id": str(product["_id"]), "sku": product.get("sku"), "ean": product.get("ean"), "name": product["name"],
            "image": images[0] if images else None,
            "image_status": "supplier_original" if images else "unavailable",
            "stock": stock, "in_stock": stock > 0 if stock is not None else None,
            "stock_status": "reported" if stock is not None else "unknown",
            "price_cents": pricing.sell_cents(product["purchase_cents"], settings["markup_percent"]) if released else None,
            "price_status": "released" if released else "not_released", "currency": "EUR", "vat_included": True,
            "vat_percent": str(pricing.config.VAT_PERCENT), "category_id": product.get("category_id"),
            "imported_at": product.get("imported_at"), "source_partial": product.get("source_partial", False)}
    if full:
        item.update({"images": images, "description": product.get("description") or "",
                     "details": product.get("details") or {}, "fitment_status": "not_checked",
                     "source": "BigBuy", "imported_at": product.get("imported_at"), "bigbuy_id": product.get("bigbuy_id")})
    return item


@router.get("/status")
async def catalog_status():
    last = await db.imports.find_one({"status": "done"}, sort=[("finished_at", -1)])
    return {"products": await db.products.count_documents({"active": True}), "last_import_at": last and last.get("finished_at"), "source": "BigBuy", "partial": bool(last and last.get("partial"))}


@router.get("/categories")
async def categories():
    counts = {row["_id"]: row["n"] async for row in db.products.aggregate([{"$match": {"active": True}}, {"$unwind": "$category_ids"}, {"$group": {"_id": "$category_ids", "n": {"$sum": 1}}}])}
    rows = [c async for c in db.categories.find({})]
    return {"categories": sorted([{"id": c["_id"], "name": c["name"], "root": c.get("root", False), "count": counts.get(c["_id"], 0)} for c in rows if counts.get(c["_id"])], key=lambda c: (not c["root"], c["name"]))}


@router.get("/products")
async def products(q: str = Query("", max_length=120), category: int | None = None, page: int = Query(1, ge=1, le=10000), page_size: int = Query(24, ge=1, le=60), sort: Literal['availability','price_asc','price_desc','name']='availability', in_stock: bool=False):
    query = {"active": True}
    if in_stock:
        query['stock'] = {'$gt': 0}
    term = q.strip()
    if term:
        pattern = re.escape(term)
        query["$or"] = [{"name": {"$regex": pattern, "$options": "i"}}, {"sku": {"$regex": "^" + pattern, "$options": "i"}}, {"ean": term}]
    if category is not None:
        query["category_ids"] = category
    total = await db.products.count_documents(query)
    settings = await pricing.settings(db)
    ordering={'availability':[("stock", -1), ("name", 1)],'price_asc':[("purchase_cents",1),("name",1)],'price_desc':[("purchase_cents",-1),("name",1)],'name':[("name",1)]}[sort]
    cursor = db.products.find(query, PUBLIC_FIELDS).sort(ordering).skip((page - 1) * page_size).limit(page_size)
    items = [present(p, settings) async for p in cursor]
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": max(1, -(-total // page_size)), "q": term, "category": category}


@router.get("/products/{product_id}")
async def product(product_id: str):
    doc = await db.products.find_one({"_id": product_id, "active": True})
    if not doc:
        raise HTTPException(404, {"error": "product_not_found"})
    category = await db.categories.find_one({"_id": doc.get("category_id")})
    item = present(doc, await pricing.settings(db), full=True)
    item["category_name"] = category and category["name"]
    return item
