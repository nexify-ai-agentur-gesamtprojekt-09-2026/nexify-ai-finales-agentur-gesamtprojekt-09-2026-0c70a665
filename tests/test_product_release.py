"""TK-11: product mandatory fields and publication block.

Pure rules plus the real routers against the in-memory store. No network, no MongoDB, no supplier.
Whether the listed mandatory fields are legally complete is NOT decided here: it is to be confirmed by
professional advice (docs/09-final/08-recht-und-compliance.md, E12).
"""
import hashlib
import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest import mock

from suite_fakes import Database, bind_shop_environment

bind_shop_environment()
from shop import product_release  # pure module: no database, no network

try:
    import httpx
    from fastapi import FastAPI
    from shop import accounts_api, cart_api, catalog_api, product_release_api
    HTTP_DEPS = True
except ImportError:
    HTTP_DEPS = False

IMAGE = "https://cdnbigbuy.com/images/V0103601_000_MKT5.jpg"
VAT = Decimal("19")


def image_ok(value):
    return value if isinstance(value, str) and value.startswith("https://cdnbigbuy.com/images/") else None


def complete(**changes):
    """A product that has every mandatory field the project's data model can carry."""
    product = {"_id": "bb-1", "bigbuy_id": 1, "sku": "S1", "ean": "4000000000001", "name": "Bremsbelag Vorderachse",
               "description": "Bremsbelagsatz fuer die Vorderachse, geprueft nach Herstellerangabe.", "images": [IMAGE],
               "purchase_cents": 1000, "stock": 5, "category_ids": [9], "category_id": 9, "active": True,
               "details": {"manufacturer": "Beispiel Teile GmbH"}, "delivery_time": {"min_days": 2, "max_days": 4},
               "imported_at": "2026-01-01T00:00:00+00:00", "first_imported_at": "2026-01-01T00:00:00+00:00"}
    product.update(changes)
    return product


def released(product=None):
    product = product or complete()
    return {**product, "release": product_release.state(product, vat_percent=VAT, image_ok=image_ok, checked_by="test", stamp="t")}


class Rules(unittest.TestCase):
    def reasons(self, **changes):
        return product_release.blockers(complete(**changes), vat_percent=VAT, image_ok=image_ok)

    def test_complete_product_has_no_blocker(self):
        self.assertEqual(self.reasons(), [])

    def test_each_missing_field_gets_its_own_reason(self):
        cases = {
            "title_missing": {"name": ""},
            "description_missing": {"description": ""},
            "price_missing": {"purchase_cents": 0},
            "image_missing": {"images": []},
            "manufacturer_missing": {"details": {}},
            "delivery_time_missing": {"delivery_time": None},
            "stock_status_unknown": {"stock": None},
        }
        for code, changes in cases.items():
            with self.subTest(code=code):
                self.assertEqual(self.reasons(**changes), [code])

    def test_tax_rate_is_a_shop_setting_and_missing_blocks(self):
        for value in (None, Decimal("-1"), Decimal("101"), Decimal("NaN"), "19"):
            with self.subTest(value=value):
                self.assertEqual(product_release.blockers(complete(), vat_percent=value, image_ok=image_ok), ["tax_rate_missing"])

    def test_several_gaps_are_all_reported_in_fixed_order(self):
        self.assertEqual(self.reasons(name="", images=[], stock=None),
                         ["title_missing", "image_missing", "stock_status_unknown"])

    def test_title_that_is_only_an_identifier_counts_as_missing(self):
        # The importer falls back to the SKU or the supplier id when the supplier sends no name.
        self.assertEqual(self.reasons(name="S1"), ["title_missing"])
        self.assertEqual(self.reasons(name="1"), ["title_missing"])
        self.assertEqual(self.reasons(name="   "), ["title_missing"])
        self.assertEqual(self.reasons(name=None), ["title_missing"])

    def test_description_needs_text_not_markup(self):
        for text in ("<p></p>", "<p>  </p><br/>", "kurz", None, 7):
            with self.subTest(text=text):
                self.assertEqual(self.reasons(description=text), ["description_missing"])
        self.assertEqual(self.reasons(description="<p>" + "x" * product_release.MIN_DESCRIPTION_CHARS + "</p>"), [])

    def test_price_must_be_a_positive_integer_of_cents(self):
        for value in (None, 0, -5, True, 10.5, "1000"):
            with self.subTest(value=value):
                self.assertEqual(self.reasons(purchase_cents=value), ["price_missing"])

    def test_image_must_pass_the_supplier_original_rule(self):
        self.assertEqual(self.reasons(images=["http://cdnbigbuy.com/images/a.jpg", "https://evil.example/a.jpg", None]), ["image_missing"])
        self.assertEqual(self.reasons(images="nicht-eine-liste"), ["image_missing"])

    def test_manufacturer_is_a_name_not_a_number_and_brand_is_accepted(self):
        self.assertEqual(self.reasons(details={"manufacturer": 12}), ["manufacturer_missing"])
        self.assertEqual(self.reasons(details={"manufacturer": "4711"}), ["manufacturer_missing"])
        self.assertEqual(self.reasons(details={"manufacturer": "  "}), ["manufacturer_missing"])
        self.assertEqual(self.reasons(details={"brand": "Beispielmarke"}), [])
        self.assertEqual(self.reasons(details=None), ["manufacturer_missing"])

    def test_delivery_time_must_be_a_sane_range_of_days(self):
        for value in ({"min_days": 5, "max_days": 2}, {"min_days": -1, "max_days": 2}, {"min_days": 1, "max_days": 400},
                      {"min_days": "2", "max_days": 3}, {"min_days": True, "max_days": 3}, {"max_days": 3}, "2-4 Tage", []):
            with self.subTest(value=value):
                self.assertEqual(self.reasons(delivery_time=value), ["delivery_time_missing"])
        self.assertEqual(self.reasons(delivery_time={"min_days": 0, "max_days": 0}), [])

    def test_stock_zero_is_a_known_status_unknown_is_not(self):
        self.assertEqual(self.reasons(stock=0), [])
        for value in (None, True, False, -1, 1.5, "3", 2**53):
            with self.subTest(value=value):
                self.assertEqual(self.reasons(stock=value), ["stock_status_unknown"])

    def test_state_carries_reasons_brand_and_rule_version(self):
        state = product_release.state(complete(), vat_percent=VAT, image_ok=image_ok, checked_by="op", stamp="t")
        self.assertEqual((state["status"], state["blocked_reasons"], state["brand"]), ("released", [], "Beispiel Teile GmbH"))
        self.assertEqual(state["rules_version"], product_release.RULES_VERSION)
        blocked = product_release.state(complete(name=""), vat_percent=VAT, image_ok=image_ok, checked_by="op", stamp="t")
        self.assertEqual((blocked["status"], blocked["blocked_reasons"]), ("blocked", ["title_missing"]))

    def test_import_state_never_releases_and_never_fills_gaps(self):
        product = complete()
        before = dict(product)
        state = product_release.import_state(product, "t")
        self.assertEqual(product, before)  # nothing is filled in
        self.assertEqual(state["status"], "blocked")
        self.assertEqual(state["checked_by"], "import")
        self.assertEqual(product_release.import_state(complete(name="", images=[]), "t")["blocked_reasons"], ["title_missing", "image_missing"])
        # A product that looks complete still waits for the evaluation in the shop process.
        self.assertEqual(state["blocked_reasons"], ["not_evaluated"])

    def test_every_reason_has_a_label_and_the_legal_note_is_present(self):
        for code in product_release.REASONS:
            self.assertTrue(product_release.REASONS[code]["field"])
            self.assertTrue(product_release.REASONS[code]["label"])
        self.assertIn("Fachberatung", product_release.LEGAL_NOTE)

    def test_is_public_needs_active_stored_release_and_a_clean_recheck(self):
        product = released()
        self.assertTrue(product_release.is_public(product, vat_percent=VAT, image_ok=image_ok))
        for broken in ({"active": False}, {"active": None}, {"release": None}, {"release": {"status": "blocked"}},
                       {"release": {"status": "unchecked"}}, {"name": ""}, {"stock": None}):
            with self.subTest(broken=broken):
                self.assertFalse(product_release.is_public({**product, **broken}, vat_percent=VAT, image_ok=image_ok))
        legacy = complete()  # imported before the gate existed: no release block at all
        self.assertFalse(product_release.is_public(legacy, vat_percent=VAT, image_ok=image_ok))


@unittest.skipUnless(HTTP_DEPS, "pinned dependencies unavailable")
class Http(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = Database()
        await self.db.users.insert_one({"user_id": "admin-1", "email": "admin@example.invalid", "role": "admin"})
        await self.db.users.insert_one({"user_id": "kunde-1", "email": "kunde@example.invalid", "role": "customer", "email_verified": True})
        for token, user in (("admin-token", "admin-1"), ("kunde-token", "kunde-1")):
            await self.db.sessions.insert_one({"token_hash": hashlib.sha256(token.encode()).hexdigest(), "user_id": user,
                                               "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)})
        await self.db.categories.insert_one({"_id": 9, "name": "Bremsen", "root": False})
        await self.db.settings.insert_one({"_id": "shop", "markup_percent": "30", "price_release": {"markup_percent": "30", "released_at": "t"}})
        for module in (accounts_api, catalog_api, cart_api, product_release_api):
            patch = mock.patch.object(module, "db", self.db)
            patch.start()
            self.addCleanup(patch.stop)
        for name, replacement in (("owner_for", self.fake_owner), ("replace_cart", self.fake_replace_cart)):
            patch = mock.patch.object(cart_api, name, replacement)
            patch.start()
            self.addCleanup(patch.stop)
        app = FastAPI()
        for module in (accounts_api, catalog_api, cart_api, product_release_api):
            app.include_router(module.router)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://suite.example.invalid")
        self.admin = {"Authorization": "Bearer admin-token"}

    async def fake_owner(self, request, response, create=True):
        from shop.auth import Identity
        return Identity(None, None, "g" * 32)

    async def fake_replace_cart(self, owner, cart, items, **_):
        # The compare-and-set write is covered by the cart tests; here only what the cart contains matters.
        await self.db.carts.update_one({"owner": owner}, {"$set": {"items": items}}, upsert=True)

    async def put(self, *products):
        for product in products:
            await self.db.products.insert_one(product)

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_public_list_detail_and_counts_show_only_released_products(self):
        gaps = complete(_id="bb-2", sku="S2", ean="4000000000002", name="")
        await self.put(released(), released(gaps), complete(_id="bb-3", sku="S3", ean="4000000000003"),  # legacy: no release block
                       released(complete(_id="bb-4", sku="S4", ean="4000000000004", active=False)))
        # bb-2 was stored as blocked by the evaluation (title missing), bb-3 never evaluated, bb-4 inactive
        listing = (await self.client.get("/api/shop/products")).json()
        self.assertEqual([i["id"] for i in listing["items"]], ["bb-1"])
        self.assertEqual(listing["total"], 1)
        self.assertEqual((await self.client.get("/api/shop/products/bb-1")).status_code, 200)
        for hidden in ("bb-2", "bb-3", "bb-4"):
            self.assertEqual((await self.client.get("/api/shop/products/" + hidden)).status_code, 404, hidden)
        self.assertEqual((await self.client.get("/api/shop/status")).json()["products"], 1)
        self.assertEqual([c["count"] for c in (await self.client.get("/api/shop/categories")).json()["categories"]], [1])
        self.assertEqual((await self.client.get("/api/shop/products", params={"q": "4000000000003"})).json()["total"], 0)

    async def test_stored_released_state_does_not_outlive_a_broken_field(self):
        stale = released()
        stale["images"] = []  # changed after the evaluation
        await self.put(stale)
        self.assertEqual((await self.client.get("/api/shop/products/bb-1")).status_code, 404)
        self.assertEqual((await self.client.get("/api/shop/products")).json()["items"], [])

    async def test_public_answers_never_expose_blocker_codes(self):
        await self.put(released())
        body = (await self.client.get("/api/shop/products/bb-1")).text + (await self.client.get("/api/shop/products")).text
        self.assertNotIn("blocked_reasons", body)
        self.assertNotIn("delivery_time_missing", body)

    async def test_fitment_is_not_shown_as_proven_without_evidence(self):
        claimed = complete(fitment_status="verified")
        await self.put(released(claimed))
        item = (await self.client.get("/api/shop/products/bb-1")).json()
        self.assertEqual((item["fitment_status"], item["fitment_verified"]), ("not_checked", False))
        listed = (await self.client.get("/api/shop/products")).json()["items"][0]
        self.assertEqual((listed["fitment_status"], listed["fitment_verified"]), ("not_checked", False))

    async def test_fitment_with_evidence_is_shown_with_its_source(self):
        evidence = {"source": "Herstellerkatalog 2026", "checked_at": "2026-02-01", "vehicles": ["VW Golf 7"]}
        await self.put(released(complete(fitment_status="verified", fitment_evidence=evidence)))
        item = (await self.client.get("/api/shop/products/bb-1")).json()
        self.assertEqual((item["fitment_status"], item["fitment_verified"]), ("verified", True))
        self.assertEqual(item["fitment_source"], "Herstellerkatalog 2026")

    async def test_blocked_product_cannot_enter_the_cart_and_existing_line_becomes_unavailable(self):
        await self.put(released(), complete(_id="bb-3", sku="S3"))
        self.assertEqual((await self.client.post("/api/shop/cart/items", json={"product_id": "bb-3", "quantity": 1})).status_code, 404)
        self.assertEqual((await self.client.post("/api/shop/cart/items", json={"product_id": "bb-1", "quantity": 1})).status_code, 200)
        await self.db.products.update_one({"_id": "bb-1"}, {"$set": {"release": {"status": "blocked", "blocked_reasons": ["image_missing"]}}})
        cart = (await self.client.get("/api/shop/cart")).json()
        self.assertEqual(cart["lines"], [])
        self.assertEqual([c["kind"] for c in cart["changes"]], ["unavailable"])

    async def test_operator_read_requires_admin_and_lists_reasons(self):
        await self.put(released(), released(complete(_id="bb-2", sku="S2", name="", images=[])), complete(_id="bb-3", sku="S3"))
        self.assertEqual((await self.client.get("/api/admin/products/release")).status_code, 401)
        self.assertEqual((await self.client.get("/api/admin/products/release", headers={"Authorization": "Bearer kunde-token"})).status_code, 403)
        body = (await self.client.get("/api/admin/products/release", headers=self.admin, params={"status": "blocked"})).json()
        self.assertEqual({i["id"] for i in body["items"]}, {"bb-2"})
        item = body["items"][0]
        self.assertEqual([r["code"] for r in item["blocked_reasons"]], ["title_missing", "image_missing"])
        self.assertTrue(all(r["label"] and r["field"] for r in item["blocked_reasons"]))
        self.assertEqual(body["summary"]["released"], 1)
        self.assertEqual(body["summary"]["blocked"], 1)
        self.assertEqual(body["summary"]["not_evaluated"], 1)
        self.assertEqual(body["summary"]["by_reason"], {"title_missing": 1, "image_missing": 1})
        self.assertIn("Fachberatung", body["legal_note"])
        filtered = (await self.client.get("/api/admin/products/release", headers=self.admin, params={"status": "all", "reason": "image_missing"})).json()
        self.assertEqual([i["id"] for i in filtered["items"]], ["bb-2"])
        self.assertEqual((await self.client.get("/api/admin/products/release", headers=self.admin, params={"status": "weird"})).status_code, 422)
        self.assertEqual((await self.client.get("/api/admin/products/release", headers=self.admin, params={"reason": "nope"})).status_code, 422)

    async def test_operator_sees_stale_state_for_unevaluated_and_changed_products(self):
        stale = released()
        stale["images"] = []
        await self.put(stale, complete(_id="bb-3", sku="S3", description="", delivery_time=None))
        body = (await self.client.get("/api/admin/products/release", headers=self.admin, params={"status": "all"})).json()
        by_id = {i["id"]: i for i in body["items"]}
        self.assertTrue(by_id["bb-1"]["stale"])
        self.assertEqual([r["code"] for r in by_id["bb-1"]["blocked_reasons"]], ["image_missing"])
        self.assertIsNone(by_id["bb-3"]["release"])
        self.assertEqual([r["code"] for r in by_id["bb-3"]["blocked_reasons"]], ["description_missing", "delivery_time_missing"])

    async def test_reevaluate_defaults_to_dry_run_and_apply_marks_without_deleting(self):
        await self.put(complete(), complete(_id="bb-2", sku="S2", name=""))
        before = [dict(p) for p in self.db.products.rows]
        dry = (await self.client.post("/api/admin/products/release/reevaluate", headers=self.admin, json={})).json()
        self.assertFalse(dry["applied"])
        self.assertEqual((dry["would_release"], dry["would_block"]), (1, 1))
        self.assertEqual(self.db.products.rows, before)
        done = (await self.client.post("/api/admin/products/release/reevaluate", headers=self.admin, json={"apply": True})).json()
        self.assertTrue(done["applied"])
        self.assertEqual(len(self.db.products.rows), 2)
        self.assertEqual({p["_id"]: p["release"]["status"] for p in self.db.products.rows}, {"bb-1": "released", "bb-2": "blocked"})
        self.assertEqual([i["id"] for i in (await self.client.get("/api/shop/products")).json()["items"]], ["bb-1"])
        again = (await self.client.post("/api/admin/products/release/reevaluate", headers=self.admin, json={"apply": True})).json()
        self.assertEqual(again["changed"], 0)  # idempotent

    async def test_reevaluate_requires_admin(self):
        self.assertEqual((await self.client.post("/api/admin/products/release/reevaluate", json={"apply": True})).status_code, 401)
        self.assertEqual((await self.client.post("/api/admin/products/release/reevaluate", headers={"Authorization": "Bearer kunde-token"}, json={"apply": True})).status_code, 403)

    async def test_operator_delivery_time_releases_a_product_that_was_only_missing_it(self):
        await self.put(complete(delivery_time=None))
        await self.client.post("/api/admin/products/release/reevaluate", headers=self.admin, json={"apply": True})
        self.assertEqual((await self.client.get("/api/shop/products/bb-1")).status_code, 404)
        bad = await self.client.put("/api/admin/products/bb-1/delivery-time", headers=self.admin, json={"min_days": 5, "max_days": 2})
        self.assertEqual(bad.status_code, 422)
        self.assertEqual((await self.client.put("/api/admin/products/bb-1/delivery-time", json={"min_days": 1, "max_days": 3})).status_code, 401)
        ok = await self.client.put("/api/admin/products/bb-1/delivery-time", headers=self.admin, json={"min_days": 1, "max_days": 3})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()["release"]["status"], "released")
        stored = self.db.products.rows[0]["delivery_time"]
        self.assertEqual((stored["min_days"], stored["max_days"], stored["set_by"]), (1, 3, "admin-1"))
        self.assertEqual((await self.client.get("/api/shop/products/bb-1")).status_code, 200)
        self.assertEqual((await self.client.put("/api/admin/products/nope/delivery-time", headers=self.admin, json={"min_days": 1, "max_days": 3})).status_code, 404)


if __name__ == "__main__":
    unittest.main()
