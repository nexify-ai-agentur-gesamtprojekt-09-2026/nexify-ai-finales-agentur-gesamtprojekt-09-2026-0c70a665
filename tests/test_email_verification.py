"""E-mail confirmation: real routers, in-memory store, mail port replaced by a stand-in. No network."""
import json
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

from suite_fakes import ROOT, Database, bind_shop_environment

bind_shop_environment()
try:
    import httpx
    from fastapi import FastAPI
    from shop import accounts_api, mailer, verification_api
    HTTP_DEPS = True
except ImportError:
    HTTP_DEPS = False

ON = {"NEXIFY_SUITE": "on", "NEXIFY_SUITE_EMAIL_VERIFICATION": "on"}
PASSWORD = "fixture-passphrase-only"


class Capture:
    def __init__(self):
        self.sent, self.fail = [], False

    async def send_verification(self, *, to, link, event_key):
        if self.fail:
            raise RuntimeError("fixture delivery failure")
        self.sent.append({"to": to, "link": link, "event_key": event_key})
        return "gesendet"


class SwitchParity(unittest.TestCase):
    def test_shop_switch_matches_the_suite_switch_definition(self):
        sys.path.insert(0, str(ROOT / "apps"))
        from suite import flags
        source = (ROOT / "apps/shop-api/shop/verification_api.py").read_text() + (ROOT / "apps/shop-api/shop/accounts_api.py").read_text()
        self.assertEqual(source.count('get("NEXIFY_SUITE") == "on"'), 2)
        self.assertEqual(source.count('get("NEXIFY_SUITE_EMAIL_VERIFICATION") == "on"'), 2)
        self.assertIn("EMAIL_VERIFICATION", flags.FEATURES)
        self.assertEqual(flags.MASTER, "NEXIFY_SUITE")


@unittest.skipUnless(HTTP_DEPS, "pinned FastAPI/httpx dependencies unavailable")
class EmailVerification(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = Database()
        await self.db.users.create_index("email", unique=True)
        await self.db.email_verifications.create_index("token_hash", unique=True)
        self.capture = Capture()

        async def no_welcome(user):
            return None
        patches = [mock.patch.object(accounts_api, "db", self.db), mock.patch.object(verification_api, "db", self.db),
                   mock.patch.object(mailer, "db", self.db), mock.patch.object(verification_api, "delivery", self.capture),
                   mock.patch.object(accounts_api, "send_welcome", no_welcome), mock.patch.dict(os.environ, ON)]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)
        app = FastAPI()
        app.include_router(accounts_api.router)
        app.include_router(verification_api.router)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://suite.example.invalid")
        self.addAsyncCleanup(self.client.aclose)

    async def register(self, email="kundin@example.invalid"):
        response = await self.client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
        self.assertEqual(response.status_code, 201, response.text)
        return response

    def token(self, index=-1):
        return self.capture.sent[index]["link"].split("token=", 1)[1]

    async def user(self, email="kundin@example.invalid"):
        return await self.db.users.find_one({"email": email})

    async def test_switch_off_keeps_todays_behaviour(self):
        with mock.patch.dict(os.environ, {"NEXIFY_SUITE_EMAIL_VERIFICATION": "off"}):
            await self.register()
            self.assertEqual(self.capture.sent, [])
            self.assertEqual(self.db.email_verifications.rows, [])
            self.assertEqual((await self.client.post("/api/auth/verify-email", json={"token": "x" * 43})).status_code, 404)
            self.assertEqual((await self.client.post("/api/auth/verify-email/resend")).status_code, 404)
        for partial in ({"NEXIFY_SUITE": "on"}, {"NEXIFY_SUITE_EMAIL_VERIFICATION": "on"}, {"NEXIFY_SUITE": "1", "NEXIFY_SUITE_EMAIL_VERIFICATION": "on"}, {}):
            self.assertFalse(verification_api.enabled(partial), partial)

    async def test_token_is_stored_hashed_and_confirms_once(self):
        await self.register()
        self.assertEqual(len(self.capture.sent), 1)
        sent, token = self.capture.sent[0], self.token()
        self.assertEqual(sent["to"], "kundin@example.invalid")
        self.assertTrue(sent["link"].startswith("https://"))
        self.assertGreaterEqual(len(token), 43)
        stored = repr(self.db.email_verifications.rows) + repr(self.db.users.rows)
        self.assertNotIn(token, stored)
        self.assertNotIn("kundin@example.invalid", repr(self.db.email_verifications.rows))
        self.assertNotIn(token, sent["event_key"])
        self.assertEqual(self.db.email_verifications.rows[0]["token_hash"], verification_api.digest(token))
        self.assertIsNot((await self.user()).get("email_verified"), True)
        self.assertEqual((await self.client.post("/api/auth/verify-email", json={"token": token})).json(), {"ok": True})
        self.assertIs((await self.user())["email_verified"], True)
        again = await self.client.post("/api/auth/verify-email", json={"token": token})
        self.assertEqual((again.status_code, again.json()["detail"]["error"]), (400, "token_invalid"))

    async def test_expired_unknown_and_reassigned_tokens_are_refused_identically(self):
        await self.register()
        self.db.email_verifications.rows[0]["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)
        answers = [await self.client.post("/api/auth/verify-email", json={"token": self.token()}),
                   await self.client.post("/api/auth/verify-email", json={"token": "A" * 43})]
        await self.register("zweite@example.invalid")
        await self.db.users.update_one({"email": "zweite@example.invalid"}, {"$set": {"email": "geaendert@example.invalid"}})
        answers.append(await self.client.post("/api/auth/verify-email", json={"token": self.token()}))
        self.assertEqual({(a.status_code, a.text) for a in answers}, {(400, answers[0].text)})
        self.assertFalse(any(u.get("email_verified") for u in self.db.users.rows))
        self.assertEqual((await self.client.post("/api/auth/verify-email", json={"token": "short"})).status_code, 422)

    async def test_resend_is_authenticated_limited_and_supersedes_older_links(self):
        async with httpx.AsyncClient(transport=self.client._transport, base_url="https://suite.example.invalid") as anonymous:
            self.assertEqual((await anonymous.post("/api/auth/verify-email/resend")).status_code, 401)
        session = (await self.register()).cookies.get(accounts_api.SESSION_COOKIE)
        headers = {"Authorization": "Bearer " + session}
        self.assertEqual((await self.client.post("/api/auth/verify-email/resend", headers=headers)).status_code, 429)  # too soon

        def age(minutes):
            for row in self.db.email_verifications.rows:
                row["created_at"] -= timedelta(minutes=minutes)
        age(2)
        self.assertEqual((await self.client.post("/api/auth/verify-email/resend", headers=headers)).json(), {"ok": True, "status": "requested"})
        first, second = self.token(0), self.token(1)
        self.assertNotEqual(first, second)
        self.assertEqual((await self.client.post("/api/auth/verify-email", json={"token": first})).status_code, 400)
        age(2)
        self.assertEqual((await self.client.post("/api/auth/verify-email/resend", headers=headers)).status_code, 200)
        age(2)
        self.assertEqual((await self.client.post("/api/auth/verify-email/resend", headers=headers)).status_code, 429)  # window maximum
        self.assertEqual(len(self.capture.sent), verification_api.RESEND_MAX_PER_WINDOW)
        age(60)
        self.assertEqual((await self.client.post("/api/auth/verify-email/resend", headers=headers)).status_code, 200)
        self.assertEqual((await self.client.post("/api/auth/verify-email", json={"token": self.token()})).status_code, 200)
        done = await self.client.post("/api/auth/verify-email/resend", headers=headers)
        self.assertEqual(done.json(), {"ok": True, "status": "already_verified"})
        self.assertEqual(len(self.capture.sent), 4)

    async def test_delivery_failure_does_not_break_registration(self):
        self.capture.fail = True
        await self.register()
        self.assertEqual(self.db.email_verifications.rows[0]["mail_status"], "delivery_failed")
        self.assertIsNot((await self.user()).get("email_verified"), True)

    async def test_mail_text_is_short_factual_and_without_commercial_statements(self):
        subject, html, text = verification_api.message("https://suite.example.invalid/konto/email-bestaetigen?token=TOKEN")
        self.assertIn("NeXify AI FACTORY", text)
        self.assertIn("mail@nexifyai.cloud", text)
        self.assertIn("token=TOKEN", text)
        self.assertIn("60 Minuten", text)
        self.assertLess(len(text), 600)
        lowered = (subject + text + html).lower()
        for word in ("€", "eur", "preis", "kostenlos", "gratis", "garant", "tarif", "abo", "angebot", "teileklar", "rabatt", "test"):
            self.assertNotIn(word, lowered, word)

    async def test_outbox_adapter_uses_a_nexify_sender_or_sends_nothing(self):
        requests = []

        def handler(request):
            requests.append(json.loads(request.content))
            return httpx.Response(200, json={"id": "fixture-mail"})
        adapter = verification_api.OutboxVerificationMailer()
        env = {"RESEND_API_KEY": "fixture-not-a-key", "RESEND_FROM": "", "RESEND_FROM_ADDRESS": "shop@example.invalid", "MAIL_DAILY_CAP": ""}
        with mock.patch.object(mailer, "transport", httpx.MockTransport(handler)):
            with mock.patch.dict(os.environ, {**env, "NEXIFY_MAIL_FROM": ""}):
                self.assertEqual(await adapter.send_verification(to="k@example.invalid", link="https://suite.example.invalid/x?token=T", event_key="verify:1"), "not_configured")
            self.assertEqual((requests, self.db.outbox.rows), ([], []))
            with mock.patch.dict(os.environ, {**env, "NEXIFY_MAIL_FROM": "NeXify AI FACTORY <konto@example.invalid>"}):
                status = await adapter.send_verification(to="k@example.invalid", link="https://suite.example.invalid/x?token=T", event_key="verify:2")
                # The shop's own mail keeps its sender: the explicit sender is per message only.
                await mailer.enqueue("shop:1", "k@example.invalid", "Bestellung", "<p>x</p>", "x")
        self.assertEqual(status, "gesendet")
        self.assertEqual([r["from"] for r in requests], ["NeXify AI FACTORY <konto@example.invalid>", "TEILEKLAR <shop@example.invalid>"])
        self.assertEqual(requests[0]["subject"], verification_api.SUBJECT)


if __name__ == "__main__":
    unittest.main()
