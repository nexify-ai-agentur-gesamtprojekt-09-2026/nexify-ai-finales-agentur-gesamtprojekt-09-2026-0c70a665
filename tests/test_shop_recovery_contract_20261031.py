"""Offline recovery contract tests; no application imports, services or secrets."""
import ast
import asyncio
import copy
from decimal import Decimal
from pathlib import Path
import types
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load_function(path, name, namespace):
    tree = ast.parse((ROOT / path).read_text(encoding="utf-8"))
    node = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == name)
    module = ast.fix_missing_locations(ast.Module(body=[node], type_ignores=[]))
    exec(compile(module, str(path), "exec"), namespace)
    return namespace[name]


class ShopRecoveryContract(unittest.IsolatedAsyncioTestCase):
    async def test_missing_price_and_shipping_approval_is_not_sellable(self):
        class Settings:
            async def find_one(self, query):
                return None

        config = types.SimpleNamespace(DEFAULT_MARKUP_PERCENT=Decimal("30"))
        settings = load_function("apps/shop-api/shop/pricing.py", "settings", {"Decimal": Decimal, "config": config})
        try:
            result = await settings(types.SimpleNamespace(settings=Settings()))
        except (ValueError, LookupError):
            return  # explicit fail-closed result
        self.assertFalse(
            result is not None and result.get("markup_percent") is not None and result.get("shipping_cents") is not None,
            "Missing approved settings must not yield usable markup and shipping prices",
        )

    async def test_paid_transition_recovers_mail_after_interrupted_cart_update(self):
        order = {"_id": "order-test", "status": "zahlung_offen", "revolut_order_id": "fake-provider-id",
                 "owner": "user:test", "lines": [{"product_id": "test-product"}]}
        emails = []

        class Orders:
            async def update_one(self, query, update):
                order.update(update.get("$set", {}))

            async def find_one_and_update(self, query, update):
                if order["status"] == "bezahlt":
                    return None
                previous = copy.deepcopy(order)
                order.update(update.get("$set", {}))
                return previous

            async def find_one(self, query):
                return copy.deepcopy(order)

        class Carts:
            def __init__(self):
                self.interrupted = False

            async def update_one(self, query, update):
                if not self.interrupted:
                    self.interrupted = True
                    raise RuntimeError("injected interruption after paid transition")

        class FakeRevolut:
            async def retrieve_order(self, order_id):
                return {"state": "completed"}

        async def enqueue_paid_mails(paid_order):
            emails.append(paid_order["_id"])

        namespace = {"PAID": "bezahlt", "OPEN": "zahlung_offen", "FAILED": "zahlung_nicht_abgeschlossen",
                     "db": types.SimpleNamespace(orders=Orders(), carts=Carts()), "revolut": FakeRevolut(),
                     "now_iso": lambda: "2026-10-31T00:00:00Z", "send_paid_mails": enqueue_paid_mails}
        sync_payment = load_function("apps/shop-api/shop/checkout_api.py", "sync_payment", namespace)
        try:
            await sync_payment(copy.deepcopy(order))
        except RuntimeError as error:
            self.assertEqual(str(error), "injected interruption after paid transition")
        await sync_payment(copy.deepcopy(order))
        self.assertEqual(emails, ["order-test"], "Retry must recover paid-order mail intent exactly once")


class FakeOutbox:
    def __init__(self, rows):
        self.rows = {row["_id"]: copy.deepcopy(row) for row in rows}

    @staticmethod
    def matches(row, query):
        for key, value in query.items():
            if key == "$or":
                if not any(FakeOutbox.matches(row, item) for item in value):
                    return False
            elif isinstance(value, dict):
                for op, expected in value.items():
                    actual = row.get(key)
                    if op == "$in" and actual not in expected:
                        return False
                    if op == "$lt" and (actual is None or not actual < expected):
                        return False
                    if op == "$exists" and (key in row) != expected:
                        return False
            elif row.get(key) != value:
                return False
        return True

    @staticmethod
    def apply(row, update):
        row.update(update.get("$set", {}))
        for key, value in update.get("$inc", {}).items():
            row[key] = row.get(key, 0) + value

    async def find_one_and_update(self, query, update):
        for row in self.rows.values():
            if self.matches(row, query):
                old = copy.deepcopy(row)
                self.apply(row, update)
                return old
        return None

    async def update_one(self, query, update):
        return await self.find_one_and_update(query, update)

    async def update_many(self, query, update):
        for row in self.rows.values():
            if self.matches(row, query):
                self.apply(row, update)

    async def find_one(self, query, projection=None):
        return next((copy.deepcopy(row) for row in self.rows.values() if self.matches(row, query)), None)

    async def count_documents(self, query):
        return 0

    def find(self, query, projection=None):
        rows = [copy.deepcopy(row) for row in self.rows.values() if self.matches(row, query)]
        class Cursor:
            def limit(self, count):
                self.rows = rows[:count]
                return self
            def __aiter__(self):
                self.iterator = iter(self.rows)
                return self
            async def __anext__(self):
                try:
                    return next(self.iterator)
                except StopIteration:
                    raise StopAsyncIteration
        return Cursor()


class MailerLeaseContract(unittest.IsolatedAsyncioTestCase):
    def setup_mailer(self, rows, outcome=200):
        import datetime
        import secrets
        outbox = FakeOutbox(rows)
        calls = []
        class HTTPError(Exception):
            pass
        class Client:
            def __init__(self, **kwargs):
                pass
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                pass
            async def post(self, url, json, headers):
                calls.append(headers["Idempotency-Key"])
                await asyncio.sleep(0)
                if outcome == "unknown":
                    raise HTTPError("simulated lost response")
                return types.SimpleNamespace(status_code=outcome, json=lambda: {"id": "fake-id"})
        namespace = {"db": types.SimpleNamespace(outbox=outbox), "datetime": datetime.datetime,
                     "timedelta": datetime.timedelta, "timezone": datetime.timezone, "secrets": secrets,
                     "CLAIM_LEASE_SECONDS": 300, "MAX_ATTEMPTS": 5, "transport": None,
                     "httpx": types.SimpleNamespace(AsyncClient=Client, HTTPError=HTTPError),
                     "now_iso": lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(),
                     "setting": lambda name: {"RESEND_API_KEY": "fake", "MAIL_DAILY_CAP": ""}.get(name, ""),
                     "sender": lambda: "fake@example.org"}
        for name in ("_finish", "deliver", "retry_pending"):
            load_function("apps/shop-api/shop/mailer.py", name, namespace)
        return namespace, outbox, calls

    @staticmethod
    def row(status, claimed_at=None):
        row = {"_id": "event", "status": status, "attempts": 0, "to": "fake@example.org",
               "subject": "test", "html": "test", "text": "test", "claim_id": "old"}
        if claimed_at is not None:
            row["claimed_at"] = claimed_at
        return row

    async def test_stale_preparation_recovered_but_fresh_claim_untouched(self):
        import datetime
        now = datetime.datetime.now(datetime.timezone.utc)
        stale = (now - datetime.timedelta(minutes=6)).isoformat()
        fresh = now.isoformat()
        ns, db, calls = self.setup_mailer([self.row("wird_vorbereitet", stale)])
        await ns["retry_pending"]()
        await ns["retry_pending"]()
        self.assertEqual((db.rows["event"]["status"], calls), ("gesendet", ["event"]))
        ns, db, calls = self.setup_mailer([self.row("wird_vorbereitet", fresh)])
        await ns["retry_pending"]()
        self.assertEqual((db.rows["event"]["status"], calls), ("wird_vorbereitet", []))

    async def test_stale_or_legacy_sending_requires_reconciliation(self):
        import datetime
        for timestamp in ("2000-01-01T00:00:00+00:00", None):
            ns, db, calls = self.setup_mailer([self.row("wird_gesendet", timestamp)])
            await ns["retry_pending"]()
            await ns["retry_pending"]()
            self.assertEqual((db.rows["event"]["status"], calls), ("abgleich_erforderlich", []))
        fresh = datetime.datetime.now(datetime.timezone.utc).isoformat()
        ns, db, calls = self.setup_mailer([self.row("wird_gesendet", fresh)])
        await ns["retry_pending"]()
        self.assertEqual((db.rows["event"]["status"], calls), ("wird_gesendet", []))

    async def test_legacy_failed_outcome_is_not_blindly_retried(self):
        ns, db, calls = self.setup_mailer([self.row("fehlgeschlagen")])
        await ns["retry_pending"]()
        self.assertEqual((db.rows["event"]["status"], calls), ("fehlgeschlagen", []))

    async def test_reclaimed_preparation_fences_original_worker(self):
        ns, db, calls = self.setup_mailer([self.row("wartend")])
        ns["setting"] = lambda name: {"RESEND_API_KEY": "fake", "MAIL_DAILY_CAP": "1"}.get(name, "")
        async def expire_during_preparation(query):
            db.rows["event"]["claimed_at"] = "2000-01-01T00:00:00+00:00"
            await db.update_many({"status": "wird_vorbereitet", "claimed_at": {"$lt": "2001"}}, {"$set": {"status": "wartend"}})
            return 0
        db.count_documents = expire_during_preparation
        await ns["deliver"]("event")
        self.assertEqual((db.rows["event"]["status"], calls), ("wartend", []))

    async def test_concurrent_workers_claim_once(self):
        ns, db, calls = self.setup_mailer([self.row("wartend")])
        await asyncio.gather(ns["deliver"]("event"), ns["deliver"]("event"))
        await ns["retry_pending"]()
        self.assertEqual((db.rows["event"]["status"], calls), ("gesendet", ["event"]))

    async def test_definite_rejection_and_uncertain_outcomes(self):
        for outcome, expected in ((400, "fehlgeschlagen"), (503, "abgleich_erforderlich"), ("unknown", "abgleich_erforderlich")):
            ns, db, calls = self.setup_mailer([self.row("wartend")], outcome)
            await ns["deliver"]("event")
            self.assertEqual(db.rows["event"]["status"], expected)
            if expected == "abgleich_erforderlich":
                await ns["retry_pending"]()
                self.assertEqual(calls, ["event"])

    async def test_database_failure_after_provider_success_needs_manual_reconciliation(self):
        ns, db, calls = self.setup_mailer([self.row("wartend")])
        original = db.update_one
        async def failing_update(query, update):
            if update.get("$set", {}).get("status") == "gesendet":
                raise RuntimeError("injected database failure")
            return await original(query, update)
        db.update_one = failing_update
        with self.assertRaisesRegex(RuntimeError, "injected database failure"):
            await ns["deliver"]("event")
        db.rows["event"]["claimed_at"] = "2000-01-01T00:00:00+00:00"
        await ns["retry_pending"]()
        self.assertEqual((db.rows["event"]["status"], calls), ("abgleich_erforderlich", ["event"]))


if __name__ == "__main__":
    unittest.main()
