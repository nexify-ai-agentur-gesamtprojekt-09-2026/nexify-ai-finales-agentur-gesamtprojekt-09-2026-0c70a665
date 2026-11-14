"""Brand boundary for stored enquiries: NeXify (agency) and TEILEKLAR (shop, workshops).

`requests` holds both brands in one collection. Every read path scopes by brand through `scope()`; a
record written before the field existed is classified by the same rule the write path uses
(`requests_api.derive_brand`), so it can never appear in the other brand's view. `backfill()` writes
that classification into the legacy records. It only adds fields, never removes or deletes anything,
and nothing calls it automatically: an operator runs it deliberately (dry run first).
"""
from .db import now_iso
from .requests_api import derive_brand

BRANDS = ("nexify", "teileklar")
TEILEKLAR_KINDS = ["partner", "workshop_partner"]
TEILEKLAR_PATH = r"^/teileklar(/|$)"


def scope(brand):
    """Mongo filter for one brand, including legacy records without the field."""
    if brand == "teileklar":
        legacy = {"brand": {"$exists": False}, "$or": [{"kind": {"$in": TEILEKLAR_KINDS}}, {"page_path": {"$regex": TEILEKLAR_PATH}}]}
    elif brand == "nexify":
        legacy = {"brand": {"$exists": False}, "kind": {"$nin": TEILEKLAR_KINDS}, "page_path": {"$not": {"$regex": TEILEKLAR_PATH}}}
    else:
        raise ValueError("unknown_brand")
    return {"$or": [{"brand": brand}, legacy]}


def scoped(brand, query=None):
    """`query` restricted to one brand; the brand condition cannot be overridden by the query."""
    return {"$and": [scope(brand), query]} if query else scope(brand)


async def backfill(database, *, apply=False, limit=5000):
    """Give legacy records their brand. Returns counts; with apply=False nothing is written.

    requests: brand from kind and page path. workshop_requests: always TEILEKLAR. Records that already
    carry a brand are left untouched, so a repeated run changes nothing.
    """
    stamp, counts = now_iso(), {"requests": {"nexify": 0, "teileklar": 0}, "workshop_requests": {"teileklar": 0}, "applied": bool(apply)}
    docs = await database.requests.find({"brand": {"$exists": False}}, {"kind": 1, "page_path": 1}).to_list(limit)
    for doc in docs:
        brand = derive_brand(doc.get("kind", "contact"), doc.get("page_path", ""))
        counts["requests"][brand] += 1
        if apply:
            await database.requests.update_one({"_id": doc["_id"], "brand": {"$exists": False}}, {"$set": {"brand": brand, "brand_backfilled_at": stamp}})
    docs = await database.workshop_requests.find({"brand": {"$exists": False}}, {"_id": 1}).to_list(limit)
    for doc in docs:
        counts["workshop_requests"]["teileklar"] += 1
        if apply:
            await database.workshop_requests.update_one({"_id": doc["_id"], "brand": {"$exists": False}}, {"$set": {"brand": "teileklar", "brand_backfilled_at": stamp}})
    counts["remaining_possible"] = len(docs) >= limit
    return counts
