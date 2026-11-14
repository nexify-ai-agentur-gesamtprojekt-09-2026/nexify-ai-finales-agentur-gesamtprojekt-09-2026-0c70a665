"""Offline recovery contract tests; no application imports, services or secrets."""
import ast
import asyncio
import copy
import hashlib
import re
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
    async def test_missing_price_approval_is_unreleased(self):
        class Catalog:
            async def shop_settings(self):
                return {}  # no stored settings; the store contract maps a missing record to {}

        config = types.SimpleNamespace(DEFAULT_MARKUP_PERCENT=Decimal("30"))
        settings = load_function("apps/shop-api/shop/pricing.py", "settings",
                                 {"Decimal": Decimal, "config": config, "store": types.SimpleNamespace(catalog=Catalog())})
        result = await settings()
        self.assertFalse(result["price_released"], "Missing price approval must remain unreleased")

    async def test_existing_order_replay_precedes_price_gate_but_new_order_does_not(self):
        tree = ast.parse((ROOT / "apps/shop-api/shop/checkout_api.py").read_text(encoding="utf-8"))
        node = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == "create_order")
        node.decorator_list = []
        for arg in node.args.args:
            arg.annotation = None
        node.args.defaults = []
        node.returns = None
        calls = []
        class Orders:
            existing = {"_id": "existing", "owner": "user:test", "checkout_url": "https://example.invalid"}
            async def find_one(self, query):
                return self.existing
        orders = Orders()
        async def owner_for(request, response, create=False):
            return types.SimpleNamespace(owner="user:test")
        async def require_price_release():
            calls.append("price_gate")
            raise ValueError("unreleased")
        async def payment_response(order):
            return {"order_id": order["_id"]}
        async def identity(request):
            return types.SimpleNamespace(owner="user:test")
        class HTTPException(Exception):
            def __init__(self, status_code, detail):
                self.status_code, self.detail = status_code, detail
        validation = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "validate_order_replay")
        validator_ns = {"HTTPException": HTTPException, "hashlib": hashlib}
        exec(compile(ast.fix_missing_locations(ast.Module(body=[validation], type_ignores=[])), "checkout_api.py", "exec"), validator_ns)
        namespace = {"auth": types.SimpleNamespace(identity=identity), "validate_order_replay": validator_ns["validate_order_replay"],
                     "owner_for": owner_for, "db": types.SimpleNamespace(orders=orders),
                     "require_price_release": require_price_release, "payment_response": payment_response,
                     "replay": lambda order: {"order_id": order["_id"]}}
        exec(compile(ast.fix_missing_locations(ast.Module(body=[node], type_ignores=[])), "checkout_api.py", "exec"), namespace)
        create = namespace["create_order"]
        self.assertEqual(await create(None, None, None, "test-key"), {"order_id": "existing"})
        self.assertEqual(calls, [])
        orders.existing = {"_id": "foreign", "owner": "user:other"}
        with self.assertRaises(HTTPException) as mismatch:
            await create(None, None, None, "test-key")
        self.assertEqual(mismatch.exception.status_code, 503)
        self.assertEqual(calls, [])
        orders.existing = None
        with self.assertRaisesRegex(ValueError, "unreleased"):
            await create(None, None, None, "test-key")
        self.assertEqual(calls, ["price_gate"])

    async def test_paid_transition_recovers_mail_after_interrupted_cart_update(self):
        order = {"_id": "order-test", "status": "zahlung_offen", "revolut_order_id": "fake-provider-id",
                 "owner": "user:test", "cart_revision": 3, "address": {"email": "customer@example.invalid"},
                 "lines": [{"product_id": "test-product"}]}
        intents = set()
        enqueue_calls = []

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

        class FakeMailer:
            @staticmethod
            def setting(name):
                return "internal@example.invalid"
            async def enqueue(self, key, *args, **kwargs):
                enqueue_calls.append(key)
                intents.add(key)
                return {"_id": key}
        templates = types.SimpleNamespace(order_confirmation=lambda _: ("subject", "html", "text"),
                                          internal_new_order=lambda _: ("subject", "html", "text"))
        fake_db = types.SimpleNamespace(orders=Orders(), carts=Carts())
        send = load_function("apps/shop-api/shop/checkout_api.py", "send_paid_mails",
                             {"PAID": "bezahlt", "db": fake_db, "mailer": FakeMailer(), "mail_templates": templates})
        namespace = {"PAID": "bezahlt", "OPEN": "zahlung_offen", "FAILED": "zahlung_nicht_abgeschlossen",
                     "db": fake_db, "revolut": FakeRevolut(), "revision_filter": lambda owner, revision: {"owner": owner, "revision": revision},
                     "now_iso": lambda: "2026-10-31T00:00:00Z", "send_paid_mails": send}
        sync_payment = load_function("apps/shop-api/shop/checkout_api.py", "sync_payment", namespace)
        with self.assertRaisesRegex(RuntimeError, "injected interruption after paid transition"):
            await sync_payment(copy.deepcopy(order))
        self.assertTrue(order["paid_mail_recovery_pending"])
        self.assertEqual(intents, set())
        await sync_payment(copy.deepcopy(order))
        await sync_payment(copy.deepcopy(order))
        self.assertEqual(intents, {"order_paid:customer:order-test", "order_paid:internal:order-test"})
        self.assertCountEqual(enqueue_calls, ["order_paid:customer:order-test", "order_paid:internal:order-test"])
        self.assertFalse(order["paid_mail_recovery_pending"])

    async def test_outbox_intents_reconcile_after_partial_insert_and_concurrent_callbacks(self):
        order = {"_id": "order-test", "status": "bezahlt", "paid_mail_recovery_pending": True,
                 "address": {"email": "customer@example.invalid"}}
        intents = set()
        class Orders:
            async def update_one(self, query, update):
                order.update(update["$set"])
            def find(self, query):
                self.query = query
                class Cursor:
                    def __aiter__(self):
                        self.done = False
                        return self
                    async def __anext__(self):
                        if self.done or not order.get("paid_mail_recovery_pending"):
                            raise StopAsyncIteration
                        self.done = True
                        return copy.deepcopy(order)
                return Cursor()
        class Mailer:
            fail_once = True
            @staticmethod
            def setting(name):
                return "internal@example.invalid"
            async def enqueue(self, key, *args, **kwargs):
                intents.add(key)
                if self.fail_once:
                    self.fail_once = False
                    raise RuntimeError("interrupted after insert")
                await asyncio.sleep(0)
                return {"_id": key}
        templates = types.SimpleNamespace(order_confirmation=lambda _: ("subject", "html", "text"),
                                          internal_new_order=lambda _: ("subject", "html", "text"))
        orders = Orders()
        ns = {"PAID": "bezahlt", "db": types.SimpleNamespace(orders=orders), "mailer": Mailer(), "mail_templates": templates}
        send = load_function("apps/shop-api/shop/checkout_api.py", "send_paid_mails", ns)
        recover = load_function("apps/shop-api/shop/checkout_api.py", "recover_paid_mail_intents", ns)
        await send(copy.deepcopy(order))
        self.assertTrue(order["paid_mail_recovery_pending"])
        await asyncio.gather(recover(), recover())
        self.assertEqual(intents, {"order_paid:customer:order-test", "order_paid:internal:order-test"})
        self.assertFalse(order["paid_mail_recovery_pending"])
        self.assertTrue(order["paid_mail_intents_recorded"])
        self.assertEqual(orders.query, {"status": "bezahlt", "paid_mail_recovery_pending": True})

    async def test_missing_internal_recipient_never_marks_recovery_complete(self):
        order = {"_id": "order-test", "status": "bezahlt", "paid_mail_recovery_pending": True,
                 "address": {"email": "customer@example.invalid"}}
        updates = []
        class Orders:
            async def update_one(self, *args):
                updates.append(args)
        class Mailer:
            @staticmethod
            def setting(name):
                return ""
            async def enqueue(self, key, to, *args, **kwargs):
                return {"_id": key} if to else None
        templates = types.SimpleNamespace(order_confirmation=lambda _: ("subject", "html", "text"),
                                          internal_new_order=lambda _: ("subject", "html", "text"))
        ns = {"PAID": "bezahlt", "db": types.SimpleNamespace(orders=Orders()), "mailer": Mailer(), "mail_templates": templates}
        send = load_function("apps/shop-api/shop/checkout_api.py", "send_paid_mails", ns)
        await send(order)
        self.assertTrue(order["paid_mail_recovery_pending"])
        self.assertEqual(updates, [])


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
                    if op == "$not" and isinstance(actual, str) and re.search(expected["$regex"], actual):
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

    async def test_provider_responses_without_proven_rejection_are_uncertain(self):
        for outcome, expected in ((202, "abgleich_erforderlich"), (302, "abgleich_erforderlich"), (400, "abgleich_erforderlich"), (503, "abgleich_erforderlich"), ("unknown", "abgleich_erforderlich")):
            ns, db, calls = self.setup_mailer([self.row("wartend")], outcome)
            await ns["deliver"]("event")
            self.assertEqual(db.rows["event"]["status"], expected)
            if expected == "abgleich_erforderlich":
                await ns["retry_pending"]()
                self.assertEqual(calls, ["event"])

    async def test_noncanonical_claim_timestamps_require_reconciliation(self):
        import datetime
        values = (None, "2026-10-31T12:00:00", "2026-10-31T12:00:00+01:00",
                  datetime.datetime(2020, 1, 1), datetime.datetime(2020, 1, 1, tzinfo=datetime.timezone.utc))
        for status in ("wird_vorbereitet", "wird_gesendet"):
            for value in values:
                row = self.row(status)
                row["claimed_at"] = value
                ns, db, calls = self.setup_mailer([row])
                await ns["retry_pending"]()
                self.assertEqual((db.rows["event"]["status"], calls), ("abgleich_erforderlich", []))

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

    async def test_slow_provider_crossing_lease_does_not_trigger_resend(self):
        ns, db, calls = self.setup_mailer([self.row("wartend")])
        started, finish = asyncio.Event(), asyncio.Event()
        class SlowClient:
            def __init__(self, **kwargs):
                pass
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                pass
            async def post(self, url, json, headers):
                calls.append(headers["Idempotency-Key"])
                started.set()
                await finish.wait()
                return types.SimpleNamespace(status_code=200, json=lambda: {"id": "fake-id"})
        ns["httpx"].AsyncClient = SlowClient
        worker = asyncio.create_task(ns["deliver"]("event"))
        await started.wait()
        db.rows["event"]["claimed_at"] = "2000-01-01T00:00:00+00:00"
        await ns["retry_pending"]()
        await ns["retry_pending"]()
        finish.set()
        await worker
        self.assertEqual((db.rows["event"]["status"], calls), ("abgleich_erforderlich", ["event"]))


if __name__ == "__main__":
    unittest.main()

