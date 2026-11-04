"""Quote drafts (Angebotsentwurf) against an in-memory Mongo double (mongomock-motor).

No real database, provider, mail or network request. Skipped when the optional
test-only dependency is absent; install it into an isolated venv to run:
  pip install --require-hashes -r apps/shop-api/requirements.txt && pip install mongomock-motor
  python -m unittest discover -s apps/shop-api/tests -p 'test_quotes_*.py'
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
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
except ImportError:  # optional isolated test dependency
    AsyncMongoMockClient = None

KEY = "unittest-quote-key-0001"
ENV = {"MONGO_URL": "mongodb://in-memory.invalid/quotes_unittest", "DB_NAME": "quotes_unittest",
       "PREVIEW_PUBLIC_ORIGIN": "https://shop.example.invalid", "SHOP_VAT_PERCENT": "19",
       "GATEWAY_PORT": "0", "REVOLUT_MODE": "sandbox"}


@unittest.skipIf(AsyncMongoMockClient is None, "mongomock-motor (test-only) not installed")
class QuoteDraftTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Never read a developer .env (credentials) and never open a real Mongo client.
        # Everything is restored afterwards so sibling adapter tests see pristine modules.
        cls.saved = (dotenv.load_dotenv, motor.motor_asyncio.AsyncIOMotorClient, {k: os.environ.get(k) for k in ENV}, set(sys.modules))
        dotenv.load_dotenv = lambda *args, **kwargs: False
        motor.motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient
        os.environ.update(ENV)
        sys.path.insert(0, str(SERVICE))
        global quotes_api, accounts_api, mailer, shop_db
        from shop import quotes_api, accounts_api, mailer, db as shop_db

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
        self.sent = []
        async def fake_enqueue(event_key, to, subject, html, text, reply_to=""):
            self.sent.append((event_key, to, subject, text))
            return {"status": "gesendet"} if to else None
        original = mailer.enqueue
        mailer.enqueue = fake_enqueue
        self.addCleanup(setattr, mailer, "enqueue", original)
        async def seed():
            for name in ("quotes", "users", "sessions"):
                await database[name].delete_many({})
            await shop_db.ensure_indexes(database)
            for uid, mail, token in (("u-1", "kunde@example.invalid", "token-one"), ("u-2", "andere@example.invalid", "token-two")):
                await database.users.insert_one({"user_id": uid, "email": mail, "name": uid})
                await database.sessions.insert_one({"token_hash": accounts_api.digest(token), "user_id": uid,
                                                    "created_at": "2026-11-04", "expires_at": datetime.now(timezone.utc) + timedelta(days=1)})
        self.client = TestClient(FastAPI(routes=quotes_api.router.routes), base_url="https://shop.example.invalid")
        self.client.__enter__()
        self.client.portal.call(seed)
        self.addCleanup(self.client.__exit__, None, None, None)

    def auth(self, token="token-one"):
        return {"Authorization": "Bearer " + token}

    def create(self, key=KEY, token="token-one", **body):
        payload = {"title": "Neue Website", "details": "Relaunch mit Shop und Terminbuchung.", "locale": "de", **body}
        return self.client.post("/api/quotes", json=payload, headers={**self.auth(token), "Idempotency-Key": key})

    def test_requires_sign_in(self):
        response = self.client.post("/api/quotes", json={"title": "x", "details": "y"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"]["sign_in_path"], "/anmelden")

    def test_create_is_idempotent_and_never_prices(self):
        first, second = self.create(), self.create()
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(first.json()["state"], "draft_price_review_required")
        self.assertEqual(self.create(title="Etwas anderes").status_code, 409)
        self.assertNotIn("price", first.json())

    def test_validation_and_idempotency_key(self):
        self.assertEqual(self.create(title="ab").status_code, 422)
        self.assertEqual(self.create(locale="es").status_code, 422)
        self.assertEqual(self.create(key="short").status_code, 400)

    def test_pdf_is_owner_only_and_marked_draft(self):
        quote = self.create().json()
        pdf = self.client.get(quote["download_url"], headers=self.auth())
        self.assertEqual(pdf.status_code, 200)
        self.assertTrue(pdf.content.startswith(b"%PDF-1.4"))
        self.assertIn(b"ENTWURF - NICHT VERBINDLICH", pdf.content)
        self.assertIn(b"zur Freigabe", pdf.content)
        self.assertEqual(self.client.get(quote["download_url"], headers=self.auth("token-two")).status_code, 404)
        self.assertEqual(self.client.get("/api/quotes/not-a-valid-id/pdf", headers=self.auth()).status_code, 404)

    def test_list_only_shows_own_quotes(self):
        self.create()
        self.create(key="unittest-quote-key-0002", token="token-two")
        mine = self.client.get("/api/quotes", headers=self.auth()).json()["items"]
        self.assertEqual(len(mine), 1)

    def test_send_goes_to_account_address_and_internal_inbox_once(self):
        quote = self.create().json()
        os.environ["MAIL_INTERNAL_TO"] = "intern@example.invalid"
        self.addCleanup(os.environ.pop, "MAIL_INTERNAL_TO", None)
        response = self.client.post("/api/quotes/%s/send" % quote["id"], headers=self.auth())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["delivery"], "gesendet")
        recipients = sorted(to for _, to, _, _ in self.sent)
        self.assertEqual(recipients, ["intern@example.invalid", "kunde@example.invalid"])
        self.assertTrue(all("Freigabe" in subject + text for _, _, subject, text in self.sent))
        self.assertEqual(self.client.post("/api/quotes/%s/send" % quote["id"], headers=self.auth("token-two")).status_code, 404)


if __name__ == "__main__":
    unittest.main()
