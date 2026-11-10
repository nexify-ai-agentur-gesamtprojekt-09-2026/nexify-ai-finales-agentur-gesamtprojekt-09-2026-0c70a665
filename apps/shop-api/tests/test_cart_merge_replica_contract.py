"""Future merge contract; run only against an explicitly disposable local replica set.

No provider, customer data or remote database is used. Each test gets a unique
synthetic database; these databases are intentionally left in the disposable
instance for inspection rather than deleted by this test.
"""
import asyncio
import importlib.util
import os
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from pymongo import AsyncMongoClient

ROOT = Path(__file__).resolve().parents[3]
SHOP = ROOT / 'apps/shop-api/shop'


def isolated_uri():
    if os.environ.get('NEXIFY_MONGO_DISPOSABLE_CONFIRMED') != 'yes':
        if os.environ.get('NEXIFY_REQUIRE_MONGO_TEST') == '1':
            raise RuntimeError('Required isolated Mongo replica set was not confirmed')
        raise unittest.SkipTest('Explicit disposable local replica-set confirmation absent')
    uri = os.environ.get('NEXIFY_TEST_MONGO_URI', '')
    parsed = urlsplit(uri)
    query = parse_qs(parsed.query, strict_parsing=True)
    if (parsed.scheme != 'mongodb' or parsed.hostname not in ('localhost', '127.0.0.1', '::1')
            or not parsed.port or parsed.port < 1024 or parsed.username or parsed.password
            or parsed.path not in ('', '/') or set(query) != {'replicaSet'}
            or len(query['replicaSet']) != 1 or not query['replicaSet'][0]):
        raise ValueError('An unauthenticated loopback-only replica-set URI is required')
    return uri


class MergeReplicaContract(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = AsyncMongoClient(isolated_uri(), serverSelectionTimeoutMS=3000)
        self.addAsyncCleanup(self.client.close)
        hello = await self.client.admin.command('hello')
        if not hello.get('setName') or not hello.get('isWritablePrimary'):
            self.fail('Test target must be the writable member of a disposable replica set')
        self.db = self.client['nexify_cart_test_' + uuid4().hex]
        await self.db.carts.create_index('owner', unique=True)
        await self.db.carts.insert_many([
            {'owner':'user:synthetic', 'items':[{'product_id':'a','name':'A','quantity':3,'price_seen_cents':100}]},
            {'owner':'guest:synthetic', 'items':[{'product_id':'a','name':'A','quantity':2,'price_seen_cents':100}]},
        ])
        name = '_cart_replica_' + uuid4().hex
        package = ModuleType(name); package.__path__ = [str(SHOP)]
        modules = {name: package}
        for suffix in ('auth','bigbuy_order','config','pricing','db','fulfillment','mail_templates','mailer','revolut'):
            module = ModuleType(name + '.' + suffix); modules[module.__name__] = module
        modules[name+'.db'].db = self.db; modules[name+'.db'].now_iso = lambda: 'synthetic-time'
        config = modules[name+'.config']; config.SHIP_FREE_THRESHOLD_CENTS = 7500
        config.SHIPPING_FALLBACK_CENTS = 995; config.VAT_PERCENT = 19; config.PUBLIC_ORIGIN = 'https://example.invalid'
        pricing = modules[name+'.pricing']; pricing.config = config
        pricing.settings = AsyncMock(return_value={'price_released':True,'markup_percent':0})
        pricing.sell_cents = lambda value, markup: value
        pricing.vat_share_cents = lambda value: 0
        modules[name+'.bigbuy_order'].cart_shipping_quote = AsyncMock(side_effect=AssertionError('provider forbidden'))
        modules[name+'.fulfillment'].submit_order = AsyncMock()
        modules[name+'.revolut'].retrieve_order = AsyncMock(return_value={'state':'completed'})
        modules[name+'.auth'].identity = AsyncMock(return_value=SimpleNamespace(owner='user:synthetic',user_id='synthetic',guest_id=None))
        self.ident = SimpleNamespace(owner='user:synthetic',user_id='synthetic',guest_id='synthetic')
        with patch.dict(sys.modules, modules):
            spec = importlib.util.spec_from_file_location(name+'.cart_api', SHOP/'cart_api.py')
            self.cart = importlib.util.module_from_spec(spec); sys.modules[spec.name] = self.cart
            self.addCleanup(sys.modules.pop, spec.name, None); spec.loader.exec_module(self.cart)
            spec = importlib.util.spec_from_file_location(name+'.checkout_api', SHOP/'checkout_api.py')
            self.checkout = importlib.util.module_from_spec(spec); spec.loader.exec_module(self.checkout)
            self.checkout.send_paid_mails = AsyncMock()

    async def carts(self):
        return (await self.db.carts.find_one({'owner':'guest:synthetic'}),
                await self.db.carts.find_one({'owner':'user:synthetic'}))

    async def test_parallel_and_retry_transfer_once_without_deleting_guest(self):
        async def merge_with_retry():
            for attempt in range(4):
                try:
                    return await self.cart.merge(self.ident)
                except HTTPException as exc:
                    if exc.status_code != 409 or attempt == 3: raise
                    await asyncio.sleep(.05)
        await asyncio.gather(*(merge_with_retry() for _ in range(8)))
        await self.cart.merge(self.ident)
        guest, user = await self.carts()
        self.assertIsNotNone(guest, 'guest document must be retained')
        self.assertEqual(guest['items'], [])
        self.assertEqual(user['items'][0]['quantity'], 5)
        receipts = guest['merge_history']
        self.assertEqual(len(receipts), 1)
        self.assertEqual(receipts[0]['guest_snapshot']['items'][0]['quantity'], 2)

    async def test_new_guest_revision_creates_one_new_transfer(self):
        await self.cart.merge(self.ident)
        await self.db.carts.update_one({'owner':'guest:synthetic'}, {'$set':{'items':[{'product_id':'a','name':'A','quantity':1,'price_seen_cents':100}]}, '$inc':{'revision':1}})
        await self.cart.merge(self.ident)
        await self.cart.merge(self.ident)
        guest, user = await self.carts()
        self.assertEqual(guest['items'], [])
        self.assertEqual(user['items'][0]['quantity'], 6)
        self.assertEqual(len(guest['merge_history']), 2)

    async def test_abort_after_guest_read_preserves_both_carts(self):
        before = await self.carts()
        original = self.cart.replace_cart
        async def abort_after_write(*args, **kwargs):
            await original(*args, **kwargs)
            raise RuntimeError('synthetic interruption after transactional write')
        with patch.object(self.cart, 'replace_cart', side_effect=abort_after_write):
            with self.assertRaises(RuntimeError):
                await self.cart.merge(self.ident)
        self.assertEqual(await self.carts(), before)
        self.assertNotIn('merge_history', (await self.carts())[0])

    async def test_limit_conflict_preserves_both_carts_without_silent_truncation(self):
        await self.db.carts.update_one({'owner':'user:synthetic'}, {'$set':{'items':[{'product_id':'a','name':'A','quantity':19,'price_seen_cents':100}]}})
        before = await self.carts()
        with self.assertRaises(HTTPException) as caught:
            await self.cart.merge(self.ident)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(await self.carts(), before)

    async def test_concurrent_cart_update_does_not_lose_merged_or_added_item(self):
        await self.db.products.insert_many([
            {'_id':'a','name':'A','sku':'a','active':True,'stock':10,'purchase_cents':100},
            {'_id':'b','name':'B','sku':'b','active':True,'stock':10,'purchase_cents':100},
        ])
        async def add_b():
            try:
                await self.cart.set_item(self.cart.ItemIn(product_id='b', quantity=1), None, None)
            except HTTPException as exc:
                if exc.status_code != 409: raise
                await self.cart.set_item(self.cart.ItemIn(product_id='b', quantity=1), None, None)
        await asyncio.gather(self.cart.merge(self.ident), add_b())
        _, user = await self.carts()
        items = {line['product_id']:line['quantity'] for line in user['items']}
        self.assertEqual(items, {'a':5, 'b':1})

    async def test_concurrent_confirmation_does_not_lose_transferred_quantity(self):
        await self.db.products.insert_one({'_id':'a','name':'A','sku':'a','active':True,'stock':10,'purchase_cents':100})
        async def confirm():
            try:
                await self.cart.confirm_changes(None, None)
            except HTTPException as exc:
                if exc.status_code != 409: raise
                await self.cart.confirm_changes(None, None)
        await asyncio.gather(self.cart.merge(self.ident), confirm())
        _, user = await self.carts()
        self.assertEqual({line['product_id']:line['quantity'] for line in user['items']}, {'a':5})

    async def test_paid_webhook_race_preserves_new_guest_quantity(self):
        order = {'_id':'synthetic-order','owner':'user:synthetic','status':'zahlung_offen',
                 'revolut_order_id':'synthetic-provider','cart_revision':None,
                 'lines':[{'product_id':'a','quantity':3}]}
        await self.db.orders.insert_one(order)
        await asyncio.gather(self.cart.merge(self.ident), self.checkout.sync_payment(order))
        guest, user = await self.carts()
        self.assertEqual(guest['items'], [])
        self.assertIn(user['items'][0]['quantity'], (2, 5))
        self.assertEqual(len(guest['merge_history']), 1)

    async def test_full_history_rejects_transfer_without_losing_either_cart(self):
        history = [{'id':'synthetic-'+str(i)} for i in range(self.cart.MAX_MERGE_HISTORY)]
        await self.db.carts.update_one({'owner':'guest:synthetic'}, {'$set':{'merge_history':history}})
        before = await self.carts()
        with self.assertRaises(HTTPException) as caught:
            await self.cart.merge(self.ident)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(caught.exception.detail['error'], 'cart_merge_archive_limit')
        self.assertEqual(await self.carts(), before)

    async def test_bson_limit_rejects_transfer_without_losing_either_cart(self):
        # A valid existing document whose archived snapshot would exceed 16 MiB.
        await self.db.carts.update_one({'owner':'guest:synthetic'}, {'$set':{'synthetic_padding':'x' * (9 * 1024 * 1024)}})
        before = await self.carts()
        with self.assertRaises(HTTPException) as caught:
            await self.cart.merge(self.ident)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(caught.exception.detail['error'], 'cart_merge_archive_limit')
        self.assertEqual(await self.carts(), before)

    async def test_namespace_metadata_remains_ready_before_and_after_merge(self):
        spec = importlib.util.spec_from_file_location('_synthetic_vercel_shop_adapter', ROOT/'apps/shop-api/vercel_app.py')
        adapter = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = adapter; self.addCleanup(sys.modules.pop, spec.name, None)
        spec.loader.exec_module(adapter)
        bound = self.client['nexify_cart_test_' + uuid4().hex]
        for name in adapter.COLLECTIONS:
            collection = await bound.create_collection(name, validator={'$jsonSchema':{'bsonType':'object','description':adapter.SCHEMA_MARKER}})
            for keys, unique, ttl in adapter.INDEXES.get(name, []):
                options = {'unique':unique}
                if ttl is not None: options['expireAfterSeconds'] = ttl
                await collection.create_index([(key,1) for key in keys], **options)
        await bound.carts.insert_many([
            {'owner':'user:synthetic','items':[{'product_id':'a','name':'A','quantity':3,'price_seen_cents':100}]},
            {'owner':'guest:synthetic','items':[{'product_id':'a','name':'A','quantity':2,'price_seen_cents':100}]},
        ])
        self.assertIsNone(await adapter.check_metadata(bound))
        self.cart.db = bound
        await self.cart.merge(self.ident)
        self.assertIsNone(await adapter.check_metadata(bound))
        names = await bound.list_collection_names()
        self.assertEqual(set(names), set(adapter.COLLECTIONS))
        guest = await bound.carts.find_one({'owner':'guest:synthetic'})
        self.assertEqual(guest['items'], [])
        self.assertEqual(guest['merge_history'][0]['guest_snapshot']['items'][0]['quantity'], 2)


if __name__ == '__main__': unittest.main()
