"""Katalog und Shop-Einstellungen lesen (MongoDB)."""
import re

# Nur diese Felder verlassen den Speicher für Listen; purchase_cents dient der Preisberechnung im Dienst.
LIST_FIELDS = {"_id": 1, "sku": 1, "ean": 1, "name": 1, "images": 1, "stock": 1, "purchase_cents": 1, "category_id": 1, "category_ids": 1, "imported_at": 1, "source_partial": 1}
ORDERINGS = {"availability": [("stock", -1), ("name", 1)], "price_asc": [("purchase_cents", 1), ("name", 1)],
             "price_desc": [("purchase_cents", -1), ("name", 1)], "name": [("name", 1)]}


class MongoCatalogStore:
    def __init__(self, db):
        self.db = db

    async def count_published(self):
        return await self.db.products.count_documents({"active": True})

    async def last_finished_import(self):
        return await self.db.imports.find_one({"status": "done"}, sort=[("finished_at", -1)])

    async def recent_imports(self, limit):
        """Importläufe jeden Zustands, zuletzt gestartete zuerst."""
        return [r async for r in self.db.imports.find({}).sort("started_at", -1).limit(limit)]

    async def published_counts_by_category(self):
        return {row["_id"]: row["n"] async for row in self.db.products.aggregate([{"$match": {"active": True}}, {"$unwind": "$category_ids"}, {"$group": {"_id": "$category_ids", "n": {"$sum": 1}}}])}

    async def categories(self):
        return [c async for c in self.db.categories.find({})]

    async def category(self, category_id):
        return await self.db.categories.find_one({"_id": category_id})

    @staticmethod
    def _search(term, category, in_stock):
        query = {"active": True}
        if in_stock:
            query["stock"] = {"$gt": 0}
        if term:
            pattern = re.escape(term)
            query["$or"] = [{"name": {"$regex": pattern, "$options": "i"}}, {"sku": {"$regex": "^" + pattern, "$options": "i"}}, {"ean": term}]
        if category is not None:
            query["category_ids"] = category
        return query

    async def count_search(self, *, term, category, in_stock):
        """Veröffentlichte Produkte: Name enthält term, Artikelnummer beginnt damit oder EAN ist gleich (ohne Groß-/Kleinschreibung)."""
        return await self.db.products.count_documents(self._search(term, category, in_stock))

    async def page_search(self, *, term, category, in_stock, sort, page, page_size):
        cursor = self.db.products.find(self._search(term, category, in_stock), LIST_FIELDS).sort(ORDERINGS[sort]).skip((page - 1) * page_size).limit(page_size)
        return [p async for p in cursor]

    async def published_product(self, product_id):
        return await self.db.products.find_one({"_id": product_id, "active": True})

    async def products_by_id(self, ids):
        """Auch unveröffentlichte: der Warenkorb muss erkennen, dass ein Produkt nicht mehr verfügbar ist."""
        return {p["_id"]: p async for p in self.db.products.find({"_id": {"$in": ids}})}

    async def shop_settings(self):
        return await self.db.settings.find_one({"_id": "shop"}) or {}
