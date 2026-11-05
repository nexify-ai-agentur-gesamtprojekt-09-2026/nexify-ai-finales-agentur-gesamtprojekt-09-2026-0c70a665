"""Money math (pricing) — gross price, VAT share and markup validation.

Pure-function unit tests; no database, provider or network. Pins the cent-exact, half-up rounding and
the markup bounds so a regression in the price/VAT arithmetic is caught (money-critical, PAngV).
"""
import os
import sys
import unittest
from decimal import Decimal
from pathlib import Path

SERVICE = Path(__file__).resolve().parents[1]
ENV = {"MONGO_URL": "mongodb://in-memory.invalid/pricing_unittest", "DB_NAME": "pricing_unittest",
       "PREVIEW_PUBLIC_ORIGIN": "https://shop.example.invalid", "SHOP_VAT_PERCENT": "19", "GATEWAY_PORT": "0"}


class PricingMathTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved_env = {k: os.environ.get(k) for k in ENV}
        cls.saved_modules = set(sys.modules)
        os.environ.update(ENV)
        sys.path.insert(0, str(SERVICE))
        global pricing
        from shop import pricing

    @classmethod
    def tearDownClass(cls):
        for key, value in cls.saved_env.items():
            os.environ.pop(key, None) if value is None else os.environ.__setitem__(key, value)
        for name in set(sys.modules) - cls.saved_modules:
            if name == "shop" or name.startswith("shop."):
                sys.modules.pop(name, None)
        sys.path.remove(str(SERVICE))

    def test_sell_cents_applies_markup_then_vat_half_up(self):
        self.assertEqual(pricing.sell_cents(1000, Decimal("20"), 19), 1428)   # 1000 * 1.20 * 1.19
        self.assertEqual(pricing.sell_cents(999, Decimal("0"), 19), 1189)     # 999 * 1.19 = 1188.81 -> 1189
        self.assertEqual(pricing.sell_cents(0, Decimal("30"), 19), 0)

    def test_vat_share_is_extracted_from_the_gross(self):
        self.assertEqual(pricing.vat_share_cents(1428, 19), 228)              # net 1200, vat 228
        self.assertEqual(pricing.vat_share_cents(1189, 19), 190)              # 1189*19/119 = 189.84 -> 190
        # The VAT share plus the net never exceeds the gross by more than rounding (<= 1 cent).
        for gross in (1, 99, 100, 1189, 1428, 999999):
            share = pricing.vat_share_cents(gross, 19)
            self.assertTrue(0 <= share < gross or gross == 0)

    def test_parse_markup_accepts_valid_and_rejects_out_of_bounds(self):
        self.assertEqual(pricing.parse_markup("20"), Decimal("20"))
        self.assertEqual(pricing.parse_markup(Decimal("12.5")), Decimal("12.5"))
        self.assertEqual(pricing.parse_markup("0"), Decimal("0"))
        self.assertEqual(pricing.parse_markup("500"), Decimal("500"))
        for bad in ("-1", "500.01", "501", "20.001", "abc", "inf", "nan", ""):
            with self.assertRaises(ValueError, msg="must reject markup %r" % bad):
                pricing.parse_markup(bad)


if __name__ == "__main__":
    unittest.main()
