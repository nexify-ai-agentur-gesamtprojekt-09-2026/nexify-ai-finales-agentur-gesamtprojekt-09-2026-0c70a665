"""Katalog und Shop-Einstellungen lesen (PostgreSQL). Gleiche Schnittstelle und Rückgaben wie ``MongoCatalogStore``."""
import json

from . import base

# Dieselbe Auswahl wie in der MongoDB-Umsetzung; purchase_cents dient der Preisberechnung im Dienst.
LIST_FIELDS = {"sku", "ean", "name", "images", "stock", "purchase_cents", "category_id", "category_ids", "imported_at", "source_partial"}
# MongoDB ordnet fehlende Werte vor alle anderen; Text wird byteweise verglichen (Spalten mit Sortierung "C").
ORDERINGS = {"availability": "stock desc nulls last, name asc nulls first, seq",
             "price_asc": "purchase_cents asc nulls first, name asc nulls first, seq",
             "price_desc": "purchase_cents desc nulls last, name asc nulls first, seq",
             "name": "name asc nulls first, seq"}
FOLD = 'collate "und-x-icu"'


class PgCatalogStore:
    def __init__(self, db):
        self.db = db

    async def count_published(self):
        async with self.db.cursor() as cur:
            await cur.execute("select count(*) from shop.products where active")
            return (await cur.fetchone())[0]

    async def last_finished_import(self):
        async with self.db.cursor() as cur:
            rows = await base.fetch_all(cur, "imports", "status = 'done'", order="finished_at desc nulls last, seq", limit=1)
        return rows[0] if rows else None

    async def recent_imports(self, limit):
        """Importläufe jeden Zustands, zuletzt gestartete zuerst."""
        async with self.db.cursor() as cur:
            return await base.fetch_all(cur, "imports", order="started_at desc nulls last, seq", limit=limit)

    async def published_counts_by_category(self):
        async with self.db.cursor() as cur:
            await cur.execute("""
                select e.value::text, count(*) from shop.products p
                cross join lateral jsonb_array_elements(case jsonb_typeof(p.category_ids) when 'array' then p.category_ids
                                                         when 'null' then '[]'::jsonb else jsonb_build_array(p.category_ids) end) e(value)
                where p.active and p.category_ids is not null group by e.value order by min(p.seq)""")
            return {json.loads(key): n for key, n in await cur.fetchall()}

    async def categories(self):
        async with self.db.cursor() as cur:
            return await base.fetch_all(cur, "categories")

    async def category(self, category_id):
        if type(category_id) is not int:
            return None
        async with self.db.cursor() as cur:
            return await base.fetch_one(cur, "categories", category_id)

    @staticmethod
    def _search(term, category, in_stock):
        where, params = ["active"], []
        if in_stock:
            where.append("stock > 0")
        if term:
            # Name enthält den Text, Artikelnummer beginnt damit (beides ohne Groß-/Kleinschreibung), EAN ist gleich. Nie ein Muster.
            where.append(f"(position(lower(%s {FOLD}) in lower(name {FOLD})) > 0 or starts_with(lower(sku {FOLD}), lower(%s {FOLD})) or ean = %s)")
            params += [term, term, term]
        if category is not None:
            where.append("category_ids @> %s::jsonb")
            params.append(json.dumps(category))
        return " and ".join(where), params

    async def count_search(self, *, term, category, in_stock):
        """Veröffentlichte Produkte: Name enthält term, Artikelnummer beginnt damit oder EAN ist gleich (ohne Groß-/Kleinschreibung)."""
        where, params = self._search(term, category, in_stock)
        async with self.db.cursor() as cur:
            await cur.execute(f"select count(*) from shop.products where {where}", params)
            return (await cur.fetchone())[0]

    async def page_search(self, *, term, category, in_stock, sort, page, page_size):
        where, params = self._search(term, category, in_stock)
        async with self.db.cursor() as cur:
            rows = await base.fetch_all(cur, "products", where, params, order=ORDERINGS[sort], limit=page_size, offset=(page - 1) * page_size)
        return [base.project(row, only=LIST_FIELDS) for row in rows]

    async def published_product(self, product_id):
        if not base.text_id(product_id):
            return None
        async with self.db.cursor() as cur:
            rows = await base.fetch_all(cur, "products", "id = %s and active", [product_id])
        return rows[0] if rows else None

    async def products_by_id(self, ids):
        """Auch unveröffentlichte: der Warenkorb muss erkennen, dass ein Produkt nicht mehr verfügbar ist."""
        wanted = [i for i in ids if base.text_id(i)]
        if not wanted:
            return {}
        async with self.db.cursor() as cur:
            return {p["_id"]: p for p in await base.fetch_all(cur, "products", "id = any(%s)", [wanted])}

    async def shop_settings(self):
        async with self.db.cursor() as cur:
            return await base.fetch_one(cur, "settings", "shop") or {}
