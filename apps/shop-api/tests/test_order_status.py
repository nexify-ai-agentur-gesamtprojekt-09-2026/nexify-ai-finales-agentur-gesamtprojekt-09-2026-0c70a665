"""Order fulfilment state machine (admin set_order_status) against an in-memory Mongo double.

No real database or network. Skipped when the optional test-only dependency is absent:
  pip install --require-hashes -r apps/shop-api/requirements.txt && pip install mongomock-motor
  python -m unittest discover -s apps/shop-api/tests -p 'test_order_status.py'

Pins the fulfilment transitions (only from a paid order along FLOW), the tracking requirement for
shipment, and the optimistic concurrency guard that rejects a stale repeat.
"""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

SERVICE = Path(__file__).resolve().parents[1]
GATEWAY = SERVICE.parent / "agent-gateway"  # provides the bare `bigbuy_get` module the import pipeline needs

try:
    import dotenv
    import motor.motor_asyncio
    from mongomock_motor import AsyncMongoMockClient
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
except ImportError:  # optional isolated test dependency
    AsyncMongoMockClient = None

ENV = {"MONGO_URL": "mongodb://in-memory.invalid/orderstatus_unittest", "DB_NAME": "orderstatus_unittest",
       "PREVIEW_PUBLIC_ORIGIN": "https://shop.example.invalid", "SHOP_VAT_PERCENT": "19", "GATEWAY_PORT": "0"}


@unittest.skipIf(AsyncMongoMockClient is None, "mongomock-motor (test-only) not installed")
class OrderStatusFlowTests(unittest.TestCase):
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
            for name in ("orders", "users", "sessions", "outbox"):
                await self.database[name].delete_many({})
            future = datetime.now(timezone.utc) + timedelta(days=1)
            await self.database.users.insert_one({"user_id": "admin-1", "email": "admin@example.invalid", "role": "admin"})
            await self.database.sessions.insert_one({"token_hash": accounts_api.digest("admin-token"), "user_id": "admin-1", "expires_at": future})
            await self.database.orders.insert_one({"_id": "ord-1", "number": "T-1001", "status": "bezahlt", "fulfilment": None,
                                                  "address": {"email": "kunde@example.invalid"}, "lines": []})
            await self.database.orders.insert_one({"_id": "ord-open", "number": "T-1002", "status": "offen", "fulfilment": None,
                                                  "address": {"email": "kunde@example.invalid"}, "lines": []})
        self.client = TestClient(FastAPI(routes=admin_api.router.routes), base_url="https://shop.example.invalid")
        self.client.__enter__()
        self.client.portal.call(seed)
        self.addCleanup(self.client.__exit__, None, None, None)

    def _post(self, order_id, status, tracking="", carrier=""):
        return self.client.post("/api/admin/orders/%s/status" % order_id,
                                headers={"Authorization": "Bearer admin-token"},
                                json={"status": status, "tracking_number": tracking, "carrier": carrier})

    def test_valid_transition_from_paid(self):
        self.assertEqual(self._post("ord-1", "in_bearbeitung").status_code, 200)

    def test_shipment_requires_tracking_number(self):
        self._post("ord-1", "in_bearbeitung")
        self.assertEqual(self._post("ord-1", "versendet").status_code, 422)
        self.assertEqual(self._post("ord-1", "versendet", tracking="TRACK-123", carrier="DHL").status_code, 200)

    def test_illegal_transition_is_rejected(self):
        # zugestellt may only follow versendet, never a freshly paid order.
        self.assertEqual(self._post("ord-1", "zugestellt").status_code, 409)

    def test_unpaid_order_cannot_advance(self):
        self.assertEqual(self._post("ord-open", "in_bearbeitung").status_code, 409)

    def test_stale_repeat_is_rejected(self):
        self.assertEqual(self._post("ord-1", "in_bearbeitung").status_code, 200)
        # repeating the same transition: current fulfilment is no longer a valid predecessor.
        self.assertEqual(self._post("ord-1", "in_bearbeitung").status_code, 409)


if __name__ == "__main__":
    unittest.main()
