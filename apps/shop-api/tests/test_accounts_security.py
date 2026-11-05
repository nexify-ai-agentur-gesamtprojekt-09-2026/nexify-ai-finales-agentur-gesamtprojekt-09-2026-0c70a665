"""Registration/login security invariants (G04, negative cases) against an in-memory Mongo double.

No real database, provider, mail or network. Skipped when the optional test-only dependency is absent:
  pip install --require-hashes -r apps/shop-api/requirements.txt && pip install mongomock-motor
  python -m unittest discover -s apps/shop-api/tests -p 'test_accounts_security.py'

Pins the part of G04 that is safe to assert without building the (owner/design-gated) verification
flow, tenant binding or trial entitlement: registration creates only an unverified customer, never an
elevated role via the request body and never an entitlement; the login lockout holds.
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

ENV = {"MONGO_URL": "mongodb://in-memory.invalid/accsec_unittest", "DB_NAME": "accsec_unittest",
       "PREVIEW_PUBLIC_ORIGIN": "https://shop.example.invalid", "SHOP_VAT_PERCENT": "19", "GATEWAY_PORT": "0"}
GOOD_PW = "supersecret12"


@unittest.skipIf(AsyncMongoMockClient is None, "mongomock-motor (test-only) not installed")
class AccountsSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved = (dotenv.load_dotenv, motor.motor_asyncio.AsyncIOMotorClient,
                     {k: os.environ.get(k) for k in ENV}, set(sys.modules))
        dotenv.load_dotenv = lambda *a, **k: False
        motor.motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient
        os.environ.update(ENV)
        sys.path.insert(0, str(SERVICE))
        global accounts_api, shop_db
        from shop import accounts_api, db as shop_db

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
        async def reset():
            for name in ("users", "sessions", "login_failures", "outbox"):
                await self.database[name].delete_many({})
        self.client = TestClient(FastAPI(routes=accounts_api.router.routes), base_url="https://shop.example.invalid")
        self.client.__enter__()
        self.client.portal.call(reset)
        self.addCleanup(self.client.__exit__, None, None, None)

    def _find_user(self, email):
        async def q():
            return await self.database.users.find_one({"email": email})
        return self.client.portal.call(q)

    def test_register_ignores_role_in_body_and_creates_unverified_customer(self):
        r = self.client.post("/api/auth/register", json={"email": "neu@example.invalid", "password": GOOD_PW,
                                                          "name": "Neu", "role": "admin", "email_verified": True})
        self.assertEqual(r.status_code, 201)
        body = r.json()
        self.assertEqual(body["role"], "customer", "a role in the request body must not escalate the account")
        self.assertFalse(body["email_verified"], "registration must leave the account unverified")
        user = self._find_user("neu@example.invalid")
        self.assertEqual(user["role"], "customer")
        self.assertFalse(user.get("email_verified"))

    def test_registration_grants_no_entitlement(self):
        self.client.post("/api/auth/register", json={"email": "kunde@example.invalid", "password": GOOD_PW, "name": "K"})
        async def counts():
            return (await self.database.entitlements.count_documents({}),
                    await self.database.suite_trials.count_documents({}))
        ent, trials = self.client.portal.call(counts)
        self.assertEqual(ent, 0, "registration must not create an entitlement")
        self.assertEqual(trials, 0, "registration must not start a suite trial")

    def test_duplicate_email_is_rejected(self):
        first = self.client.post("/api/auth/register", json={"email": "dup@example.invalid", "password": GOOD_PW, "name": "A"})
        second = self.client.post("/api/auth/register", json={"email": "dup@example.invalid", "password": GOOD_PW, "name": "B"})
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 409)

    def test_short_password_is_rejected(self):
        r = self.client.post("/api/auth/register", json={"email": "kurz@example.invalid", "password": "short", "name": "K"})
        self.assertEqual(r.status_code, 422)

    def test_login_locks_out_after_max_failures(self):
        self.client.post("/api/auth/register", json={"email": "lock@example.invalid", "password": GOOD_PW, "name": "L"})
        statuses = []
        for _ in range(accounts_api.MAX_FAILS + 1):
            resp = self.client.post("/api/auth/login", json={"email": "lock@example.invalid", "password": "wrong-password"})
            statuses.append(resp.status_code)
        self.assertEqual(statuses[:accounts_api.MAX_FAILS], [401] * accounts_api.MAX_FAILS, "each wrong attempt is unauthorized")
        self.assertEqual(statuses[-1], 429, "the attempt after the limit must be locked out")


if __name__ == "__main__":
    unittest.main()
