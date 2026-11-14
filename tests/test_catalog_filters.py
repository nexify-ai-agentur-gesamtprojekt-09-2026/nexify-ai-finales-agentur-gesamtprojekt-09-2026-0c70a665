"""TK-13 (backend part): catalog filters, facets with counts, sorting, stable bounded pagination.

Real router against the in-memory store. Only released products take part (shop/product_release.py).
"""
import unittest
from decimal import Decimal
from unittest import mock

from suite_fakes import Database, bind_shop_environment

bind_shop_environment()
from shop import pricing

try:
    import httpx
    from fastapi import FastAPI
    from shop import catalog_api, product_release
    HTTP_DEPS = True
except ImportError:
    HTTP_DEPS = False

IMAGE = "https://cdnbigbuy.com/images/V0103601_000_MKT5.jpg"
VAT = Decimal("19")
SOLD = ({"min_days": 1, "max_days": 3})


class PriceBounds(unittest.TestCase):
    def test_bounds_agree_with_the_selling_price_at_every_edge(self):
        for markup in ("0", "30", "37.5", "100"):
            for vat in ("0", "7", "19"):
                for low, high in ((0, 10**6), (1500, 1600), (1547, 1547), (1548, 1548), (2000, 2000), (999, 5000)):
                    bounds = pricing.purchase_range_for_sell(low, high, markup, vat)
                    brute = [p for p in range(0, 4000) if low <= pricing.sell_cents(p, markup, vat) <= high]
                    with self.subTest(markup=markup, vat=vat, low=low, high=high):
                        lo, hi = bounds
                        got = [p for p in range(0, 4000) if (lo is None or p >= lo) and (hi is None or p <= hi)]
                        self.assertEqual(got, brute)

    def test_open_ends_stay_open(self):
        self.assertEqual(pricing.purchase_range_for_sell(None, None, "30", "19"), (None, None))
        self.assertIsNone(pricing.purchase_range_for_sell(None, 2000, "30", "19")[0])
        self.assertIsNone(pricing.purchase_range_for_sell(1000, None, "30", "19")[1])


def product(n, *, brand="Alpha", categories=(9, 1), purchase=1000, stock=5, name=None, first="2026-01-%02d", released=True, **extra):
    doc = {"_id": "bb-%d" % n, "bigbuy_id": n, "sku": "S%d" % n, "ean": "40000000%05d" % n, "name": name or "Artikel %d" % n,
           "description": "Beschreibung fuer Artikel mit genug Text.", "images": [IMAGE], "purchase_cents": purchase, "stock": stock,
           "category_ids": list(categories), "category_id": categories[0], "active": True, "details": {"manufacturer": brand},
           "delivery_time": SOLD, "imported_at": "2026-01-01T00:00:00+00:00", "first_imported_at": first % (n % 28 + 1)}
    doc.update(extra)
    if released:
        doc["release"] = product_release.state(doc, vat_percent=VAT, image_ok=catalog_api.supplier_image if HTTP_DEPS else (lambda v: v),
                                                checked_by="test", stamp="t")
    return doc


@unittest.skipUnless(HTTP_DEPS, "pinned dependencies unavailable")
class Catalog(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = Database()
        for cid, name, root in ((1, "Auto & Motorrad", True), (9, "Bremsen", False), (10, "Filter", False)):
            await self.db.categories.insert_one({"_id": cid, "name": name, "root": root})
        await self.db.settings.insert_one({"_id": "shop", "markup_percent": "30", "price_release": {"markup_percent": "30", "released_at": "t"}})
        patch = mock.patch.object(catalog_api, "db", self.db)
        patch.start()
        self.addCleanup(patch.stop)
        app = FastAPI()
        app.include_router(catalog_api.router)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://suite.example.invalid")
        self.addAsyncCleanup(self.client.aclose)

    async def put(self, *docs):
        for doc in docs:
            await self.db.products.insert_one(doc)

    async def fixture(self):
        await self.put(
            product(1, brand="Alpha", categories=(9, 1), purchase=1000, stock=5, name="Bremsbelag"),
            product(2, brand="Alpha", categories=(10, 1), purchase=2000, stock=0, name="Oelfilter"),
            product(3, brand="Beta", categories=(9, 1), purchase=3000, stock=2, name="Bremsscheibe"),
            product(4, brand="Beta", categories=(10, 1), purchase=4000, stock=7, name="Luftfilter"),
            product(5, brand="Gamma", categories=(9, 1), purchase=5000, stock=0, name="Bremsfluessigkeit"),
            product(6, brand="Alpha", categories=(9, 1), purchase=1000, stock=5, name="Bremsbelag"),  # same name, price, stock as 1
            product(7, brand="Alpha", categories=(9, 1), purchase=1000, stock=5, name="Gesperrt", released=False),  # not released
        )

    async def get(self, **params):
        return await self.client.get("/api/shop/products", params=params)

    async def ids(self, **params):
        response = await self.get(**params)
        self.assertEqual(response.status_code, 200, response.text)
        return [i["id"] for i in response.json()["items"]]

    async def test_answer_shape_documents_applied_filters_facets_and_limits(self):
        await self.fixture()
        body = (await self.get(brand="Alpha", price_min_cents=1000, availability="in_stock", sort="price_asc")).json()
        self.assertEqual(set(body), {"items", "total", "page", "page_size", "pages", "q", "category", "sort", "applied", "facets", "limits"})
        self.assertEqual(body["applied"], {"q": "", "category": None, "brands": ["Alpha"], "price_min_cents": 1000, "price_max_cents": None,
                                           "availability": "in_stock"})
        self.assertEqual(set(body["facets"]), {"categories", "brands", "availability", "price"})
        self.assertEqual(body["limits"], {"max_page_size": 60, "max_window_items": 10000, "window_limited": False})
        self.assertEqual(body["sort"], "price_asc")

    async def test_only_released_products_are_listed_and_counted(self):
        await self.fixture()
        body = (await self.get()).json()
        self.assertEqual(body["total"], 6)
        self.assertNotIn("bb-7", [i["id"] for i in body["items"]])
        self.assertEqual({b["value"]: b["count"] for b in body["facets"]["brands"]}, {"Alpha": 3, "Beta": 2, "Gamma": 1})

    async def test_filters_category_brand_price_availability(self):
        await self.fixture()
        self.assertEqual(sorted(await self.ids(category=10)), ["bb-2", "bb-4"])
        self.assertEqual(sorted(await self.ids(brand="Beta")), ["bb-3", "bb-4"])
        self.assertEqual(sorted(await self.ids(brand=["Beta", "Gamma"])), ["bb-3", "bb-4", "bb-5"])
        self.assertEqual(sorted(await self.ids(availability="in_stock")), ["bb-1", "bb-3", "bb-4", "bb-6"])
        self.assertEqual(sorted(await self.ids(availability="out_of_stock")), ["bb-2", "bb-5"])
        self.assertEqual(sorted(await self.ids(in_stock="true")), ["bb-1", "bb-3", "bb-4", "bb-6"])  # earlier parameter still works
        # selling price = purchase x 1.30 x 1.19 = 1.547 per cent: 1000 -> 1547, 2000 -> 3094
        self.assertEqual(sorted(await self.ids(price_min_cents=1547, price_max_cents=3094)), ["bb-1", "bb-2", "bb-6"])
        self.assertEqual(sorted(await self.ids(price_min_cents=1548, price_max_cents=3093)), [])
        self.assertEqual(sorted(await self.ids(price_max_cents=1547)), ["bb-1", "bb-6"])
        self.assertEqual(sorted(await self.ids(brand="Alpha", category=9, availability="in_stock")), ["bb-1", "bb-6"])

    async def test_text_search_combines_with_filters(self):
        await self.fixture()
        self.assertEqual(sorted(await self.ids(q="brems", brand="Alpha")), ["bb-1", "bb-6"])
        self.assertEqual(await self.ids(q="40000000%05d" % 4), ["bb-4"])

    async def test_facets_count_each_dimension_without_its_own_filter(self):
        await self.fixture()
        body = (await self.get(brand="Alpha", category=9)).json()
        self.assertEqual(body["total"], 2)
        # brand facet ignores the brand filter but respects the category filter
        self.assertEqual({b["value"]: b["count"] for b in body["facets"]["brands"]}, {"Alpha": 2, "Beta": 1, "Gamma": 1})
        # category facet ignores the category filter but respects the brand filter
        self.assertEqual({c["id"]: c["count"] for c in body["facets"]["categories"]}, {1: 3, 9: 2, 10: 1})
        self.assertEqual(body["facets"]["availability"], {"in_stock": 2, "out_of_stock": 0})
        names = {c["id"]: c["name"] for c in body["facets"]["categories"]}
        self.assertEqual(names[9], "Bremsen")

    async def test_availability_facet_ignores_the_availability_filter(self):
        await self.fixture()
        body = (await self.get(availability="in_stock")).json()
        self.assertEqual(body["facets"]["availability"], {"in_stock": 4, "out_of_stock": 2})

    async def test_price_facet_is_the_selling_price_range_without_the_price_filter(self):
        await self.fixture()
        body = (await self.get(price_min_cents=3000)).json()
        self.assertEqual(body["facets"]["price"], {"min_cents": 1547, "max_cents": 7735, "currency": "EUR"})
        self.assertEqual(body["total"], 4)  # purchase >= 1940 -> 2000, 3000, 4000, 5000

    async def test_facets_are_sorted_by_count_then_name_and_bounded(self):
        await self.fixture()
        brands = (await self.get()).json()["facets"]["brands"]
        self.assertEqual([b["value"] for b in brands], ["Alpha", "Beta", "Gamma"])
        for n in range(20, 20 + 70):
            await self.put(product(n, brand="Marke%03d" % n))
        brands = (await self.get()).json()["facets"]["brands"]
        self.assertEqual(len(brands), catalog_api.MAX_FACET_VALUES)

    async def test_sorting_is_stable_and_complete(self):
        await self.fixture()
        self.assertEqual(await self.ids(sort="price_asc"), ["bb-1", "bb-6", "bb-2", "bb-3", "bb-4", "bb-5"])
        self.assertEqual(await self.ids(sort="price_desc"), ["bb-5", "bb-4", "bb-3", "bb-2", "bb-1", "bb-6"])
        self.assertEqual(await self.ids(sort="name"), ["bb-1", "bb-6", "bb-5", "bb-3", "bb-4", "bb-2"])
        # relevance (no full-text weighting): stock descending, then name, ties by id
        self.assertEqual(await self.ids(sort="relevance"), ["bb-4", "bb-1", "bb-6", "bb-3", "bb-5", "bb-2"])
        self.assertEqual(await self.ids(), await self.ids(sort="relevance"))
        newest = await self.ids(sort="newest")
        stamps = {d["_id"]: d["first_imported_at"] for d in self.db.products.rows}
        ordered = [stamps[i] for i in newest]
        self.assertEqual(ordered, sorted(ordered, reverse=True))

    async def test_pagination_has_no_gaps_or_repeats_when_sort_keys_tie(self):
        await self.fixture()
        seen = []
        for page in (1, 2, 3, 4):
            body = (await self.get(page_size=2, page=page, sort="price_asc")).json()
            seen += [i["id"] for i in body["items"]]
            self.assertEqual((body["total"], body["pages"]), (6, 3))
        self.assertEqual(seen, ["bb-1", "bb-6", "bb-2", "bb-3", "bb-4", "bb-5"])
        self.assertEqual((await self.get(page_size=2, page=4)).json()["items"], [])

    async def test_pagination_window_is_capped(self):
        await self.fixture()
        capped = await self.get(page=167, page_size=60)  # 167 * 60 = 10020 > 10000
        self.assertEqual(capped.status_code, 422)
        self.assertEqual(capped.json()["detail"]["error"], "page_out_of_range")
        self.assertEqual(capped.json()["detail"]["max_window_items"], 10000)
        self.assertEqual((await self.get(page=10000, page_size=1)).status_code, 200)
        self.assertEqual((await self.get(page=10001, page_size=1)).status_code, 422)

    async def test_invalid_input_is_refused_with_the_field_named(self):
        await self.fixture()
        cases = [({"price_min_cents": -1}, "price_min_cents"), ({"price_min_cents": "abc"}, "price_min_cents"),
                 ({"price_max_cents": 10**9}, "price_max_cents"), ({"price_min_cents": 500, "price_max_cents": 100}, "price_max_cents"),
                 ({"sort": "zufall"}, "sort"), ({"availability": "bald"}, "availability"), ({"page_size": 61}, "page_size"),
                 ({"page": 0}, "page"), ({"category": "x"}, "category"), ({"brand": "x" * 81}, "brand"),
                 ({"brand": ["m%d" % n for n in range(11)]}, "brand"), ({"brand": ""}, "brand"), ({"q": "x" * 121}, "q")]
        for params, field in cases:
            with self.subTest(params=params):
                response = await self.get(**params)
                self.assertEqual(response.status_code, 422, response.text)
                self.assertIn(field, response.text)

    async def test_price_filter_and_price_sort_need_released_prices(self):
        await self.fixture()
        await self.db.settings.update_one({"_id": "shop"}, {"$unset": {"price_release": ""}})
        for params in ({"price_min_cents": 100}, {"price_max_cents": 100}, {"sort": "price_asc"}, {"sort": "price_desc"}):
            with self.subTest(params=params):
                response = await self.get(**params)
                self.assertEqual((response.status_code, response.json()["detail"]["error"]), (409, "price_not_released"))
        body = (await self.get()).json()
        self.assertIsNone(body["facets"]["price"])
        self.assertTrue(all(i["price_cents"] is None for i in body["items"]))

    async def test_blocked_and_inactive_products_never_appear_in_any_facet(self):
        await self.fixture()
        await self.put(product(30, brand="Delta", active=False), product(31, brand="Delta", released=False))
        body = (await self.get()).json()
        self.assertNotIn("Delta", [b["value"] for b in body["facets"]["brands"]])
        self.assertEqual(body["total"], 6)

    async def test_an_empty_result_has_empty_but_complete_facets(self):
        await self.fixture()
        body = (await self.get(brand="Unbekannt")).json()
        self.assertEqual((body["total"], body["items"], body["pages"]), (0, [], 1))
        self.assertEqual(body["facets"]["availability"], {"in_stock": 0, "out_of_stock": 0})
        self.assertEqual({b["value"]: b["count"] for b in body["facets"]["brands"]}, {"Alpha": 3, "Beta": 2, "Gamma": 1})

    async def test_brand_values_are_matched_exactly_not_as_patterns(self):
        await self.fixture()
        self.assertEqual(await self.ids(brand=".*"), [])
        self.assertEqual(await self.ids(brand="alpha"), [])  # exact, as the facet value is


if __name__ == "__main__":
    unittest.main()
