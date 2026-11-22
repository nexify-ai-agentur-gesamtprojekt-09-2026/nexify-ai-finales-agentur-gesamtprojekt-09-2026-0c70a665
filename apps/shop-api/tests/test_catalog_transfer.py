"""Catalog first fill: take over products and categories of the previous shop, unchanged, checked and repeatable.

Source and MongoDB target are the in-memory stand-in of the driver (synthetic documents). The document form of
the previous shop is an ASSUMPTION derived from the code that wrote it (build_product in shop/bigbuy_import.py
plus ``active`` as the FTP and selection imports set it); no document of the running shop was read for this test.
The PostgreSQL target needs the disposable local PostgreSQL (see pg_fixture) and is skipped without it.
"""
import copy
from datetime import datetime, timezone
import importlib.util
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(__file__))
import pg_fixture  # noqa: E402
import test_store_contract as contract  # noqa: E402

SPEC = importlib.util.spec_from_file_location('shop_catalog_transfer_under_test', Path(__file__).resolve().parents[1] / 'transfer_catalog.py')
catalog = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(catalog)
NOW = datetime(2026, 11, 15, 12, 0, tzinfo=timezone.utc)
CONTRACT = {'scope': 'catalog_first_fill', 'tenant': 'teileklar', 'supplier': 'bigbuy', 'supplier_agreement_reference': 'synthetischer Vertragsverweis',
            'data_licence_reference': 'synthetischer Lizenzverweis', 'approved_by': 'Inhaber (synthetisch)', 'approved_at': '2026-11-15', 'product_count_minimum': 3}


class Subscript:
    """The stand-in database with the subscript access and the client the transfer uses."""
    def __init__(self, database, only_find=False): self.database, self.client, self.only_find, self.reads = database, database.client, only_find, 0
    def __getitem__(self, name):
        collection = self.database.collections.setdefault(name, contract.Collection())
        if not self.only_find: return collection
        outer = self
        class OnlyFind:
            def find(self, query): outer.reads += 1; return collection.find(query)
            def __getattr__(self, attribute): raise AssertionError('the transfer touched the source with ' + attribute)
        return OnlyFind()
    def __getattr__(self, name): return self[name]


def old_product(number, **fields):
    """A product as the previous shop is assumed to store it."""
    return {'_id': 'bb-%d' % number, 'bigbuy_id': number, 'sku': 'S%d' % number, 'ean': '400000000%04d' % number, 'name': 'Teil %d' % number,
            'description': '<p>Beschreibung ä</p>', 'images': ['https://cdn.example.invalid/%d.jpg' % number], 'category_ids': [1, 10], 'category_id': 10,
            'purchase_cents': 1000 + number, 'stock': number, 'details': {'weight': 1.5, 'manufacturer': 'M'}, 'buyable': False, 'publishable': False,
            'shipping_cost_cents': 495, 'source': 'bigbuy', 'source_environment': 'ftp', 'imported_at': '2026-10-%02dT08:00:00+00:00' % (number % 27 + 1),
            'import_run_id': 'run-old', 'active': True, **fields}


def old_shop():
    database = contract.Database()
    database.collections['products'].docs = [old_product(1), old_product(2, stock=None), old_product(3, active=False), old_product(4, images=[])]
    database.collections['categories'].docs = [{'_id': 1, 'name': 'Bremse', 'root': True}, {'_id': 10, 'name': 'Scheiben', 'root': False}]
    database.collections['settings'].docs = [{'_id': 'shop', 'markup_percent': '30.00', 'price_release': {'markup_percent': '30.00'}}]
    database.collections['orders'].docs = [contract.order('old-order')]
    database.collections['users'].docs = [{'_id': 'u', **contract.account('user_old', 'old@example.invalid')}]
    database.collections['imports'].docs = [{'_id': 'run-old', 'status': 'done', 'finished_at': '2026-10-05T08:00:00+00:00'}]
    return database


class CatalogTransferContract:
    """What holds for every target."""
    async def asyncSetUp(self):
        self.old = old_shop()
        self.source = Subscript(self.old, only_find=True)
        self.lines = []
        await self.make_target()

    async def run_transfer(self, **options):
        return await catalog.transfer(self.source, self.target, log=self.lines.append, now=NOW, **options)

    async def test_default_is_a_dry_run_that_compares_and_writes_nothing(self):
        report = await self.run_transfer()
        self.assertEqual((report['outcome'], report['published'], report['run']), ('dry_run', 3, None))
        self.assertEqual({c: (e['source_count'], e['inserted'], e['match']) for c, e in report['collections'].items()}, {'categories': (2, 2, True), 'products': (4, 4, True)})
        self.assertEqual(await self.target_rows('products'), [])
        self.assertEqual(await self.target_rows('imports'), [])

    async def test_writing_needs_a_complete_publication_contract_for_exactly_this_transfer(self):
        broken = {'absent': None, 'empty': {}, 'other tenant': {**CONTRACT, 'tenant': 'anderer'}, 'other scope': {**CONTRACT, 'scope': 'import'},
                  'no supplier agreement': {**CONTRACT, 'supplier_agreement_reference': ' '}, 'no licence': {k: v for k, v in CONTRACT.items() if k != 'data_licence_reference'},
                  'no approver': {**CONTRACT, 'approved_by': ''}, 'no date': {**CONTRACT, 'approved_at': 'bald'}, 'other count': {**CONTRACT, 'product_count_minimum': 2},
                  'extra field': {**CONTRACT, 'password': 'x'}}
        for label, contract in broken.items():
            with self.subTest(label), self.assertRaises(catalog.Abort) as caught:
                await self.run_transfer(apply=True, contract=contract, expect_min=3)
            self.assertIn('D-008', str(caught.exception))
            self.assertEqual(self.source.reads, 0, 'the source is not even read without the contract')
        self.assertEqual(await self.target_rows('products'), [])

    async def test_fewer_products_than_expected_abort_and_the_sample_reports_whole_documents_as_equal(self):
        with self.assertRaises(catalog.Abort) as caught:
            await self.run_transfer(apply=True, contract={**CONTRACT, 'product_count_minimum': 5}, expect_min=5)
        self.assertIn('erwartet sind mindestens 5', str(caught.exception))
        with self.assertRaises(catalog.Abort) as caught:
            await self.run_transfer(apply=True, contract={**CONTRACT, 'product_count_minimum': 5})
        self.assertIn('erwartet sind mindestens 5', str(caught.exception), 'the minimum of the contract holds without the option')
        with self.assertRaises(catalog.Abort) as caught:
            await self.run_transfer(apply=True, contract={**CONTRACT, 'product_count_minimum': 4})
        self.assertIn('3 veröffentlichte Produkte', str(caught.exception), 'four stored products of which three are published do not meet a minimum of four')
        self.assertEqual(await self.target_rows('products'), [])
        report = await self.run_transfer(apply=True, contract=CONTRACT, expect_min=3, sample=3)
        self.assertEqual(report['sample'], [{'id': i, 'equal': True} for i in ('bb-1', 'bb-2', 'bb-3')])
        self.assertIn('"step": "sample", "checked": 3, "equal": 3', '\n'.join(self.lines))

    async def test_applied_catalog_is_served_by_the_new_store_and_a_second_run_writes_nothing(self):
        first = await self.run_transfer(apply=True, contract=CONTRACT, expect_min=3)
        self.assertEqual(first['outcome'], 'applied')
        for name, entry in first['collections'].items():
            self.assertEqual((entry['source_count'], entry['source_digest']), (entry['target_count'], entry['target_digest']), name)
        store = await self.new_store()
        self.assertEqual(await store.catalog.count_published(), 3)
        listed = await store.catalog.page_search(term='', category=None, in_stock=False, sort='name', page=1, page_size=10)
        self.assertEqual([p['_id'] for p in listed], ['bb-1', 'bb-2', 'bb-4'])
        self.assertEqual((listed[0]['purchase_cents'], listed[0]['images'], listed[1]['stock']), (1001, ['https://cdn.example.invalid/1.jpg'], None))
        self.assertEqual(await store.catalog.published_product('bb-1'), old_product(1), 'the product is stored exactly as it was, field by field')
        self.assertIsNone(await store.catalog.published_product('bb-3'), 'an unpublished product stays unpublished')
        self.assertEqual({c['_id']: c['name'] for c in await store.catalog.categories()}, {1: 'Bremse', 10: 'Scheiben'})
        self.assertEqual(await store.catalog.published_counts_by_category(), {1: 3, 10: 3})
        self.assertEqual(await store.catalog.shop_settings(), {}, 'no price release is carried over; prices stay unreleased')
        run = await store.catalog.last_finished_import()
        self.assertEqual((run['_id'], run['mode'], run['counts'], run['transferred_at']), (first['run'], 'catalog_transfer', {'categories': 2, 'products': 4}, NOW.isoformat()))
        proof = run['publication_contract']
        self.assertEqual((proof['approved_by'], proof['approved_at'], proof['supplier_agreement_reference'], len(proof['sha256'])),
                         ('Inhaber (synthetisch)', '2026-11-15', 'synthetischer Vertragsverweis', 64))
        self.assertEqual(run['finished_at'], '2026-10-05T08:00:00+00:00', 'the status shows the age of the data, not the moment of the transfer')
        before = await self.target_state()
        second = await self.run_transfer(apply=True, contract=CONTRACT, expect_min=3)
        self.assertEqual({c: (e['inserted'], e['updated'], e['unchanged']) for c, e in second['collections'].items()}, {'categories': (0, 0, 2), 'products': (0, 0, 4)})
        self.assertEqual(await self.target_state(), before, 'nothing was rewritten, the run entry of the first transfer stands')

    async def test_a_changed_source_product_is_the_only_row_written_next_time(self):
        await self.run_transfer(apply=True, contract=CONTRACT, expect_min=3)
        self.old.collections['products'].docs[0]['stock'] = 99
        report = await self.run_transfer(apply=True, contract=CONTRACT, expect_min=3)
        self.assertEqual({c: (e['inserted'], e['updated']) for c, e in report['collections'].items()}, {'categories': (0, 0), 'products': (0, 1)})
        self.assertEqual((await (await self.new_store()).catalog.published_product('bb-1'))['stock'], 99)

    async def test_products_the_new_shop_could_not_show_or_price_abort_before_anything_is_written(self):
        cases = {'Name fehlt': {'name': ' '}, 'Einkaufspreis': {'purchase_cents': 10.5}, 'bigbuy_id': {'bigbuy_id': None}, 'active': {'active': 'yes'},
                 'Herkunft': {'source': 'manual'}, 'Bestand': {'stock': -1}, 'Bilder': {'images': 'https://x'}, 'Kategorie fehlt': {'category_ids': [1, 77]},
                 'mehrfach vergeben': {'bigbuy_id': 1}, 'JSON': {'blob': b'\x00'}}
        for expected, change in cases.items():
            with self.subTest(expected):
                self.old.collections['products'].docs = [old_product(1), old_product(9, **change)]
                with self.assertRaises(catalog.Abort) as caught:
                    await self.run_transfer(apply=True, contract=CONTRACT, expect_min=3)
                self.assertIn(expected, str(caught.exception))
                self.assertNotIn('Teil 9', str(caught.exception), 'the message names reasons and counts, not content')
                self.assertEqual(await self.target_rows('products'), [])
                self.assertEqual(await self.target_rows('categories'), [])

    async def test_a_product_that_exists_only_in_the_target_aborts_and_is_neither_deleted_nor_joined(self):
        await self.seed_target('products', [old_product(50)])
        with self.assertRaises(catalog.Abort) as caught:
            await self.run_transfer(apply=True, contract=CONTRACT, expect_min=3)
        self.assertIn('products: Quelle 4 / Ziel 5', str(caught.exception))
        self.assertEqual([p['_id'] for p in await self.target_rows('products')], ['bb-50'])
        self.assertEqual(await self.target_rows('categories'), [], 'the categories written before the deviation were undone')
        self.assertEqual(await self.target_rows('imports'), [])

    async def test_the_source_is_only_read_and_nothing_but_the_catalog_reaches_the_target(self):
        untouched = copy.deepcopy({name: c.docs for name, c in self.old.collections.items()})
        await self.run_transfer(apply=True, contract=CONTRACT, expect_min=3)
        self.assertEqual({name: c.docs for name, c in self.old.collections.items()}, untouched)
        self.assertEqual(self.source.reads, 2, 'one find for categories and one for products')
        for name in ('settings', 'orders', 'users', 'carts', 'price_releases'):
            self.assertEqual(await self.target_rows(name), [], name)
        self.assertNotIn('Teil 1', '\n'.join(self.lines))


class CatalogToMongo(CatalogTransferContract, unittest.IsolatedAsyncioTestCase):
    async def make_target(self):
        self.new = contract.Database()
        self.target = catalog.MongoTarget(Subscript(self.new))
    async def new_store(self): return contract.load_store(self.new)
    async def seed_target(self, collection, docs): await self.new.collections[collection].insert_many(docs)
    async def target_rows(self, collection): return [d async for d in self.new.collections[collection].find({})]
    async def target_state(self): return copy.deepcopy({name: c.docs for name, c in self.new.collections.items()})


class CatalogToPostgres(CatalogTransferContract, unittest.IsolatedAsyncioTestCase):
    async def make_target(self):
        self.database_name = pg_fixture.create_database()
        self.addCleanup(pg_fixture.drop_database, self.database_name)
        self.dsn = pg_fixture.dsn_for(self.database_name, pg_fixture.SERVICE_LOGIN)
        self.target = catalog.PostgresTarget(self.dsn)
        self.base = catalog.common.load_base()
    async def new_store(self):
        store, _, database = contract.load_pg_store(self.dsn)
        self.addAsyncCleanup(database.close)
        return store
    def query(self, sql):
        import psycopg
        with psycopg.connect(pg_fixture.dsn_for(self.database_name)) as conn:
            return conn.execute(sql).fetchall()
    async def seed_target(self, collection, docs):
        import psycopg
        with psycopg.connect(pg_fixture.dsn_for(self.database_name), autocommit=True) as conn:
            for doc in copy.deepcopy(docs):
                row_id, body = self.base.split(doc)
                conn.execute(f'insert into shop.{collection} (id, doc) values (%s, %s::json)', (row_id, self.base.encode(body)))
    async def target_rows(self, collection): return [self.base.join(*row) for row in self.query(f'select id, doc::text from shop.{collection} order by seq')]
    async def target_state(self): return {t: self.query(f'select id::text, xmin::text from shop.{t} order by 1') for t in ('products', 'categories', 'imports')}

    async def test_a_closed_target_is_not_written_by_the_catalog_transfer_either(self):
        await self.run_transfer(apply=True, contract=CONTRACT, expect_min=3)
        pg_fixture.run(self.database_name, "update shop.products set doc = '{\"name\":\"neuer Stand\",\"active\":true,\"purchase_cents\":1}' where id = 'bb-1'",
                       "insert into shop.settings (id, doc) values ('transfer_closed', '{\"closed_at\":\"2026-11-15T12:00:00+00:00\"}')")
        before = await self.target_state()
        for options in ({'apply': True, 'contract': CONTRACT}, {}):
            with self.subTest(options), self.assertRaises(catalog.Abort) as caught:
                await self.run_transfer(**options)
            self.assertIn('geschlossen', str(caught.exception))
        self.assertEqual(await self.target_state(), before)
        self.assertEqual(self.query("select doc ->> 'name' from shop.products where id = 'bb-1'"), [('neuer Stand',)], 'the newer product of the leading target stands')


class CommandLine(unittest.TestCase):
    def run_main(self, arguments, environment):
        import tempfile
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, environment, clear=True), patch('sys.stderr'):
            (Path(folder) / 'broken.json').write_text('{', encoding='utf-8')
            return catalog.main(['--log', str(Path(folder) / 'run.jsonl'), *[a.replace('FOLDER', folder) for a in arguments]])

    def test_it_refuses_missing_configuration_the_bindings_of_the_service_an_uncontracted_write_and_one_database_as_both_ends(self):
        mongo = {'CATALOG_SOURCE_MONGO_URL': 'mongodb://127.0.0.1:1/', 'CATALOG_SOURCE_DB_NAME': 'old', 'CATALOG_TARGET_KIND': 'mongodb',
                 'CATALOG_TARGET_MONGO_URL': 'mongodb://127.0.0.1:1/', 'CATALOG_TARGET_DB_NAME': 'new'}
        self.assertEqual(self.run_main([], {'MONGO_URL': 'mongodb://127.0.0.1:1/', 'DB_NAME': 'shop'}), 3)
        self.assertEqual(self.run_main([], {**mongo, 'CATALOG_TARGET_KIND': 'sqlite'}), 3)
        self.assertEqual(self.run_main(['--apply'], mongo), 3)
        self.assertEqual(self.run_main(['--apply', '--publication-contract', 'FOLDER/missing.json'], mongo), 3)
        self.assertEqual(self.run_main(['--apply', '--publication-contract', 'FOLDER/broken.json'], mongo), 3)
        self.assertEqual(self.run_main([], {**mongo, 'CATALOG_TARGET_DB_NAME': 'old'}), 3)
        for same in ('mongodb://writer:other@127.0.0.1:1/?retryWrites=true', 'mongodb://127.0.0.1:1,127.0.0.2:1/admin', 'MONGODB://w@127.0.0.1:1'):
            with self.subTest(same):
                self.assertEqual(self.run_main([], {**mongo, 'CATALOG_TARGET_MONGO_URL': same, 'CATALOG_TARGET_DB_NAME': 'old'}), 3, 'credentials and options do not make it another database')
        self.assertEqual(catalog.mongo_hosts('mongodb://u:p@Host-A,host-b:27018/db?x=1'), {'host-a:27017', 'host-b:27018'})
        self.assertEqual(catalog.mongo_hosts('mongodb+srv://u:p@Cluster.example.invalid/?x=1'), {'cluster.example.invalid'})
        self.assertFalse(catalog.mongo_hosts('mongodb://127.0.0.1:1/') & catalog.mongo_hosts('mongodb://127.0.0.1:2/'))
        with patch('sys.stderr'), self.assertRaises(SystemExit):
            catalog.main([])  # no run without a log file


if __name__ == '__main__': unittest.main()
