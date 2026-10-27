"""Synthetic catalog only: persistent cart behavior on the existing visitor DB."""
import concurrent.futures
from contextlib import contextmanager
import importlib.util
import json
from pathlib import Path
import tempfile
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


visitor = load('visitor_cart_test', 'apps/agent-gateway/server.py')
shop = load('local_shop_cart_test', 'apps/agent-gateway/cart.py')


class CartTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.path = Path(self.folder.name) / 'visitor.sqlite'
        self.store = visitor.Store(self.path)
        self.owner = self.store.visitor()[0]['id']
        self.other = self.store.visitor()[0]['id']
        self.clock = [1000]
        self.options = dict(tenant='synthetic-tenant', store_id='synthetic-store', currency='EUR',
                            catalog_version='fixture-v1', products={'fixture-a': 123, 'fixture-b': 456},
                            lifetime_seconds=100, maximum_quantity=5, now=lambda: self.clock[0])
        self.cart = shop.LocalCart(self.store, **self.options)
        self.body = {'store_id': 'synthetic-store', 'locale': 'nl'}

    def create(self, key='create_0001'):
        result = self.cart.create(self.owner, key, self.body)
        return result, result['cart']['id'], result['guest_capability']

    def rejected(self, code, call):
        with self.assertRaises(shop.CartRejected) as error:
            call()
        self.assertEqual(error.exception.code, code)

    def test_persisted_readback_and_exact_replays_across_restart(self):
        initial, identifier, capability = self.create()
        changed = self.cart.change(self.owner, identifier, capability, 'change_0001', '1', {'product_id': 'fixture-a', 'quantity': 2})
        self.assertEqual(changed['total_minor'], 246)
        restarted = shop.LocalCart(visitor.Store(self.path), **self.options)
        self.assertEqual(restarted.read(self.owner, identifier, capability), changed)
        self.assertEqual(restarted.create(self.owner, 'create_0001', self.body), initial)
        self.assertEqual(restarted.change(self.owner, identifier, capability, 'change_0001', '1', {'product_id': 'fixture-a', 'quantity': 2}), changed)
        self.assertEqual(restarted.read(self.owner, identifier, capability)['version'], '2')

    def test_cross_visitor_tenant_store_and_cart_capabilities_denied(self):
        _, identifier, capability = self.create()
        self.rejected('cart_not_found', lambda: self.cart.read(self.other, identifier, capability))
        for field in ('tenant', 'store_id'):
            options = dict(self.options, **{field: 'different'})
            other = shop.LocalCart(self.store, **options)
            self.rejected('cart_not_found', lambda: other.read(self.owner, identifier, capability))
        _, other_id, _ = self.create('create_0002')
        self.rejected('cart_not_found', lambda: self.cart.read(self.owner, other_id, capability))
        self.rejected('cart_not_found', lambda: self.cart.read(self.owner, identifier, 'not-a-capability'))

    def test_expiry_cannot_be_renewed_by_replay(self):
        initial, identifier, capability = self.create()
        self.clock[0] = 1100
        self.rejected('cart_expired', lambda: self.cart.read(self.owner, identifier, capability))
        self.rejected('cart_expired', lambda: self.cart.create(self.owner, 'create_0001', self.body))
        self.rejected('cart_expired', lambda: self.cart.change(self.owner, identifier, capability, 'change_0001', '1', {'product_id': 'fixture-a', 'quantity': 1}))

    def test_session_expiry_is_enforced_on_read_and_replay(self):
        _, identifier, capability = self.create()
        with self.store.connect() as db:
            db.execute('UPDATE visitors SET expires=? WHERE id=?', (1000, self.owner))
        self.rejected('session_invalid', lambda: self.cart.read(self.owner, identifier, capability))
        self.rejected('session_invalid', lambda: self.cart.create(self.owner, 'create_0001', self.body))

    def test_catalog_price_or_version_change_needs_explicit_reconciliation(self):
        _, identifier, capability = self.create()
        for change in ({'products': {'fixture-a': 1}}, {'catalog_version': 'fixture-v2'}, {'currency': 'USD'}):
            replacement = shop.LocalCart(self.store, **dict(self.options, **change))
            self.rejected('catalog_binding_changed', lambda: replacement.read(self.owner, identifier, capability))
            self.rejected('catalog_binding_changed', lambda: replacement.create(self.owner, 'create_0001', self.body))

    def test_input_cannot_override_price_tenant_currency_or_limits(self):
        for extra in ({'tenant': 'different'}, {'currency': 'USD'}, {'total_minor': 0}):
            self.rejected('invalid_cart_input', lambda: self.cart.create(self.owner, 'create_0001', dict(self.body, **extra)))
        _, identifier, capability = self.create()
        for body in ({'product_id': 'missing', 'quantity': 1}, {'product_id': 'fixture-a', 'quantity': True},
                     {'product_id': 'fixture-a', 'quantity': 6}, {'product_id': 'fixture-a', 'quantity': -1},
                     {'product_id': 'fixture-a', 'quantity': 1, 'price': 0}):
            self.rejected('invalid_cart_change', lambda: self.cart.change(self.owner, identifier, capability, 'change_0001', '1', body))
        self.assertEqual(self.cart.read(self.owner, identifier, capability)['line_items'], [])

    def test_reused_key_conflicts_and_zero_removes_item(self):
        _, identifier, capability = self.create()
        body = {'product_id': 'fixture-a', 'quantity': 2}
        self.cart.change(self.owner, identifier, capability, 'change_0001', '1', body)
        self.rejected('idempotency_conflict', lambda: self.cart.change(self.owner, identifier, capability, 'change_0001', '1', dict(body, quantity=3)))
        self.rejected('cart_version_conflict', lambda: self.cart.change(self.owner, identifier, capability, 'change_0002', '1', body))
        result = self.cart.change(self.owner, identifier, capability, 'change_0002', '2', dict(body, quantity=0))
        self.assertEqual(result['total_minor'], 0)
        self.assertEqual(result['line_items'], [])

    def test_concurrent_create_and_compare_and_swap_have_single_winner(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            created = list(pool.map(lambda _: self.cart.create(self.owner, 'create_0001', self.body), range(4)))
        self.assertTrue(all(row == created[0] for row in created))
        _, identifier, capability = self.create()
        def change(number):
            try:
                return self.cart.change(self.owner, identifier, capability, 'change_000'+str(number), '1', {'product_id': 'fixture-a', 'quantity': number})
            except shop.CartRejected as error:
                return error.code
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            changed = list(pool.map(change, (1, 2)))
        self.assertEqual(sum(isinstance(row, dict) for row in changed), 1)
        self.assertIn('cart_version_conflict', changed)

    def test_failed_commit_rolls_back_domain_and_receipt_before_restart(self):
        _, identifier, capability = self.create()
        with self.store.connect() as db:
            db.execute("CREATE TRIGGER fail_cart_receipt BEFORE INSERT ON receipts WHEN NEW.operation LIKE 'shop_cart_change:%' BEGIN SELECT RAISE(ABORT, 'synthetic crash'); END")
        import sqlite3
        with self.assertRaises(sqlite3.IntegrityError):
            self.cart.change(self.owner, identifier, capability, 'change_0001', '1', {'product_id': 'fixture-a', 'quantity': 2})
        restarted = shop.LocalCart(visitor.Store(self.path), **self.options)
        self.assertEqual(restarted.read(self.owner, identifier, capability)['version'], '1')
        with self.store.connect() as db:
            db.execute('DROP TRIGGER fail_cart_receipt')
        result = restarted.change(self.owner, identifier, capability, 'change_0001', '1', {'product_id': 'fixture-a', 'quantity': 2})
        self.assertEqual(result['version'], '2')

    def test_process_death_before_commit_leaves_no_partial_effect(self):
        _, identifier, capability = self.create()
        child = r"""
import importlib.util,sys,os
from contextlib import contextmanager
from pathlib import Path
root,db_path,owner,identifier,capability=sys.argv[1:]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,Path(root)/path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
visitor=load('child_visitor','apps/agent-gateway/server.py')
shop=load('child_shop','apps/agent-gateway/cart.py')
store=visitor.Store(db_path);original=store.connect
@contextmanager
def die_before_commit():
    with original() as db:
        yield db
        os._exit(73)
store.connect=die_before_commit
cart=shop.LocalCart(store,tenant='synthetic-tenant',store_id='synthetic-store',currency='EUR',catalog_version='fixture-v1',products={'fixture-a':123,'fixture-b':456},lifetime_seconds=100,maximum_quantity=5,now=lambda:1000)
cart.change(owner,identifier,capability,'change_0001','1',{'product_id':'fixture-a','quantity':2})
"""
        # The synthetic capability is not included in assertion output or a shell command.
        result = subprocess.run([sys.executable, '-c', child, str(ROOT), str(self.path), self.owner, identifier, capability], capture_output=True)
        self.assertEqual(result.returncode, 73)
        restarted = shop.LocalCart(visitor.Store(self.path), **self.options)
        self.assertEqual(restarted.read(self.owner, identifier, capability)['version'], '1')
        resumed = restarted.change(self.owner, identifier, capability, 'change_0001', '1', {'product_id': 'fixture-a', 'quantity': 2})
        self.assertEqual(resumed['total_minor'], 246)
        self.assertEqual(resumed['version'], '2')

    def test_browser_csrf_cannot_mint_cart_capability(self):
        import hashlib
        import hmac
        _, identifier, capability = self.create()
        with self.store.connect() as db:
            browser_csrf = db.execute('SELECT csrf FROM visitors WHERE id=?', (self.owner,)).fetchone()[0]
        forged = hmac.new(browser_csrf.encode(), shop.canonical([self.options['tenant'], self.options['store_id'], self.owner, identifier]).encode(), hashlib.sha256).hexdigest()
        self.assertNotEqual(forged, capability)
        self.rejected('cart_not_found', lambda: self.cart.read(self.owner, identifier, forged))

    def test_missing_signing_key_fails_closed_instead_of_reviving_old_cart(self):
        _, identifier, capability = self.create()
        with self.store.connect() as db:
            db.execute("DELETE FROM objects WHERE kind='cart_signing_key'")
        self.rejected('cart_signing_key_missing', lambda: self.cart.read(self.owner, identifier, capability))
        self.rejected('cart_signing_key_missing', lambda: self.cart.create(self.owner, 'create_0001', self.body))

    def test_invalid_signing_key_is_not_used_as_authority(self):
        _, identifier, capability = self.create()
        for invalid in ('browser-known', 123, None):
            with self.store.connect() as db:
                db.execute("UPDATE objects SET payload=? WHERE kind='cart_signing_key'", (json.dumps(invalid),))
            self.rejected('cart_signing_key_invalid', lambda: self.cart.read(self.owner, identifier, capability))

    def test_new_cart_after_key_loss_does_not_rekey_old_cart_replay(self):
        _, identifier, capability = self.create()
        with self.store.connect() as db:
            db.execute("DELETE FROM objects WHERE kind='cart_signing_key'")
        replacement, replacement_id, replacement_capability = self.create('create_0002')
        self.assertEqual(self.cart.read(self.owner, replacement_id, replacement_capability), replacement['cart'])
        self.rejected('cart_signing_key_changed', lambda: self.cart.create(self.owner, 'create_0001', self.body))
        self.rejected('cart_not_found', lambda: self.cart.read(self.owner, identifier, capability))

    def test_binding_and_limits_are_required_without_defaults(self):
        for change in ({'lifetime_seconds': 0}, {'maximum_quantity': True}, {'tenant': ''}, {'products': {}}, {'products': {'a': 1.5}}):
            with self.assertRaises(ValueError):
                shop.LocalCart(self.store, **dict(self.options, **change))
        with self.assertRaises(TypeError):
            shop.LocalCart(self.store)

    def test_no_capability_secrets_saved_in_receipts_or_broad_guest_rights(self):
        _, identifier, capability = self.create()
        with self.store.connect() as db:
            stored = '\n'.join(row[0] for row in db.execute('SELECT response FROM receipts'))
        self.assertNotIn(capability, stored)
        self.assertFalse(visitor.capabilities().get('shop_checkout', False))
        self.assertFalse(hasattr(self.cart, 'checkout'))
