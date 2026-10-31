"""BigBuy "Auto & Motorrad" import: full pagination, dedupe by BigBuy ID, previous catalog kept on failure."""
import asyncio
import os
import re
import time
import uuid

import httpx
from bigbuy_get import (  # existing gateway module: hosts + typed error codes
    HOSTS,
    BigBuyReadError,
)
from pymongo import UpdateOne

from . import bigbuy_ftp, config
from .db import now_iso

PAGE_SIZE = 1000
MAX_PAGES = 600
ROOT_PATTERN = re.compile(r"^\s*auto\s*(und|&)\s*motorrad\s*$", re.I)
transport = None  # tests inject httpx.MockTransport
pause_seconds = 1.0
_running = {"task": None}


class BigBuyClient:
    def __init__(self, environment):
        key = config.bigbuy_key(environment)
        if not key:
            raise BigBuyReadError("api_key_missing")
        self.base, self.headers = HOSTS[environment], {"Authorization": "Bearer " + key, "Accept": "application/json"}
        self.page_counts = {}

    async def get(self, path, params):
        async with httpx.AsyncClient(base_url=self.base, timeout=60, transport=transport, follow_redirects=False) as client:
            for attempt in range(8):
                try:
                    response = await client.get(path, params=params, headers=self.headers)
                except httpx.HTTPError:
                    raise BigBuyReadError("transport_unavailable") from None
                if response.status_code == 429:
                    wait = float(response.headers.get("retry-after") or 0) or min(60, 5 * 2 ** attempt)
                    await asyncio.sleep(min(wait, 120) if pause_seconds else 0)
                    continue
                if response.status_code in (401, 403):
                    raise BigBuyReadError("access_denied")
                if response.status_code == 404:
                    return None
                if response.status_code != 200:
                    raise BigBuyReadError("provider_http_error_%d" % response.status_code)
                remaining, reset = response.headers.get("x-ratelimit-remaining"), response.headers.get("x-ratelimit-reset")
                if pause_seconds and remaining is not None and remaining.isdigit() and int(remaining) <= 1 and (reset or "").isdigit():
                    await asyncio.sleep(max(1.0, min(65.0, int(reset) - time.time() + 1)))
                await asyncio.sleep(pause_seconds)
                return response.json()
        raise BigBuyReadError("rate_limited")

    async def pages(self, path, params, keep=None):
        rows, seen = [], set()
        for page in range(MAX_PAGES):
            self.page_counts[path] = page + 1
            batch = await self.get(path, {**params, "page": page, "pageSize": PAGE_SIZE})
            if not isinstance(batch, list) or not batch:
                break
            fresh = [r for r in batch if isinstance(r, dict) and r.get("id") not in seen]
            seen.update(r.get("id") for r in fresh)
            rows.extend(r for r in fresh if keep is None or keep(r))
            if len(batch) < PAGE_SIZE or not fresh:
                break
        return rows


def find_roots(taxonomies):
    override = [int(x) for x in os.environ.get("BIGBUY_TAXONOMY_IDS", "").split(",") if x.strip().isdigit()]
    if override:
        return override
    roots = [t for t in taxonomies if not t.get("parentTaxonomy") and ROOT_PATTERN.search(t.get("name") or "")]
    return [int(t["id"]) for t in roots]


def first(row, *keys):
    for key in keys:
        if row.get(key) not in (None, ""):
            return row[key]
    return None


def to_cents(value):
    return int(round(float(value) * 100)) if value not in (None, "") else None


def build_product(row, info, images, stock, taxonomy_names, root_id, stamp, run_id, environment):
    tax_id = first(row, "taxonomy", "taxonomyId")
    category_id = int(tax_id) if str(tax_id or "").isdigit() and int(tax_id) in taxonomy_names else root_id
    image_urls = [i["url"] for i in sorted(images, key=lambda i: not i.get("isCover")) if isinstance(i, dict) and str(i.get("url", "")).startswith("https://")]
    details = {k: row.get(k) for k in ("weight", "height", "width", "depth", "condition", "manufacturer", "dateUpd") if row.get(k) not in (None, "")}
    return {"_id": "bb-%s" % row["id"], "bigbuy_id": int(row["id"]), "sku": str(first(row, "sku") or ""),
            "ean": str(first(row, "ean13", "ean") or ""), "name": (info.get("name") or str(first(row, "sku") or row["id"])).strip(),
            "description": info.get("description") or "", "images": image_urls[:12],
            "category_ids": sorted({category_id, root_id}), "category_id": category_id,
            "purchase_cents": to_cents(first(row, "wholesalePrice", "wholesale_price")),
            "stock": int(stock) if stock is not None else 0, "details": details, "active": True,
            "source": "bigbuy", "source_environment": environment, "imported_at": stamp, "import_run_id": run_id}


async def fetch_catalog(environment):
    client = BigBuyClient(environment)
    taxonomies = await client.get("/rest/catalog/taxonomies.json", {"isoCode": "de"}) or []
    roots = find_roots(taxonomies)
    if not roots:
        raise BigBuyReadError("category_auto_motorrad_not_found")
    names = {int(t["id"]): t.get("name") for t in taxonomies if str(t.get("id", "")).isdigit()}
    # BigBuy ignores taxonomy filters below first level, so read the full catalog and keep the root subtrees locally.
    children = {}
    for t in taxonomies:
        children.setdefault(t.get("parentTaxonomy"), []).append(t.get("id"))
    scope, stack = {r: r for r in roots}, list(roots)
    while stack:
        node = stack.pop()
        for child in children.get(node, []):
            if child not in scope:
                scope[child] = scope[node]
                stack.append(child)
    rows = await client.pages("/rest/catalog/products.json", {}, keep=lambda r: r.get("taxonomy") in scope)
    ids = {r["id"] for r in rows if "id" in r}
    keep = lambda r: r.get("id") in ids
    info = {r["id"]: r for r in await client.pages("/rest/catalog/productsinformation.json", {"isoCode": "de"}, keep)}
    images = {r["id"]: r.get("images") or [] for r in await client.pages("/rest/catalog/productsimages.json", {}, keep)}
    stock = {r["id"]: sum(int(s.get("quantity") or 0) for s in r.get("stocks") or []) for r in await client.pages("/rest/catalog/productsstockbyhandlingdays.json", {}, keep)}
    collected = {}
    for row in rows:
        if "id" in row:
            collected.setdefault(row["id"], (row, info.get(row["id"], {}), images.get(row["id"], []), stock.get(row["id"]), scope[row["taxonomy"]]))
    manifest = [{"source": "api", "taxonomy_ids": roots, "scope_taxonomies": len(scope), "iso_code": "de", "page_size": PAGE_SIZE,
                 "pages": dict(client.page_counts), "rows": {"products": len(rows), "information": len(info), "images": len(images), "stock": len(stock)}}]
    return roots, names, collected, manifest


async def run_import(db, environment, run_id):
    stamp = now_iso()
    try:
        if environment == "ftp":
            roots, names, products, manifest = await bigbuy_ftp.fetch(stamp, run_id)
            collected = products
            await db.imports.update_one({"_id": run_id}, {"$set": {"manifest": manifest}})
            if manifest:
                await db.source_manifests.insert_many([{**m, "run_id": run_id} for m in manifest])
        else:
            roots, names, collected, manifest = await fetch_catalog(environment)
            products = [build_product(*values[:4], names, values[4], stamp, run_id, environment) for values in collected.values()]
            await db.imports.update_one({"_id": run_id}, {"$set": {"manifest": manifest}})
            await db.source_manifests.insert_many([{**m, "run_id": run_id, "created_at": stamp} for m in manifest])
        skipped = [{"bigbuy_id": p["bigbuy_id"], "reason": "missing_wholesale_price"} for p in products if p["purchase_cents"] is None]
        products = [p for p in products if p["purchase_cents"] is not None]
        if not products:
            raise BigBuyReadError("no_products_returned")
        before = await db.products.count_documents({"source": "bigbuy"})
        result = await db.products.bulk_write([UpdateOne({"_id": p["_id"]}, {"$set": p, "$setOnInsert": {"first_imported_at": stamp}}, upsert=True) for p in products], ordered=False)
        gone = await db.products.update_many({"source": "bigbuy", "import_run_id": {"$ne": run_id}}, {"$set": {"active": False}})
        used = {c for p in products for c in p["category_ids"]}
        await db.categories.delete_many({})
        await db.categories.insert_many([{"_id": c, "name": names.get(c) or "Auto & Motorrad", "root": c in roots} for c in used])
        counts = {"fetched": len(collected), "stored": len(products), "created": result.upserted_count,
                  "updated": len(products) - result.upserted_count, "deactivated": gone.modified_count, "before": before,
                  "skipped": len(skipped), "with_images": sum(1 for p in products if p["images"]), "in_stock": sum(1 for p in products if p["stock"] > 0)}
        if skipped:
            await db.imports.update_one({"_id": run_id}, {"$set": {"skipped": skipped[:500]}})
        await db.imports.update_one({"_id": run_id}, {"$set": {"status": "done", "finished_at": now_iso(), "counts": counts, "taxonomy_ids": roots}})
    except BigBuyReadError as error:
        await db.imports.update_one({"_id": run_id}, {"$set": {"status": "failed", "finished_at": now_iso(), "error": str(error)}})
    except Exception as error:
        await db.imports.update_one({"_id": run_id}, {"$set": {"status": "failed", "finished_at": now_iso(), "error": "unexpected_" + type(error).__name__}})


async def start_import(db, environment, actor):
    task = _running["task"]
    if task and not task.done():
        return None
    run_id = uuid.uuid4().hex
    await db.imports.insert_one({"_id": run_id, "status": "running", "environment": environment, "started_at": now_iso(), "started_by": actor, "source": "BigBuy Auto & Motorrad (%s)" % ("FTP" if environment == "ftp" else "API")})
    _running["task"] = asyncio.create_task(run_import(db, environment, run_id))
    return run_id
