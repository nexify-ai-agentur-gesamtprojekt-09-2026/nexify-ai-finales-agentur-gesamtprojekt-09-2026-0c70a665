"""Bounded BigBuy import; publish only a validated, nonempty acquisition in a Mongo transaction.

Requires a transaction-capable Mongo deployment. No nontransactional fallback exists.
Pagination checks detect incomplete reads; they do not establish supplier snapshot isolation.
Sandbox publication is forbidden because the public schema has no environment boundary.
"""
import asyncio
import os
import re
import time
import uuid
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

import httpx
from bigbuy_get import (  # existing gateway module: hosts + typed error codes
    HOSTS,
    BigBuyReadError,
)
from pymongo import UpdateOne
from pymongo.read_concern import ReadConcern
from pymongo.write_concern import WriteConcern

from . import bigbuy_ftp, bigbuy_order, config, product_release
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
                    raise BigBuyReadError("catalog_endpoint_not_found")
                if response.status_code != 200:
                    raise BigBuyReadError("provider_http_error_%d" % response.status_code)
                remaining, reset = response.headers.get("x-ratelimit-remaining"), response.headers.get("x-ratelimit-reset")
                if pause_seconds and remaining is not None and remaining.isdigit() and int(remaining) <= 1 and (reset or "").isdigit():
                    await asyncio.sleep(max(1.0, min(65.0, int(reset) - time.time() + 1)))
                await asyncio.sleep(pause_seconds)
                try:
                    return response.json()
                except ValueError:
                    raise BigBuyReadError("catalog_invalid_json") from None
        raise BigBuyReadError("rate_limited")

    async def pages(self, path, params, keep=None):
        rows, seen = [], set()
        for page in range(MAX_PAGES):
            self.page_counts[path] = page + 1
            batch = await self.get(path, {**params, "page": page, "pageSize": PAGE_SIZE})
            if not isinstance(batch, list) or len(batch) > PAGE_SIZE:
                raise BigBuyReadError("catalog_page_schema")
            for row in batch:
                if not isinstance(row, dict) or type(row.get("id")) is not int or row["id"] <= 0:
                    raise BigBuyReadError("catalog_row_identity")
                if row["id"] in seen:
                    raise BigBuyReadError("catalog_duplicate_page_identity")
                seen.add(row["id"])
            rows.extend(r for r in batch if keep is None or keep(r))
            # A short page may be a provider cap that ignores our requested size.
            # Without a verified total/size contract only an explicit empty page
            # terminates acquisition. Repeated pages and cap exhaustion still fail.
            if not batch:
                return rows
        raise BigBuyReadError("catalog_page_limit_incomplete")


def find_roots(taxonomies):
    raw_override = os.environ.get("BIGBUY_TAXONOMY_IDS", "").strip()
    if raw_override and any(not x.strip().isascii() or not x.strip().isdigit() or int(x) <= 0 for x in raw_override.split(",")):
        raise BigBuyReadError("category_override_invalid")
    override = [int(x) for x in raw_override.split(",")] if raw_override else []
    if override:
        known = {t["id"] for t in taxonomies}
        if not set(override) <= known:
            raise BigBuyReadError("category_override_unknown")
        return override
    roots = [t for t in taxonomies if not t.get("parentTaxonomy") and ROOT_PATTERN.search(t.get("name") or "")]
    return [int(t["id"]) for t in roots]


def first(row, *keys):
    for key in keys:
        if row.get(key) not in (None, ""):
            return row[key]
    return None


def to_cents(value):
    try:
        if isinstance(value, bool) or value is None or len(str(value)) > 80:
            raise ValueError()
        price = Decimal(str(value))
        if not price.is_finite() or price < 0 or price > Decimal(2**63 - 1) / 100:
            raise ValueError()
        return int((price * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    except (ValueError, InvalidOperation, OverflowError):
        raise BigBuyReadError("invalid_wholesale_price") from None


def stock_quantity(value):
    """Only observed JSON integers represent quantity; unknown is never zero."""
    if type(value) is not int or not 0 <= value <= 2**63 - 1:
        raise BigBuyReadError("catalog_stock_invalid")
    return value


def stock_total(row):
    buckets = row.get("stocks")
    # An empty array has no independently verified zero-stock semantics here.
    if not isinstance(buckets, list) or not buckets:
        raise BigBuyReadError("catalog_stock_unknown")
    total = 0
    for bucket in buckets:
        if not isinstance(bucket, dict):
            raise BigBuyReadError("catalog_stock_invalid")
        total = stock_quantity(total + stock_quantity(bucket.get("quantity")))
    return total


def build_product(row, info, images, stock, taxonomy_names, root_id, stamp, run_id, environment, shipping_cost_cents=0):
    tax_id = first(row, "taxonomy", "taxonomyId")
    if type(tax_id) is not int or tax_id not in taxonomy_names or root_id not in taxonomy_names:
        raise BigBuyReadError("product_category_invalid")
    category_id = tax_id
    image_urls = [i["url"] for i in sorted(images, key=lambda i: not i.get("isCover")) if isinstance(i, dict) and str(i.get("url", "")).startswith("https://")]
    details = {k: row.get(k) for k in ("weight", "height", "width", "depth", "condition", "manufacturer", "dateUpd") if row.get(k) not in (None, "")}
    return {"_id": "bb-%s" % row["id"], "bigbuy_id": int(row["id"]), "sku": str(first(row, "sku") or ""),
            "ean": str(first(row, "ean13", "ean") or ""), "name": (info.get("name") or str(first(row, "sku") or row["id"])).strip(),
            "description": info.get("description") or "", "images": image_urls[:12],
            "category_ids": sorted({category_id, root_id}), "category_id": category_id,
            "purchase_cents": to_cents(first(row, "wholesalePrice", "wholesale_price")),
            "stock": stock_quantity(stock), "details": details, "buyable": False, "publishable": False,
            "shipping_cost_cents": int(shipping_cost_cents), "source": "bigbuy", "source_environment": environment, "imported_at": stamp, "import_run_id": run_id}


async def fetch_catalog(environment):
    client = BigBuyClient(environment)
    taxonomies = await client.get("/rest/catalog/taxonomies.json", {"isoCode": "de"})
    if not isinstance(taxonomies, list) or not taxonomies:
        raise BigBuyReadError("taxonomy_schema")
    known = set()
    for t in taxonomies:
        if (not isinstance(t, dict) or type(t.get("id")) is not int or t["id"] <= 0
                or t["id"] in known or not isinstance(t.get("name"), str) or not t["name"].strip()
                or (t.get("parentTaxonomy") is not None and
                    (type(t["parentTaxonomy"]) is not int or t["parentTaxonomy"] < 0))):
            raise BigBuyReadError("taxonomy_schema")
        known.add(t["id"])
    if any(t.get("parentTaxonomy") and t["parentTaxonomy"] not in known for t in taxonomies):
        raise BigBuyReadError("taxonomy_parent_unknown")
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
    def in_scope(row):
        if type(row.get("taxonomy")) is not int or row["taxonomy"] not in names:
            raise BigBuyReadError("product_category_invalid")
        return row["taxonomy"] in scope
    rows = await client.pages("/rest/catalog/products.json", {}, keep=in_scope)
    if not rows:
        raise BigBuyReadError("no_products_returned")
    ids = {r["id"] for r in rows if "id" in r}
    keep = lambda r: r.get("id") in ids
    info = {r["id"]: r for r in await client.pages("/rest/catalog/productsinformation.json", {"isoCode": "de"}, keep)}
    images = {r["id"]: r.get("images") or [] for r in await client.pages("/rest/catalog/productsimages.json", {}, keep)}
    stock = {r["id"]: stock_total(r) for r in await client.pages("/rest/catalog/productsstockbyhandlingdays.json", {}, keep)}
    if set(info) != ids or set(stock) != ids:
        raise BigBuyReadError("catalog_resource_coverage_incomplete")
    collected = {}
    for row in rows:
        if "id" in row:
            collected.setdefault(row["id"], (row, info.get(row["id"], {}), images.get(row["id"], []), stock.get(row["id"]), scope[row["taxonomy"]]))
    for pid in list(collected):
        values = collected[pid]
        sku = str(first(values[0], "sku") or "")
        cents = config.SHIPPING_FALLBACK_CENTS
        quote = await bigbuy_order.shipping_quote(environment, sku, config.SHIP_SAMPLE_COUNTRY, config.SHIP_SAMPLE_POSTCODE, 1)
        if quote and quote.get("cost_cents") is not None:
            cents = quote["cost_cents"]
        collected[pid] = values + (cents,)
    manifest = [{"source": "api", "taxonomy_ids": roots, "scope_taxonomies": len(scope), "iso_code": "de", "page_size": PAGE_SIZE,
                 "pages": dict(client.page_counts), "rows": {"products": len(rows), "information": len(info), "images": len(images), "stock": len(stock)}}]
    return roots, names, collected, manifest


async def publish_categories(db, used, names, roots, session):
    """Update owned categories only; ambiguous IDs abort the entire transaction."""
    for category_id in sorted(used):
        existing = await db.categories.find_one({"_id": category_id}, session=session)
        if existing is not None and existing.get("source") != "bigbuy":
            raise BigBuyReadError("category_ownership_unverified")
    for category_id in sorted(used):
        await db.categories.update_one(
            {"_id": category_id, "source": "bigbuy"},
            {"$set": {"name": names[category_id], "root": category_id in roots, "source": "bigbuy"}},
            upsert=True, session=session,
        )


def require_publication_contract():
    """No verified tenant-bound publication contract exists for this legacy importer."""
    raise BigBuyReadError("tenant_publication_contract_unverified")


async def run_import(db, environment, run_id):
    # This legacy adapter writes the public collection directly. A complete
    # acquisition and a provider key do not authorize tenant-bound publication.
    require_publication_contract()
    stamp = now_iso()
    try:
        if environment not in ("production", "ftp"):
            raise BigBuyReadError("sandbox_publication_forbidden" if environment == "sandbox" else "invalid_environment")
        if environment == "ftp":
            roots, names, products, manifest = await bigbuy_ftp.fetch(stamp, run_id)
            collected = products
        else:
            roots, names, collected, manifest = await fetch_catalog(environment)
            products = [build_product(*values[:4], names, values[4], stamp, run_id, environment, shipping_cost_cents=values[5]) for values in collected.values()]
        # The importer never releases a product and never fills a gap: it records the gaps it sees as blocker
        # codes (product_release). Release happens only in the shop process after the rules are evaluated.
        products = [{**{key: value for key, value in product.items() if key != "active"},
                     "buyable": False, "publishable": False,
                     "release": product_release.import_state(product, stamp)} for product in products]
        if not products:
            raise BigBuyReadError("no_products_returned")
        used = {c for p in products for c in p["category_ids"]}
        if (not roots or not used or not used <= names.keys()
                or len({p["_id"] for p in products}) != len(products)
                or any(type(p["purchase_cents"]) is not int or p["purchase_cents"] < 0 for p in products)):
            raise BigBuyReadError("catalog_publication_invalid")
        for product in products:
            stock_quantity(product.get("stock"))

        async def publish(session):
            # Shared write serializes concurrent publishers; driver retries the entire
            # transaction on a write conflict, never a partial catalog publication.
            await db.settings.update_one({"_id": "bigbuy_publication"}, {"$inc": {"revision": 1}}, upsert=True, session=session)
            claimed = await db.imports.update_one({"_id": run_id, "status": "running"}, {"$set": {"publication_started_at": stamp}}, session=session)
            if claimed.matched_count != 1:
                raise BigBuyReadError("import_run_not_running")
            before = await db.products.count_documents({"source": "bigbuy"}, session=session)
            result = await db.products.bulk_write([UpdateOne({"_id": p["_id"], "source": "bigbuy"}, {"$set": p, "$setOnInsert": {"first_imported_at": stamp}}, upsert=True) for p in products], ordered=False, session=session)
            # Pagination ending does not prove a consistent supplier snapshot.
            # Never retire unseen products on that basis: abort the publication
            # so previously available products cannot silently keep stale stock.
            missing = await db.products.count_documents(
                {"source": "bigbuy", "active": True, "import_run_id": {"$ne": run_id}}, session=session
            )
            if missing:
                raise BigBuyReadError("catalog_missing_existing_products_unverified")
            await publish_categories(db, used, names, roots, session)
            if manifest:
                await db.source_manifests.insert_many([{**m, "run_id": run_id, "created_at": stamp} for m in manifest], session=session)
            counts = {"fetched": len(collected), "stored": len(products), "created": result.upserted_count,
                      "updated": len(products) - result.upserted_count, "deactivated": 0, "before": before,
                      "skipped": 0, "with_images": sum(1 for p in products if p["images"]), "in_stock": sum(1 for p in products if p["stock"] > 0)}
            await db.imports.update_one({"_id": run_id}, {"$set": {"status": "done", "finished_at": now_iso(), "counts": counts, "taxonomy_ids": roots, "manifest": manifest}}, session=session)

        async with await db.client.start_session() as session:
            await session.with_transaction(publish, read_concern=ReadConcern("snapshot"), write_concern=WriteConcern("majority"), max_commit_time_ms=10000)
    except BigBuyReadError as error:
        await db.imports.update_one({"_id": run_id, "status": {"$ne": "done"}}, {"$set": {"status": "failed", "finished_at": now_iso(), "error": str(error)}})
    except Exception as error:
        unknown = callable(getattr(error, "has_error_label", None)) and error.has_error_label("UnknownTransactionCommitResult")
        # A lost commit acknowledgement may have committed everything. Never relabel
        # a committed done record as failed or retry publication based on that guess.
        await db.imports.update_one({"_id": run_id, "status": {"$ne": "done"}}, {"$set": {"status": "publication_unknown" if unknown else "failed", "finished_at": now_iso(), "error": "transaction_commit_unknown" if unknown else "unexpected_" + type(error).__name__}})


async def start_import(db, environment, actor):
    # Includes the legacy selection path, which otherwise writes active products.
    require_publication_contract()
    task = _running["task"]
    if task and not task.done():
        return None
    run_id = uuid.uuid4().hex
    await db.imports.insert_one({"_id": run_id, "status": "running", "environment": environment, "started_at": now_iso(), "started_by": actor, "source": "BigBuy Auto & Motorrad (%s)" % ("FTP" if environment == "ftp" else "API")})
    if environment == "selection":
        from .bigbuy_selection import import_selection
        _running["task"] = asyncio.create_task(import_selection(actor, run_id=run_id))
    else:
        _running["task"] = asyncio.create_task(run_import(db, environment, run_id))
    return run_id
