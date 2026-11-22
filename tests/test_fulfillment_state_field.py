"""The BigBuy automation must write the same delivery-state field that the admin and customer views read."""
import ast
from pathlib import Path
import unittest

SHOP = Path(__file__).resolve().parents[1] / 'apps/shop-api/shop'


# The automation reaches orders only through the data-access class; what it persists is written there.
AUTOMATION = ('fulfillment.py', 'store/orders.py')


def string_constants(*paths):
    return set().union(*(file_constants(path) for path in paths))


def file_constants(path):
    return {node.value for node in ast.walk(ast.parse((SHOP / path).read_text(encoding='utf-8'))) if isinstance(node, ast.Constant) and isinstance(node.value, str)}


class FulfilmentStateField(unittest.TestCase):
    def test_automation_uses_the_field_the_views_read(self):
        written = string_constants(*AUTOMATION)
        for part in AUTOMATION:
            self.assertIn('fulfilment', string_constants(part))
        self.assertNotIn('fulfillment', written, 'orders.fulfillment would be invisible to the admin list and the customer timeline')
        for reader in ('admin_api.py', 'checkout_api.py'):
            self.assertIn('fulfilment', string_constants(reader))

    def test_error_and_retry_markers_stay_distinct_from_the_state(self):
        written = string_constants(*AUTOMATION)
        self.assertTrue({'fulfillment_error', 'bigbuy_submit_pending'} <= written)

    def test_admin_sees_supplier_errors_and_can_pull_tracking(self):
        admin = (SHOP / 'admin_api.py').read_text(encoding='utf-8')
        self.assertIn('fulfillment_error', admin)
        self.assertIn('/orders/{order_id}/tracking-refresh', admin)
        self.assertIn('fulfillment.poll_and_update_tracking', admin)

    def test_tracking_refresh_never_moves_a_delivered_order_back_to_shipped(self):
        source = (SHOP / 'fulfillment.py').read_text(encoding='utf-8')
        self.assertIn('DELIVERED = "zugestellt"', source)
        self.assertIn('in (SHIPPED, DELIVERED)', source)
        self.assertIn('if not await store.orders.mark_shipped(', source)
        storage = (SHOP / 'store/orders.py').read_text(encoding='utf-8')
        self.assertIn('SHIPPED = "versendet"', storage)
        self.assertIn('DELIVERED = "zugestellt"', storage)
        self.assertIn('{"$nin": [SHIPPED, DELIVERED]}', storage)

    def test_payment_mode_defaults_to_the_safe_one(self):
        config = (SHOP / 'config.py').read_text(encoding='utf-8')
        self.assertIn('os.environ.get("REVOLUT_MODE", "sandbox")', config)


if __name__ == '__main__':
    unittest.main()
