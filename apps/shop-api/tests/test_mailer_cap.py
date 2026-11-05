"""Atomic daily mail cap (G17) against an in-memory Mongo double (mongomock-motor).

No real database, provider, mail or network request: the Resend HTTP call is served by an
httpx.MockTransport. Skipped when the optional test-only dependency is absent; install it into an
isolated venv to run:
  pip install --require-hashes -r apps/shop-api/requirements.txt && pip install mongomock-motor
  python -m unittest discover -s apps/shop-api/tests -p 'test_mailer_cap.py'

Guards the fix for the count-then-act race: the old cap check counted already-sent mails and then
sent, so concurrent deliveries each passed the check and exceeded the cap. The fix reserves a daily
slot atomically before sending; this test asserts the cap holds under concurrency and that a definite
non-send releases the reserved slot.
"""
import asyncio
import os
import sys
import unittest
from pathlib import Path

SERVICE = Path(__file__).resolve().parents[1]

try:
    import dotenv
    import httpx
    import motor.motor_asyncio
    from mongomock_motor import AsyncMongoMockClient
except ImportError:  # optional isolated test dependency
    AsyncMongoMockClient = None

ENV = {"MONGO_URL": "mongodb://in-memory.invalid/mailcap_unittest", "DB_NAME": "mailcap_unittest",
       "PREVIEW_PUBLIC_ORIGIN": "https://shop.example.invalid", "SHOP_VAT_PERCENT": "19",
       "RESEND_API_KEY": "re_test_key", "RESEND_FROM_ADDRESS": "versand@example.invalid",
       "MAIL_DAILY_CAP": "2", "GATEWAY_PORT": "0"}


@unittest.skipIf(AsyncMongoMockClient is None, "mongomock-motor (test-only) not installed")
class MailerDailyCapTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved = (dotenv.load_dotenv, motor.motor_asyncio.AsyncIOMotorClient,
                     {k: os.environ.get(k) for k in ENV}, set(sys.modules))
        dotenv.load_dotenv = lambda *a, **k: False
        motor.motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient
        os.environ.update(ENV)
        sys.path.insert(0, str(SERVICE))
        global mailer, shop_db
        from shop import mailer, db as shop_db

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
        mailer.transport = None

    def setUp(self):
        self.db = shop_db.db
        async def reset():
            for name in ("outbox", "mail_quota"):
                await self.db[name].delete_many({})
        asyncio.run(reset())

    def _ok_transport(self):
        return httpx.MockTransport(lambda request: httpx.Response(200, json={"id": "prov-ok"}))

    def _error_transport(self):
        return httpx.MockTransport(lambda request: httpx.Response(500, json={"error": "server"}))

    async def _seed(self, count):
        for i in range(count):
            await self.db.outbox.insert_one({"_id": "evt-%d" % i, "to": "kunde%d@example.invalid" % i,
                                             "subject": "Betreff %d" % i, "html": "<p>h</p>", "text": "t",
                                             "reply_to": "", "status": "wartend", "attempts": 0})

    def test_concurrent_deliveries_never_exceed_daily_cap(self):
        """Five concurrent deliveries with cap 2: exactly 2 sent, 3 deferred, quota == 2."""
        async def run():
            await self._seed(5)
            mailer.transport = self._ok_transport()
            results = await asyncio.gather(*[mailer.deliver("evt-%d" % i) for i in range(5)])
            return results
        asyncio.run(run())
        async def check():
            sent = await self.db.outbox.count_documents({"status": "gesendet"})
            deferred = await self.db.outbox.count_documents({"status": "zurückgestellt", "last_error": "daily_cap_reached"})
            quota = await self.db.mail_quota.find_one({"_id": _today()})
            return sent, deferred, quota
        sent, deferred, quota = asyncio.run(check())
        self.assertEqual(sent, 2, "cap must hold under concurrency; sent exceeded the daily cap")
        self.assertEqual(deferred, 3, "deliveries beyond the cap must defer, not send")
        self.assertIsNotNone(quota)
        self.assertEqual(quota["sent"], 2, "reserved slot count must equal the cap, no over-reservation")

    def test_provider_error_releases_reserved_slot(self):
        """A provider rejection releases the slot so a later success still fits under the cap."""
        async def run():
            await self._seed(2)
            mailer.transport = self._error_transport()
            await mailer.deliver("evt-0")  # rejected (HTTP 500) -> slot released
            after_fail = (await self.db.mail_quota.find_one({"_id": _today()})) or {"sent": 0}
            mailer.transport = self._ok_transport()
            await mailer.deliver("evt-1")  # must still be allowed to send
            return after_fail
        after_fail = asyncio.run(run())
        async def check():
            sent = await self.db.outbox.count_documents({"status": "gesendet"})
            quota = await self.db.mail_quota.find_one({"_id": _today()})
            return sent, quota
        sent, quota = asyncio.run(check())
        self.assertEqual(after_fail["sent"], 0, "a provider rejection must release the reserved slot")
        self.assertEqual(sent, 1, "the retry after a released slot must send within the cap")
        self.assertEqual(quota["sent"], 1)


def _today():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


if __name__ == "__main__":
    unittest.main()
