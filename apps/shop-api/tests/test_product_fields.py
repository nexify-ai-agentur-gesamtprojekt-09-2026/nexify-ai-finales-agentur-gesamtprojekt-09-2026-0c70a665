"""Optional product facts (concept 4.3) pass through only when well-formed; nothing is guessed.

Offline: the serializer functions are extracted from the source, no DB/provider is initialized.
"""
import ast
import math
import types
import unittest
from pathlib import Path

SERVICE = Path(__file__).resolve().parents[1]


def extract(path, names, assigns=()):
    tree = ast.parse((SERVICE / path).read_text())
    nodes = [node for node in tree.body if
             isinstance(node, ast.Import) and any(a.name == "re" for a in node.names)
             or isinstance(node, ast.ImportFrom) and node.module == "urllib.parse"
             or isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in assigns for t in node.targets)
             or isinstance(node, ast.FunctionDef) and node.name in names]
    scope = {"pricing": types.SimpleNamespace(config=types.SimpleNamespace(VAT_PERCENT=19), sell_cents=lambda c, m: c)}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), path, "exec"), scope)
    return scope


class OptionalProductFields(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.present = staticmethod(extract("shop/catalog_api.py", ("supplier_image", "present"), ("SUPPLIER_IMAGE_HOSTS", "PUBLIC_FIELDS"))["present"])
        cls.catalog = extract("shop/catalog_api.py", (), ("PUBLIC_FIELDS",))
        cls.delivery = staticmethod(extract("shop/cart_api.py", ("delivery_days",))["delivery_days"])

    def row(self, full=True, **fields):
        return self.present({"_id": "p", "name": "n", "purchase_cents": 100, **fields}, {"price_released": True, "markup_percent": "0"}, full=full)

    def test_absent_fields_stay_empty_and_bigbuy_manufacturer_id_is_not_a_name(self):
        row = self.row(details={"manufacturer": 4711})
        for key in ("manufacturer", "delivery_days_min", "delivery_days_max", "net_content", "unit", "disposal_class"):
            self.assertIsNone(row[key], key)
        for key in ("suitability", "safety_notes", "scope_of_delivery"):
            self.assertEqual(row[key], [], key)

    def test_well_formed_values_pass_through(self):
        row = self.row(manufacturer="  Muster AG  ", delivery_days_min=3, delivery_days_max=6, net_content=500, unit="ml",
                       suitability=["universal", " 12 V "], safety_notes=["Hinweis"], disposal_class="weee", scope_of_delivery=["Gerät"])
        self.assertEqual((row["manufacturer"], row["delivery_days_min"], row["delivery_days_max"], row["net_content"], row["unit"]),
                         ("Muster AG", 3, 6, 500, "ml"))
        self.assertEqual((row["suitability"], row["safety_notes"], row["disposal_class"], row["scope_of_delivery"]),
                         (["universal", "12 V"], ["Hinweis"], "weee", ["Gerät"]))

    def test_malformed_values_are_dropped(self):
        for fields in ({"delivery_days_min": 6, "delivery_days_max": 3}, {"delivery_days_min": 0, "delivery_days_max": 3},
                       {"delivery_days_min": True, "delivery_days_max": 3}, {"delivery_days_min": "3", "delivery_days_max": 6},
                       {"delivery_days_min": 3}, {"delivery_days_min": 1, "delivery_days_max": 61}):
            with self.subTest(fields=fields):
                row = self.row(**fields)
                self.assertIsNone(row["delivery_days_min"]); self.assertIsNone(row["delivery_days_max"])
                self.assertEqual(self.delivery(fields), {})
        for content, unit in ((0, "l"), (-1, "l"), (math.nan, "l"), (math.inf, "l"), (True, "l"), ("1", "l"), (1, "Stück"), (1, None)):
            with self.subTest(content=content, unit=unit):
                row = self.row(net_content=content, unit=unit)
                self.assertIsNone(row["net_content"]); self.assertIsNone(row["unit"])
        row = self.row(manufacturer="   ", suitability="universal", safety_notes=[7, "", "x" * 601], disposal_class="toxic")
        self.assertEqual((row["manufacturer"], row["suitability"], row["safety_notes"], row["disposal_class"]), (None, [], [], None))

    def test_list_view_exposes_card_facts_only(self):
        row = self.row(full=False, manufacturer="M", safety_notes=["x"], disposal_class="battery")
        self.assertEqual(row["manufacturer"], "M")
        for key in ("safety_notes", "disposal_class", "scope_of_delivery", "description"):
            self.assertNotIn(key, row)
        fields = self.catalog["PUBLIC_FIELDS"]
        for key in ("manufacturer", "delivery_days_min", "delivery_days_max", "net_content", "unit", "suitability"):
            self.assertEqual(fields.get(key), 1, key)
        self.assertEqual(self.delivery({"delivery_days_min": 2, "delivery_days_max": 2}), {"delivery_days_min": 2, "delivery_days_max": 2})


if __name__ == "__main__":
    unittest.main()
