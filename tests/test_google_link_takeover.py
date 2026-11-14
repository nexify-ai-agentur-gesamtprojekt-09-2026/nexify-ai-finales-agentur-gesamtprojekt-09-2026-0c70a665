"""Google sign-in must not hand an address holder's account to whoever registered it first.

Real router, in-memory store; the identity provider answer is a local stand-in (no network).
"""
import types
import unittest
from unittest import mock

from suite_fakes import Database, bind_shop_environment

bind_shop_environment()
try:
    import httpx
    from fastapi import FastAPI
    from shop import accounts_api
    HTTP_DEPS = True
except ImportError:
    HTTP_DEPS = False

VICTIM = "inhaberin@example.invalid"
ATTACKER_PASSWORD = "fixture-attacker-passphrase"


@unittest.skipUnless(HTTP_DEPS, "pinned FastAPI/httpx dependencies unavailable")
class GoogleLink(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = Database()
        await self.db.users.create_index("email", unique=True)
        self.profile = {"email": VICTIM, "name": "Inhaberin"}
        test = self

        class Provider:
            def __init__(self, **_):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *_):
                return False

            async def get(self, url, headers=None):
                ok = headers.get("X-Session-ID") == "valid-provider-session"
                return types.SimpleNamespace(status_code=200 if ok else 401, json=lambda: test.profile if ok else {})

        async def no_welcome(user):
            return None
        real_client = httpx.AsyncClient
        for patch in (mock.patch.object(accounts_api, "db", self.db), mock.patch.object(accounts_api, "send_welcome", no_welcome),
                      mock.patch.object(accounts_api, "httpx", types.SimpleNamespace(AsyncClient=Provider))):
            patch.start()
            self.addCleanup(patch.stop)
        app = FastAPI()
        app.include_router(accounts_api.router)
        self.transport = httpx.ASGITransport(app=app)
        self.new_client = lambda: real_client(transport=self.transport, base_url="https://suite.example.invalid")

    async def call(self, method, path, token=None, **kwargs):
        async with self.new_client() as client:
            headers = {"Authorization": "Bearer " + token} if token else {}
            return await client.request(method, path, headers=headers, **kwargs)

    async def google(self, session_id="valid-provider-session"):
        return await self.call("POST", "/api/auth/google/session", json={"session_id": session_id})

    async def register(self):
        response = await self.call("POST", "/api/auth/register", json={"email": VICTIM, "password": ATTACKER_PASSWORD})
        self.assertEqual(response.status_code, 201)
        return response.cookies.get(accounts_api.SESSION_COOKIE)

    async def test_linking_an_unconfirmed_password_account_locks_out_the_earlier_registrant(self):
        attacker_session = await self.register()
        self.assertEqual((await self.call("GET", "/api/auth/me", attacker_session)).status_code, 200)
        await self.db.password_resets.insert_one({"token_hash": "h", "user_id": self.db.users.rows[0]["user_id"], "used": False})
        linked = await self.google()
        self.assertEqual(linked.status_code, 200)
        holder_session = linked.cookies.get(accounts_api.SESSION_COOKIE)
        user = await self.db.users.find_one({"email": VICTIM})
        self.assertNotIn("password_hash", user)
        self.assertIs(user["email_verified"], True)
        self.assertIs(user["google_linked"], True)
        self.assertEqual(len(self.db.users.rows), 1)
        self.assertEqual((await self.call("GET", "/api/auth/me", attacker_session)).status_code, 401)
        login = await self.call("POST", "/api/auth/login", json={"email": VICTIM, "password": ATTACKER_PASSWORD})
        self.assertEqual(login.status_code, 401)
        self.assertIs(self.db.password_resets.rows[0]["used"], True)
        self.assertEqual((await self.call("GET", "/api/auth/me", holder_session)).status_code, 200)
        self.assertEqual(len(self.db.sessions.rows), 1)

    async def test_linking_a_confirmed_password_account_keeps_password_and_sessions(self):
        own_session = await self.register()
        await self.db.users.update_one({"email": VICTIM}, {"$set": {"email_verified": True}})
        before = (await self.db.users.find_one({"email": VICTIM}))["password_hash"]
        self.assertEqual((await self.google()).status_code, 200)
        user = await self.db.users.find_one({"email": VICTIM})
        self.assertEqual(user["password_hash"], before)
        self.assertIs(user["google_linked"], True)
        self.assertNotIn("password_invalidated_at", user)
        self.assertEqual((await self.call("GET", "/api/auth/me", own_session)).status_code, 200)
        self.assertEqual((await self.call("POST", "/api/auth/login", json={"email": VICTIM, "password": ATTACKER_PASSWORD})).status_code, 200)

    async def test_new_google_account_is_created_confirmed_and_without_password(self):
        created = await self.google()
        self.assertEqual(created.status_code, 200)
        self.assertEqual(created.json()["email"], VICTIM)
        user = await self.db.users.find_one({"email": VICTIM})
        self.assertEqual((user["role"], user["email_verified"], user["google_linked"]), ("customer", True, True))
        self.assertNotIn("password_hash", user)
        self.assertEqual((await self.call("POST", "/api/auth/login", json={"email": VICTIM, "password": ""})).status_code, 401)
        self.assertEqual((await self.google()).status_code, 200)  # second sign-in reuses the account
        self.assertEqual(len(self.db.users.rows), 1)

    async def test_invalid_provider_session_changes_nothing(self):
        await self.register()
        self.assertEqual((await self.google("forged")).status_code, 401)
        self.assertIn("password_hash", await self.db.users.find_one({"email": VICTIM}))
        self.profile = {"email": "not-an-address"}
        self.assertEqual((await self.google()).status_code, 401)


if __name__ == "__main__":
    unittest.main()
