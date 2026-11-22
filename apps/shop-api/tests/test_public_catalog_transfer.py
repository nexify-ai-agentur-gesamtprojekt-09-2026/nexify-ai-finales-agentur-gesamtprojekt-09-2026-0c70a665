"""Katalog-Übernahme über die öffentliche Schnittstelle von teileklar.shop (transfer_public_catalog.py).

Quelle: nachgebildete Antworten in der am 16.11.2026 gemessenen Form (offset wirkt, page nicht, höchstens 500 je Abruf).
Ziel: der In-Memory-Ersatz des Treibers aus test_store_contract. Keine Netz- und keine Datenbankverbindung.
"""
import asyncio
import ast
import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(__file__))
import test_store_contract as contract  # noqa: E402

HERE = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("shop_public_transfer_under_test", HERE / "transfer_public_catalog.py")
pub = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pub)

CONTRACT = {"scope": "catalog_public_api_transfer", "tenant": "teileklar", "source_url": "https://teileklar.shop/api/shop/products",
            "target_namespace": "nexify_teileklar_shop_v1", "list_prices_approved": True, "product_count_minimum": 3,
            "data_licence_reference": "synthetisch", "list_price_reference": "synthetisch", "approved_by": "Inhaber (synthetisch)",
            "approved_at": "2026-11-16T00:00:00+00:00"}


def item(n, **fields):
    pid = "S%07d" % n
    return {"id": pid, "name": "Artikel %d" % n, "maker": "M", "brand": "B", "category": "Autozubehör" if n % 2 else "Schutzgläser",
            "price": "%d.%02d €" % (n, n % 100), "value": float("%d.%02d" % (n, n % 100)), "sku": pid,
            "image": "/api/shop/image?src=https%3A%2F%2Fcdnbigbuy.com%2Fimages%2F" + pid + "_000.jpg", "alt": "a", "oe": None,
            "ean": "84%011d" % n, "condition": "NEW", "shipping": "", "gpc": "", "status": "catalog", "status_label": "Katalog-Artikel",
            "delivery_short": "", "source": "BigBuy", "evidence": "", "specs": [{"label": "Gewicht", "value": "0.4 kg"}],
            "feed_title": "Artikel %d" % n, "created_at": "2026-10-%02dT10:00:00+00:00" % (n % 27 + 1), "stock": n % 3, **fields}


PLACEHOLDER = item(99, id="oil", image="assets/part-oil.png", source="Geprüft von TEILEKLAR", stock=0)


class FakeSource:
    """Antwortet wie teileklar.shop: ``page`` wirkungslos, ``offset`` wirkt, höchstens 500 je Abruf."""
    def __init__(self, rows, total=None, shuffle_ties=False): self.rows, self.total, self.calls = rows, total, []
    def __call__(self, url):
        self.calls.append(url)
        query = dict(part.split("=") for part in url.split("?", 1)[1].split("&"))
        offset, limit = int(query.get("offset", 0)), min(int(query.get("limit", 20)), 500)
        return {"items": [dict(r) for r in self.rows[offset:offset + limit]], "total": self.total if self.total is not None else len(self.rows)}


def run(coroutine):
    return asyncio.run(coroutine)


class SourceReading(unittest.TestCase):
    def test_reads_all_items_through_overlapping_offset_windows_with_pause(self):
        rows = [item(n) for n in range(1, 1201)]
        source, pauses = FakeSource(rows), []
        items, meta = pub.fetch_source(get=source, sleep=pauses.append, pause=1.5)
        self.assertEqual(len(items), 1200)
        self.assertEqual(len({i["id"] for i in items}), 1200)
        self.assertTrue(all("offset=" in u and "limit=500" in u and "page=" not in u for u in source.calls))
        self.assertTrue(pauses and all(p >= 1.5 for p in pauses))
        self.assertEqual(meta["passes"], 1)

    def test_incomplete_source_aborts(self):
        source = FakeSource([item(n) for n in range(1, 11)], total=12)
        with self.assertRaises(pub.Abort):
            pub.fetch_source(get=source, sleep=lambda s: None, max_passes=2)

    def test_same_id_with_different_content_aborts(self):
        rows = [item(n) for n in range(1, 601)]
        calls = {"n": 0}

        def changing(url):
            calls["n"] += 1
            body = FakeSource(rows)(url)
            if calls["n"] == 2:
                body["items"][0]["value"] = 999.0
            return body
        with self.assertRaises(pub.Abort):
            pub.fetch_source(get=changing, sleep=lambda s: None)

    def test_total_changing_while_reading_aborts(self):
        rows = [item(n) for n in range(1, 601)]
        calls = {"n": 0}

        def growing(url):
            calls["n"] += 1
            body = FakeSource(rows)(url)
            body["total"] += calls["n"] - 1
            return body
        with self.assertRaises(pub.Abort):
            pub.fetch_source(get=growing, sleep=lambda s: None)


class StableSnapshot(unittest.TestCase):
    def test_source_changing_between_two_passes_aborts(self):
        first = [item(n) for n in range(1, 4)]
        second = [item(1), item(2), item(4)]
        results = iter([(first, {"total": 3, "windows": [], "fetched": 3, "passes": 1}),
                        (second, {"total": 3, "windows": [], "fetched": 3, "passes": 1})])
        with patch.object(pub, "fetch_source", side_effect=lambda **kw: next(results)), self.assertRaises(pub.Abort):
            run(pub.run(None, apply=False, contract=None, limit=None, pause=0, log=lambda line: None, image_check=lambda u: True))


class Mapping(unittest.TestCase):
    def test_price_spellings_measured_at_the_source(self):
        self.assertEqual(pub.shown_cents("7.06 €"), 706)
        self.assertEqual(pub.shown_cents(".71 €"), 71)
        self.assertEqual(pub.shown_cents("1,048.70 €"), 104870)
        self.assertEqual(pub.shown_cents("19,90 €"), 1990)
        for bad in ("7.06", "1.048,70 €", "abc €", "", None, "1,0487.0 €"):
            self.assertIsNone(pub.shown_cents(bad))

    def test_price_must_agree_between_value_and_shown_price(self):
        self.assertEqual(pub.price_cents(item(7)), 707)
        self.assertIsNone(pub.price_cents(item(7, price="7.08 €")))
        self.assertIsNone(pub.price_cents(item(7, value=0)))
        self.assertIsNone(pub.price_cents(item(7, value=True)))
        self.assertIsNone(pub.price_cents(item(7, value=7.065, price="7.07 €")))

    def test_image_is_the_decoded_supplier_address_and_nothing_else(self):
        self.assertEqual(pub.image_url(item(5)), "https://cdnbigbuy.com/images/S0000005_000.jpg")
        self.assertIsNone(pub.image_url(item(5, image="/api/shop/image?src=https%3A%2F%2Fevil.example%2Fimages%2Fx.jpg")))
        self.assertIsNone(pub.image_url(item(5, image="/api/shop/image?src=a&src=b")))
        self.assertIsNone(pub.image_url(item(5, image="assets/part-placeholder.png")))

    def test_placeholders_are_skipped_and_named_problems_abort(self):
        lines = []
        docs = pub.build_documents([item(1), item(2), PLACEHOLDER], lines.append)
        self.assertEqual([p["_id"] for p in docs["products"]], ["S0000001", "S0000002"])
        self.assertIn('"oil"', lines[0])
        with self.assertRaises(pub.Abort) as caught:
            pub.build_documents([item(1), item(2, price="9.99 €"), item(3, image="/api/shop/image?src=x")])
        self.assertIn("Preis", str(caught.exception))
        self.assertIn("Bild", str(caught.exception))

    def test_source_record_is_kept_unchanged_and_derived_fields_are_exact(self):
        source = item(12)
        product, reasons = pub.map_item(source, {"https://cdnbigbuy.com/images/S0000012_000.jpg": True})
        self.assertEqual(reasons, [])
        self.assertIs(pub.map_item(source)[0]["active"], False)  # ohne Bildnachweis nie sichtbar
        self.assertEqual(product["legacy"], source)
        self.assertEqual(product["list_price_cents"], 1212)
        self.assertEqual(product["images"], ["https://cdnbigbuy.com/images/S0000012_000.jpg"])
        self.assertIs(product["active"], True)
        self.assertIs(product["buyable"], False)
        self.assertNotIn("purchase_cents", product)
        self.assertEqual(product["bigbuy_id"], "S0000012")  # eindeutiger Index des Namensraums, Wert aus der Quelle


class Writing(unittest.TestCase):
    def setUp(self):
        self.database = contract.Database()
        self.target = types.SimpleNamespace(**{name: self.database.collections.setdefault(name, contract.Collection()) for name in ("products", "categories", "imports")},
                                            client=self.database.client)
        self.target.__getitem__ = None

    def db(self):
        database = self.database

        class Target:
            client = database.client
            def __getitem__(self, name): return database.collections.setdefault(name, contract.Collection())
            def __getattr__(self, name): return self[name]
        return Target()

    def test_contract_is_checked_before_the_source_is_read(self):
        source = FakeSource([item(n) for n in range(1, 4)])
        for bad in (None, {**CONTRACT, "scope": "catalog_first_fill"}, {**CONTRACT, "list_prices_approved": 1},
                    {**CONTRACT, "approved_by": " "}, {**CONTRACT, "extra": "x"}, {**CONTRACT, "target_namespace": "other"}):
            with patch.object(pub, "fetch_source", side_effect=AssertionError("Quelle gelesen")):
                with self.assertRaises(pub.Abort):
                    run(pub.run(self.db(), apply=True, contract=bad, limit=None, pause=0, log=lambda line: None))
        self.assertEqual(source.calls, [])

    def test_apply_writes_everything_once_and_a_second_run_writes_nothing(self):
        items = [item(n) for n in range(1, 4)] + [PLACEHOLDER]
        report, sample, meta, docs = run(pub.run(self.db(), apply=True, contract=CONTRACT, limit=None, pause=0, log=lambda line: None, items=items, image_check=lambda url: True))
        self.assertEqual(report["collections"]["products"]["inserted"], 3)
        self.assertTrue(all(r["equal"] for r in sample))
        self.assertEqual(len(self.database.collections["products"].docs), 3)
        self.assertEqual(len(self.database.collections["imports"].docs), 1)
        report, sample, meta, docs = run(pub.run(self.db(), apply=True, contract=CONTRACT, limit=None, pause=0, log=lambda line: None, items=items, image_check=lambda url: True))
        self.assertEqual(report["collections"]["products"]["unchanged"], 3)
        self.assertEqual(report["collections"]["products"]["inserted"] + report["collections"]["products"]["updated"], 0)

    def test_only_products_with_a_loading_image_become_visible_and_the_rest_is_kept(self):
        items = [item(1), item(2), item(3)]
        broken = "https://cdnbigbuy.com/images/S0000002_000.jpg"
        report, sample, meta, docs = run(pub.run(self.db(), apply=True, contract=CONTRACT, limit=None, pause=0, log=lambda line: None,
                                                 items=items, image_check=lambda url: url != broken))
        stored = {d["_id"]: d for d in self.database.collections["products"].docs}
        self.assertEqual(len(stored), 3)
        self.assertEqual({k: v["active"] for k, v in stored.items()}, {"S0000001": True, "S0000002": False, "S0000003": True})
        self.assertEqual(report["published"], 2)
        self.assertTrue(all(r["equal"] for r in sample))

    def test_image_check_retries_unclear_results_and_never_decides_them(self):
        calls = []

        def flaky(url):
            calls.append(url)
            raise pub.ProbeUnclear("HTTP 429")
        self.assertEqual(pub.verify_images(["https://cdnbigbuy.com/images/a.jpg"], flaky, sleep=lambda s: None), {"https://cdnbigbuy.com/images/a.jpg": None})
        self.assertEqual(len(calls), 3)

    def test_unclear_image_probes_abort_before_any_write(self):
        def outage(url):
            raise pub.ProbeUnclear("HTTP 503")
        with patch.object(pub.time, "sleep", lambda s: None), self.assertRaises(pub.Abort):
            run(pub.run(self.db(), apply=True, contract=CONTRACT, limit=None, pause=0, log=lambda line: None,
                        items=[item(1), item(2), item(3)], image_check=outage))
        self.assertEqual(self.database.collections.get("products", contract.Collection()).docs, [])

    def test_withdraw_hides_transferred_products_without_deleting_and_a_rerun_restores_them(self):
        items = [item(1), item(2), item(3)]
        run(pub.run(self.db(), apply=True, contract=CONTRACT, limit=None, pause=0, log=lambda line: None, items=items, image_check=lambda url: True))
        products = self.database.collections["products"]
        products.docs.append({"_id": "bb-9", "name": "fremd", "source": "bigbuy", "active": True})
        dry = run(pub.withdraw(self.db(), apply=False, contract=None, log=lambda line: None))
        self.assertEqual((dry["outcome"], dry["visible_before"]), ("dry_run", 3))
        self.assertTrue(all(d["active"] for d in products.docs))
        with self.assertRaises(pub.Abort):
            run(pub.withdraw(self.db(), apply=True, contract=None, log=lambda line: None))
        done = run(pub.withdraw(self.db(), apply=True, contract=CONTRACT, log=lambda line: None))
        self.assertEqual(done["withdrawn"], 3)
        self.assertEqual(len(products.docs), 4)  # nichts gelöscht
        self.assertEqual({d["_id"]: d["active"] for d in products.docs}, {"S0000001": False, "S0000002": False, "S0000003": False, "bb-9": True})
        self.assertTrue(any(d.get("mode") == "catalog_withdraw" for d in self.database.collections["imports"].docs))
        # Wiederherstellen per erneuter Übernahme setzt voraus, dass im Namensraum nur übernommene Artikel liegen
        # (fremde Produkte gelten als Abweichung, der Lauf bricht dann ab – gewollt).
        products.docs = [d for d in products.docs if d["_id"] != "bb-9"]
        run(pub.run(self.db(), apply=True, contract=CONTRACT, limit=None, pause=0, log=lambda line: None, items=items, image_check=lambda url: True))
        self.assertTrue(all(d["active"] for d in products.docs))

    def test_contract_minimum_applies_to_full_runs(self):
        items = [item(1), item(2)]
        with self.assertRaises(pub.Abort):
            run(pub.run(self.db(), apply=True, contract=CONTRACT, limit=None, pause=0, log=lambda line: None, items=items, image_check=lambda url: True))
        self.assertEqual(self.database.collections.get("products", contract.Collection()).docs, [])

    def test_dry_run_writes_nothing(self):
        run(pub.run(self.db(), apply=False, contract=None, limit=None, pause=0, log=lambda line: None, items=[item(1), item(2), item(3)], image_check=lambda url: True))
        self.assertEqual(self.database.collections["products"].docs, [])


class CommandLine(unittest.TestCase):
    def main(self, arguments, environment):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, environment, clear=True), patch("sys.stderr"):
            return pub.main(["--log", os.path.join(folder, "l.jsonl"), *arguments])

    def test_production_namespace_is_never_written_partially_or_from_a_file(self):
        env = {"CATALOG_TARGET_MONGO_URL": "mongodb://127.0.0.1:1/", "CATALOG_TARGET_DB_NAME": "nexify_teileklar_shop_v1"}
        self.assertEqual(self.main(["--limit", "20"], env), 3)
        self.assertEqual(self.main(["--from-snapshot", "x.json"], env), 3)
        self.assertEqual(self.main([], {**env, "CATALOG_TARGET_DB_NAME": "andere"}), 3)
        self.assertEqual(self.main([], {}), 3)
        self.assertEqual(self.main(["--apply"], env), 3)


def presentation():
    tree = ast.parse((HERE / "shop" / "catalog_api.py").read_text())
    nodes = [n for n in tree.body if isinstance(n, ast.Import) and any(a.name == "re" for a in n.names)
             or isinstance(n, ast.ImportFrom) and n.module == "urllib.parse"
             or isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "SUPPLIER_IMAGE_HOSTS" for t in n.targets)
             or isinstance(n, ast.FunctionDef) and n.name in ("supplier_image", "present")]
    sell = lambda purchase, markup: int(purchase * (1 + markup / 100) * 1.19 + 0.5)  # noqa: E731
    scope = {"pricing": types.SimpleNamespace(config=types.SimpleNamespace(VAT_PERCENT=19), sell_cents=sell)}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), "presentation", "exec"), scope)
    return scope["present"]


class Presentation(unittest.TestCase):
    present = staticmethod(presentation())
    closed = {"price_released": False, "markup_percent": 30}

    def test_transferred_product_shows_its_list_price_and_is_not_orderable(self):
        product, _ = pub.map_item(item(7))
        shown = self.present(product, self.closed, full=True)
        self.assertEqual((shown["price_cents"], shown["price_status"]), (707, "list_price"))
        self.assertEqual(shown["image"], "https://cdnbigbuy.com/images/S0000007_000.jpg")
        self.assertIs(shown["orderable"], False)

    def test_list_price_needs_the_transfer_marker_and_origin(self):
        product, _ = pub.map_item(item(7))
        for change in ({"list_price_status": None}, {"source": "bigbuy"}, {"list_price_cents": 0}, {"list_price_cents": "707"}):
            shown = self.present({**product, **change}, self.closed)
            self.assertIsNone(shown["price_cents"])
            self.assertEqual(shown["price_status"], "not_released")

    def test_supplier_products_keep_the_release_rule(self):
        supplier = {"_id": "bb-1", "name": "x", "purchase_cents": 1000, "images": []}
        self.assertIsNone(self.present(supplier, self.closed)["price_cents"])
        released = self.present(supplier, {"price_released": True, "markup_percent": 30}, full=True)
        self.assertEqual(released["price_status"], "released")
        self.assertIs(released["orderable"], True)


if __name__ == "__main__":
    unittest.main()
