"""Werkstattsuche (workshops_api) against an in-memory Mongo double (mongomock-motor).

No real database or network. Skipped when the optional test-only dependency is absent:
  pip install --require-hashes -r apps/shop-api/requirements.txt && pip install mongomock-motor
  python -m unittest discover -s apps/shop-api/tests -p 'test_workshops_api.py'

Covers the previously untested P12 module: the Haversine distance that drives the radius filter, the
'Verzeichnisbetrieb, never partner' projection invariant, and the request validation (consent is
mandatory — GDPR) with receipt mail enqueue.
"""
import os
import sys
import unittest
from pathlib import Path

SERVICE = Path(__file__).resolve().parents[1]

try:
    import dotenv
    import motor.motor_asyncio
    from mongomock_motor import AsyncMongoMockClient
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
except ImportError:  # optional isolated test dependency
    AsyncMongoMockClient = None

ENV = {"MONGO_URL": "mongodb://in-memory.invalid/workshops_unittest", "DB_NAME": "workshops_unittest",
       "PREVIEW_PUBLIC_ORIGIN": "https://shop.example.invalid", "SHOP_VAT_PERCENT": "19", "GATEWAY_PORT": "0"}


@unittest.skipIf(AsyncMongoMockClient is None, "mongomock-motor (test-only) not installed")
class WorkshopsApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved = (dotenv.load_dotenv, motor.motor_asyncio.AsyncIOMotorClient,
                     {k: os.environ.get(k) for k in ENV}, set(sys.modules))
        dotenv.load_dotenv = lambda *a, **k: False
        motor.motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient
        os.environ.update(ENV)
        sys.path.insert(0, str(SERVICE))
        global workshops_api, shop_db
        from shop import workshops_api, db as shop_db

    @classmethod
    def tearDownClass(cls):
        load, client, env, modules = cls.saved
        dotenv.load_dotenv, motor.motor_asyncio.AsyncIOMotorClient = load, client
        for key, value in env.items():
            os.environ.pop(key, None) if value is None else os.environ.__setitem__(key, value)
        for name in set(sys.modules) - modules:
            if name == "shop" or name.startswith("shop."):
                sys.modules.pop(name, None)
        sys.path.remove(str(SERVICE))

    def setUp(self):
        self.database = shop_db.db
        async def seed():
            for name in ("workshops", "workshop_requests", "outbox"):
                await self.database[name].delete_many({})
            await self.database.workshops.insert_one({"_id": "w1", "id": "w1", "name": "Werkstatt Mitte", "zip": "10115", "city": "Berlin",
                                                     "city_key": "berlin", "lat": 52.53, "lon": 13.40, "market": "de", "directory_entry": True})
            await self.database.workshops.insert_one({"_id": "w2", "id": "w2", "name": "Werkstatt Nord", "zip": "10117", "city": "Berlin",
                                                     "city_key": "berlin", "lat": 52.52, "lon": 13.41, "market": "de", "directory_entry": True})
            await self.database.workshops.insert_one({"_id": "w3", "id": "w3", "name": "Werkstatt ohne Geo", "zip": "10115", "city": "Berlin",
                                                     "city_key": "berlin", "market": "de", "directory_entry": True})
        self.client = TestClient(FastAPI(routes=workshops_api.router.routes), base_url="https://shop.example.invalid")
        self.client.__enter__()
        self.client.portal.call(seed)
        self.addCleanup(self.client.__exit__, None, None, None)

    def test_haversine_distance_is_correct(self):
        berlin, hamburg = (52.52, 13.405), (53.55, 9.993)
        d = workshops_api.km(berlin[0], berlin[1], hamburg[0], hamburg[1])
        self.assertAlmostEqual(d, 255, delta=8)  # ~255 km great-circle
        self.assertAlmostEqual(workshops_api.km(52.52, 13.405, 52.52, 13.405), 0.0, places=6)

    def test_public_marks_directory_never_partner_and_rounds_distance(self):
        item = workshops_api.public({"id": "w1", "name": "W", "zip": "10115", "city": "Berlin", "lat": 52.5, "lon": 13.4, "empty": ""}, distance=3.456)
        self.assertEqual(item["kind_label"], "Verzeichnisbetrieb")
        self.assertIs(item["partner"], False)
        self.assertEqual(item["distance_km"], 3.5)
        self.assertNotIn("empty", item)

    def test_request_requires_consent_and_valid_fields(self):
        base = {"name": "Max Mustermann", "email": "max@example.invalid", "message": "Bitte um einen Termin nächste Woche.", "consent": True}
        self.assertEqual(self.client.post("/api/workshops/w1/requests", json={**base, "consent": False}).status_code, 422)
        self.assertEqual(self.client.post("/api/workshops/w1/requests", json={**base, "email": "nope"}).status_code, 422)
        self.assertEqual(self.client.post("/api/workshops/w1/requests", json={**base, "message": "kurz"}).status_code, 422)
        self.assertEqual(self.client.post("/api/workshops/unknown/requests", json=base).status_code, 404)
        ok = self.client.post("/api/workshops/w1/requests", json=base)
        self.assertEqual(ok.status_code, 201)
        rid = ok.json()["id"]
        async def check():
            return (await self.database.workshop_requests.find_one({"_id": rid}),
                    await self.database.outbox.find_one({"_id": "workshop_request:" + rid}))
        stored, mail = self.client.portal.call(check)
        self.assertIsNotNone(stored)
        self.assertEqual(stored["workshop_id"], "w1")
        self.assertIsNotNone(mail, "a receipt mail intent must be enqueued")

    def test_search_by_zip_returns_located_within_radius_and_unlocated(self):
        result = self.client.get("/api/workshops/search", params={"q": "10115", "radius": 25}).json()
        self.assertIsNotNone(result["center"])
        ids = {r["id"] for r in result["results"]}
        self.assertIn("w1", ids)
        self.assertIn("w2", ids)
        for r in result["results"]:
            self.assertLessEqual(r["distance_km"], 25)
            self.assertIs(r["partner"], False)
        self.assertIn("w3", {u["id"] for u in result["unlocated"]})


if __name__ == "__main__":
    unittest.main()
