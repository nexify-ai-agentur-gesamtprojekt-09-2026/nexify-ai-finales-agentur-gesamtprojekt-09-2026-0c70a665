"""Werkstattverzeichnis und Werkstattanfragen (MongoDB).

Ein Betrieb gilt als verortet, wenn er Koordinaten hat. Listen kommen in Ablagereihenfolge zurück.
"""
import re


class MongoWorkshopStore:
    def __init__(self, db):
        self.db = db

    async def estimated_count(self, database=None):
        d = database if database is not None else self.db
        return await d.workshops.estimated_document_count()

    async def add_many(self, docs, database=None):
        d = database if database is not None else self.db
        await d.workshops.insert_many(docs)

    async def _points(self, match, limit=None):
        cursor = self.db.workshops.find({**match, "lat": {"$exists": True}}, {"lat": 1, "lon": 1})
        if limit is not None:
            cursor = cursor.limit(limit)
        return [d async for d in cursor]

    async def points_by_zip(self, zip_code):
        return await self._points({"zip": zip_code})

    async def points_by_zip_prefix(self, prefix):
        return await self._points({"zip": {"$regex": "^" + prefix}})

    async def points_by_city(self, city_key):
        return await self._points({"city_key": city_key})

    async def points_by_city_prefix(self, city_key, limit):
        """city_key ist Text, kein Muster."""
        return await self._points({"city_key": {"$regex": "^" + re.escape(city_key)}}, limit)

    async def located_in_box(self, lat_min, lat_max, lon_min, lon_max):
        """Grenzen einschließlich."""
        return [d async for d in self.db.workshops.find({"lat": {"$gte": lat_min, "$lte": lat_max}, "lon": {"$gte": lon_min, "$lte": lon_max}})]

    async def _unlocated(self, key, limit):
        return [d async for d in self.db.workshops.find({**key, "lat": {"$exists": False}}).limit(limit)]

    async def unlocated_by_zip(self, zip_code, limit):
        return await self._unlocated({"zip": zip_code}, limit)

    async def unlocated_by_city(self, city_key, limit):
        return await self._unlocated({"city_key": city_key}, limit)

    async def get(self, workshop_id):
        return await self.db.workshops.find_one({"_id": workshop_id})

    async def add_request(self, request):
        await self.db.workshop_requests.insert_one(request)

    async def request(self, request_id):
        return await self.db.workshop_requests.find_one({"_id": request_id})
