"""Admin authorization invariant against an in-memory Mongo double (mongomock-motor).

No real database or network. Skipped when the optional test-only dependency is absent:
  pip install --require-hashes -r apps/shop-api/requirements.txt && pip install mongomock-motor
  python -m unittest discover -s apps/shop-api/tests -p 'test_admin_authz.py'

Pins a severe-if-regressed invariant: admin endpoints require an authenticated session whose user
record carries role "admin" (never a client claim). No session -> 401, a customer session -> 403,
an admin session -> 200.
"""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

SERVICE = Path(__file__).resolve().parents[1]

try:
    import dotenv
    import motor.motor_asyncio
    from mongomock_motor import AsyncMongoMockClient
    from fastapi import Depends, FastAPI
    from fastapi.testclient import TestClient
except ImportError:  # optional isolated test dependency
    AsyncMongoMockClient = None

ENV = {"MONGO_URL": "mongodb://in-memory.invalid/adminauthz_unittest", "DB_NAME": "adminauthz_unittest",
       "PREVIEW_PUBLIC_ORIGIN": "https://shop.example.invalid", "SHOP_VAT_PERCENT": "19", "GATEWAY_PORT": "0"}


@unittest.skipIf(AsyncMongoMockClient is None, "mongomock-motor (test-only) not installed")
class AdminAuthorizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved = (dotenv.load_dotenv, motor.motor_asyncio.AsyncIOMotorClient,
                     {k: os.environ.get(k) for k in ENV}, set(sys.modules))
        dotenv.load_dotenv = lambda *a, **k: False
        motor.motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient
        os.environ.update(ENV)
        sys.path.insert(0, str(SERVICE))
        # Test the real guard (auth.require_admin) via a tiny protected route, without importing
        # admin_api (whose import chain pulls the bigbuy pipeline). The guard is what enforces authz.
        global auth, accounts_api, shop_db
        from shop import auth, accounts_api, db as shop_db

        async def guarded(ident=Depends(auth.require_admin)):
            return {"ok": True, "role": ident.role}
        app = FastAPI()
        app.get("/api/admin/settings")(guarded)
        cls.app = app

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
            for name in ("users", "sessions", "settings"):
                await self.database[name].delete_many({})
            future = datetime.now(timezone.utc) + timedelta(days=1)
            await self.database.users.insert_one({"user_id": "admin-1", "email": "admin@example.invalid", "role": "admin"})
            await self.database.users.insert_one({"user_id": "cust-1", "email": "kunde@example.invalid", "role": "customer"})
            await self.database.sessions.insert_one({"token_hash": accounts_api.digest("admin-token"), "user_id": "admin-1", "expires_at": future})
            await self.database.sessions.insert_one({"token_hash": accounts_api.digest("cust-token"), "user_id": "cust-1", "expires_at": future})
        self.client = TestClient(self.app, base_url="https://shop.example.invalid")
        self.client.__enter__()
        self.client.portal.call(seed)
        self.addCleanup(self.client.__exit__, None, None, None)

    def test_admin_endpoint_requires_authentication(self):
        self.assertEqual(self.client.get("/api/admin/settings").status_code, 401)

    def test_customer_is_forbidden_from_admin_endpoint(self):
        r = self.client.get("/api/admin/settings", headers={"Authorization": "Bearer cust-token"})
        self.assertEqual(r.status_code, 403)

    def test_admin_session_is_allowed(self):
        r = self.client.get("/api/admin/settings", headers={"Authorization": "Bearer admin-token"})
        self.assertEqual(r.status_code, 200)

    def test_client_claimed_role_cannot_escalate(self):
        # A header that merely claims admin, with a customer session, must still be forbidden.
        r = self.client.get("/api/admin/settings",
                            headers={"Authorization": "Bearer cust-token", "X-Role": "admin", "role": "admin"})
        self.assertEqual(r.status_code, 403)


if __name__ == "__main__":
    unittest.main()
