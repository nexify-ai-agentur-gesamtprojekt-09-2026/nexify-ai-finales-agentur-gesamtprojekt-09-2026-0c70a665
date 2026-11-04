"""Cart write semantics against an in-memory Mongo double (mongomock-motor).

No real database, provider, mail or network request. Skipped when the optional
test-only dependency is absent; install it into an isolated venv to run:
  pip install --require-hashes -r apps/shop-api/requirements.txt && pip install mongomock-motor
  python -m unittest discover -s apps/shop-api/tests -p 'test_cart_*.py'
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

KEY = "unittest-add-key-0001"
ENV = {"MONGO_URL": "mongodb://in-memory.invalid/cart_unittest", "DB_NAME": "cart_unittest",
       "PREVIEW_PUBLIC_ORIGIN": "https://shop.example.invalid", "SHOP_VAT_PERCENT": "19",
       "GATEWAY_PORT": "0", "REVOLUT_MODE": "sandbox"}


@unittest.skipIf(AsyncMongoMockClient is None, "mongomock-motor (test-only) not installed")
class CartIdempotencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Never read a developer .env (credentials) and never open a real Mongo client.
        # Everything is restored afterwards so sibling adapter tests see pristine modules.
        cls.saved = (dotenv.load_dotenv, motor.motor_asyncio.AsyncIOMotorClient, {k: os.environ.get(k) for k in ENV}, set(sys.modules))
        dotenv.load_dotenv = lambda *args, **kwargs: False
        motor.motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient
        os.environ.update(ENV)
        sys.path.insert(0, str(SERVICE))
        global cart_api, shop_db
        from shop import cart_api, db as shop_db

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
        database = shop_db.db
        async def seed():
            for name in ("products", "carts", "settings"):
                await database[name].delete_many({})
            await shop_db.ensure_indexes(database)
            await database.settings.insert_one({"_id": "shop", "markup_percent": "30", "shipping_cents": 0,
                                                "price_release": {"released_at": "2026-11-04T00:00:00+00:00", "markup_percent": "30"}})
            await database.products.insert_many([
                {"_id": "synthetic-a", "bigbuy_id": 1, "name": "Synthetic A", "purchase_cents": 1000, "stock": 5, "active": True, "category_ids": []},
                {"_id": "synthetic-b", "bigbuy_id": 2, "name": "Synthetic B", "purchase_cents": 500, "stock": 1, "active": True, "category_ids": []}])
        self.client = TestClient(FastAPI(routes=cart_api.router.routes), base_url="https://shop.example.invalid")
        self.client.__enter__()
        self.client.portal.call(seed)
        self.addCleanup(self.client.__exit__, None, None, None)

    def add(self, quantity, key=KEY, product="synthetic-a", **extra):
        headers = {"Idempotency-Key": key} if key else {}
        return self.client.post("/api/shop/cart/items", headers=headers,
                                json={"product_id": product, "quantity": quantity, "mode": "add", **extra})

    def test_set_mode_remains_absolute_and_backward_compatible(self):
        first = self.client.post("/api/shop/cart/items", json={"product_id": "synthetic-a", "quantity": 2, "price_cents": 1})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["lines"][0]["quantity"], 2)
        self.assertEqual(first.json()["lines"][0]["unit_cents"], 1547)  # 1000 * 1.3 * 1.19, server-side
        again = self.client.post("/api/shop/cart/items", json={"product_id": "synthetic-a", "quantity": 2})
        self.assertEqual(again.json()["count"], 2)

    def test_add_is_additive_from_server_state_and_replay_safe(self):
        self.client.post("/api/shop/cart/items", json={"product_id": "synthetic-a", "quantity": 1})
        added = self.add(2)
        self.assertEqual(added.status_code, 200)
        self.assertEqual(added.json()["lines"][0]["quantity"], 3)
        # Lost response + retry with the same key: no second effect.
        replay = self.add(2)
        self.assertEqual(replay.status_code, 200)
        self.assertEqual(replay.json()["lines"][0]["quantity"], 3)
        # A new intent (new key) adds again.
        self.assertEqual(self.add(1, key="unittest-add-key-0002").json()["lines"][0]["quantity"], 4)

    def test_add_on_fresh_guest_creates_one_cart_and_issues_cookie(self):
        response = self.add(1)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.client.cookies.get("tk_guest"))
        self.assertEqual(self.add(1).json()["count"], 1)

    def test_add_requires_key_positive_quantity_and_respects_stock_and_limit(self):
        self.assertEqual(self.add(1, key=None).status_code, 428)
        self.assertEqual(self.add(1, key="short").status_code, 428)
        self.assertEqual(self.add(0).status_code, 422)
        self.assertEqual(self.add(1, product="synthetic-b").status_code, 200)
        over = self.add(1, key="unittest-add-key-0003", product="synthetic-b")
        self.assertEqual(over.status_code, 409)
        self.assertEqual(over.json()["detail"]["error"], "insufficient_stock")
        self.assertEqual(self.client.get("/api/shop/cart").json()["count"], 1)

    def test_add_rejected_while_price_not_released(self):
        self.client.portal.call(shop_db.db.settings.update_one, {"_id": "shop"}, {"$set": {"price_release": {}}})
        refused = self.add(1)
        self.assertEqual(refused.status_code, 409)
        self.assertEqual(refused.json()["detail"]["error"], "price_not_released")

    def test_forged_well_formed_guest_cookie_is_not_adopted(self):
        forged = "F" * 43
        self.client.cookies.set("tk_guest", forged, domain="shop.example.invalid")
        self.assertEqual(self.client.get("/api/shop/cart").json()["count"], 0)
        self.client.post("/api/shop/cart/items", json={"product_id": "synthetic-a", "quantity": 1})
        rotated = self.client.cookies.get("tk_guest")
        self.assertTrue(rotated)
        self.assertNotEqual(rotated, forged)
        owners = self.client.portal.call(lambda: shop_db.db.carts.distinct("owner"))
        self.assertEqual(owners, ["guest:" + rotated])


if __name__ == "__main__":
    unittest.main()
