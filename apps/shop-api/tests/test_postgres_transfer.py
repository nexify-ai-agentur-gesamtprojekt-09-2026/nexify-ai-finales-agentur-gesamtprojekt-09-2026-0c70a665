"""Data transfer MongoDB -> PostgreSQL: counts and checksums agree, a second run changes nothing, any deviation aborts.

The source is the in-memory stand-in of the driver from test_store_contract (synthetic documents only);
the target is a disposable local PostgreSQL built from the real migrations, written through the service login.
A real MongoDB was not available for this test; the source side therefore proves the assumptions of the stand-in.
"""
import copy
from datetime import datetime, timedelta, timezone
import importlib.util
import os
from pathlib import Path
import sys
import unittest

from bson import ObjectId

sys.path.insert(0, os.path.dirname(__file__))
import pg_fixture  # noqa: E402
import test_store_contract as contract  # noqa: E402

SPEC = importlib.util.spec_from_file_location('shop_transfer_under_test', Path(__file__).resolve().parents[1] / 'transfer_mongo_to_postgres.py')
transfer_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(transfer_module)

NOW = datetime(2026, 11, 14, 12, 0, 0, 123000)


class ReadOnlySource:
    """Hands out collections that allow ``find`` and nothing else, and counts the reads."""
    def __init__(self, database): self.database, self.reads = database, 0
    def __getitem__(self, name):
        source, collection = self, self.database.collections.setdefault(name, contract.Collection())
        class OnlyFind:
            def find(self, query): source.reads += 1; return collection.find(query)
            def __getattr__(self, attribute): raise AssertionError('the transfer touched the source with ' + attribute)
        return OnlyFind()


def synthetic_shop():
    database = contract.Database()
    for name in ('source_manifests', 'api_keys'):
        database.collections[name] = contract.Collection()
    seed = {
        'products': [contract.product('bb-1', 'Bremsscheibe vorn', bigbuy_id=1, sku='BS-100', ean='4000000000017', stock=5, purchase_cents=300, category_ids=[1, 10],
                                      images=['https://example.invalid/a.jpg'], description='Ä ö ü ß – "quoted" \\ back', weight=1.25),
                     contract.product('bb-2', 'Wischer', bigbuy_id=2, stock=None, purchase_cents=200, category_ids=[2], active=False)],
        'categories': [{'_id': 1, 'name': 'Bremse', 'root': True}, {'_id': 2, 'name': 'Sicht'}, {'_id': 10, 'name': 'Scheiben'}],
        'imports': [{'_id': 'run-1', 'status': 'done', 'started_at': contract.T0, 'finished_at': contract.T1, 'counts': {'stored': 2}}],
        'source_manifests': [{'_id': ObjectId('65f000000000000000000001'), 'run_id': 'run-1', 'sha256': 'a' * 64, 'created_at': contract.T0}],
        'settings': [{'_id': 'shop', 'markup_percent': '12.50', 'shipping_cents': 495, 'price_release': {'markup_percent': '12.50', 'released_at': contract.T0}},
                     {'_id': 'bigbuy_publication', 'revision': 3}],
        'price_releases': [{'_id': ObjectId('65f000000000000000000002'), 'markup_percent': '12.50', 'released_at': contract.T0, 'action': 'release'}],
        'carts': [{'_id': ObjectId('65f000000000000000000003'), 'owner': 'guest:one', 'items': [contract.ITEM], 'revision': 4, 'updated_at': contract.T0},
                  {'_id': ObjectId('65f000000000000000000004'), 'owner': 'guest:old', 'items': []}],
        'users': [{'_id': ObjectId('65f000000000000000000005'), **contract.account('user_a', 'a@example.invalid'), 'email_verified': True}],
        'api_keys': [{'_id': ObjectId('65f000000000000000000006'), 'key_id': 'key_1', 'tenant_id': 'user_a', 'hash': 'b' * 64, 'revoked_at': None, 'calls': 0}],
        'orders': [contract.order('o1', revolut_order_id='rev-1', status='bezahlt', paid_at=contract.T1, paid_transitions=1),
                   contract.order('o2', owner='guest:g', fulfilment='in_bearbeitung', bigbuy_order_id=None)],
        'revolut_webhooks': [{'_id': 'sandbox', 'webhook_id': 'w1', 'signing_secret': 'synthetic-one', 'events': ['E'], 'stored_at': contract.T0}],
        'outbox': [contract.mail('order_paid:customer:o1', 'gesendet', attempts=1, sent_at=contract.T1, provider_id=None),
                   contract.mail('legacy', 'wird_gesendet', claimed_at=datetime(2026, 11, 14, 12, 0))],
        'requests': [contract.contact('a'), contract.contact('b', notify_recovery_pending=False)],
        'workshops': [contract.workshop('w1', zip='10115', city_key='berlin', lat=52.53, lon=13.38), contract.workshop('w2', zip='10999', city_key='berlin')],
        'workshop_requests': [{'_id': 'WA-1', 'workshop_id': 'w1', 'consent': True, 'created_at': contract.T0}],
        'sessions': [{'_id': ObjectId('65f000000000000000000007'), 'token_hash': '1' * 64, 'user_id': 'user_a', 'created_at': contract.T0, 'expires_at': NOW + timedelta(days=14)}],
        'login_failures': [{'_id': ObjectId('65f000000000000000000008'), 'email': 'a@example.invalid', 'at': NOW}],
        'password_resets': [{'_id': ObjectId('65f000000000000000000009'), 'token_hash': 'a' * 64, 'user_id': 'user_a', 'used': False, 'expires_at': NOW + timedelta(hours=1), 'mail_status': 'gesendet'},
                            {'_id': ObjectId('65f00000000000000000000a'), 'token_hash': 'c' * 64, 'user_id': 'user_a', 'used': True, 'expires_at': NOW}],
        'webhook_events': [{'_id': ObjectId('65f00000000000000000000b'), 'event_key': 'k' * 64, 'event': 'ORDER_COMPLETED', 'order_id': 'rev-1', 'received_at': contract.T1},
                           {'_id': ObjectId('65f00000000000000000000c'), 'event_key': 'n' * 64, 'event': None, 'order_id': None, 'received_at': contract.T1}],
    }
    for name, docs in seed.items():
        database.collections[name].docs = copy.deepcopy(docs)
    return database


class TransferContract(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.database_name = pg_fixture.create_database()
        self.addCleanup(pg_fixture.drop_database, self.database_name)
        self.target = pg_fixture.dsn_for(self.database_name, pg_fixture.SERVICE_LOGIN)
        self.mongo = synthetic_shop()
        self.source = ReadOnlySource(self.mongo)
        self.lines = []

    async def run_transfer(self, apply=True, **options):
        return await transfer_module.transfer(self.source, self.target, apply=apply, log=self.lines.append, **options)

    def rows(self, sql):
        import psycopg
        with psycopg.connect(pg_fixture.dsn_for(self.database_name)) as conn:
            return conn.execute(sql).fetchall()

    def stored(self):
        """Every row of the target with its row version; equal lists mean no row was written in between."""
        return {table: self.rows(f'select id::text, xmin::text from shop.{table} order by 1') for table in transfer_module.COLLECTIONS}

    async def test_dry_run_compares_everything_and_leaves_the_target_empty(self):
        report = await self.run_transfer(apply=False)
        self.assertEqual(report['outcome'], 'dry_run')
        self.assertEqual(set(report['collections']), set(transfer_module.COLLECTIONS))
        for name, entry in report['collections'].items():
            self.assertTrue(entry['match'], name)
            self.assertEqual((entry['source_count'], entry['source_digest']), (entry['target_count'], entry['target_digest']), name)
            self.assertEqual(entry['source_count'], len(self.mongo.collections[name].docs), name)
        self.assertEqual({table: rows for table, rows in self.stored().items() if rows}, {}, 'nothing was committed')

    async def test_applied_transfer_has_equal_counts_and_checksums_and_a_second_run_changes_nothing(self):
        first = await self.run_transfer()
        self.assertEqual(first['outcome'], 'applied')
        total = sum(len(c.docs) for name, c in self.mongo.collections.items() if name in transfer_module.COLLECTIONS)
        self.assertEqual(sum(e['inserted'] for e in first['collections'].values()), total)
        self.assertEqual(sum(e['target_count'] for e in first['collections'].values()), total)
        before = self.stored()
        self.assertEqual(sum(len(rows) for rows in before.values()), total)
        second = await self.run_transfer()
        for name, entry in second['collections'].items():
            self.assertEqual((entry['inserted'], entry['updated'], entry['unchanged'], entry['match']), (0, 0, entry['source_count'], True), name)
            self.assertEqual((entry['source_digest'], entry['target_digest']), (first['collections'][name]['source_digest'],) * 2, name)
        self.assertEqual(self.stored(), before, 'no row version changed')

    async def test_both_stores_answer_alike_after_the_transfer(self):
        await self.run_transfer()
        mongo = contract.load_store(self.mongo)
        postgres, _, database = contract.load_pg_store(self.target)
        self.addAsyncCleanup(database.close)
        search = {'term': '', 'category': None, 'in_stock': False, 'sort': 'name', 'page': 1, 'page_size': 10}
        calls = [lambda s: s.catalog.page_search(**search), lambda s: s.catalog.published_product('bb-1'), lambda s: s.catalog.products_by_id(['bb-1', 'bb-2']),
                 lambda s: s.catalog.categories(), lambda s: s.catalog.published_counts_by_category(), lambda s: s.catalog.shop_settings(),
                 lambda s: s.catalog.last_finished_import(), lambda s: s.orders.get('o1'), lambda s: s.orders.by_provider_order_id('rev-1'),
                 lambda s: s.orders.recent_without_lines(10), lambda s: s.orders.get_for_owners('o2', ['guest:g']), lambda s: s.outbox.get('order_paid:customer:o1'),
                 lambda s: s.outbox.get('legacy'), lambda s: s.outbox.recent_summaries(10), lambda s: s.outbox.order_mails('o1'),
                 lambda s: s.requests.pending_notifications(10), lambda s: s.workshops.points_by_zip('10115'), lambda s: s.workshops.unlocated_by_city('berlin', 5),
                 lambda s: s.workshops.request('WA-1'), lambda s: s.payments.webhook_registration('sandbox'), lambda s: s.accounts.profile_by_id('user_a'),
                 lambda s: s.accounts.role_and_hash_by_email('a@example.invalid'), lambda s: s.accounts.count_login_failures('a@example.invalid', NOW),
                 lambda s: s.carts.get('guest:old')]
        for index, call in enumerate(calls):
            expected, actual = await call(mongo), await call(postgres)
            self.assertEqual(transfer_module.canonical(actual), transfer_module.canonical(expected), f'call {index}: same fields in the same order')
        for store in (mongo, postgres):
            session = await store.accounts.session('1' * 64)
            self.assertEqual((session['user_id'], session['created_at'], session['expires_at']), ('user_a', contract.T0, NOW + timedelta(days=14)))
            self.assertIsNone(await store.accounts.consume_password_reset('c' * 64, NOW - timedelta(hours=1)), 'a used token stays used')
            self.assertEqual((await store.accounts.consume_password_reset('a' * 64, NOW))['user_id'], 'user_a')
            self.assertEqual((await store.carts.get('guest:one'))['revision'], 4)
            with self.assertRaises(store.AlreadyExists):
                await store.payments.record_webhook_event('k' * 64, 'ORDER_COMPLETED', 'rev-1', contract.T2)
            self.assertIs(await store.orders.mark_paid('o1', contract.T2), False, 'a paid order is not paid again after the move')

    async def test_a_changed_and_a_new_source_document_are_the_only_rows_written_by_the_next_run(self):
        await self.run_transfer()
        before = self.stored()
        self.mongo.collections['products'].docs[0]['stock'] = 4
        self.mongo.collections['orders'].docs.append(contract.order('o3'))
        report = await self.run_transfer()
        written = {name: (e['inserted'], e['updated']) for name, e in report['collections'].items() if e['inserted'] or e['updated']}
        self.assertEqual(written, {'products': (0, 1), 'orders': (1, 0)})
        after = self.stored()
        self.assertEqual({t for t in after if after[t] != before[t]}, {'products', 'orders'})
        self.assertEqual(self.rows("select doc ->> 'stock' from shop.products where id = 'bb-1'"), [('4',)])

    async def test_a_row_that_exists_only_in_the_target_aborts_and_nothing_of_the_run_is_kept(self):
        await self.run_transfer(collections=['categories'])
        pg_fixture.run(self.database_name, "insert into shop.orders (id, doc) values ('only-here', '{\"owner\":\"user:x\",\"idempotency_key\":\"k\"}')")
        with self.assertRaises(transfer_module.Abort) as caught:
            await self.run_transfer()
        self.assertIn('orders: Quelle 2 / Ziel 3', str(caught.exception))
        self.assertIn('only-here', str(caught.exception))
        self.assertEqual(self.rows('select count(*) from shop.products'), [(0,)], 'the products written before the deviation were rolled back')
        self.assertEqual(self.rows('select count(*) from shop.orders'), [(1,)], 'nothing is deleted in the target')

    async def test_a_target_row_that_differs_in_an_unchangeable_table_aborts(self):
        await self.run_transfer()
        self.mongo.collections['webhook_events'].docs[0]['event'] = 'ORDER_FAILED'
        with self.assertRaises(transfer_module.Abort) as caught:
            await self.run_transfer()
        self.assertIn('webhook_events', str(caught.exception))
        self.assertEqual(self.rows("select event from shop.webhook_events order by seq limit 1"), [('ORDER_COMPLETED',)], 'a received event is never rewritten')

    async def test_a_closed_target_is_never_written_again_so_newer_data_there_is_not_overwritten(self):
        await self.run_transfer()
        store, _, database = contract.load_pg_store(self.target)
        self.addAsyncCleanup(database.close)
        self.assertIs(await store.orders.mark_paid('o2', contract.T2), True, 'after the switch the order is paid in PostgreSQL only')
        pg_fixture.run(self.database_name, "insert into shop.settings (id, doc) values ('transfer_closed', '{\"closed_at\":\"2026-11-15T12:00:00+00:00\"}')")
        before = self.stored()
        for options in ({}, {'collections': ['orders']}, {'apply': False}):
            with self.subTest(options), self.assertRaises(transfer_module.Abort) as caught:
                await self.run_transfer(**options)
            self.assertIn('geschlossen', str(caught.exception))
        self.assertEqual(self.stored(), before)
        self.assertEqual((await store.orders.get('o2'))['status'], 'bezahlt', 'the payment recorded after the switch stands')
        self.assertEqual(await store.catalog.shop_settings(), (await contract.load_store(self.mongo).catalog.shop_settings()), 'the marker is no shop setting')

    async def test_documents_that_cannot_be_moved_without_loss_abort_before_the_target_is_touched(self):
        cases = {'amount that is not whole cents': ('orders', {**contract.order('bad'), 'total_cents': 19.95}),
                 'amount stored as text': ('orders', {**contract.order('bad'), 'total_cents': '1995'}),
                 'unexpected field in a session': ('sessions', {'_id': ObjectId(), 'token_hash': '2' * 64, 'user_id': 'u', 'expires_at': NOW, 'ip': '203.0.113.1'}),
                 'session without expiry': ('sessions', {'_id': ObjectId(), 'token_hash': '2' * 64, 'user_id': 'u'}),
                 'category id that is not a whole number': ('categories', {'_id': 'x', 'name': 'N'}),
                 'identifier of an unsupported kind': ('orders', {**contract.order('bad'), '_id': 12.5}),
                 'value json cannot carry': ('products', {**contract.product('bad', 'N'), 'blob': b'\x00\x01'}),
                 'second order for one idempotency key': ('orders', contract.order('dup', key='key-o1'))}
        for label, (collection, doc) in cases.items():
            with self.subTest(label):
                self.mongo, self.lines = synthetic_shop(), []
                self.mongo.collections[collection].docs.append(doc)
                self.source = ReadOnlySource(self.mongo)
                with self.assertRaises(transfer_module.Abort) as caught:
                    await self.run_transfer()
                self.assertTrue(str(caught.exception).startswith(collection + ':'), str(caught.exception))
                self.assertEqual({t: r for t, r in self.stored().items() if r}, {}, 'nothing was committed')

    async def test_the_source_is_only_read_and_the_log_carries_no_content(self):
        untouched = copy.deepcopy({name: c.docs for name, c in self.mongo.collections.items()})
        await self.run_transfer(apply=False)
        await self.run_transfer()
        self.assertEqual({name: c.docs for name, c in self.mongo.collections.items()}, untouched)
        self.assertEqual(self.source.reads, 2 * len(transfer_module.COLLECTIONS), 'one find per collection and run, nothing else')
        log = '\n'.join(self.lines)
        for secret in ('synthetic-one', 'hash-of-user_a', 'a@example.invalid', '1' * 64, 'Bremsscheibe', 'fixture-only'):
            self.assertNotIn(secret, log)

    async def test_source_report_needs_no_target(self):
        report = await transfer_module.transfer(self.source, None, apply=False, log=self.lines.append)
        self.assertEqual(report['outcome'], 'source_report')
        self.assertEqual(report['collections']['products']['source_count'], 2)
        self.assertNotIn('target_count', report['collections']['products'])

    def test_command_line_refuses_to_start_without_its_own_configuration(self):
        with unittest.mock.patch.dict(os.environ, {'MONGO_URL': 'mongodb://127.0.0.1:1/', 'DB_NAME': 'shop'}, clear=True), \
                unittest.mock.patch('sys.stderr'):
            self.assertEqual(transfer_module.main(['--dry-run']), 3, 'the bindings of the running service are not used')


import unittest.mock  # noqa: E402

if __name__ == '__main__': unittest.main()
