"""Artikel ohne Lieferantenbild: nicht im Shop praesentieren, im Datenbestand/Feeds erhalten, mit Platzhalter."""
import ast
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "apps/shop-api/shop/catalog_api.py"
CARD = ROOT / "apps/web/components/shop/ProductCard.tsx"
PLACEHOLDER = ROOT / "apps/web/components/shop/ProductPlaceholder.tsx"


def load(names):
    tree = ast.parse(API.read_text())
    nodes = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names
             or isinstance(n, ast.Import) and any(a.name == "re" for a in n.names)
             or isinstance(n, ast.Assign) and any(getattr(t, "id", "") == "SUPPLIER_IMAGE_PATTERN" for t in n.targets)]
    scope = {}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), "catalog_visibility", "exec"), scope)
    return scope


class ShopImageVisibility(unittest.TestCase):
    def test_shop_listing_defaults_to_articles_with_supplier_image(self):
        fn = load({"shop_visibility"})["shop_visibility"]
        clause = fn(True)
        self.assertIn("images", clause)
        self.assertIn("$elemMatch", clause["images"])
        self.assertIn("cdnbigbuy", clause["images"]["$elemMatch"]["$regex"])

    def test_feed_and_admin_reads_keep_all_articles(self):
        fn = load({"shop_visibility"})["shop_visibility"]
        self.assertEqual(fn(False), {})

    def test_products_endpoint_exposes_flag_default_true_and_applies_it(self):
        src = API.read_text()
        self.assertRegex(src, r"with_image\s*:\s*bool\s*=\s*True")
        self.assertIn("shop_visibility(with_image)", src)

    def test_category_counts_match_what_the_shop_shows(self):
        src = API.read_text()
        start = src.index("async def categories")
        self.assertIn("shop_visibility", src[start:src.index("@router.get(\"/products\")")])

    def test_product_detail_stays_reachable_without_image(self):
        src = API.read_text()
        detail = src[src.index("async def product("):]
        self.assertNotIn("shop_visibility", detail)

    def test_placeholder_is_branded_component_not_a_text_notice(self):
        self.assertTrue(PLACEHOLDER.exists(), "ProductPlaceholder.tsx fehlt")
        ph = PLACEHOLDER.read_text()
        self.assertIn("<svg", ph)
        self.assertIn("TEILE", ph)
        self.assertIn("KLAR", ph)
        card = CARD.read_text()
        self.assertIn("ProductPlaceholder", card)
        self.assertNotIn("tk-image-missing", card)

    def test_every_image_surface_goes_through_the_central_component(self):
        """Gesamtkontrolle: kein Shop-Bauteil rendert ein eigenes <img> oder eigenen Platzhalter."""
        offenders = []
        for f in sorted((ROOT / "apps/web/components/shop").glob("*.tsx")):
            if f.name in ("ProductCard.tsx", "ProductPlaceholder.tsx"):
                continue
            text = f.read_text()
            if "<img" in text or "tk-image-missing" in text:
                offenders.append(f.name)
        self.assertEqual(offenders, [])
        users = [f.name for f in (ROOT / "apps/web/components/shop").glob("*.tsx")
                 if "<ProductImage" in f.read_text()]
        for expected in ("Storefront.tsx", "CartView.tsx", "ProductDetail.tsx"):
            self.assertIn(expected, users)

    def test_shop_clients_never_ask_for_the_unfiltered_catalogue(self):
        offenders = []
        for f in (ROOT / "apps/web").rglob("*.ts*"):
            if "node_modules" in f.parts or ".next" in f.parts:
                continue
            if "with_image=false" in f.read_text():
                offenders.append(str(f.relative_to(ROOT)))
        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()


class FilterMatchesValidator(unittest.TestCase):
    """Befund Codex Review (PR #219): Filter und supplier_image() müssen dasselbe akzeptieren."""
    CASES = [
        "https://cdnbigbuy.com/images/a.jpg", "https://cdnbigbuy.com/images/x/y-1_2.WEBP", "https://cdnbigbuy.com/images/p.png",
        "https://cdnbigbuy.com/images/a.jpg?x=1", "https://cdnbigbuy.com/images/a.jpg#f", "https://cdnbigbuy.com/images/../a.jpg",
        "https://cdnbigbuy.com/images/./a.jpg", "https://cdnbigbuy.com/images/a.gif", "https://cdnbigbuy.com/images/a b.jpg",
        "https://user:pw@cdnbigbuy.com/images/a.jpg", "https://cdnbigbuy.com:444/images/a.jpg", "http://cdnbigbuy.com/images/a.jpg",
        "https://cdnbigbuy.com/other/a.jpg", "https://cdnbigbuy.com/images/a.jpg.exe", "https://cdnbigbuy.com/images/..a.jpg",
    ]

    def test_regex_and_validator_agree(self):
        import re
        from urllib.parse import urlsplit
        tree = ast.parse(API.read_text())
        nodes = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in {"shop_visibility", "supplier_image"}
                 or isinstance(n, ast.Assign) and any(getattr(t, "id", "") in ("SUPPLIER_IMAGE_HOSTS", "SUPPLIER_IMAGE_PATTERN") for t in n.targets)]
        scope = {"re": re, "urlsplit": urlsplit}
        exec(compile(ast.Module(body=nodes, type_ignores=[]), "catalog", "exec"), scope)
        pattern = scope["shop_visibility"](True)["images"]["$elemMatch"]
        regex = re.compile(pattern["$regex"], re.I if "i" in pattern.get("$options", "") else 0)
        for url in self.CASES:
            self.assertEqual(bool(regex.search(url)), scope["supplier_image"](url) is not None, url)
