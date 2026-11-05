"""Price-release safety gate (admin settings + price-release) against an in-memory Mongo double.

No real database or network. Skipped when the optional test-only dependency is absent:
  pip install --require-hashes -r apps/shop-api/requirements.txt && pip install mongomock-motor
  python -m unittest discover -s apps/shop-api/tests -p 'test_price_release.py'

Pins the money-safety invariant: prices are not "released" until an explicit release that matches the
current markup; changing the markup afterwards invalidates the prior release (must be re-released).
"""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

SERVICE = Path(__file__).resolve().parents[1]
GATEWAY = SERVICE.parent / "agent-gateway"

try:
    import dotenv
    import motor.motor_asyncio
    from mongomock_motor import AsyncMongoMockClient
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
except ImportError:  # optional isolated test dependency
    AsyncMongoMockClient = None

ENV = {"MONGO_URL": "mongodb://in-memory.invalid/pricerel_unittest", "DB_NAME": "pricerel_unittest",
       "PREVIEW_PUBLIC_ORIGIN": "https://shop.example.invalid", "SHOP_VAT_PERCENT": "19", "GATEWAY_PORT": "0"}


@unittest.skipIf(AsyncMongoMockClient is None, "mongomock-motor (test-only) not installed")
class PriceReleaseGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved = (dotenv.load_dotenv, motor.motor_asyncio.AsyncIOMotorClient,
                     {k: os.environ.get(k) for k in ENV}, set(sys.modules), list(sys.path))
        dotenv.load_dotenv = lambda *a, **k: False
        motor.motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient
        os.environ.update(ENV)
        sys.path.insert(0, str(SERVICE))
        sys.path.insert(0, str(GATEWAY))
        global admin_api, accounts_api, shop_db
        from shop import admin_api, accounts_api, db as shop_db

    @classmethod
    def tearDownClass(cls):
        load, client, env, modules, path = cls.saved
        dotenv.load_dotenv, motor.motor_asyncio.AsyncIOMotorClient = load, client
        for key, value in env.items():
            os.environ.pop(key, None) if value is None else os.environ.__setitem__(key, value)
        for name in set(sys.modules) - modules:
            if name == "shop" or name.startswith("shop."):
                sys.modules.pop(name, None)
        sys.path[:] = path

    def setUp(self):
        self.database = shop_db.db
        async def seed():
            for name in ("settings", "users", "sessions", "price_releases", "revolut_webhooks"):
                await self.database[name].delete_many({})
            future = datetime.now(timezone.utc) + timedelta(days=1)
            await self.database.users.insert_one({"user_id": "admin-1", "email": "admin@example.invalid", "role": "admin"})
            await self.database.sessions.insert_one({"token_hash": accounts_api.digest("admin-token"), "user_id": "admin-1", "expires_at": future})
        self.client = TestClient(FastAPI(routes=admin_api.router.routes), base_url="https://shop.example.invalid")
        self.client.__enter__()
        self.client.portal.call(seed)
        self.addCleanup(self.client.__exit__, None, None, None)

    def _auth(self):
        return {"Authorization": "Bearer admin-token"}

    def _set_markup(self, markup):
        return self.client.put("/api/admin/settings", headers=self._auth(), json={"markup_percent": markup, "shipping_cents": 500})

    def test_new_markup_is_not_released_until_explicit_release(self):
        r = self._set_markup("25")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["price_released"], "a freshly set markup must not be released automatically")
        released = self.client.post("/api/admin/price-release", headers=self._auth())
        self.assertEqual(released.status_code, 200)
        self.assertTrue(released.json()["price_released"], "an explicit release must mark the current markup released")

    def test_changing_markup_invalidates_a_prior_release(self):
        self._set_markup("25")
        self.client.post("/api/admin/price-release", headers=self._auth())
        self.assertTrue(self.client.get("/api/admin/settings", headers=self._auth()).json()["price_released"])
        # changing the markup after a release must drop the released state until re-released
        self._set_markup("30")
        self.assertFalse(self.client.get("/api/admin/settings", headers=self._auth()).json()["price_released"],
                         "a markup change must invalidate the prior price release")

    def test_invalid_markup_rejected(self):
        self.assertEqual(self._set_markup("600").status_code, 422)
        self.assertEqual(self._set_markup("abc").status_code, 422)


if __name__ == "__main__":
    unittest.main()
