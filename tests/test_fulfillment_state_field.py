"""The BigBuy automation must write the same delivery-state field that the admin and customer views read."""
import ast
from pathlib import Path
import unittest

SHOP = Path(__file__).resolve().parents[1] / 'apps/shop-api/shop'


def string_constants(path):
    return {node.value for node in ast.walk(ast.parse((SHOP / path).read_text(encoding='utf-8'))) if isinstance(node, ast.Constant) and isinstance(node.value, str)}


class FulfilmentStateField(unittest.TestCase):
    def test_automation_uses_the_field_the_views_read(self):
        written = string_constants('fulfillment.py')
        self.assertIn('fulfilment', written)
        self.assertNotIn('fulfillment', written, 'orders.fulfillment would be invisible to the admin list and the customer timeline')
        for reader in ('admin_api.py', 'checkout_api.py'):
            self.assertIn('fulfilment', string_constants(reader))

    def test_error_and_retry_markers_stay_distinct_from_the_state(self):
        written = string_constants('fulfillment.py')
        self.assertTrue({'fulfillment_error', 'bigbuy_submit_pending'} <= written)

    def test_admin_sees_supplier_errors_and_can_pull_tracking(self):
        admin = (SHOP / 'admin_api.py').read_text(encoding='utf-8')
        self.assertIn('fulfillment_error', admin)
        self.assertIn('/orders/{order_id}/tracking-refresh', admin)
        self.assertIn('fulfillment.poll_and_update_tracking', admin)

    def test_payment_mode_defaults_to_the_safe_one(self):
        config = (SHOP / 'config.py').read_text(encoding='utf-8')
        self.assertIn('os.environ.get("REVOLUT_MODE", "sandbox")', config)


if __name__ == '__main__':
    unittest.main()
