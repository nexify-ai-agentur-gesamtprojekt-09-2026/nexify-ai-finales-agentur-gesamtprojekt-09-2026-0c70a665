"""Werkstattverzeichnis und Werkstattanfragen (PostgreSQL).

Ein Betrieb gilt als verortet, wenn er Koordinaten hat. Listen kommen in Ablagereihenfolge zurück.
"""
import psycopg

from ..errors import AlreadyExists
from . import base

POINT = {"lat", "lon"}


class PgWorkshopStore:
    def __init__(self, db):
        self.db = db

    async def estimated_count(self, database=None):
        async with self.db.cursor() as cur:
            await cur.execute("select count(*) from workshops")
            return (await cur.fetchone())[0]

    async def add_many(self, docs, database=None):
        async with self.db.cursor() as cur:
            for doc in docs:
                await base.insert(cur, "workshops", dict(doc))

    async def _points(self, where, params, limit=None):
        async with self.db.cursor() as cur:
            rows = await base.fetch_all(cur, "workshops", where + " and has_lat", params, limit=limit)
        return [base.project(row, only=POINT) for row in rows]

    async def points_by_zip(self, zip_code):
        return await self._points("zip = %s", [zip_code])

    async def points_by_zip_prefix(self, prefix):
        return await self._points("starts_with(zip, %s)", [prefix])

    async def points_by_city(self, city_key):
        return await self._points("city_key = %s", [city_key])

    async def points_by_city_prefix(self, city_key, limit):
        """city_key ist Text, kein Muster."""
        return await self._points("starts_with(city_key, %s)", [city_key], limit)

    async def located_in_box(self, lat_min, lat_max, lon_min, lon_max):
        """Grenzen einschließlich."""
        async with self.db.cursor() as cur:
            return await base.fetch_all(cur, "workshops", "lat >= %s and lat <= %s and lon >= %s and lon <= %s", [lat_min, lat_max, lon_min, lon_max])

    async def _unlocated(self, column, value, limit):
        async with self.db.cursor() as cur:
            return await base.fetch_all(cur, "workshops", f"{column} = %s and not has_lat", [value], limit=limit)

    async def unlocated_by_zip(self, zip_code, limit):
        return await self._unlocated("zip", zip_code, limit)

    async def unlocated_by_city(self, city_key, limit):
        return await self._unlocated("city_key", city_key, limit)

    async def get(self, workshop_id):
        if not base.text_id(workshop_id):
            return None
        async with self.db.cursor() as cur:
            return await base.fetch_one(cur, "workshops", workshop_id)

    async def add_request(self, request):
        try:
            async with self.db.cursor() as cur:
                await base.insert(cur, "workshop_requests", request)
        except psycopg.errors.UniqueViolation:
            raise AlreadyExists() from None

    async def request(self, request_id):
        if not base.text_id(request_id):
            return None
        async with self.db.cursor() as cur:
            return await base.fetch_one(cur, "workshop_requests", request_id)
