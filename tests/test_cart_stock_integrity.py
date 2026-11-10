"""Shop cart and checkout contracts against inert in-memory doubles only."""
import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from bson.int64 import Int64
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
SHOP = ROOT / 'apps/shop-api/shop'


class AsyncRows:
    def __init__(self, rows): self.rows = rows
    def __aiter__(self): self.iterator = iter(self.rows); return self
    async def __anext__(self):
        try: return next(self.iterator)
        except StopIteration: raise StopAsyncIteration from None


class CartStockTests(unittest.TestCase):
    def setUp(self):
        name = '_cart_stock_subject'
        package = ModuleType(name); package.__path__ = [str(SHOP)]
        modules = {name: package}
        for suffix in ('auth', 'bigbuy_order', 'config', 'pricing', 'db', 'fulfillment', 'mail_templates', 'mailer', 'revolut'):
            module = ModuleType(name + '.' + suffix); modules[module.__name__] = module
        self.product = {'_id': 'fixture-product', 'name': 'Fixture', 'active': True,
                        'stock': 4, 'purchase_cents': 100, 'sku': 'fixture'}
        self.items = []
        self.extra_product = None
        self.writes = []
        self.external = AsyncMock(side_effect=AssertionError('supplier access forbidden'))

        async def find_cart(query): return {'items': list(self.items)}
        async def update_cart(query, update, **kwargs):
            self.writes.append((query, update))
            self.items = list(update['$set']['items'])
        async def find_product(query): return self.product if self.product.get('active') and query['_id'] == self.product['_id'] else None
        def find_products(query):
            products = [p for p in (self.product, self.extra_product) if p and p['_id'] in query['_id']['$in']]
            return AsyncRows(products)
        async def settings(db): return {'markup_percent': 0, 'price_released': True}
        auth = modules[name + '.auth']
        auth.identity = AsyncMock(return_value=SimpleNamespace(owner='guest:fixture', user_id=None, guest_id='fixture'))
        db = SimpleNamespace(carts=SimpleNamespace(find_one=find_cart, update_one=update_cart),
                             products=SimpleNamespace(find_one=find_product, find=find_products),
                             orders=SimpleNamespace(find_one=AsyncMock(return_value=None), insert_one=AsyncMock()))
        modules[name + '.db'].db = db; modules[name + '.db'].now_iso = lambda: 'fixture-time'
        config = modules[name + '.config']; config.SHIP_FREE_THRESHOLD_CENTS = 7500
        config.SHIPPING_FALLBACK_CENTS = 995; config.PUBLIC_ORIGIN = 'https://example.invalid'
        config.VAT_PERCENT = 19
        pricing = modules[name + '.pricing']; pricing.settings = settings
        pricing.sell_cents = lambda value, markup: value
        pricing.vat_share_cents = lambda value: 0; pricing.config = config
        modules[name + '.bigbuy_order'].cart_shipping_quote = self.external
        with patch.dict(sys.modules, modules):
            for suffix in ('cart_api', 'checkout_api', 'catalog_api'):
                spec = importlib.util.spec_from_file_location(name + '.' + suffix, SHOP / (suffix + '.py'))
                module = importlib.util.module_from_spec(spec); sys.modules[spec.name] = module
                self.addCleanup(sys.modules.pop, spec.name, None)
                spec.loader.exec_module(module); modules[spec.name] = module
            app = FastAPI(); app.include_router(modules[name + '.cart_api'].router)
            app.include_router(modules[name + '.checkout_api'].router)
        self.client = TestClient(app)
        self.db = db
        self.catalog = modules[name + '.catalog_api']

    def invalid_stock_values(self):
        return (None, True, False, -1, 1.0, '4', [], {}, 2**53)

    def test_unknown_stock_blocks_add_without_mutation(self):
        for value in self.invalid_stock_values():
            with self.subTest(stock=value):
                self.product['stock'] = value
                result = self.client.post('/api/shop/cart/items', json={'product_id': 'fixture-product', 'quantity': 1})
                self.assertEqual(result.status_code, 409)
                self.assertEqual(result.json()['detail']['error'], 'stock_unavailable')
                self.assertEqual(self.writes, [])
        self.product.pop('stock')
        self.assertEqual(self.client.post('/api/shop/cart/items', json={'product_id':'fixture-product','quantity':1}).json()['detail']['error'], 'stock_unavailable')
        self.external.assert_not_awaited()

    def test_unknown_stock_blocks_quote_confirmation_and_order_without_writes(self):
        self.items = [{'product_id':'fixture-product','name':'Fixture','quantity':1,'price_seen_cents':100}]
        body = {'address':{'first_name':'Test','last_name':'Person','street':'Test 1','zip':'10115','city':'Berlin','country':'DE','email':'test@example.invalid'},
                'accept_terms':True,'quote_hash':'fixture'}
        for value in self.invalid_stock_values():
            with self.subTest(stock=value):
                self.product['stock'] = value
                for url, payload, headers in (('/api/shop/checkout/quote', {}, {}),
                                               ('/api/shop/cart/confirm-changes', {}, {}),
                                               ('/api/shop/orders', body, {'Idempotency-Key':'fixture-idempotency-123'})):
                    result = self.client.post(url, json=payload, headers=headers)
                    self.assertEqual(result.status_code, 409, (url, result.text))
                    self.assertEqual(result.json()['detail']['error'], 'stock_unavailable')
                self.assertEqual(self.writes, [])
        self.db.orders.insert_one.assert_not_awaited(); self.external.assert_not_awaited()

    def test_zero_stock_is_known_insufficient_and_positive_stock_is_accepted(self):
        self.product['stock'] = 0
        result = self.client.post('/api/shop/cart/items', json={'product_id':'fixture-product','quantity':1})
        self.assertEqual(result.status_code, 409)
        self.assertEqual(result.json()['detail'], {'error':'insufficient_stock','stock':0})
        self.product['stock'] = 4
        result = self.client.post('/api/shop/cart/items', json={'product_id':'fixture-product','quantity':2})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['count'], 2)

    def test_bson_int64_stock_is_accepted_within_public_safe_range(self):
        self.product['stock'] = Int64(4)
        result = self.client.post('/api/shop/cart/items', json={'product_id':'fixture-product','quantity':2})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['lines'][0]['stock'], 4)
        self.product['stock'] = Int64(2**53)
        result = self.client.post('/api/shop/cart/items', json={'product_id':'fixture-product','quantity':1})
        self.assertEqual(result.status_code, 409)
        self.assertEqual(result.json()['detail']['error'], 'stock_unavailable')

    def test_catalog_and_cart_agree_on_bson_and_invalid_stock(self):
        settings = {'price_released': True, 'markup_percent': 0}
        for value, expected in ((Int64(4), 4), (Int64(0), 0), (True, None), (None, None), (Int64(2**53), None)):
            with self.subTest(stock=value):
                self.product['stock'] = value
                shown = self.catalog.present(self.product, settings)
                self.assertEqual(shown['stock'], expected)
                self.assertEqual(shown['stock_status'], 'unknown' if expected is None else 'reported')

    def test_other_unknown_item_is_checked_before_cart_update(self):
        self.extra_product = {'_id':'other','name':'Other','active':True,'stock':None,'purchase_cents':100}
        self.items = [{'product_id':'other','name':'Other','quantity':1,'price_seen_cents':100}]
        result = self.client.post('/api/shop/cart/items', json={'product_id':'fixture-product','quantity':1})
        self.assertEqual(result.status_code, 409)
        self.assertEqual(result.json()['detail'], {'error':'stock_unavailable','product_id':'other'})
        self.assertEqual(self.writes, [])

    def test_customer_can_remove_item_with_unknown_stock(self):
        self.product['stock'] = None
        self.items = [{'product_id':'fixture-product','name':'Fixture','quantity':1,'price_seen_cents':100}]
        result = self.client.post('/api/shop/cart/items', json={'product_id':'fixture-product','quantity':0})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['count'], 0)
        self.assertEqual(self.items, [])
        self.external.assert_not_awaited()

    def test_two_unknown_stock_items_remain_removable_without_becoming_orderable(self):
        self.product['stock'] = None
        self.extra_product = {'_id':'other','name':'Other','active':True,'stock':None,'purchase_cents':100}
        self.items = [{'product_id':'fixture-product','name':'Fixture','quantity':1,'price_seen_cents':100},
                      {'product_id':'other','name':'Other','quantity':1,'price_seen_cents':100}]
        initial = self.client.get('/api/shop/cart')
        self.assertEqual(initial.status_code, 200, initial.text)
        self.assertEqual([line['stock'] for line in initial.json()['lines']], [None, None])
        self.assertEqual([line['stock_status'] for line in initial.json()['lines']], ['unknown', 'unknown'])
        self.assertEqual([change['kind'] for change in initial.json()['changes']], ['stock_unknown', 'stock_unknown'])
        self.assertEqual(self.client.post('/api/shop/checkout/quote', json={}).status_code, 409)
        first = self.client.post('/api/shop/cart/items', json={'product_id':'fixture-product','quantity':0})
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual([line['product_id'] for line in first.json()['lines']], ['other'])
        self.assertIsNone(first.json()['lines'][0]['stock'])
        self.assertEqual(first.json()['changes'][0]['kind'], 'stock_unknown')
        self.assertEqual(self.client.post('/api/shop/checkout/quote', json={}).status_code, 409)
        second = self.client.post('/api/shop/cart/items', json={'product_id':'other','quantity':0})
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(second.json()['count'], 0)
        self.assertEqual(self.items, [])
        self.external.assert_not_awaited()

    def test_untrusted_quantities_are_not_coerced(self):
        for value in (True, False, '2', 1.0, -1, 21):
            with self.subTest(quantity=value):
                result = self.client.post('/api/shop/cart/items', json={'product_id':'fixture-product','quantity':value})
                self.assertEqual(result.status_code, 422)
        self.assertEqual(self.writes, [])

    def test_invalid_persisted_quantity_is_rejected_without_confirmation(self):
        for value in (None, True, False, '1', -1, 0, 21):
            with self.subTest(quantity=value):
                self.items = [{'product_id':'fixture-product','name':'Fixture','quantity':value,'price_seen_cents':100}]
                result = self.client.post('/api/shop/cart/confirm-changes', json={})
                self.assertEqual(result.status_code, 409)
                self.assertEqual(result.json()['detail']['error'], 'cart_quantity_invalid')
        self.assertEqual(self.writes, [])


if __name__ == '__main__': unittest.main()
