"""Guest-cart merge safety (G02) against an in-memory Mongo double (mongomock-motor).

No real database or network. Skipped when the optional test-only dependency is absent:
  pip install --require-hashes -r apps/shop-api/requirements.txt && pip install mongomock-motor
  python -m unittest discover -s apps/shop-api/tests -p 'test_cart_merge_safety.py'

Guards the fix for the loss window: the old merge deleted the guest cart first and committed the
merged items afterwards, so a failure in between lost the guest items. The fix commits into the user
cart first and deletes the guest cart only after, and re-applying the same guest cart is idempotent.
"""
import asyncio
import os
import sys
import types
import unittest
from pathlib import Path

SERVICE = Path(__file__).resolve().parents[1]

try:
    import dotenv
    import motor.motor_asyncio
    from mongomock_motor import AsyncMongoMockClient
except ImportError:  # optional isolated test dependency
    AsyncMongoMockClient = None

ENV = {"MONGO_URL": "mongodb://in-memory.invalid/cartmerge_unittest", "DB_NAME": "cartmerge_unittest",
       "PREVIEW_PUBLIC_ORIGIN": "https://shop.example.invalid", "SHOP_VAT_PERCENT": "19", "GATEWAY_PORT": "0"}


@unittest.skipIf(AsyncMongoMockClient is None, "mongomock-motor (test-only) not installed")
class CartMergeSafetyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved = (dotenv.load_dotenv, motor.motor_asyncio.AsyncIOMotorClient,
                     {k: os.environ.get(k) for k in ENV}, set(sys.modules))
        dotenv.load_dotenv = lambda *a, **k: False
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
        self.db = shop_db.db
        asyncio.run(self.db.carts.delete_many({}))

    def ident(self):
        return types.SimpleNamespace(guest_id="g1", owner="user:u1")

    async def _seed(self):
        await self.db.carts.insert_one({"owner": "guest:g1", "items": [{"product_id": "p1", "quantity": 2}], "rev": 1})
        await self.db.carts.insert_one({"owner": "user:u1", "items": [{"product_id": "p1", "quantity": 1}], "rev": 1})

    def test_commit_failure_does_not_lose_guest_cart_and_retry_does_not_double_count(self):
        # mongomock returns a fresh collection object per db.carts access, so patching one instance
        # does not stick; inject the commit failure through a stable proxy on cart_api.db instead.
        class FailingCarts:
            def __init__(self, base):
                self._base, self.calls = base, 0
            def __getattr__(self, name):
                if name == "update_one":
                    async def u(*a, **k):
                        self.calls += 1
                        if self.calls == 1:
                            raise RuntimeError("simulated crash during commit")
                        return await self._base.update_one(*a, **k)
                    return u
                return getattr(self._base, name)
        class ProxyDB:
            def __init__(self, base, carts):
                self._base, self._carts = base, carts
            def __getattr__(self, name):
                return self._carts if name == "carts" else getattr(self._base, name)

        async def run():
            await self._seed()
            real = shop_db.db
            proxy = ProxyDB(real, FailingCarts(real.carts))
            cart_api.db = proxy
            try:
                with self.assertRaises(RuntimeError):
                    await cart_api.merge(self.ident())
                guest_after_fail = await self.db.carts.find_one({"owner": "guest:g1"})
                user_after_fail = await self.db.carts.find_one({"owner": "user:u1"})
                await cart_api.merge(self.ident())  # retry succeeds (second update_one delegates)
            finally:
                cart_api.db = real
            guest_after = await self.db.carts.find_one({"owner": "guest:g1"})
            user_after = await self.db.carts.find_one({"owner": "user:u1"})
            return guest_after_fail, user_after_fail, guest_after, user_after
        gf, uf, ga, ua = asyncio.run(run())
        self.assertIsNotNone(gf, "guest cart must survive a failed commit (no silent loss)")
        self.assertEqual(uf["items"][0]["quantity"], 1, "user cart must be unchanged after a failed commit")
        self.assertIsNone(ga, "guest cart is removed only after a successful commit")
        self.assertEqual(ua["items"][0]["quantity"], 3, "retry merges once: 1 + 2, never double-counts")

    def test_repeated_merge_of_same_guest_is_idempotent(self):
        async def run():
            await self._seed()
            await cart_api.merge(self.ident())  # qty 3, guest deleted
            # the same guest cart reappears (e.g. a duplicate login event) with the same revision
            await self.db.carts.insert_one({"owner": "guest:g1", "items": [{"product_id": "p1", "quantity": 2}], "rev": 1})
            await cart_api.merge(self.ident())
            user = await self.db.carts.find_one({"owner": "user:u1"})
            guest = await self.db.carts.find_one({"owner": "guest:g1"})
            return user, guest
        user, guest = asyncio.run(run())
        self.assertEqual(user["items"][0]["quantity"], 3, "re-merging the same guest cart must not add again")
        self.assertIsNone(guest, "guest cart is cleared after merge")


if __name__ == "__main__":
    unittest.main()
