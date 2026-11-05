"""Offline integrity tests: real modules, inert config, mock HTTP and transactional fakes.

No dotenv, real credentials, Mongo client, socket listener or supplier call is used.
The fake proves adapter operation/session binding and rollback expectations, not
Mongo deployment compatibility or supplier pagination/snapshot semantics.
"""
import asyncio
import copy
import importlib.util
import os
from pathlib import Path
import ssl
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

import httpx

ROOT = Path(__file__).resolve().parents[1]
SHOP = ROOT / 'apps/shop-api/shop'


def load_modules():
    package = ModuleType('_bigbuy_integrity_subject')
    package.__path__ = [str(SHOP)]
    config = ModuleType(package.__name__ + '.config')
    config.bigbuy_key = lambda environment: 'offline-fixture-key'
    database = ModuleType(package.__name__ + '.db')
    database.now_iso = lambda: '2026-11-02T00:00:00+00:00'
    def load(name, path):
        spec = importlib.util.spec_from_file_location(name, path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[name] = module
        spec.loader.exec_module(module)
        return module
    injected = {package.__name__: package, config.__name__: config, database.__name__: database}
    with patch.dict(sys.modules, injected):
        gateway = load('bigbuy_get', ROOT / 'apps/agent-gateway/bigbuy_get.py')
        ftp = load(package.__name__ + '.bigbuy_ftp', SHOP / 'bigbuy_ftp.py')
        importer = load(package.__name__ + '.bigbuy_import', SHOP / 'bigbuy_import.py')
    return gateway, ftp, importer


# pymongo is an optional runtime dependency (the bigbuy importer needs it). Where it is absent this
# test skips cleanly, consistent with the mongomock-gated shop-api tests, instead of erroring the load.
try:
    GET, FTP, IMPORT = load_modules()
    ERROR = GET.BigBuyReadError
    OPTIONAL_DEP_MISSING = None
except ImportError as exc:
    GET = FTP = IMPORT = ERROR = None
    OPTIONAL_DEP_MISSING = str(exc)

SKIP_REASON = "bigbuy integrity modules require the optional pymongo dependency: %s" % OPTIONAL_DEP_MISSING


@unittest.skipIf(IMPORT is None, SKIP_REASON)
class Pagination(unittest.IsolatedAsyncioTestCase):
    async def acquire(self, batches):
        client = IMPORT.BigBuyClient('production')
        client.get = AsyncMock(side_effect=batches)
        with patch.object(IMPORT, 'PAGE_SIZE', 2), patch.object(IMPORT, 'MAX_PAGES', 3):
            return await client.pages('/catalog', {})

    async def test_short_page_continues_until_empty_sentinel(self):
        result = await self.acquire([[{'id': 1}, {'id': 2}], [{'id': 3}], []])
        self.assertEqual([r['id'] for r in result], [1, 2, 3])

    async def test_provider_capped_pages_do_not_imply_end(self):
        client = IMPORT.BigBuyClient('production')
        client.get = AsyncMock(side_effect=[[{'id': 1}, {'id': 2}], [{'id': 3}], [{'id': 4}, {'id': 5}], []])
        with patch.object(IMPORT, 'PAGE_SIZE', 1000), patch.object(IMPORT, 'MAX_PAGES', 5):
            result = await client.pages('/catalog', {})
        self.assertEqual([r['id'] for r in result], [1, 2, 3, 4, 5])
        self.assertEqual([call.args[1]['page'] for call in client.get.call_args_list], [0, 1, 2, 3])
        self.assertTrue(all(call.args[1]['pageSize'] == 1000 for call in client.get.call_args_list))

    async def test_capped_short_pages_without_sentinel_fail_at_limit(self):
        with self.assertRaisesRegex(ERROR, 'page_limit_incomplete'):
            await self.acquire([[{'id': 1}], [{'id': 2}], [{'id': 3}]])

    async def test_exact_page_then_empty_positive(self):
        self.assertEqual(len(await self.acquire([[{'id': 1}, {'id': 2}], []])), 2)

    async def test_malformed_and_repeated_pages_rejected(self):
        for batches in ([None], [{}], [[None]], [[{'id': True}]], [[{'id': 0}]],
                        [[{'id': 1}, {'id': 1}]],
                        [[{'id': 1}, {'id': 2}], [{'id': 2}]],
                        [[{'id': 1}, {'id': 2}, {'id': 3}]]):
            with self.subTest(batches=batches), self.assertRaises(ERROR):
                await self.acquire(batches)

    async def test_cap_without_terminal_rejected(self):
        with self.assertRaisesRegex(ERROR, 'page_limit_incomplete'):
            await self.acquire([[{'id': 1}, {'id': 2}], [{'id': 3}, {'id': 4}], [{'id': 5}, {'id': 6}]])

    async def test_actual_http_404_and_bad_json_fail(self):
        for status, body, expected in [(404, b'{}', 'endpoint_not_found'), (200, b'{', 'invalid_json')]:
            requests = []
            def respond(request):
                requests.append(request)
                return httpx.Response(status, content=body)
            with self.subTest(status=status), patch.object(IMPORT, 'transport', httpx.MockTransport(respond)), patch.object(IMPORT, 'pause_seconds', 0):
                with self.assertRaisesRegex(ERROR, expected):
                    await IMPORT.BigBuyClient('production').get('/rest/catalog/products.json', {})
                self.assertEqual(len(requests), 1)
                self.assertEqual(requests[0].method, 'GET')

    async def test_missing_join_resource_rejects_catalog(self):
        client = SimpleNamespace(page_counts={})
        client.get = AsyncMock(return_value=[{'id': 5, 'parentTaxonomy': 0, 'name': 'Auto & Motorrad'}])
        client.pages = AsyncMock(side_effect=[[{'id': 1, 'taxonomy': 5}], [], [], []])
        with patch.object(IMPORT, 'BigBuyClient', return_value=client), patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(ERROR, 'coverage_incomplete'):
                await IMPORT.fetch_catalog('production')


@unittest.skipIf(IMPORT is None, SKIP_REASON)
class InputIntegrity(unittest.TestCase):
    def test_price_exact_rounding_and_zero(self):
        for module in (FTP, IMPORT):
            for value, expected in [('0', 0), ('1.005', 101), ('12.34', 1234)]:
                self.assertEqual(module.to_cents(value), expected)
        self.assertEqual(FTP.to_cents('12,34'), 1234)

    def test_invalid_prices_rejected(self):
        for module in (FTP, IMPORT):
            for value in (None, '', '-0.01', 'NaN', 'Infinity', '1e999', True, 'not-price'):
                with self.subTest(module=module.__name__, value=value), self.assertRaises(ERROR):
                    module.to_cents(value)

    def test_api_stock_accepts_only_explicit_integer_buckets(self):
        self.assertEqual(IMPORT.stock_total({'stocks': [{'quantity': 0}]}), 0)
        self.assertEqual(IMPORT.stock_total({'stocks': [{'quantity': 2}, {'quantity': 3}]}), 5)
        for value in (None, False, True, '0', '12', -1, 1.0, 0.0, 2**63):
            with self.subTest(value=value), self.assertRaises(ERROR):
                IMPORT.stock_total({'stocks': [{'quantity': value}]})
        with self.assertRaises(ERROR):
            IMPORT.stock_total({'stocks': [{'quantity': 2**63 - 1}, {'quantity': 1}]})

    def test_missing_or_empty_stock_buckets_never_become_zero(self):
        for row in ({}, {'stocks': None}, {'stocks': []}, {'stocks': {}}, {'stocks': [None]}, {'stocks': [{}]}):
            with self.subTest(row=row), self.assertRaises(ERROR):
                IMPORT.stock_total(row)

    def test_product_builder_rejects_unknown_or_coerced_stock(self):
        row = {'id': 12, 'taxonomy': 5, 'wholesalePrice': '1.00'}
        for value in (None, False, True, '0', '2', -1, 1.0):
            with self.subTest(value=value), self.assertRaisesRegex(ERROR, 'stock_invalid'):
                IMPORT.build_product(row, {}, [], value, {5: 'Auto'}, 5, 'stamp', 'run', 'production')

    def test_ftp_stock_requires_canonical_csv_integer_cell(self):
        self.assertEqual(FTP.stock_quantity('0'), 0)
        self.assertEqual(FTP.stock_quantity('12'), 12)
        for value in (None, False, True, 0, 1, 1.0, '', '-1', '1.0', 'false', 'NaN', '+1', '01', ' 1', '１２', str(2**63)):
            with self.subTest(value=value), self.assertRaisesRegex(ERROR, 'stock_invalid'):
                FTP.stock_quantity(value)
        base = {'ID': '12', 'CATEGORY': '5', 'PRICE': '2.00'}
        for value in (None, '', '-1', '1.5', 'false'):
            row = base if value is None else {**base, 'STOCK': value}
            with self.subTest(cell=value), self.assertRaisesRegex(ERROR, 'stock_invalid'):
                FTP.build(row, {5}, [5], {5: 'Auto'}, 'stamp', 'run')

    def test_ftp_requires_known_nonempty_category(self):
        row = {'ID': '12', 'CATEGORY': '5', 'PRICE': '2.00', 'STOCK': '3'}
        self.assertEqual(FTP.build(row, {5}, [5], {5: 'Auto & Motorrad'}, 'stamp', 'run')['category_id'], 5)
        for category in ('', 'bad', '0', '99', '5|bad', '5|'):
            with self.subTest(category=category), self.assertRaisesRegex(ERROR, 'category_invalid'):
                FTP.build({**row, 'CATEGORY': category}, {5}, [5], {5: 'Auto & Motorrad'}, 'stamp', 'run')
        self.assertIsNone(FTP.build({**row, 'CATEGORY': '7'}, {5}, [5], {5: 'Auto', 7: 'Other'}, 'stamp', 'run'))

    def test_api_unknown_category_is_not_assigned_to_root(self):
        with self.assertRaisesRegex(ERROR, 'category_invalid'):
            IMPORT.build_product({'id': 1, 'taxonomy': 99}, {}, [], 0, {5: 'Auto'}, 5, 'stamp', 'run', 'production')

    def test_ftp_missing_category_file_stops_before_download(self):
        fake = Mock()
        with patch.object(FTP, 'connect', return_value=fake), patch.object(FTP, 'walk', return_value=['/product_de.csv']), patch.object(FTP, 'download') as download, patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(ERROR, 'category_file_missing'):
                FTP.fetch_sync('stamp', 'run')
            download.assert_not_called()
            fake.quit.assert_called_once()

    def test_bad_category_tree_rejected(self):
        for rows in ([], [{'ID': '5', 'NAME': 'Auto & Motorrad', 'PARENT': '99'}],
                     [{'ID': '5', 'NAME': 'Auto & Motorrad'}, {'ID': '5', 'NAME': 'duplicate'}]):
            with self.subTest(rows=rows), patch.dict(os.environ, {}, clear=True), self.assertRaises(ERROR):
                FTP.auto_categories(rows)

    def test_category_override_cannot_silently_drop_bad_ids(self):
        taxonomy = [{'id': 5, 'parentTaxonomy': 0, 'name': 'Auto & Motorrad'}]
        csv_rows = [{'ID': '5', 'NAME': 'Auto & Motorrad'}]
        for value in ('5,bad', '5,', '0', '99'):
            with self.subTest(value=value), patch.dict(os.environ, {'BIGBUY_TAXONOMY_IDS': value}, clear=True):
                with self.assertRaises(ERROR):
                    IMPORT.find_roots(taxonomy)
                with self.assertRaises(ERROR):
                    FTP.auto_categories(csv_rows)

    def test_ftps_failure_never_uses_plaintext(self):
        fake = Mock()
        fake.auth.side_effect = ssl.SSLError('offline failure')
        env = {'BIGBUY_FTP_HOST': 'fixture.invalid', 'BIGBUY_FTP_USER': 'fixture', 'BIGBUY_FTP_PASSWORD': 'fixture'}
        with patch.dict(os.environ, env, clear=True), patch.object(FTP.ftplib, 'FTP_TLS', return_value=fake) as tls, patch.object(FTP.ftplib, 'FTP') as plaintext:
            with self.assertRaisesRegex(ERROR, 'no_plaintext_fallback'):
                FTP.connect()
            plaintext.assert_not_called()
            fake.login.assert_not_called()
            context = tls.call_args.kwargs['context']
            self.assertTrue(context.check_hostname)
            self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
            fake.close.assert_called_once()

    def test_csv_corruption_rejected(self):
        for raw in (b'ID;NAME\n1;\xff', b'ID;ID\n1;2', b'ID;NAME\n1;ok;extra', b'ID;NAME\n1'):
            with self.subTest(raw=raw), self.assertRaises(ERROR):
                FTP.rows(raw)


class FakeCollection:
    def __init__(self, db, name):
        self.db, self.name = db, name

    def operation(self, op, session):
        if self.name != 'imports' or session is not None:
            if session is not self.db.session or not session.active:
                raise AssertionError('catalog operation outside transaction')
        key = self.name + '.' + op
        self.db.calls.append(key)
        if self.db.fail == key:
            self.db.fail = None
            raise RuntimeError('injected ' + key)

    async def count_documents(self, query, session=None):
        self.operation('count_documents', session)
        return len(self.db.data[self.name])

    async def bulk_write(self, operations, ordered, session=None):
        # Mutate one operation before injected failure, exercising rollback of partial bulk.
        self.db.data['products'][operations[0]._filter['_id']] = copy.deepcopy(operations[0]._doc['$set'])
        self.operation('bulk_write', session)
        for op in operations:
            self.db.data['products'][op._filter['_id']] = copy.deepcopy(op._doc['$set'])
        return SimpleNamespace(upserted_count=len(operations))

    async def update_many(self, query, update, session=None):
        self.operation('update_many', session)
        for row in self.db.data[self.name].values():
            if row.get('import_run_id') != query['import_run_id']['$ne']:
                row.update(update['$set'])
        return SimpleNamespace(modified_count=1)

    async def delete_many(self, query, session=None):
        self.operation('delete_many', session)
        self.db.data[self.name].clear()

    async def insert_many(self, rows, session=None):
        self.operation('insert_many', session)
        for i, row in enumerate(rows):
            self.db.data[self.name][row.get('_id', str(i))] = copy.deepcopy(row)

    async def update_one(self, query, update, upsert=False, session=None):
        self.operation('done' if update.get('$set', {}).get('status') == 'done' else 'update_one', session)
        current = self.db.data[self.name].setdefault(query['_id'], {})
        if 'status' in query:
            expected = query['status']
            matches = current.get('status') != expected['$ne'] if isinstance(expected, dict) else current.get('status') == expected
            if not matches:
                return SimpleNamespace(matched_count=0)
        current.update(copy.deepcopy(update.get('$set', {})))
        for key, delta in update.get('$inc', {}).items():
            current[key] = current.get(key, 0) + delta
        return SimpleNamespace(matched_count=1)


class FakeSession:
    active = False
    def __init__(self, db):
        self.db = db
    async def __aenter__(self):
        return self
    async def __aexit__(self, *args):
        return False
    async def with_transaction(self, callback, **options):
        self.db.options = options
        if self.db.unsupported:
            raise RuntimeError('transactions unsupported')
        before = copy.deepcopy(self.db.data)
        self.active = True
        try:
            result = await callback(self)
            if self.db.commit_error:
                # Unknown acknowledgement after an actual atomic commit.
                raise self.db.commit_error
            return result
        except Exception as error:
            if not getattr(error, 'committed', False):
                self.db.data = before
            raise
        finally:
            self.active = False


class FakeDB:
    def __init__(self, fail=None, unsupported=False):
        self.data = {'products': {'bb-old': {'_id': 'bb-old', 'source': 'bigbuy', 'active': True, 'import_run_id': 'old'}},
                     'categories': {5: {'_id': 5, 'name': 'Old category'}}, 'imports': {'run': {'status': 'running'}}, 'source_manifests': {}, 'settings': {}}
        self.calls, self.fail, self.unsupported, self.commit_error = [], fail, unsupported, None
        self.session = FakeSession(self)
        self.client = SimpleNamespace(start_session=AsyncMock(return_value=self.session))
        for key in self.data:
            setattr(self, key, FakeCollection(self, key))


@unittest.skipIf(IMPORT is None, SKIP_REASON)
class Publication(unittest.IsolatedAsyncioTestCase):
    def catalog(self):
        row = {'id': 12, 'taxonomy': 5, 'sku': 'S12', 'wholesalePrice': '1.005'}
        return ([5], {5: 'Auto & Motorrad'}, {12: (row, {'name': 'Fixture'}, [], 2, 5)}, [{'source': 'api'}])

    async def test_success_publishes_catalog_categories_receipt_and_done_together(self):
        db = FakeDB()
        with patch.object(IMPORT, 'fetch_catalog', AsyncMock(return_value=self.catalog())):
            await IMPORT.run_import(db, 'production', 'run')
        self.assertEqual(db.data['products']['bb-12']['purchase_cents'], 101)
        self.assertFalse(db.data['products']['bb-old']['active'])
        self.assertEqual(db.data['categories'][5]['name'], 'Auto & Motorrad')
        self.assertEqual(db.data['imports']['run']['status'], 'done')
        self.assertTrue(db.data['source_manifests'])
        self.assertEqual(db.options['read_concern'].level, 'snapshot')
        self.assertEqual(db.options['write_concern'].document, {'w': 'majority'})

    async def test_every_publication_failure_keeps_old_catalog_and_no_partial_new_rows(self):
        for point in ('settings.update_one', 'products.count_documents', 'products.bulk_write', 'products.update_many',
                      'categories.delete_many', 'categories.insert_many', 'source_manifests.insert_many', 'imports.update_one', 'imports.done'):
            db = FakeDB(fail=point)
            before = copy.deepcopy(db.data)
            with self.subTest(point=point), patch.object(IMPORT, 'fetch_catalog', AsyncMock(return_value=self.catalog())):
                await IMPORT.run_import(db, 'production', 'run')
                for name in ('products', 'categories', 'source_manifests', 'settings'):
                    self.assertEqual(db.data[name], before[name])
                self.assertEqual(db.data['imports']['run']['status'], 'failed')

    async def test_unsupported_transaction_has_no_nontransactional_fallback(self):
        db = FakeDB(unsupported=True)
        before = copy.deepcopy(db.data)
        with patch.object(IMPORT, 'fetch_catalog', AsyncMock(return_value=self.catalog())):
            await IMPORT.run_import(db, 'production', 'run')
        self.assertEqual(db.data['products'], before['products'])
        self.assertEqual(db.data['categories'], before['categories'])
        self.assertEqual(db.calls, ['imports.update_one'])
        self.assertEqual(db.data['imports']['run']['status'], 'failed')

    async def test_empty_failed_or_invalid_acquisition_never_starts_transaction(self):
        for response in (([], {}, {}, []), ([5], {5: 'Auto'}, {}, []), ERROR('catalog_page_limit_incomplete')):
            db = FakeDB()
            acquisition = AsyncMock(side_effect=response) if isinstance(response, Exception) else AsyncMock(return_value=response)
            with self.subTest(response=response), patch.object(IMPORT, 'fetch_catalog', acquisition):
                before = copy.deepcopy(db.data['products'])
                await IMPORT.run_import(db, 'production', 'run')
                self.assertEqual(db.data['products'], before)
                db.client.start_session.assert_not_called()
                self.assertEqual(db.data['imports']['run']['status'], 'failed')

    async def test_sandbox_never_acquires_or_publishes(self):
        db = FakeDB()
        before = copy.deepcopy(db.data['products'])
        with patch.object(IMPORT, 'fetch_catalog', AsyncMock()) as acquire:
            await IMPORT.run_import(db, 'sandbox', 'run')
        acquire.assert_not_called()
        db.client.start_session.assert_not_called()
        self.assertEqual(db.data['products'], before)
        self.assertEqual(db.data['imports']['run']['error'], 'sandbox_publication_forbidden')

    async def test_invalid_price_or_category_preserves_existing_catalog(self):
        for field, value in (('wholesalePrice', '-12.00'), ('taxonomy', 99)):
            acquired = self.catalog()
            acquired[2][12][0][field] = value
            db = FakeDB()
            before = copy.deepcopy(db.data['products'])
            with self.subTest(field=field), patch.object(IMPORT, 'fetch_catalog', AsyncMock(return_value=acquired)):
                await IMPORT.run_import(db, 'production', 'run')
                self.assertEqual(db.data['products'], before)
                self.assertEqual(db.data['imports']['run']['status'], 'failed')
                db.client.start_session.assert_not_called()

    async def test_capped_acquisition_without_empty_sentinel_keeps_old_catalog(self):
        db = FakeDB()
        before = copy.deepcopy(db.data['products'])
        async def get(client, path, params):
            if path.endswith('taxonomies.json'):
                return [{'id': 5, 'parentTaxonomy': 0, 'name': 'Auto & Motorrad'}]
            self.assertTrue(path.endswith('products.json'))
            # Provider sends one row despite requested pageSize=1000, never an
            # empty sentinel. Actual fetch_catalog/pages must reject at the cap.
            return [{'id': params['page'] + 1, 'taxonomy': 5, 'wholesalePrice': '1.00'}]
        with patch.object(IMPORT.BigBuyClient, 'get', get), patch.object(IMPORT, 'MAX_PAGES', 3), patch.dict(os.environ, {}, clear=True):
            await IMPORT.run_import(db, 'production', 'run')
        self.assertEqual(db.data['products'], before)
        self.assertEqual(db.data['imports']['run']['error'], 'catalog_page_limit_incomplete')
        db.client.start_session.assert_not_called()

    async def test_invalid_supplier_stock_preserves_existing_catalog(self):
        for buckets in (None, [], [{'quantity': -1}], [{'quantity': '2'}], [{'quantity': False}], [{'quantity': 1.5}], [{}]):
            db = FakeDB()
            before = copy.deepcopy(db.data['products'])
            async def get(client, path, params):
                if path.endswith('taxonomies.json'):
                    return [{'id': 5, 'parentTaxonomy': 0, 'name': 'Auto & Motorrad'}]
                if params['page']:
                    return []
                if path.endswith('products.json'):
                    return [{'id': 12, 'taxonomy': 5, 'wholesalePrice': '1.00'}]
                if path.endswith('productsinformation.json'):
                    return [{'id': 12, 'name': 'Fixture'}]
                if path.endswith('productsimages.json'):
                    return [{'id': 12, 'images': []}]
                return [{'id': 12, 'stocks': buckets}]
            with self.subTest(buckets=buckets), patch.object(IMPORT.BigBuyClient, 'get', get), patch.dict(os.environ, {}, clear=True):
                await IMPORT.run_import(db, 'production', 'run')
            self.assertEqual(db.data['products'], before)
            self.assertEqual(db.data['imports']['run']['status'], 'failed')
            self.assertIn('catalog_stock_', db.data['imports']['run']['error'])
            db.client.start_session.assert_not_called()

    async def test_empty_product_page_zero_never_retires_existing_catalog(self):
        db = FakeDB()
        before = copy.deepcopy(db.data['products'])
        async def get(client, path, params):
            if path.endswith('taxonomies.json'):
                return [{'id': 5, 'parentTaxonomy': 0, 'name': 'Auto & Motorrad'}]
            self.assertEqual(params['page'], 0)
            return []
        with patch.object(IMPORT.BigBuyClient, 'get', get), patch.dict(os.environ, {}, clear=True):
            await IMPORT.run_import(db, 'production', 'run')
        self.assertEqual(db.data['products'], before)
        self.assertEqual(db.data['imports']['run']['error'], 'no_products_returned')
        db.client.start_session.assert_not_called()

    async def test_unknown_commit_does_not_overwrite_committed_done(self):
        class LostAcknowledgement(RuntimeError):
            committed = True
            def has_error_label(self, label):
                return label == 'UnknownTransactionCommitResult'
        db = FakeDB()
        db.commit_error = LostAcknowledgement()
        with patch.object(IMPORT, 'fetch_catalog', AsyncMock(return_value=self.catalog())):
            await IMPORT.run_import(db, 'production', 'run')
        self.assertEqual(db.data['imports']['run']['status'], 'done')
        self.assertIn('bb-12', db.data['products'])

    async def test_done_run_cannot_publish_again(self):
        db = FakeDB()
        db.data['imports']['run']['status'] = 'done'
        before = copy.deepcopy(db.data)
        with patch.object(IMPORT, 'fetch_catalog', AsyncMock(return_value=self.catalog())):
            await IMPORT.run_import(db, 'production', 'run')
        self.assertEqual(db.data, before)

    async def test_unknown_commit_is_not_claimed_as_definite_failure(self):
        class LostAcknowledgement(RuntimeError):
            def has_error_label(self, label):
                return label == 'UnknownTransactionCommitResult'
        db = FakeDB()
        before = copy.deepcopy(db.data['products'])
        db.commit_error = LostAcknowledgement()
        with patch.object(IMPORT, 'fetch_catalog', AsyncMock(return_value=self.catalog())):
            await IMPORT.run_import(db, 'production', 'run')
        self.assertEqual(db.data['products'], before)
        self.assertEqual(db.data['imports']['run']['status'], 'publication_unknown')


if __name__ == '__main__':
    unittest.main()
