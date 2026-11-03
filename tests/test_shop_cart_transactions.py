"""Real Mongo replica-set tests, opt-in and restricted to a disposable loopback DB.

NEXIFY_CART_TEST_MONGO_URI=mongodb://127.0.0.1:27028/?replicaSet=nexify_cart_test
No production config/dotenv, accounts, provider calls or database deletion.
"""
import asyncio
from datetime import datetime, timezone
from decimal import Decimal
import importlib.util
import os
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch
import uuid

URI = os.environ.get('NEXIFY_CART_TEST_MONGO_URI', '')
ROOT = Path(__file__).resolve().parents[1]


def load_subject(database):
    package = ModuleType('_cart_transaction_subject')
    package.__path__ = [str(ROOT / 'apps/shop-api/shop')]
    config = ModuleType(package.__name__ + '.config')
    config.VAT_PERCENT = Decimal('19')  # isolated synthetic price, never a business rate
    config.DEFAULT_MARKUP_PERCENT = Decimal('30')
    db = ModuleType(package.__name__ + '.db')
    db.db = database
    db.now_iso = lambda: datetime.now(timezone.utc).isoformat()
    def load(name):
        spec = importlib.util.spec_from_file_location(package.__name__ + '.' + name,
                                                    Path(package.__path__[0]) / (name + '.py'))
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module
    with patch.dict(sys.modules, {package.__name__: package, config.__name__: config, db.__name__: db}):
        auth = load('auth')
        pricing = load('pricing')
        package.auth, package.pricing = auth, pricing
        return load('cart_api')


@unittest.skipUnless(URI, 'disposable loopback Mongo replica set not selected')
class CartTransactions(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        if URI != 'mongodb://127.0.0.1:27028/?replicaSet=nexify_cart_test':
            self.fail('Only the explicit disposable loopback replica set is permitted')
        from motor.motor_asyncio import AsyncIOMotorClient
        self.client = AsyncIOMotorClient(URI, serverSelectionTimeoutMS=5000)
        self.database = self.client['nexify_cart_test_' + uuid.uuid4().hex]
        self.cart = load_subject(self.database)
        self.ident = self.cart.auth.Identity('alice', 'customer', 'g' * 32)
        await self.database.carts.create_index('owner', unique=True)
        await self.database.carts.insert_many([
            {'owner': self.ident.owner, 'items': [{'product_id': 'shared', 'quantity': 3}]},
            {'owner': 'guest:' + self.ident.guest_id, 'items': [
                {'product_id': 'shared', 'quantity': 2}, {'product_id': 'guest-only', 'quantity': 1}]}])

    async def asyncTearDown(self):
        # Keep synthetic evidence DBs until the explicitly named container is stopped.
        self.client.close()

    async def quantities(self, owner='user:alice'):
        row = await self.database.carts.find_one({'owner': owner})
        return {i['product_id']: i['quantity'] for i in row['items']}

    async def test_merge_replay_has_one_effect_and_preserves_guest_identity(self):
        await self.cart.merge(self.ident)
        await self.cart.merge(self.ident)
        self.assertEqual(await self.quantities(), {'shared': 5, 'guest-only': 1})
        guest = await self.database.carts.find_one({'owner': 'guest:' + self.ident.guest_id})
        self.assertEqual(guest['items'], [])

    async def test_parallel_same_guest_applied_once(self):
        await asyncio.gather(*(self.cart.merge(self.ident) for _ in range(12)))
        self.assertEqual(await self.quantities(), {'shared': 5, 'guest-only': 1})

    async def test_guest_cannot_be_claimed_by_two_accounts(self):
        other = self.cart.auth.Identity('bob', 'customer', self.ident.guest_id)
        await asyncio.gather(self.cart.merge(self.ident), self.cart.merge(other))
        rows = [r async for r in self.database.carts.find({'owner': {'$in': ['user:alice', 'user:bob']}})]
        self.assertEqual(sum(i['quantity'] for r in rows for i in r['items'] if i['product_id'] == 'shared'), 5)
        self.assertEqual(sum(i['quantity'] for r in rows for i in r['items'] if i['product_id'] == 'guest-only'), 1)

    async def test_failure_after_target_write_rolls_back_both_carts(self):
        actual = self.database.carts.update_one
        async def fail_source(query, update, **kwargs):
            if query['owner'].startswith('guest:'):
                raise RuntimeError('injected_before_source_commit')
            return await actual(query, update, **kwargs)
        collection = self.database.carts
        original_database = self.cart.db
        # Motor creates Collection wrappers on access; bind one explicitly.
        self.cart.db = SimpleNamespace(carts=collection, client=self.client)
        with patch.object(collection, 'update_one', fail_source):
            with self.assertRaisesRegex(RuntimeError, 'injected_before_source_commit'):
                await self.cart.merge(self.ident)
        self.cart.db = original_database
        self.assertEqual(await self.quantities(), {'shared': 3})
        self.assertEqual(await self.quantities('guest:' + self.ident.guest_id), {'shared': 2, 'guest-only': 1})
        await self.cart.merge(self.ident)
        self.assertEqual(await self.quantities(), {'shared': 5, 'guest-only': 1})

    async def test_restart_after_lost_ack_does_not_duplicate(self):
        await self.cart.merge(self.ident)  # commit happened, HTTP response is lost
        restarted = load_subject(self.database)
        await restarted.merge(self.ident)
        self.assertEqual(await self.quantities(), {'shared': 5, 'guest-only': 1})

    async def test_parallel_different_guests_preserve_all_items(self):
        await self.database.carts.insert_one({'owner': 'guest:' + 'h' * 32, 'items': [{'product_id': 'second', 'quantity': 4}]})
        other = self.cart.auth.Identity('alice', 'customer', 'h' * 32)
        await asyncio.gather(self.cart.merge(self.ident), self.cart.merge(other))
        self.assertEqual(await self.quantities(), {'shared': 5, 'guest-only': 1, 'second': 4})

    async def test_merge_caps_existing_quantity(self):
        await self.database.carts.update_one({'owner': 'user:alice'}, {'$set': {'items': [{'product_id': 'shared', 'quantity': 19}]}})
        await self.cart.merge(self.ident)
        self.assertEqual((await self.quantities())['shared'], 20)

    async def test_stale_guest_mutation_cannot_modify_transferred_user_items(self):
        await self.cart.merge(self.ident)
        async def guest_owner(*args, **kwargs):
            return self.cart.auth.Identity(None, None, self.ident.guest_id)
        with patch.object(self.cart, 'owner_for', guest_owner):
            await self.cart.set_item(self.cart.ItemIn(product_id='shared', quantity=0), None, None)
        self.assertEqual(await self.quantities('guest:' + self.ident.guest_id), {})
        self.assertEqual(await self.quantities(), {'shared': 5, 'guest-only': 1})

    async def test_parallel_mutation_and_merge_do_not_lose_unrelated_items(self):
        async def user_owner(*args, **kwargs):
            return self.cart.auth.Identity('alice', 'customer', None)
        await self.database.products.insert_one({'_id': 'new', 'active': True, 'stock': 10, 'name': 'Test', 'purchase_cents': 100})
        await self.database.settings.insert_one({'_id': 'shop', 'markup_percent': '30', 'price_release': {'released_at': 'fixture', 'markup_percent': '30'}})
        with patch.object(self.cart, 'owner_for', user_owner):
            await asyncio.gather(self.cart.merge(self.ident), self.cart.set_item(self.cart.ItemIn(product_id='new', quantity=2), None, None))
        self.assertEqual(await self.quantities(), {'shared': 5, 'guest-only': 1, 'new': 2})

    async def test_empty_guest_and_absent_guest_do_not_create_user_cart(self):
        for guest_id in ('e' * 32, 'z' * 32):
            if guest_id.startswith('e'):
                await self.database.carts.insert_one({'owner': 'guest:' + guest_id, 'items': []})
            await self.cart.merge(self.cart.auth.Identity('new-user', 'customer', guest_id))
        self.assertIsNone(await self.database.carts.find_one({'owner': 'user:new-user'}))

    async def test_login_keeps_guest_order_capability_and_guest_can_shop_again(self):
        from fastapi import Response
        guest_id = self.ident.guest_id
        async def logged_in(request):
            return self.ident
        response = Response()
        with patch.object(self.cart.auth, 'identity', logged_in):
            await self.cart.owner_for(None, response)
        self.assertNotIn('set-cookie', response.headers)
        self.assertEqual(self.ident.guest_id, guest_id)
        # New anonymous contents are a new transfer, independent of the prior one.
        await self.database.carts.update_one({'owner': 'guest:' + guest_id}, {'$set': {'items': [{'product_id': 'new-guest', 'quantity': 2}]}})
        await self.cart.merge(self.ident)
        await self.cart.merge(self.ident)
        self.assertEqual(await self.quantities(), {'shared': 5, 'guest-only': 1, 'new-guest': 2})


if __name__ == '__main__':
    unittest.main()
