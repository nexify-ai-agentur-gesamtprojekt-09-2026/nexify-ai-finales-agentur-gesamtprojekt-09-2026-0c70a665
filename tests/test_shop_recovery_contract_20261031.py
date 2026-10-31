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


if __name__ == "__main__":
    unittest.main()
