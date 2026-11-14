import re
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Query
from typing import Literal

from . import pricing, product_release
from .db import db

router = APIRouter(prefix="/api/shop")
# Only released products are public (product_release): the stored release state is the query, the rules are re-checked per row.
PUBLIC_BASE = {"active": True, "release.status": product_release.STATUS_RELEASED}
PUBLIC_FIELDS = {"_id": 1, "sku": 1, "ean": 1, "name": 1, "images": 1, "stock": 1, "purchase_cents": 1, "category_id": 1, "category_ids": 1, "imported_at": 1, "source_partial": 1, "bigbuy_id": 1, "release": 1, "description": 1, "details": 1, "delivery_time": 1, "fitment_status": 1, "fitment_evidence": 1, "active": 1}

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


def release_blockers(product):
    return product_release.blockers(product, vat_percent=pricing.config.VAT_PERCENT, image_ok=supplier_image)


def release_state(product, checked_by, stamp):
    return product_release.state(product, vat_percent=pricing.config.VAT_PERCENT, image_ok=supplier_image, checked_by=checked_by, stamp=stamp)


def is_public(product, ignore=()):
    """Active, stored as released, and every mandatory field still present."""
    return product_release.is_public(product, vat_percent=pricing.config.VAT_PERCENT, image_ok=supplier_image, ignore=ignore)


def present(product, settings, full=False):
    released = settings["price_released"]
    raw_stock = product.get("stock")
    stock = int(raw_stock) if isinstance(raw_stock, int) and not isinstance(raw_stock, bool) and 0 <= raw_stock <= 2**53 - 1 else None
    raw_images = product.get("images")
    images = list(dict.fromkeys(url for value in raw_images if (url := supplier_image(value)))) if isinstance(raw_images, list) else []
    delivery = product.get("delivery_time")
    delivery_days = ({"min": delivery["min_days"], "max": delivery["max_days"]} if isinstance(delivery, dict)
                     and type(delivery.get("min_days")) is int and type(delivery.get("max_days")) is int else None)
    # Fitment is shown as checked only with a recorded source and date; a bare claim stays "not_checked".
    evidence = product.get("fitment_evidence")
    proven = (product.get("fitment_status") == "verified" and isinstance(evidence, dict)
              and isinstance(evidence.get("source"), str) and evidence["source"].strip()
              and isinstance(evidence.get("checked_at"), str) and evidence["checked_at"].strip())
    item = {"id": str(product["_id"]), "sku": product.get("sku"), "ean": product.get("ean"), "name": product["name"],
            "image": images[0] if images else None,
            "image_status": "supplier_original" if images else "unavailable",
            "stock": stock, "in_stock": stock > 0 if stock is not None else None,
            "stock_status": "reported" if stock is not None else "unknown",
            "price_cents": pricing.sell_cents(product["purchase_cents"], settings["markup_percent"]) if released else None,
            "price_status": "released" if released else "not_released", "currency": "EUR", "vat_included": True,
            "vat_percent": str(pricing.config.VAT_PERCENT), "category_id": product.get("category_id"),
            "imported_at": product.get("imported_at"), "source_partial": product.get("source_partial", False),
            "delivery_days": delivery_days, "fitment_status": "verified" if proven else "not_checked", "fitment_verified": bool(proven),
            "fitment_source": evidence["source"].strip() if proven else None}
    if full:
        item.update({"images": images, "description": product.get("description") or "",
                     "details": product.get("details") or {},
                     "source": "BigBuy", "imported_at": product.get("imported_at"), "bigbuy_id": product.get("bigbuy_id")})
    return item


@router.get("/status")
async def catalog_status():
    last = await db.imports.find_one({"status": "done"}, sort=[("finished_at", -1)])
    return {"products": await db.products.count_documents(PUBLIC_BASE), "last_import_at": last and last.get("finished_at"), "source": "BigBuy", "partial": bool(last and last.get("partial"))}


@router.get("/categories")
async def categories():
    counts = {row["_id"]: row["n"] async for row in db.products.aggregate([{"$match": PUBLIC_BASE}, {"$unwind": "$category_ids"}, {"$group": {"_id": "$category_ids", "n": {"$sum": 1}}}])}
    rows = [c async for c in db.categories.find({})]
    return {"categories": sorted([{"id": c["_id"], "name": c["name"], "root": c.get("root", False), "count": counts.get(c["_id"], 0)} for c in rows if counts.get(c["_id"])], key=lambda c: (not c["root"], c["name"]))}


MAX_WINDOW_ITEMS = 10000        # page * page_size may not exceed this: deep offsets are refused, not slowly served
MAX_PAGE_SIZE = 60
MAX_FACET_VALUES = 50
MAX_BRANDS = 10
MAX_BRAND_CHARS = 80
MAX_PRICE_CENTS = 10_000_000
# Every order ends in the identifier, so equal keys never reorder between pages.
STOCK_FIRST = [("stock", -1), ("name", 1), ("_id", 1)]
SORTS = {"relevance": STOCK_FIRST, "availability": STOCK_FIRST,
         "price_asc": [("purchase_cents", 1), ("name", 1), ("_id", 1)], "price_desc": [("purchase_cents", -1), ("name", 1), ("_id", 1)],
         "name": [("name", 1), ("_id", 1)], "newest": [("first_imported_at", -1), ("imported_at", -1), ("_id", 1)]}


def invalid(**fields):
    return HTTPException(422, {"error": "filter_invalid", "fields": fields})


def read_filters(q, category, brand, price_min_cents, price_max_cents, availability, in_stock):
    brands = list(dict.fromkeys(b for b in brand))
    if len(brands) > MAX_BRANDS:
        raise invalid(brand="too_many")
    if any(not b.strip() or len(b) > MAX_BRAND_CHARS or re.search(r"[\x00-\x1f\x7f]", b) for b in brands):
        raise invalid(brand="invalid")
    if price_min_cents is not None and price_max_cents is not None and price_min_cents > price_max_cents:
        raise invalid(price_max_cents="less_than_price_min_cents")
    if in_stock:
        if availability == "out_of_stock":
            raise invalid(availability="conflicts_with_in_stock")
        availability = "in_stock"
    return {"q": q.strip(), "category": category, "brands": brands, "price_min_cents": price_min_cents,
            "price_max_cents": price_max_cents, "availability": availability}


def filter_query(f, markup, skip=()):
    """Mongo query for the filters, without the dimension named in `skip` (facets count a dimension without its own filter)."""
    query = dict(PUBLIC_BASE)
    if f["q"] and "q" not in skip:
        pattern = re.escape(f["q"])
        query["$or"] = [{"name": {"$regex": pattern, "$options": "i"}}, {"sku": {"$regex": "^" + pattern, "$options": "i"}}, {"ean": f["q"]}]
    if f["category"] is not None and "category" not in skip:
        query["category_ids"] = f["category"]
    if f["brands"] and "brand" not in skip:
        query["release.brand"] = {"$in": f["brands"]}
    if f["availability"] and "availability" not in skip:
        query["stock"] = {"$gt": 0} if f["availability"] == "in_stock" else 0
    if (f["price_min_cents"] is not None or f["price_max_cents"] is not None) and "price" not in skip:
        lo, hi = pricing.purchase_range_for_sell(f["price_min_cents"], f["price_max_cents"], markup)
        query["purchase_cents"] = {**({"$gte": lo} if lo is not None else {}), **({"$lte": hi} if hi is not None else {})}
    return query


async def facets(f, settings):
    markup = settings["markup_percent"]
    categories = {row["_id"]: row["n"] async for row in db.products.aggregate([
        {"$match": filter_query(f, markup, ("category",))}, {"$unwind": "$category_ids"}, {"$group": {"_id": "$category_ids", "n": {"$sum": 1}}},
        {"$sort": {"n": -1, "_id": 1}}, {"$limit": MAX_FACET_VALUES}])}
    names = {c["_id"]: c async for c in db.categories.find({"_id": {"$in": list(categories)}})}
    brands = [{"value": row["_id"], "count": row["n"]} async for row in db.products.aggregate([
        {"$match": filter_query(f, markup, ("brand",))}, {"$group": {"_id": "$release.brand", "n": {"$sum": 1}}},
        {"$sort": {"n": -1, "_id": 1}}, {"$limit": MAX_FACET_VALUES}]) if row["_id"]]
    base = filter_query(f, markup, ("availability",))
    price = None
    if settings["price_released"]:
        rows = [row async for row in db.products.aggregate([{"$match": filter_query(f, markup, ("price",))},
                                                            {"$group": {"_id": None, "lo": {"$min": "$purchase_cents"}, "hi": {"$max": "$purchase_cents"}}}])]
        if rows:
            price = {"min_cents": pricing.sell_cents(rows[0]["lo"], markup), "max_cents": pricing.sell_cents(rows[0]["hi"], markup), "currency": "EUR"}
    return {"categories": [{"id": cid, "name": names[cid]["name"], "root": names[cid].get("root", False), "count": n}
                           for cid, n in categories.items() if cid in names],
            "brands": brands,
            "availability": {"in_stock": await db.products.count_documents({**base, "stock": {"$gt": 0}}),
                             "out_of_stock": await db.products.count_documents({**base, "stock": 0})},
            "price": price}


@router.get("/products")
async def products(q: str = Query("", max_length=120), category: int | None = Query(None, ge=1), brand: list[str] = Query([]),
                   price_min_cents: int | None = Query(None, ge=0, le=MAX_PRICE_CENTS), price_max_cents: int | None = Query(None, ge=0, le=MAX_PRICE_CENTS),
                   availability: Literal["in_stock", "out_of_stock"] | None = None, in_stock: bool = False,
                   sort: Literal["relevance", "availability", "price_asc", "price_desc", "name", "newest"] = "relevance",
                   page: int = Query(1, ge=1, le=10000), page_size: int = Query(24, ge=1, le=MAX_PAGE_SIZE)):
    """Public catalogue: released products only. Filters combine with AND; several brands combine with OR.

    Facets count each dimension with every other filter applied but not its own. Counts come from the stored
    release state; a row whose mandatory fields have since gone is left out of the page (fail closed).
    """
    f = read_filters(q, category, brand, price_min_cents, price_max_cents, availability, in_stock)
    if page * page_size > MAX_WINDOW_ITEMS:
        raise HTTPException(422, {"error": "page_out_of_range", "max_window_items": MAX_WINDOW_ITEMS})
    settings = await pricing.settings(db)
    priced = f["price_min_cents"] is not None or f["price_max_cents"] is not None or sort in ("price_asc", "price_desc")
    if priced and not settings["price_released"]:
        raise HTTPException(409, {"error": "price_not_released", "message": "Preis noch nicht freigegeben"})
    query = filter_query(f, settings["markup_percent"])
    total = await db.products.count_documents(query)
    cursor = db.products.find(query, PUBLIC_FIELDS).sort(SORTS[sort]).skip((page - 1) * page_size).limit(page_size)
    items = [present(p, settings) async for p in cursor if is_public(p)]
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": max(1, -(-total // page_size)), "q": f["q"],
            "category": category, "sort": sort,
            "applied": {"q": f["q"], "category": category, "brands": f["brands"], "price_min_cents": price_min_cents,
                        "price_max_cents": price_max_cents, "availability": f["availability"]},
            "facets": await facets(f, settings),
            "limits": {"max_page_size": MAX_PAGE_SIZE, "max_window_items": MAX_WINDOW_ITEMS, "window_limited": total > MAX_WINDOW_ITEMS}}


@router.get("/products/{product_id}")
async def product(product_id: str):
    doc = await db.products.find_one({"_id": product_id, "active": True})
    if not doc or not is_public(doc):
        raise HTTPException(404, {"error": "product_not_found"})
    category = await db.categories.find_one({"_id": doc.get("category_id")})
    item = present(doc, await pricing.settings(db), full=True)
    item["category_name"] = category and category["name"]
    return item
