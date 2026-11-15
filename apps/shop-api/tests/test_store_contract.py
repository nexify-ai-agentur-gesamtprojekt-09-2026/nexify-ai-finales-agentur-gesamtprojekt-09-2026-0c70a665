"""Contracts of the shop data-access interfaces (shop/store).

Each contract class states what the business code may rely on, using only the
interface plus a ``seed_*`` hook. Every implementation has to pass it: today the
MongoDB one, later a PostgreSQL one (add a binding class, change no assertion).

Bindings here:
* InMemory*: the real Mongo implementation over a small in-memory stand-in for
  the driver. No network, always runs. The stand-in is an assumption about
  MongoDB semantics, limited to the operators these stores use, and it has the
  call shapes of Motor (the production driver), not of pymongo's async client.
* DisposableMongo*: the same contracts against a real, explicitly disposable
  local replica set; skipped unless confirmed like test_cart_merge_replica_contract.
"""
import copy
from datetime import datetime, timedelta, timezone
import importlib
import os
from pathlib import Path
import re
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

from pymongo.errors import DuplicateKeyError

SHOP = Path(__file__).resolve().parents[1] / 'shop'


def load_store(database):
    """Import shop/store under a private package name with an inert db module (no client, no env)."""
    name = '_store_contract_' + uuid4().hex
    package = ModuleType(name); package.__path__ = [str(SHOP)]
    db_module = ModuleType(name + '.db'); db_module.db = database; db_module.now_iso = lambda: 'contract-time'
    with patch.dict(sys.modules, {name: package, name + '.db': db_module}):
        return importlib.import_module(name + '.store')


# --- in-memory stand-in for the driver ---------------------------------------------------
def matches(doc, query):
    for key, expected in query.items():
        if key == '$or':
            if not any(matches(doc, part) for part in expected): return False
            continue
        present, value = key in doc, doc.get(key)
        if isinstance(expected, dict) and any(k.startswith('$') for k in expected):
            for operator, operand in expected.items():
                if operator == '$options': continue
                if operator == '$in' and value not in operand: return False
                if operator == '$nin' and value in operand: return False
                if operator == '$ne' and value == operand: return False
                if operator == '$not' and matches(doc, {key: operand}): return False
                if operator == '$exists' and present is not operand: return False
                if operator in ('$gt', '$gte'):
                    try:
                        if value is None or isinstance(value, bool) or not (value > operand or (operator == '$gte' and value == operand)): return False
                    except TypeError:
                        return False
                if operator in ('$lt', '$lte'):
                    try:
                        if value is None or isinstance(value, bool) or not (value < operand or (operator == '$lte' and value == operand)): return False
                    except TypeError:
                        return False
                if operator == '$regex' and not (isinstance(value, str) and re.search(operand, value, re.I if 'i' in expected.get('$options', '') else 0)): return False
        elif expected is None:
            if value is not None: return False  # a null condition also matches a missing field
        elif isinstance(value, list) and not isinstance(expected, list):
            if expected not in value: return False
        elif not present or value != expected:
            return False
    return True


def order_key(value):
    return (0, 0) if value is None else (1, value)


class Cursor:
    def __init__(self, rows): self.rows = rows
    def sort(self, ordering, direction=None):
        for key, way in reversed(ordering if isinstance(ordering, list) else [(ordering, direction)]):
            self.rows.sort(key=lambda row: order_key(row.get(key)), reverse=way < 0)
        return self
    def skip(self, count): self.rows = self.rows[count:]; return self
    def limit(self, count): self.rows = self.rows[:count]; return self
    def __aiter__(self): self.iterator = iter(self.rows); return self
    async def __anext__(self):
        try: return next(self.iterator)
        except StopIteration: raise StopAsyncIteration from None


def apply(target, update):
    # Field order as MongoDB 5.0+ documents it: update operators process fields in lexicographic order,
    # so an existing field keeps its place and new fields are appended alphabetically, whatever the operator.
    for key in update.get('$unset', {}): target.pop(key, None)
    changes = {**{k: ('$set', v) for k, v in update.get('$set', {}).items()}, **{k: ('$inc', v) for k, v in update.get('$inc', {}).items()},
               **{k: ('$push', v) for k, v in update.get('$push', {}).items()}}
    for key in sorted(changes):
        operator, value = changes[key]
        if operator == '$set': target[key] = copy.deepcopy(value)
        elif operator == '$inc': target[key] = target.get(key, 0) + value
        else: target.setdefault(key, []).append(copy.deepcopy(value))
    for key, condition in update.get('$pull', {}).items():
        if key in target: target[key] = [entry for entry in target[key] if not matches(entry, condition)]


class Collection:
    def __init__(self, unique=()): self.docs, self.unique = [], list(unique)
    def _project(self, doc, fields):
        if not fields: return copy.deepcopy(doc)
        chosen = {k for k, v in fields.items() if v and k != '_id'}
        if chosen or fields == {'_id': 1}:
            return copy.deepcopy({k: v for k, v in doc.items() if k in chosen or (k == '_id' and fields.get('_id', 1))})
        return copy.deepcopy({k: v for k, v in doc.items() if k not in fields})
    async def create_index(self, key, unique=False, **options):
        if unique and key not in self.unique: self.unique.append(key)
    async def insert_one(self, doc):
        stored = copy.deepcopy(doc); self._insert(stored); doc['_id'] = stored['_id']
    async def delete_one(self, query):
        target = next((d for d in self.docs if matches(d, query)), None)
        if target is not None: self.docs.remove(target)
    async def delete_many(self, query): self.docs = [d for d in self.docs if not matches(d, query)]
    async def find_one_and_update(self, query, update, return_document=False):
        target = next((d for d in self.docs if matches(d, query)), None)
        if target is None: return None
        before = copy.deepcopy(target); apply(target, update)
        return copy.deepcopy(target) if return_document else before
    async def update_many(self, query, update):
        for target in self.docs:
            if matches(target, query): apply(target, update)
    def find(self, query, fields=None, session=None):
        return Cursor([self._project(d, fields) for d in self.docs if matches(d, query)])
    async def find_one(self, query, fields=None, sort=None, session=None):
        rows = self.find(query, fields)
        if sort: rows.sort(sort)
        return rows.rows[0] if rows.rows else None
    async def count_documents(self, query): return sum(matches(d, query) for d in self.docs)
    async def estimated_document_count(self): return len(self.docs)
    def aggregate(self, pipeline):
        match, unwind, group = pipeline
        field = unwind['$unwind'].lstrip('$'); counts = {}
        for doc in self.docs:
            if matches(doc, match['$match']):
                for value in doc.get(field) or []: counts[value] = counts.get(value, 0) + 1
        return Cursor([{'_id': key, 'n': n} for key, n in counts.items()])
    async def insert_many(self, docs):
        for doc in docs: self._insert(copy.deepcopy(doc))
    def _insert(self, doc):
        doc.setdefault('_id', uuid4().hex)
        def taken(key):
            fields = key if isinstance(key, tuple) else (key,)
            return any(f in doc for f in fields) and any(all(d.get(f) == doc.get(f) for f in fields) for d in self.docs)
        if any(taken(key) for key in ['_id', *self.unique]):
            raise DuplicateKeyError('duplicate')
        self.docs.append({'_id': doc['_id'], **doc})  # the server stores _id as the first field
    async def replace_one(self, query, replacement, upsert=False, session=None):
        target = next((d for d in self.docs if matches(d, query)), None)
        if target is not None: self.docs[self.docs.index(target)] = copy.deepcopy(replacement)
        elif upsert: self._insert(copy.deepcopy(replacement))
    async def update_one(self, query, update, upsert=False, session=None):
        target = next((d for d in self.docs if matches(d, query)), None)
        created = target is None and upsert
        if created:
            target = {k: v for k, v in query.items() if not isinstance(v, dict)}
        if target is None:
            return SimpleNamespace(matched_count=0, upserted_id=None)
        apply(target, update)
        if created:
            self._insert(target)
        return SimpleNamespace(matched_count=0 if created else 1, upserted_id=target['_id'] if created else None)


class Session:
    def __init__(self, database): self.database = database
    async def __aenter__(self): return self
    async def __aexit__(self, *exc): return False
    async def with_transaction(self, work, **options):
        saved = {name: copy.deepcopy(c.docs) for name, c in self.database.collections.items()}
        try:
            return await work(self)
        except BaseException:
            for name, docs in saved.items(): self.database.collections[name].docs = docs
            raise


class Database:
    def __init__(self):
        self.collections = {'products': Collection(), 'categories': Collection(), 'imports': Collection(),
                            'settings': Collection(), 'carts': Collection(unique=['owner']), 'users': Collection(),
                            'sessions': Collection(), 'login_failures': Collection(), 'password_resets': Collection(),
                            'workshops': Collection(), 'workshop_requests': Collection(), 'requests': Collection(),
                            'outbox': Collection(), 'orders': Collection(unique=[('owner', 'idempotency_key')]),
                            'webhook_events': Collection(unique=['event_key']), 'revolut_webhooks': Collection(),
                            'price_releases': Collection(), 'api_keys': Collection()}
        self.client = SimpleNamespace(start_session=lambda: Session(self))
    def __getattr__(self, name): return self.collections[name]


class InMemoryBinding(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.database = Database()
        self.store = load_store(self.database)
        await self.store.accounts.ensure_indexes(900)

    async def seed(self, collection, docs): await getattr(self.database, collection).insert_many(docs)
    async def rows(self, collection): return [d async for d in getattr(self.database, collection).find({})]
    async def events(self): return [e async for e in self.database.webhook_events.find({})]
    async def release_log(self): return [e async for e in self.database.price_releases.find({})]


def disposable_uri():
    if os.environ.get('NEXIFY_MONGO_DISPOSABLE_CONFIRMED') != 'yes':
        raise unittest.SkipTest('Explicit disposable local replica-set confirmation absent')
    uri = os.environ.get('NEXIFY_TEST_MONGO_URI', '')
    parsed = urlsplit(uri); query = parse_qs(parsed.query)
    if (parsed.scheme != 'mongodb' or parsed.hostname not in ('localhost', '127.0.0.1', '::1') or parsed.username
            or parsed.password or parsed.path not in ('', '/') or set(query) != {'replicaSet'}):
        raise ValueError('An unauthenticated loopback-only replica-set URI is required')
    return uri


class DisposableMongoBinding(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Motor, because that is the driver shop/db.py binds in production. pymongo's own
        # AsyncMongoClient differs (aggregate() is a coroutine there, a cursor here).
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(disposable_uri(), serverSelectionTimeoutMS=3000)
        self.addCleanup(client.close)
        self.database = client['nexify_store_contract_' + uuid4().hex]
        await self.database.carts.create_index('owner', unique=True)
        await self.database.orders.create_index([('owner', 1), ('idempotency_key', 1)], unique=True)
        await self.database.webhook_events.create_index('event_key', unique=True)
        self.store = load_store(self.database)
        await self.store.accounts.ensure_indexes(900)

    async def seed(self, collection, docs): await self.database[collection].insert_many(copy.deepcopy(docs))
    async def rows(self, collection): return [d async for d in self.database[collection].find({})]
    async def events(self): return [e async for e in self.database.webhook_events.find({})]
    async def release_log(self): return [e async for e in self.database.price_releases.find({})]


def load_pg_store(dsn):
    """The PostgreSQL stores under a private package name, with the same inert db module (fixed now_iso)."""
    name = '_store_contract_' + uuid4().hex
    package = ModuleType(name); package.__path__ = [str(SHOP)]
    db_module = ModuleType(name + '.db'); db_module.db = None; db_module.now_iso = lambda: 'contract-time'
    with patch.dict(sys.modules, {name: package, name + '.db': db_module}), patch.dict(os.environ, {'SHOP_STORE_BACKEND': 'mongodb'}):
        store = importlib.import_module(name + '.store')
        pg = importlib.import_module(name + '.store.pg')
        base = importlib.import_module(name + '.store.pg.base')
    database = pg.PgDatabase(dsn)
    errors = {error: getattr(store, error) for error in ('AlreadyExists', 'ArchiveTooLarge', 'RevisionStale', 'StoreUnavailable', 'StoredDataInvalid')}
    return SimpleNamespace(**vars(pg.bind(database)), **errors), base, database


class DisposablePostgresBinding(unittest.IsolatedAsyncioTestCase):
    """The same contracts against PostgreSQL: a fresh database per test, built from the real migrations,
    used through a login that only holds the service role (grants and policies are part of what is tested)."""
    async def asyncSetUp(self):
        import pg_fixture
        self.fixture = pg_fixture
        self.database_name = pg_fixture.create_database()
        self.addCleanup(pg_fixture.drop_database, self.database_name)
        self.store, self.base, self.database = load_pg_store(pg_fixture.dsn_for(self.database_name, pg_fixture.SERVICE_LOGIN))
        self.addAsyncCleanup(self.database.close)
        await self.store.accounts.ensure_indexes(900)

    async def seed(self, collection, docs):
        """Stored rows as a data transfer would leave them: the document as given, the id generated when absent."""
        import psycopg
        with psycopg.connect(self.fixture.dsn_for(self.database_name), autocommit=True) as conn:
            for doc in copy.deepcopy(docs):
                row_id, body = self.base.split(doc)
                conn.execute(f'insert into shop.{collection} (id, doc) values (%s, %s::json)', (row_id, self.base.encode(body)))

    async def rows(self, collection):
        import psycopg
        with psycopg.connect(self.fixture.dsn_for(self.database_name)) as conn:
            return [self.base.join(*row) for row in conn.execute(f'select id, doc::text from shop.{collection} order by seq')]

    async def events(self): return await self.store.payments.webhook_events()
    async def release_log(self): return await self.rows('price_releases')


# --- contracts --------------------------------------------------------------------------
def product(pid, name, **fields):
    return {'_id': pid, 'name': name, 'active': True, 'sku': pid.upper(), 'ean': '', 'stock': 1, 'purchase_cents': 100,
            'category_ids': [], **fields}


class CatalogContract:
    async def seed_catalog(self):
        await self.seed('products', [
            product('a', 'Bremsscheibe vorn', sku='BS-100', ean='4000000000017', stock=5, purchase_cents=300, category_ids=[1, 10]),
            product('b', 'Bremsbelag (Satz)', sku='bb-200', stock=0, purchase_cents=100, category_ids=[1]),
            product('c', 'Wischer', sku='W.1', stock=None, purchase_cents=200, category_ids=[2]),
            product('d', 'Bremsschlauch', sku='BS-900', stock=9, purchase_cents=50, category_ids=[1], active=False),
            {'_id': 'e', 'name': 'Altprodukt', 'sku': 'E', 'purchase_cents': 1},
        ])
        await self.seed('categories', [{'_id': 1, 'name': 'Bremse', 'root': True}, {'_id': 2, 'name': 'Sicht'}, {'_id': 10, 'name': 'Scheiben'}])

    async def ids(self, sort='name', **search):
        search = {'term': '', 'category': None, 'in_stock': False, **search}
        rows = await self.store.catalog.page_search(**search, sort=sort, page=1, page_size=60)
        self.assertEqual(await self.store.catalog.count_search(**search), len(rows), 'count and page agree')
        return [row['_id'] for row in rows]

    async def test_only_published_products_are_counted_listed_and_read(self):
        await self.seed_catalog()
        self.assertEqual(await self.store.catalog.count_published(), 3)
        self.assertEqual(await self.ids(), ['b', 'a', 'c'])
        self.assertIsNone(await self.store.catalog.published_product('d'))
        self.assertIsNone(await self.store.catalog.published_product('e'))
        self.assertIsNone(await self.store.catalog.published_product('missing'))
        self.assertEqual((await self.store.catalog.published_product('a'))['purchase_cents'], 300)

    async def test_search_matches_name_part_sku_prefix_and_exact_ean_ignoring_case(self):
        await self.seed_catalog()
        self.assertEqual(await self.ids(term='brems'), ['b', 'a'])
        self.assertEqual(await self.ids(term='BB-2'), ['b'])
        self.assertEqual(await self.ids(term='-100'), [], 'sku matches only from its start')
        self.assertEqual(await self.ids(term='4000000000017'), ['a'])
        self.assertEqual(await self.ids(term='400000000001'), [], 'ean matches only as a whole')
        self.assertEqual(await self.ids(term='(Satz)'), ['b'], 'the term is literal text, never a pattern')
        self.assertEqual(await self.ids(term='W.1'), ['c'])
        self.assertEqual(await self.ids(term='Wx1'), [])
        self.assertEqual(await self.ids(term='.*'), [])

    async def test_category_and_stock_filters(self):
        await self.seed_catalog()
        self.assertEqual(await self.ids(category=1), ['b', 'a'])
        self.assertEqual(await self.ids(category=10), ['a'])
        self.assertEqual(await self.ids(category=99), [])
        self.assertEqual(await self.ids(in_stock=True), ['a'], 'zero and unknown stock are not in stock')
        self.assertEqual(await self.ids(term='brems', category=1, in_stock=True), ['a'])

    async def test_orderings_and_paging(self):
        await self.seed_catalog()
        self.assertEqual(await self.ids(sort='availability'), ['a', 'b', 'c'], 'known stock descending, unknown last')
        self.assertEqual(await self.ids(sort='price_asc'), ['b', 'c', 'a'])
        self.assertEqual(await self.ids(sort='price_desc'), ['a', 'c', 'b'])
        search = {'term': '', 'category': None, 'in_stock': False, 'sort': 'name', 'page_size': 2}
        first = await self.store.catalog.page_search(**search, page=1)
        second = await self.store.catalog.page_search(**search, page=2)
        self.assertEqual([r['_id'] for r in first + second], ['b', 'a', 'c'])
        self.assertEqual(await self.store.catalog.page_search(**search, page=3), [])

    async def test_products_by_id_include_unpublished_and_omit_missing(self):
        await self.seed_catalog()
        found = await self.store.catalog.products_by_id(['a', 'd', 'missing'])
        self.assertEqual(set(found), {'a', 'd'})
        self.assertFalse(found['d']['active'])
        self.assertEqual(await self.store.catalog.products_by_id([]), {})

    async def test_categories_and_counts_of_published_products(self):
        await self.seed_catalog()
        self.assertEqual({c['_id']: c['name'] for c in await self.store.catalog.categories()}, {1: 'Bremse', 2: 'Sicht', 10: 'Scheiben'})
        self.assertEqual(await self.store.catalog.published_counts_by_category(), {1: 2, 2: 1, 10: 1})
        self.assertEqual((await self.store.catalog.category(1))['name'], 'Bremse')
        self.assertIsNone(await self.store.catalog.category(99))
        self.assertIsNone(await self.store.catalog.category(None))

    async def test_recent_imports_of_any_state_newest_start_first_and_limited(self):
        self.assertEqual(await self.store.catalog.recent_imports(10), [])
        await self.seed('imports', [{'_id': 'r1', 'status': 'done', 'started_at': '2026-01-01T00:00:00+00:00'},
                                    {'_id': 'r2', 'status': 'failed', 'started_at': '2026-03-01T00:00:00+00:00', 'error': 'x'},
                                    {'_id': 'r3', 'status': 'running', 'started_at': '2026-02-01T00:00:00+00:00'}])
        self.assertEqual([r['_id'] for r in await self.store.catalog.recent_imports(10)], ['r2', 'r3', 'r1'])
        self.assertEqual([(r['_id'], r['status'], r.get('error')) for r in await self.store.catalog.recent_imports(1)], [('r2', 'failed', 'x')])

    async def test_settings_and_last_finished_import(self):
        self.assertEqual(await self.store.catalog.shop_settings(), {}, 'no stored settings is an empty record')
        self.assertIsNone(await self.store.catalog.last_finished_import())
        await self.seed('settings', [{'_id': 'shop', 'markup_percent': '12.50'}, {'_id': 'bigbuy_publication', 'revision': 3}])
        await self.seed('imports', [{'_id': 'r1', 'status': 'done', 'finished_at': '2026-01-01T00:00:00+00:00'},
                                    {'_id': 'r2', 'status': 'done', 'finished_at': '2026-02-01T00:00:00+00:00', 'partial': True},
                                    {'_id': 'r3', 'status': 'failed', 'finished_at': '2026-03-01T00:00:00+00:00'},
                                    {'_id': 'r4', 'status': 'running'}])
        self.assertEqual((await self.store.catalog.shop_settings())['markup_percent'], '12.50')
        self.assertEqual((await self.store.catalog.last_finished_import())['_id'], 'r2')


ITEM = {'product_id': 'a', 'name': 'A', 'quantity': 1, 'price_seen_cents': 100}


class CartContract:
    async def revision(self, owner): return (await self.store.carts.get(owner)).get('revision')

    async def test_missing_cart_is_none_and_first_write_creates_revision_one(self):
        self.assertIsNone(await self.store.carts.get('guest:one'))
        await self.store.carts.replace_items('guest:one', None, [ITEM], create=True)
        cart = await self.store.carts.get('guest:one')
        self.assertEqual((cart['owner'], cart['items'], cart['revision']), ('guest:one', [ITEM], 1))
        self.assertEqual(cart['updated_at'], 'contract-time')

    async def test_each_write_needs_the_current_revision(self):
        await self.store.carts.replace_items('guest:one', None, [ITEM], create=True)
        await self.store.carts.replace_items('guest:one', 1, [], create=False)
        self.assertEqual(await self.revision('guest:one'), 2)
        for stale in (1, 0, 3, None):
            with self.subTest(stale=stale), self.assertRaises(self.store.RevisionStale):
                await self.store.carts.replace_items('guest:one', stale, [ITEM], create=False)
        cart = await self.store.carts.get('guest:one')
        self.assertEqual((cart['items'], cart['revision']), ([], 2), 'a rejected write changes nothing')

    async def test_creating_a_cart_that_already_exists_is_stale_not_a_second_cart(self):
        await self.store.carts.replace_items('guest:one', None, [ITEM], create=True)
        with self.assertRaises(self.store.RevisionStale):
            await self.store.carts.replace_items('guest:one', None, [], create=True)
        self.assertEqual((await self.store.carts.get('guest:one'))['items'], [ITEM])

    async def test_writing_a_missing_cart_without_create_is_stale(self):
        with self.assertRaises(self.store.RevisionStale):
            await self.store.carts.replace_items('guest:none', 0, [ITEM], create=False)
        self.assertIsNone(await self.store.carts.get('guest:none'))

    async def test_cart_without_revision_is_matched_by_none_only(self):
        await self.seed('carts', [{'owner': 'guest:old', 'items': [ITEM]}])
        with self.assertRaises(self.store.RevisionStale):
            await self.store.carts.replace_items('guest:old', 0, [], create=False)
        await self.store.carts.replace_items('guest:old', None, [], create=False)
        self.assertEqual(await self.revision('guest:old'), 1)

    async def test_owners_do_not_affect_each_other(self):
        await self.store.carts.replace_items('guest:one', None, [ITEM], create=True)
        await self.store.carts.replace_items('user:two', None, [], create=True)
        await self.store.carts.replace_items('user:two', 1, [{**ITEM, 'quantity': 3}], create=False)
        self.assertEqual((await self.store.carts.get('guest:one'))['items'], [ITEM])
        self.assertEqual(await self.revision('guest:one'), 1)

    async def test_transaction_applies_all_writes_and_keeps_merge_receipts_in_order(self):
        await self.store.carts.replace_items('guest:one', None, [ITEM], create=True)
        async def work(tx):
            guest = await self.store.carts.get('guest:one', tx=tx)
            self.assertIsNone(await self.store.carts.get('user:two', tx=tx))
            await self.store.carts.replace_items('user:two', None, guest['items'], create=True, tx=tx)
            await self.store.carts.replace_items('guest:one', guest['revision'], [], create=False, tx=tx, archive_entry={'id': 'first'})
        await self.store.carts.in_transaction(work)
        await self.store.carts.replace_items('guest:one', 2, [], create=False, archive_entry={'id': 'second'})
        guest = await self.store.carts.get('guest:one')
        self.assertEqual((guest['items'], guest['revision'], [e['id'] for e in guest['merge_history']]), ([], 3, ['first', 'second']))
        self.assertEqual((await self.store.carts.get('user:two'))['items'], [ITEM])

    async def test_failed_transaction_leaves_nothing_and_passes_the_callers_error_through(self):
        await self.store.carts.replace_items('guest:one', None, [ITEM], create=True)
        class Abort(Exception): pass
        async def work(tx):
            await self.store.carts.replace_items('user:two', None, [ITEM], create=True, tx=tx)
            await self.store.carts.replace_items('guest:one', 1, [], create=False, tx=tx)
            raise Abort()
        with self.assertRaises(Abort):
            await self.store.carts.in_transaction(work)
        self.assertIsNone(await self.store.carts.get('user:two'))
        self.assertEqual((await self.store.carts.get('guest:one'))['items'], [ITEM])
        self.assertEqual(await self.revision('guest:one'), 1)

    async def test_stale_write_inside_a_transaction_undoes_the_earlier_write(self):
        await self.store.carts.replace_items('guest:one', None, [ITEM], create=True)
        async def work(tx):
            await self.store.carts.replace_items('user:two', None, [ITEM], create=True, tx=tx)
            await self.store.carts.replace_items('guest:one', 7, [], create=False, tx=tx)
        with self.assertRaises(self.store.RevisionStale):
            await self.store.carts.in_transaction(work)
        self.assertIsNone(await self.store.carts.get('user:two'))

    async def test_paid_products_leave_the_cart_only_at_the_quoted_revision(self):
        other = {**ITEM, 'product_id': 'b'}
        await self.store.carts.replace_items('guest:one', None, [ITEM, other, {**ITEM, 'product_id': 'c'}], create=True)
        await self.store.carts.remove_products('guest:one', 0, ['a'])
        await self.store.carts.remove_products('guest:one', 2, ['a'])
        await self.store.carts.remove_products('guest:one', None, ['a'])
        cart = await self.store.carts.get('guest:one')
        self.assertEqual((len(cart['items']), cart['revision']), (3, 1), 'a cart changed since the quote is left alone')
        await self.store.carts.remove_products('guest:one', 1, ['a', 'c', 'missing'])
        cart = await self.store.carts.get('guest:one')
        self.assertEqual((cart['items'], cart['revision']), ([other], 2))
        await self.store.carts.remove_products('guest:one', 1, ['b'])
        self.assertEqual((await self.store.carts.get('guest:one'))['items'], [other], 'the same removal does not apply twice')
        await self.store.carts.remove_products('guest:none', None, ['a'])
        self.assertIsNone(await self.store.carts.get('guest:none'), 'removing from a missing cart creates none')
        await self.seed('carts', [{'owner': 'guest:old', 'items': [ITEM, other]}])
        await self.store.carts.remove_products('guest:old', 0, ['a'])
        self.assertEqual(len((await self.store.carts.get('guest:old'))['items']), 2, 'a cart without revision is matched by none only')
        await self.store.carts.remove_products('guest:old', None, ['a'])
        cart = await self.store.carts.get('guest:old')
        self.assertEqual((cart['items'], cart['revision']), ([other], 1))

    async def test_ordinary_cart_with_receipt_is_archivable(self):
        self.assertIsNone(self.store.carts.check_archivable({'owner': 'guest:one', 'items': [], 'merge_history': [{'id': 'x', 'guest_snapshot': {'items': [ITEM]}}]}))


NOW = datetime(2026, 11, 14, 12, 0, tzinfo=timezone.utc)


def instant(value):
    """Stored instants may come back without a zone; they are UTC."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def account(user_id, email, **fields):
    return {'user_id': user_id, 'email': email, 'name': 'N', 'role': 'customer', 'password_hash': 'hash-of-' + user_id, 'created_at': 'c', **fields}


class AccountContract:
    async def test_user_is_read_in_three_shapes_and_unknown_is_absent(self):
        await self.store.accounts.create_user(account('user_a', 'a@example.invalid'))
        full = await self.store.accounts.user_by_email('a@example.invalid')
        self.assertEqual((full['user_id'], full['password_hash'], full['role']), ('user_a', 'hash-of-user_a', 'customer'))
        self.assertEqual((await self.store.accounts.user_by_id('user_a'))['email'], 'a@example.invalid')
        profile = await self.store.accounts.profile_by_id('user_a')
        self.assertEqual(profile, {'user_id': 'user_a', 'email': 'a@example.invalid', 'name': 'N', 'role': 'customer', 'created_at': 'c'},
                         'a session profile carries neither the password hash nor an internal key')
        self.assertEqual(await self.store.accounts.role_and_hash_by_email('a@example.invalid'), {'role': 'customer', 'password_hash': 'hash-of-user_a'})
        self.assertTrue(await self.store.accounts.email_taken('a@example.invalid'))
        self.assertFalse(await self.store.accounts.email_taken('A@example.invalid'), 'addresses are compared exactly; the caller lowercases')
        for missing in (await self.store.accounts.user_by_email('x@example.invalid'), await self.store.accounts.user_by_id('user_x'),
                        await self.store.accounts.profile_by_id('user_x'), await self.store.accounts.role_and_hash_by_email('x@example.invalid')):
            self.assertIsNone(missing)

    async def test_email_and_user_id_are_unique_and_the_first_account_is_kept(self):
        await self.store.accounts.create_user(account('user_a', 'a@example.invalid'))
        with self.assertRaises(self.store.AlreadyExists):
            await self.store.accounts.create_user(account('user_b', 'a@example.invalid', password_hash='other'))
        with self.assertRaises(self.store.AlreadyExists):
            await self.store.accounts.create_user(account('user_a', 'b@example.invalid'))
        self.assertEqual((await self.store.accounts.user_by_email('a@example.invalid'))['password_hash'], 'hash-of-user_a')
        self.assertIsNone(await self.store.accounts.user_by_email('b@example.invalid'))
        self.assertIsNone(await self.store.accounts.user_by_id('user_b'))

    async def test_account_without_password_hash_is_stored_as_such(self):
        user = account('user_g', 'g@example.invalid'); del user['password_hash']
        await self.store.accounts.create_user(user)
        self.assertNotIn('password_hash', await self.store.accounts.user_by_email('g@example.invalid'))
        await self.store.accounts.mark_google_linked('user_g')
        self.assertIs((await self.store.accounts.user_by_id('user_g'))['google_linked'], True)

    async def test_credential_changes_touch_exactly_one_account(self):
        await self.store.accounts.create_user(account('user_a', 'a@example.invalid'))
        await self.store.accounts.create_user(account('user_b', 'b@example.invalid'))
        await self.store.accounts.set_password_hash('user_a', 'new-hash')
        await self.store.accounts.set_role_and_password_hash('b@example.invalid', 'admin', 'admin-hash')
        await self.store.accounts.set_password_hash('user_missing', 'ignored')
        a, b = await self.store.accounts.user_by_id('user_a'), await self.store.accounts.user_by_id('user_b')
        self.assertEqual((a['password_hash'], a['role'], b['password_hash'], b['role']), ('new-hash', 'customer', 'admin-hash', 'admin'))
        self.assertIsNone(await self.store.accounts.user_by_id('user_missing'), 'changing a missing account creates nothing')

    async def test_redeemed_reset_proves_the_address_and_revokes_only_the_valid_keys_of_that_account(self):
        await self.store.accounts.create_user(account('user_a', 'a@example.invalid'))
        await self.store.accounts.create_user(account('user_b', 'b@example.invalid'))
        await self.store.accounts.set_password_hash_verified('user_a', 'new-hash')
        await self.store.accounts.set_password_hash_verified('user_missing', 'ignored')
        a, b = await self.store.accounts.user_by_id('user_a'), await self.store.accounts.user_by_id('user_b')
        self.assertEqual((a['password_hash'], a['email_verified'], a['role']), ('new-hash', True, 'customer'))
        self.assertEqual((b['password_hash'], b.get('email_verified')), ('hash-of-user_b', None), 'another account is neither changed nor verified')
        self.assertIsNone(await self.store.accounts.user_by_id('user_missing'))
        key = lambda kid, tenant, **fields: {'_id': kid, 'key_id': kid, 'tenant_id': tenant, 'hash': kid * 64, 'calls': 3, **fields}
        await self.seed('api_keys', [key('1', 'user_a', revoked_at=None), key('2', 'user_a', revoked_at=T0), key('3', 'user_b', revoked_at=None), key('4', 'user_a')])
        await self.store.accounts.revoke_api_keys_of('user_a', T1)
        await self.store.accounts.revoke_api_keys_of('user_none', T2)
        keys = {k['_id']: k for k in await self.rows('api_keys')}
        self.assertEqual([keys[k].get('revoked_at') for k in '1234'], [T1, T0, None, T1], 'valid keys are revoked now; a revoked key keeps its instant; other accounts keep theirs')
        self.assertEqual({k['calls'] for k in keys.values()}, {3}, 'nothing else of a key changes')
        await self.store.accounts.revoke_api_keys_of('user_a', T2)
        self.assertEqual([k.get('revoked_at') for k in await self.rows('api_keys')], [T1, T0, None, T1], 'revoking twice changes no instant')

    async def test_sessions_are_found_by_token_hash_and_deleted_singly_or_per_user(self):
        expires = NOW + timedelta(days=14)
        for token_hash, user_id in (('1' * 64, 'user_a'), ('2' * 64, 'user_a'), ('3' * 64, 'user_b')):
            await self.store.accounts.create_session(token_hash, user_id, 'c', expires)
        session = await self.store.accounts.session('1' * 64)
        self.assertEqual((session['user_id'], instant(session['expires_at'])), ('user_a', expires))
        self.assertIsNone(await self.store.accounts.session('9' * 64))
        with self.assertRaises(Exception):
            await self.store.accounts.create_session('1' * 64, 'user_b', 'c', expires)
        self.assertEqual((await self.store.accounts.session('1' * 64))['user_id'], 'user_a', 'a token hash cannot be taken over')
        await self.store.accounts.delete_session('1' * 64)
        await self.store.accounts.delete_session('9' * 64)
        self.assertIsNone(await self.store.accounts.session('1' * 64))
        self.assertIsNotNone(await self.store.accounts.session('2' * 64))
        await self.store.accounts.delete_sessions_of('user_a')
        self.assertIsNone(await self.store.accounts.session('2' * 64))
        self.assertEqual((await self.store.accounts.session('3' * 64))['user_id'], 'user_b')

    async def test_login_failures_count_per_address_from_the_window_start_inclusive(self):
        for minutes in (20, 15, 14, 1):
            await self.store.accounts.record_login_failure('a@example.invalid', NOW - timedelta(minutes=minutes))
        await self.store.accounts.record_login_failure('b@example.invalid', NOW)
        since = NOW - timedelta(minutes=15)
        self.assertEqual(await self.store.accounts.count_login_failures('a@example.invalid', since), 3)
        self.assertEqual(await self.store.accounts.count_login_failures('b@example.invalid', since), 1)
        self.assertEqual(await self.store.accounts.count_login_failures('c@example.invalid', since), 0)
        await self.store.accounts.clear_login_failures('a@example.invalid')
        self.assertEqual(await self.store.accounts.count_login_failures('a@example.invalid', NOW - timedelta(days=1)), 0)
        self.assertEqual(await self.store.accounts.count_login_failures('b@example.invalid', since), 1)

    async def test_password_reset_is_redeemed_exactly_once_and_never_after_expiry(self):
        await self.store.accounts.create_password_reset('a' * 64, 'user_a', NOW + timedelta(minutes=60))
        await self.store.accounts.create_password_reset('b' * 64, 'user_b', NOW)
        await self.store.accounts.create_password_reset('c' * 64, 'user_c', NOW + timedelta(minutes=60))
        await self.store.accounts.set_password_reset_mail_status('a' * 64, 'gesendet')
        self.assertIsNone(await self.store.accounts.consume_password_reset('f' * 64, NOW))
        self.assertIsNone(await self.store.accounts.consume_password_reset('b' * 64, NOW), 'a token is expired at its expiry instant')
        self.assertIsNone(await self.store.accounts.consume_password_reset('a' * 64, NOW + timedelta(minutes=61)))
        redeemed = await self.store.accounts.consume_password_reset('a' * 64, NOW)
        self.assertEqual(redeemed['user_id'], 'user_a')
        self.assertIsNone(await self.store.accounts.consume_password_reset('a' * 64, NOW), 'a redeemed token is spent')
        self.assertEqual((await self.store.accounts.consume_password_reset('c' * 64, NOW))['user_id'], 'user_c', 'other tokens stay redeemable')


def workshop(wid, **fields):
    return {'_id': wid, 'id': wid, 'name': 'W ' + wid, **fields}


class WorkshopContract:
    async def fill(self):
        await self.store.workshops.add_many([
            workshop('w1', zip='10115', city='Berlin', city_key='berlin', lat=52.53, lon=13.38),
            workshop('w2', zip='10117', city='Berlin', city_key='berlin', lat=52.52, lon=13.39),
            workshop('w3', zip='10999', city='Berlin', city_key='berlin'),
            workshop('w4', zip='80331', city='München', city_key='münchen', lat=48.14, lon=11.57),
            workshop('w5', zip='10115', city='Berlin-Mitte', city_key='berlin-mitte', lat=52.54, lon=13.37),
            workshop('w6', zip='10115', city='Berlin', city_key='berlin'),
            workshop('w7', zip='5020', city='b.erlin', city_key='b.erlin', lat=47.8, lon=13.04),
        ])

    @staticmethod
    def ids(rows): return [row['_id'] for row in rows]

    async def test_directory_is_filled_once_and_counted(self):
        self.assertEqual(await self.store.workshops.estimated_count(), 0)
        await self.fill()
        self.assertEqual(await self.store.workshops.estimated_count(), 7)
        self.assertEqual((await self.store.workshops.get('w4'))['city'], 'München')
        self.assertIsNone(await self.store.workshops.get('missing'))

    async def test_points_are_only_located_workshops_with_their_coordinates(self):
        await self.fill()
        points = await self.store.workshops.points_by_zip('10115')
        self.assertEqual(self.ids(points), ['w1', 'w5'], 'in storage order, without the unlocated w6')
        self.assertEqual((points[0]['lat'], points[0]['lon']), (52.53, 13.38))
        self.assertEqual(await self.store.workshops.points_by_zip('1011'), [], 'a postcode matches only as a whole')
        self.assertEqual(self.ids(await self.store.workshops.points_by_zip_prefix('101')), ['w1', 'w2', 'w5'])
        self.assertEqual(self.ids(await self.store.workshops.points_by_zip_prefix('011')), [], 'prefix means from the start')
        self.assertEqual(self.ids(await self.store.workshops.points_by_city('berlin')), ['w1', 'w2'])
        self.assertEqual(self.ids(await self.store.workshops.points_by_city('Berlin')), [], 'the caller passes the folded key')
        self.assertEqual(self.ids(await self.store.workshops.points_by_city_prefix('berl', 500)), ['w1', 'w2', 'w5'])
        self.assertEqual(self.ids(await self.store.workshops.points_by_city_prefix('berl', 2)), ['w1', 'w2'])
        self.assertEqual(self.ids(await self.store.workshops.points_by_city_prefix('b.e', 500)), ['w7'], 'the key is text, never a pattern')
        self.assertEqual(await self.store.workshops.points_by_city_prefix('b.r', 500), [], 'a dot is a dot')
        self.assertEqual(await self.store.workshops.points_by_city_prefix('erlin', 500), [])

    async def test_box_includes_its_edges_and_excludes_unlocated(self):
        await self.fill()
        self.assertEqual(self.ids(await self.store.workshops.located_in_box(52.52, 52.53, 13.38, 13.39)), ['w1', 'w2'])
        self.assertEqual(self.ids(await self.store.workshops.located_in_box(52.521, 52.53, 13.38, 13.39)), ['w1'])
        self.assertEqual(self.ids(await self.store.workshops.located_in_box(52.52, 52.53, 13.38, 13.389)), ['w1'])
        self.assertEqual(self.ids(await self.store.workshops.located_in_box(0, 90, 0, 180)), ['w1', 'w2', 'w4', 'w5', 'w7'])
        self.assertEqual(await self.store.workshops.located_in_box(60, 61, 13, 14), [])

    async def test_unlocated_lists_are_exact_and_limited(self):
        await self.fill()
        self.assertEqual(self.ids(await self.store.workshops.unlocated_by_zip('10115', 20)), ['w6'])
        self.assertEqual(self.ids(await self.store.workshops.unlocated_by_city('berlin', 20)), ['w3', 'w6'])
        self.assertEqual(self.ids(await self.store.workshops.unlocated_by_city('berlin', 1)), ['w3'])
        self.assertEqual(await self.store.workshops.unlocated_by_city('münchen', 20), [])
        self.assertEqual(await self.store.workshops.unlocated_by_zip('101', 20), [])

    async def test_request_is_stored_under_its_id_and_read_back_whole(self):
        request = {'_id': 'WA-1', 'workshop_id': 'w1', 'workshop_name': 'W w1', 'name': 'N', 'email': 'n@example.invalid', 'phone': '',
                   'vehicle': 'V', 'message': 'Bitte um Termin', 'consent': True, 'status': 'S', 'created_at': 'c'}
        await self.store.workshops.add_request(dict(request))
        self.assertEqual(await self.store.workshops.request('WA-1'), request)
        self.assertIsNone(await self.store.workshops.request('WA-2'))
        with self.assertRaises(Exception):
            await self.store.workshops.add_request({**request, 'name': 'other'})
        self.assertEqual((await self.store.workshops.request('WA-1'))['name'], 'N', 'an id is never overwritten')


def contact(rid, **fields):
    return {'_id': 'request:' + rid * 64, 'payload_hash': rid * 64, 'number': 'NX-' + rid, 'email': 'a@example.invalid', 'name': 'N',
            'message': 'Eine Anfrage', 'kind': 'contact', 'consent': True, 'status': 'eingegangen', 'stage': 'lead', 'user_id': None,
            'created_at': '2026-11-14T12:00:00+00:00', 'notify_recovery_pending': True, 'notify_status': 'wartend', **fields}


class RequestContract:
    async def test_request_is_stored_once_under_its_idempotent_id(self):
        first = contact('a')
        await self.store.requests.add(dict(first))
        self.assertEqual(await self.store.requests.get(first['_id']), first)
        self.assertIsNone(await self.store.requests.get('request:' + 'f' * 64))
        with self.assertRaises(self.store.AlreadyExists):
            await self.store.requests.add({**first, 'message': 'anderer Inhalt', 'payload_hash': 'b' * 64})
        self.assertEqual(await self.store.requests.get(first['_id']), first, 'the first request is kept unchanged')

    async def test_rate_window_counts_one_address_from_the_boundary_inclusive(self):
        for rid, created in (('a', '2026-11-14T10:59:59+00:00'), ('b', '2026-11-14T11:00:00+00:00'), ('c', '2026-11-14T11:30:00+00:00')):
            await self.store.requests.add(contact(rid, created_at=created))
        await self.store.requests.add(contact('d', email='b@example.invalid'))
        since = '2026-11-14T11:00:00+00:00'
        self.assertEqual(await self.store.requests.count_from_email_since('a@example.invalid', since), 2)
        self.assertEqual(await self.store.requests.count_from_email_since('b@example.invalid', since), 1)
        self.assertEqual(await self.store.requests.count_from_email_since('c@example.invalid', since), 0)

    async def test_pending_notifications_are_listed_in_order_until_recorded(self):
        for rid in 'abc':
            await self.store.requests.add(contact(rid))
        await self.store.requests.add(contact('d', notify_recovery_pending=False))
        legacy = contact('e'); del legacy['notify_recovery_pending']
        await self.store.requests.add(legacy)
        numbers = lambda rows: [row['number'] for row in rows]
        self.assertEqual(numbers(await self.store.requests.pending_notifications(50)), ['NX-a', 'NX-b', 'NX-c'])
        self.assertEqual(numbers(await self.store.requests.pending_notifications(2)), ['NX-a', 'NX-b'])
        await self.store.requests.record_notification(contact('b')['_id'], 'gesendet')
        self.assertEqual(numbers(await self.store.requests.pending_notifications(50)), ['NX-a', 'NX-c'])
        recorded = await self.store.requests.get(contact('b')['_id'])
        self.assertEqual((recorded['notify_status'], recorded['notify_recovery_pending'], recorded['message']), ('gesendet', False, 'Eine Anfrage'))
        self.assertEqual((await self.store.requests.get(contact('a')['_id']))['notify_status'], 'wartend')


def mail(key, status='wartend', **fields):
    return {'_id': key, 'to': 'a@example.invalid', 'subject': 'S', 'html': '<p>H</p>', 'text': 'T', 'reply_to': '', 'status': status,
            'attempts': 0, 'created_at': '2026-11-14T12:00:00+00:00', **fields}


T0, T1, T2 = '2026-11-14T12:00:00+00:00', '2026-11-14T12:05:00+00:00', '2026-11-14T12:10:00+00:00'


class OutboxContract:
    async def state(self, key):
        entry = await self.store.outbox.get(key)
        return entry['status'], entry['attempts']

    async def test_entry_is_queued_once_per_key_and_the_summary_carries_no_content(self):
        await self.store.outbox.add('k1', 'a@example.invalid', 'S', '<p>H</p>', 'T', 'r@example.invalid', T0)
        self.assertEqual(await self.store.outbox.get('k1'), {'_id': 'k1', 'to': 'a@example.invalid', 'subject': 'S', 'html': '<p>H</p>', 'text': 'T',
                                                             'reply_to': 'r@example.invalid', 'status': 'wartend', 'attempts': 0, 'created_at': T0})
        summary = await self.store.outbox.summary('k1')
        self.assertEqual(set(summary), {'_id', 'to', 'subject', 'reply_to', 'status', 'attempts', 'created_at'})
        with self.assertRaises(self.store.AlreadyExists):
            await self.store.outbox.add('k1', 'other@example.invalid', 'S2', 'H2', 'T2', '', T1)
        self.assertEqual((await self.store.outbox.get('k1'))['to'], 'a@example.invalid', 'the first entry is kept unchanged')
        self.assertIsNone(await self.store.outbox.summary('missing'))
        self.assertIsNone(await self.store.outbox.get('missing'))

    async def test_only_deliverable_entries_are_claimed_and_only_once(self):
        await self.seed('outbox', [mail('waiting'), mail('deferred', 'zurückgestellt'), mail('retry', 'fehlgeschlagen', retry_safe=True),
                                   mail('failed', 'fehlgeschlagen'), mail('unsafe', 'fehlgeschlagen', retry_safe=False),
                                   mail('sent', 'gesendet'), mail('unclear', 'abgleich_erforderlich'), mail('preparing', 'wird_vorbereitet'),
                                   mail('sending', 'wird_gesendet'), mail('spent', attempts=5), mail('last', attempts=4)])
        for key in ('waiting', 'deferred', 'retry', 'last'):
            claimed = await self.store.outbox.claim(key, 'c-' + key, T1, 5)
            self.assertEqual((claimed['_id'], claimed['to'], claimed['html'], claimed['text']), (key, 'a@example.invalid', '<p>H</p>', 'T'))
            entry = await self.store.outbox.get(key)
            self.assertEqual((entry['status'], entry['claim_id'], entry['claimed_at']), ('wird_vorbereitet', 'c-' + key, T1))
            self.assertIsNone(await self.store.outbox.claim(key, 'second', T2, 5), 'a claimed entry cannot be claimed again')
            self.assertEqual((await self.store.outbox.get(key))['claim_id'], 'c-' + key)
        for key in ('failed', 'unsafe', 'sent', 'unclear', 'preparing', 'sending', 'spent', 'missing'):
            self.assertIsNone(await self.store.outbox.claim(key, 'c', T1, 5), key)
        self.assertEqual(await self.state('spent'), ('wartend', 5))
        self.assertEqual(await self.state('sent'), ('gesendet', 0))
        self.assertIsNone(await self.store.outbox.get('missing'), 'claiming creates nothing')

    async def test_only_the_owner_moves_an_entry_through_sending_to_sent(self):
        await self.seed('outbox', [mail('k1'), mail('k2')])
        await self.store.outbox.claim('k1', 'mine', T0, 5)
        self.assertIs(await self.store.outbox.start_sending('k1', 'other', T1), False)
        self.assertIs(await self.store.outbox.start_sending('k2', 'mine', T1), False, 'an unclaimed entry cannot be sent')
        self.assertEqual(await self.state('k1'), ('wird_vorbereitet', 0))
        await self.store.outbox.mark_sent('k1', 'mine', T1, 'p-0')
        self.assertEqual(await self.state('k1'), ('wird_vorbereitet', 0), 'sent is reached only from sending')
        self.assertIs(await self.store.outbox.start_sending('k1', 'mine', T1), True)
        self.assertIs(await self.store.outbox.start_sending('k1', 'mine', T2), False, 'sending starts once')
        entry = await self.store.outbox.get('k1')
        self.assertEqual((entry['status'], entry['claimed_at']), ('wird_gesendet', T1))
        await self.store.outbox.mark_sent('k1', 'other', T2, 'p-x')
        self.assertEqual(await self.state('k1'), ('wird_gesendet', 0))
        await self.store.outbox.mark_sent('k1', 'mine', T2, 'p-1')
        entry = await self.store.outbox.get('k1')
        self.assertEqual((entry['status'], entry['attempts'], entry['sent_at'], entry['provider_id']), ('gesendet', 1, T2, 'p-1'))
        await self.store.outbox.mark_sent('k1', 'mine', T2, 'p-2')
        await self.store.outbox.finish('k1', 'mine', 'fehlgeschlagen', 'late', T2, count_attempt=True, retry_safe=True)
        entry = await self.store.outbox.get('k1')
        self.assertEqual((entry['status'], entry['attempts'], entry['provider_id']), ('gesendet', 1, 'p-1'), 'a sent entry is final')
        self.assertEqual(await self.state('k2'), ('wartend', 0))

    async def test_an_attempt_is_finished_only_by_its_owner_while_it_runs(self):
        await self.seed('outbox', [mail('k1'), mail('k2'), mail('k3')])
        for key in ('k1', 'k2', 'k3'):
            await self.store.outbox.claim(key, 'mine', T0, 5)
        await self.store.outbox.finish('k1', 'other', 'fehlgeschlagen', 'x', T1, count_attempt=True, retry_safe=True)
        self.assertEqual(await self.state('k1'), ('wird_vorbereitet', 0))
        await self.store.outbox.finish('k1', 'mine', 'zurückgestellt', 'daily_cap_reached', T1, count_attempt=False, retry_safe=False)
        entry = await self.store.outbox.get('k1')
        self.assertEqual((entry['status'], entry['attempts'], entry['last_error'], entry['updated_at'], entry['retry_safe']),
                         ('zurückgestellt', 0, 'daily_cap_reached', T1, False))
        await self.store.outbox.finish('k1', 'mine', 'fehlgeschlagen', 'again', T2, count_attempt=True, retry_safe=True)
        self.assertEqual(await self.state('k1'), ('zurückgestellt', 0), 'a finished attempt is not finished twice')
        await self.store.outbox.finish('k2', 'mine', 'fehlgeschlagen', 'not_configured', T1, count_attempt=True, retry_safe=True)
        entry = await self.store.outbox.get('k2')
        self.assertEqual((entry['status'], entry['attempts'], entry['retry_safe']), ('fehlgeschlagen', 1, True))
        self.assertIsNotNone(await self.store.outbox.claim('k2', 'next', T2, 5), 'a retry-safe failure is deliverable again')
        await self.store.outbox.start_sending('k3', 'mine', T1)
        await self.store.outbox.finish('k3', 'mine', 'abgleich_erforderlich', 'transport_outcome_unknown', T2, count_attempt=True, retry_safe=False)
        self.assertEqual(await self.state('k3'), ('abgleich_erforderlich', 1))
        self.assertIsNone(await self.store.outbox.claim('k3', 'next', T2, 5), 'an unclear outcome is never sent again')

    async def test_daily_count_covers_sent_entries_from_the_boundary_inclusive(self):
        await self.seed('outbox', [mail('a', 'gesendet', sent_at='2026-11-13T23:59:59+00:00'), mail('b', 'gesendet', sent_at='2026-11-14'),
                                   mail('c', 'gesendet', sent_at='2026-11-14T08:00:00+00:00'), mail('d', 'wird_gesendet', sent_at='2026-11-14T09:00:00+00:00'),
                                   mail('e', 'gesendet'), mail('f')])
        self.assertEqual(await self.store.outbox.count_sent_since('2026-11-14'), 2)
        self.assertEqual(await self.store.outbox.count_sent_since('2026-11-13'), 3)
        self.assertEqual(await self.store.outbox.count_sent_since('2026-11-15'), 0)

    async def test_running_entries_with_an_unverifiable_claim_time_need_reconciliation(self):
        odd = {'naive': '2026-11-14T12:00:00', 'offset': '2026-11-14T12:00:00+01:00', 'date': datetime(2026, 11, 14), 'zulu': '2026-11-14T12:00:00Z', 'prefixed': 'x' + T0}
        rows = [mail(status + '-' + name, status, claimed_at=value) for status in ('wird_vorbereitet', 'wird_gesendet') for name, value in odd.items()]
        rows += [mail('p-none', 'wird_vorbereitet'), mail('s-none', 'wird_gesendet'), mail('p-ok', 'wird_vorbereitet', claimed_at=T0),
                 mail('s-ok', 'wird_gesendet', claimed_at='2026-11-14T12:00:00.123456+00:00'), mail('idle'), mail('done', 'gesendet')]
        await self.seed('outbox', rows)
        await self.store.outbox.quarantine_unverifiable_claims()
        for row in rows:
            status, _ = await self.state(row['_id'])
            if row['_id'] in ('p-ok', 's-ok', 'idle', 'done'):
                self.assertEqual(status, row['status'], row['_id'])
            else:
                self.assertEqual(status, 'abgleich_erforderlich', row['_id'])
                self.assertEqual((await self.store.outbox.get(row['_id']))['last_error'], 'claim_time_unverifiable')

    async def test_stale_preparation_is_released_and_its_old_owner_fenced(self):
        await self.seed('outbox', [mail('old', 'wird_vorbereitet', claimed_at=T0, claim_id='first'), mail('edge', 'wird_vorbereitet', claimed_at=T1, claim_id='first'),
                                   mail('fresh', 'wird_vorbereitet', claimed_at=T2, claim_id='first'), mail('sending', 'wird_gesendet', claimed_at=T0, claim_id='first')])
        await self.store.outbox.release_stale_preparations(T1)
        entry = await self.store.outbox.get('old')
        self.assertEqual((entry['status'], entry['last_error'], entry['attempts']), ('wartend', 'preparation_lease_expired', 0))
        self.assertEqual([(await self.state(key))[0] for key in ('edge', 'fresh', 'sending')], ['wird_vorbereitet', 'wird_vorbereitet', 'wird_gesendet'],
                         'the lease ends strictly before the cutoff and covers preparation only')
        self.assertIs(await self.store.outbox.start_sending('old', 'first', T2), False, 'the displaced owner cannot start sending')
        self.assertIsNotNone(await self.store.outbox.claim('old', 'second', T2, 5))
        self.assertIs(await self.store.outbox.start_sending('old', 'first', T2), False, 'not even after the entry was claimed again')
        self.assertIs(await self.store.outbox.start_sending('old', 'second', T2), True)

    async def test_stale_or_undated_sending_needs_reconciliation_and_is_not_sent_again(self):
        await self.seed('outbox', [mail('old', 'wird_gesendet', claimed_at=T0, claim_id='first'), mail('undated', 'wird_gesendet', claim_id='first'),
                                   mail('edge', 'wird_gesendet', claimed_at=T1), mail('fresh', 'wird_gesendet', claimed_at=T2),
                                   mail('preparing', 'wird_vorbereitet', claimed_at=T0)])
        await self.store.outbox.quarantine_stale_sendings(T1)
        for key in ('old', 'undated'):
            entry = await self.store.outbox.get(key)
            self.assertEqual((entry['status'], entry['last_error'], entry['attempts']), ('abgleich_erforderlich', 'delivery_outcome_unknown', 0), key)
            self.assertIsNone(await self.store.outbox.claim(key, 'second', T2, 5))
        self.assertEqual([(await self.state(key))[0] for key in ('edge', 'fresh', 'preparing')], ['wird_gesendet', 'wird_gesendet', 'wird_vorbereitet'])
        await self.store.outbox.mark_sent('old', 'first', T2, 'late')
        self.assertEqual(await self.state('old'), ('abgleich_erforderlich', 0), 'a late success of the displaced owner is not recorded as sent')

    async def test_deliverable_keys_are_listed_in_order_up_to_the_limit(self):
        await self.seed('outbox', [mail('a'), mail('b', 'gesendet'), mail('c', 'zurückgestellt'), mail('d', 'fehlgeschlagen'),
                                   mail('e', 'fehlgeschlagen', retry_safe=True), mail('f', attempts=5), mail('g', 'abgleich_erforderlich'),
                                   mail('h', 'wird_vorbereitet'), mail('i', attempts=4)])
        self.assertEqual(await self.store.outbox.deliverable_keys(5, 50), ['a', 'c', 'e', 'i'])
        self.assertEqual(await self.store.outbox.deliverable_keys(5, 2), ['a', 'c'])
        self.assertEqual(await self.store.outbox.deliverable_keys(4, 50), ['a', 'c', 'e'])
        self.assertEqual(await self.store.outbox.deliverable_keys(5, 50), await self.store.outbox.deliverable_keys(5, 50), 'listing claims nothing')

    async def test_recent_summaries_newest_first_limited_and_without_content(self):
        await self.seed('outbox', [mail('a', created_at=T0), mail('b', 'gesendet', created_at=T2), mail('c', created_at=T1)])
        rows = await self.store.outbox.recent_summaries(100)
        self.assertEqual([m['_id'] for m in rows], ['b', 'c', 'a'])
        self.assertEqual(set(rows[0]), {'_id', 'to', 'subject', 'reply_to', 'status', 'attempts', 'created_at'})
        self.assertEqual([m['_id'] for m in await self.store.outbox.recent_summaries(2)], ['b', 'c'])

    async def test_mails_of_an_order_are_its_confirmations_and_status_notices_only(self):
        await self.seed('outbox', [mail('order_paid:customer:o-1', 'gesendet', attempts=1), mail('order_paid:internal:o-1'), mail('order_status:versendet:o-1'),
                                   mail('order_status:in_bearbeitung:o-1'), mail('fulfillment_error:o-1'), mail('order_paid:customer:o-2'), mail('request:o-1'),
                                   mail('x-order_paid:customer:o-1'), mail('order_paid:X-order_status:versendet:o-1')])
        mails = await self.store.outbox.order_mails('o-1')
        self.assertEqual([m['_id'] for m in mails], ['order_paid:customer:o-1', 'order_paid:internal:o-1', 'order_status:versendet:o-1', 'order_status:in_bearbeitung:o-1'])
        self.assertEqual(mails[0], {'_id': 'order_paid:customer:o-1', 'status': 'gesendet', 'subject': 'S', 'attempts': 1}, 'neither recipient nor content')
        self.assertEqual(await self.store.outbox.order_mails('o-3'), [])

    async def test_provider_event_is_recorded_on_one_entry(self):
        await self.seed('outbox', [mail('a', 'gesendet', provider_id='p-1'), mail('b', 'gesendet', provider_id='p-2')])
        await self.store.outbox.record_provider_event('a', 'delivered', T1)
        await self.store.outbox.record_provider_event('missing', 'bounced', T1)
        a, b = await self.store.outbox.get('a'), await self.store.outbox.get('b')
        self.assertEqual((a['provider_event'], a['checked_at'], a['status']), ('delivered', T1, 'gesendet'))
        self.assertNotIn('provider_event', b)
        self.assertIsNone(await self.store.outbox.get('missing'))


def order(oid, owner='user:a', key=None, **fields):
    return {'_id': oid, 'id': oid, 'number': 'TK-' + oid, 'owner': owner, 'user_id': None, 'idempotency_key': key or 'key-' + oid,
            'status': 'zahlung_offen', 'lines': [{'product_id': 'a', 'quantity': 2, 'unit_cents': 500}], 'subtotal_cents': 1000,
            'shipping_cents': 995, 'total_cents': 1995, 'currency': 'EUR', 'address': {'email': 'a@example.invalid'},
            'created_at': '2026-11-14T12:00:00+00:00', 'paid_transitions': 0, 'request_hash': 'h' * 64, 'cart_revision': 1, **fields}


class SettingsContract:
    async def test_pricing_is_saved_without_losing_a_release_and_a_release_sets_the_markup(self):
        await self.store.settings.save_pricing('12.50', 495, T0, 'user_admin')
        self.assertEqual(await self.store.catalog.shop_settings(), {'_id': 'shop', 'markup_percent': '12.50', 'shipping_cents': 495, 'updated_at': T0, 'updated_by': 'user_admin'})
        release = {'markup_percent': '12.50', 'released_at': T1, 'released_by': 'user_admin'}
        await self.store.settings.set_price_release(dict(release))
        await self.store.settings.save_pricing('20.00', 0, T2, 'user_other')
        self.assertEqual(await self.store.catalog.shop_settings(), {'_id': 'shop', 'markup_percent': '20.00', 'shipping_cents': 0, 'updated_at': T2, 'updated_by': 'user_other',
                                                                    'price_release': release}, 'the stored release still names the markup it was given for')
        await self.store.settings.set_price_release({'markup_percent': '25.00', 'released_at': T2, 'released_by': 'user_admin'})
        stored = await self.store.catalog.shop_settings()
        self.assertEqual((stored['markup_percent'], stored['price_release']['markup_percent'], stored['shipping_cents'], stored['updated_by']), ('25.00', '25.00', 0, 'user_other'))

    async def test_release_without_earlier_settings_creates_them(self):
        await self.store.settings.set_price_release({'markup_percent': '30', 'released_at': T0, 'released_by': 'user_admin'})
        self.assertEqual(await self.store.catalog.shop_settings(), {'_id': 'shop', 'markup_percent': '30', 'price_release': {'markup_percent': '30', 'released_at': T0, 'released_by': 'user_admin'}})

    async def test_release_log_only_grows(self):
        self.assertEqual(await self.release_log(), [])
        for at in (T0, T1):
            await self.store.settings.log_price_release({'markup_percent': '30', 'released_at': at, 'released_by': 'user_admin', 'action': 'release'})
        self.assertEqual([(e['released_at'], e['action'], e['markup_percent']) for e in await self.release_log()], [(T0, 'release', '30'), (T1, 'release', '30')])
        self.assertEqual(await self.store.catalog.shop_settings(), {}, 'the log does not change the settings')


class OrderContract:
    async def field(self, oid, *names):
        doc = await self.store.orders.get(oid)
        return tuple(doc.get(name) for name in names)

    async def test_order_is_stored_once_per_owner_and_idempotency_key(self):
        first = order('o1')
        await self.store.orders.add(dict(first))
        self.assertEqual(await self.store.orders.get('o1'), first, 'amounts, lines and address come back as stored')
        with self.assertRaises(self.store.AlreadyExists):
            await self.store.orders.add(order('o2', key='key-o1', total_cents=1))
        self.assertIsNone(await self.store.orders.get('o2'))
        self.assertEqual((await self.store.orders.by_idempotency_key('user:a', 'key-o1'))['total_cents'], 1995, 'the first order is kept')
        await self.store.orders.add(order('o3', owner='user:b', key='key-o1'))
        await self.store.orders.add(order('o4', key='key-other'))
        self.assertEqual((await self.store.orders.by_idempotency_key('user:b', 'key-o1'))['_id'], 'o3', 'a key belongs to its owner')
        self.assertEqual((await self.store.orders.by_idempotency_key('user:a', 'key-o1'))['_id'], 'o1')
        self.assertIsNone(await self.store.orders.by_idempotency_key('user:c', 'key-o1'))
        self.assertIsNone(await self.store.orders.by_idempotency_key('user:a', 'key-none'))
        self.assertIsNone(await self.store.orders.get('missing'))

    async def test_order_is_readable_only_for_its_owners_and_by_provider_reference(self):
        await self.store.orders.add(order('o1', owner='guest:g'))
        await self.store.orders.add(order('o2', owner='user:b', revolut_order_id='rev-2'))
        self.assertEqual((await self.store.orders.get_for_owners('o1', ['user:a', 'guest:g']))['_id'], 'o1')
        self.assertIsNone(await self.store.orders.get_for_owners('o1', ['user:a', 'user:b']))
        self.assertIsNone(await self.store.orders.get_for_owners('o1', []))
        self.assertIsNone(await self.store.orders.get_for_owners('missing', ['guest:g']))
        self.assertEqual((await self.store.orders.by_provider_order_id('rev-2'))['_id'], 'o2')
        self.assertIsNone(await self.store.orders.by_provider_order_id('rev-1'))

    async def test_recent_orders_of_one_owner_newest_first_and_limited(self):
        for oid, created, owner in (('o1', '2026-11-01T00:00:00+00:00', 'user:a'), ('o2', '2026-11-03T00:00:00+00:00', 'user:a'),
                                    ('o3', '2026-11-02T00:00:00+00:00', 'user:a'), ('o4', '2026-11-04T00:00:00+00:00', 'user:b')):
            await self.store.orders.add(order(oid, owner=owner, created_at=created))
        self.assertEqual([o['_id'] for o in await self.store.orders.recent_of_owner('user:a', 100)], ['o2', 'o3', 'o1'])
        self.assertEqual([o['_id'] for o in await self.store.orders.recent_of_owner('user:a', 2)], ['o2', 'o3'])
        self.assertEqual(await self.store.orders.recent_of_owner('user:c', 100), [])

    async def test_overview_lists_all_owners_newest_first_without_lines(self):
        for oid, created, owner in (('o1', '2026-11-01T00:00:00+00:00', 'user:a'), ('o2', '2026-11-03T00:00:00+00:00', 'guest:g'), ('o3', '2026-11-02T00:00:00+00:00', 'user:b')):
            await self.store.orders.add(order(oid, owner=owner, created_at=created))
        rows = await self.store.orders.recent_without_lines(200)
        self.assertEqual([o['_id'] for o in rows], ['o2', 'o3', 'o1'])
        self.assertEqual([o['_id'] for o in await self.store.orders.recent_without_lines(2)], ['o2', 'o3'])
        expected = order('o2', owner='guest:g', created_at='2026-11-03T00:00:00+00:00'); del expected['lines']
        self.assertEqual(rows[0], expected, 'everything but the lines')

    async def test_delivery_state_changes_only_from_the_state_the_caller_saw(self):
        await self.store.orders.add(order('o1')); await self.store.orders.add(order('o2', fulfilment='in_bearbeitung'))
        self.assertIsNone(await self.store.orders.change_delivery_state('o1', 'in_bearbeitung', {'fulfilment': 'versendet'}))
        self.assertIsNone(await self.store.orders.change_delivery_state('o2', None, {'fulfilment': 'versendet'}))
        self.assertIsNone(await self.store.orders.change_delivery_state('missing', None, {'fulfilment': 'versendet'}))
        self.assertEqual((await self.field('o1', 'fulfilment'), await self.field('o2', 'fulfilment')), ((None,), ('in_bearbeitung',)))
        changed = await self.store.orders.change_delivery_state('o1', None, {'fulfilment': 'in_bearbeitung', 'processing_at': T0, 'status_changed_by': 'user_admin'})
        self.assertEqual(changed, {**order('o1'), 'fulfilment': 'in_bearbeitung', 'processing_at': T0, 'status_changed_by': 'user_admin'}, 'the order as it is after the change')
        self.assertIsNone(await self.store.orders.change_delivery_state('o1', None, {'fulfilment': 'versendet'}), 'the second of two concurrent changes loses')
        changed = await self.store.orders.change_delivery_state('o1', 'in_bearbeitung', {'fulfilment': 'versendet', 'shipped_at': T1, 'tracking_number': 'TR', 'carrier': ''})
        self.assertEqual((changed['fulfilment'], changed['tracking_number'], changed['processing_at'], changed['status']), ('versendet', 'TR', T0, 'zahlung_offen'))
        self.assertEqual(await self.field('o2', 'fulfilment', 'tracking_number'), ('in_bearbeitung', None))
        self.assertIsNone(await self.store.orders.get('missing'))

    async def test_payment_reference_replaces_an_earlier_error_and_leaves_the_order_as_ordered(self):
        await self.store.orders.add(order('o1')); await self.store.orders.add(order('o2'))
        await self.store.orders.record_payment_error('o2', 'revolut_unreachable')
        self.assertEqual(await self.field('o2', 'payment_error', 'checkout_url'), ('revolut_unreachable', None))
        await self.store.orders.record_checkout('o2', 'rev-2', 'https://checkout.example.invalid/2', 'pending')
        self.assertEqual(await self.field('o2', 'revolut_order_id', 'checkout_url', 'payment_state', 'status'),
                         ('rev-2', 'https://checkout.example.invalid/2', 'pending', 'zahlung_offen'))
        self.assertNotIn('payment_error', await self.store.orders.get('o2'))
        await self.store.orders.record_payment_state('o2', 'processing')
        self.assertEqual(await self.field('o2', 'payment_state', 'status', 'total_cents', 'paid_transitions'), ('processing', 'zahlung_offen', 1995, 0),
                         'the provider state is a note; it is not the order status')
        self.assertEqual(await self.store.orders.get('o1'), order('o1'), 'another order is never touched')
        await self.store.orders.record_payment_error('missing', 'x'); await self.store.orders.record_checkout('missing', 'r', 'u', 's')
        await self.store.orders.record_payment_state('missing', 's')
        self.assertIsNone(await self.store.orders.get('missing'), 'recording on a missing order creates none')

    async def test_paid_is_reached_exactly_once(self):
        await self.store.orders.add(order('o1')); await self.store.orders.add(order('o2'))
        self.assertIs(await self.store.orders.mark_paid('o1', T0), True)
        self.assertIs(await self.store.orders.mark_paid('o1', T1), False)
        self.assertEqual(await self.field('o1', 'status', 'paid_at', 'paid_transitions', 'paid_mail_recovery_pending', 'total_cents'),
                         ('bezahlt', T0, 1, True, 1995), 'the first transition stands; amounts are untouched')
        self.assertEqual(await self.field('o2', 'status', 'paid_transitions', 'paid_at'), ('zahlung_offen', 0, None))
        self.assertIs(await self.store.orders.mark_paid('missing', T0), False)
        self.assertIsNone(await self.store.orders.get('missing'))

    async def test_concurrent_paid_transitions_have_one_winner(self):
        await self.store.orders.add(order('o1'))
        import asyncio
        results = await asyncio.gather(*(self.store.orders.mark_paid('o1', T0) for _ in range(8)))
        self.assertEqual(sorted(results), [False] * 7 + [True])
        self.assertEqual(await self.field('o1', 'status', 'paid_transitions'), ('bezahlt', 1))

    async def test_payment_failure_is_recorded_for_an_open_order_only_and_never_unpays(self):
        await self.store.orders.add(order('o1')); await self.store.orders.add(order('o2'))
        await self.store.orders.mark_payment_failed('o1')
        self.assertEqual(await self.field('o1', 'status'), ('zahlung_nicht_abgeschlossen',))
        self.assertIs(await self.store.orders.mark_paid('o1', T0), True, 'a late completed payment still counts once')
        await self.store.orders.mark_payment_failed('o1')
        self.assertEqual(await self.field('o1', 'status', 'paid_transitions'), ('bezahlt', 1), 'a paid order never becomes unpaid')
        self.assertEqual(await self.field('o2', 'status'), ('zahlung_offen',))
        await self.store.orders.mark_payment_failed('missing')
        self.assertIsNone(await self.store.orders.get('missing'))

    async def test_pending_confirmation_mails_are_listed_until_recorded_for_paid_orders_only(self):
        for oid in ('o1', 'o2', 'o3', 'o4'):
            await self.store.orders.add(order(oid))
        await self.store.orders.mark_paid('o1', T0); await self.store.orders.mark_paid('o2', T0)
        await self.seed('orders', [order('o5', status='bezahlt'), order('o6', paid_mail_recovery_pending=True)])
        pending = lambda: self.store.orders.paid_with_pending_mails()
        self.assertEqual([o['_id'] async for o in pending()], ['o1', 'o2'], 'paid and marked pending; legacy and unpaid orders are not listed')
        await self.store.orders.mark_paid_mails_recorded('o2')
        await self.store.orders.mark_paid_mails_recorded('o3')
        await self.store.orders.mark_paid_mails_recorded('missing')
        self.assertEqual(await self.field('o2', 'paid_mail_intents_recorded', 'paid_mail_recovery_pending', 'status'), (True, False, 'bezahlt'))
        self.assertEqual(await self.field('o3', 'paid_mail_intents_recorded', 'paid_mail_recovery_pending'), (None, None), 'only a paid order is marked')
        self.assertEqual([o['_id'] async for o in pending()], ['o1'])
        self.assertEqual((await pending().__anext__())['address'], {'email': 'a@example.invalid'}, 'orders come back whole')
        self.assertIsNone(await self.store.orders.get('missing'))

    async def test_supplier_handover_is_claimed_once_and_released_by_a_failure(self):
        await self.store.orders.add(order('o1')); await self.store.orders.add(order('o2', bigbuy_order_id=''))
        await self.seed('orders', [order('o3', bigbuy_order_id='BB-9'), order('o4', bigbuy_order_id=None, bigbuy_submitting=True),
                                   order('o5', bigbuy_order_id=None, bigbuy_submitting=False)])
        self.assertIs(await self.store.orders.claim_supplier_submission('o1', T0), True)
        self.assertIs(await self.store.orders.claim_supplier_submission('o1', T1), False, 'a second run must not place a second supplier order')
        self.assertEqual(await self.field('o1', 'bigbuy_submitting', 'fulfillment_checked_at'), (True, T0))
        self.assertIs(await self.store.orders.claim_supplier_submission('o2', T0), True, 'an empty supplier reference means not yet ordered')
        self.assertIs(await self.store.orders.claim_supplier_submission('o3', T0), False, 'an order already at the supplier is never claimed')
        self.assertIs(await self.store.orders.claim_supplier_submission('o4', T0), False)
        self.assertIs(await self.store.orders.claim_supplier_submission('o5', T0), True)
        self.assertIs(await self.store.orders.claim_supplier_submission('missing', T0), False)
        self.assertEqual(await self.field('o3', 'bigbuy_submitting', 'fulfillment_checked_at'), (None, None))
        await self.store.orders.record_supplier_failure('o1', 'insufficient_balance', T1)
        self.assertEqual(await self.field('o1', 'fulfillment_error', 'bigbuy_submit_pending', 'bigbuy_submitting', 'fulfillment_checked_at', 'status'),
                         ('insufficient_balance', True, False, T1, 'zahlung_offen'))
        self.assertIs(await self.store.orders.claim_supplier_submission('o1', T2), True, 'after a recorded failure the handover can be retried')
        self.assertIsNone(await self.store.orders.get('missing'))

    async def test_supplier_order_is_recorded_without_replacing_a_different_one(self):
        await self.store.orders.add(order('o1')); await self.store.orders.add(order('o2', fulfilment='versendet'))
        await self.seed('orders', [order('o3', bigbuy_order_id='BB-other')])
        for oid in ('o1', 'o2'):
            await self.store.orders.claim_supplier_submission(oid, T0)
        await self.store.orders.record_supplier_failure('o1', 'bigbuy_submit_failed', T0)
        await self.store.orders.record_supplier_order('o1', None, 'BB-1', 'SEUR', T1, T2)
        self.assertEqual(await self.field('o1', 'bigbuy_order_id', 'bigbuy_submitted_at', 'bigbuy_submit_pending', 'fulfillment_error', 'bigbuy_carrier',
                                          'bigbuy_submitting', 'fulfilment', 'processing_at'), ('BB-1', T1, False, None, 'SEUR', False, 'in_bearbeitung', T2))
        await self.store.orders.record_supplier_order('o2', None, 'BB-2', 'GLS', T1)
        self.assertEqual(await self.field('o2', 'bigbuy_order_id', 'bigbuy_carrier', 'bigbuy_submitting', 'fulfilment', 'processing_at'), ('BB-2', 'GLS', False, 'versendet', None),
                         'without a processing time the delivery state is left as it is')
        await self.store.orders.record_supplier_order('o3', None, 'BB-3', 'SEUR', T1, T2)
        self.assertEqual(await self.field('o3', 'bigbuy_order_id', 'bigbuy_carrier', 'fulfilment'), ('BB-other', None, None), 'a different supplier order is not overwritten')
        await self.store.orders.record_supplier_order('o3', 'BB-other', 'BB-3', 'SEUR', T1)
        self.assertEqual(await self.field('o3', 'bigbuy_order_id'), ('BB-3',), 'the known one may be replaced')
        self.assertIs(await self.store.orders.claim_supplier_submission('o1', T2), False, 'an order at the supplier is not handed over again')
        await self.store.orders.record_supplier_order('missing', None, 'BB-4', 'SEUR', T1)
        self.assertIsNone(await self.store.orders.get('missing'))

    async def test_shipped_is_reached_once_and_never_from_shipped_or_delivered(self):
        await self.store.orders.add(order('o1')); await self.store.orders.add(order('o2', fulfilment='in_bearbeitung'))
        await self.store.orders.add(order('o3', fulfilment='zugestellt', tracking_number='OLD', shipped_at=T0))
        self.assertIs(await self.store.orders.mark_shipped('o1', 'TR-1', 'SEUR', T1), True)
        self.assertIs(await self.store.orders.mark_shipped('o1', 'TR-9', 'GLS', T2), False)
        self.assertEqual(await self.field('o1', 'fulfilment', 'tracking_number', 'carrier', 'shipped_at'), ('versendet', 'TR-1', 'SEUR', T1))
        self.assertIs(await self.store.orders.mark_shipped('o2', 'TR-2', '', T1), True)
        self.assertIs(await self.store.orders.mark_shipped('o3', 'TR-3', 'SEUR', T2), False)
        self.assertEqual(await self.field('o3', 'fulfilment', 'tracking_number', 'shipped_at'), ('zugestellt', 'OLD', T0), 'a delivered order never moves back')
        self.assertIs(await self.store.orders.mark_shipped('missing', 'TR-4', 'SEUR', T1), False)
        self.assertIsNone(await self.store.orders.get('missing'))


class PaymentContract:
    async def test_one_webhook_registration_per_mode_is_replaced_whole(self):
        self.assertIsNone(await self.store.payments.webhook_registration('sandbox'))
        self.assertIs(await self.store.payments.has_webhook_registration('sandbox'), False)
        self.assertEqual(await self.store.payments.webhook_registrations(), [])
        first = {'_id': 'sandbox', 'webhook_id': 'w1', 'url': 'https://example.invalid/hook', 'signing_secret': 'synthetic-one', 'events': ['E'], 'stored_at': T0}
        await self.store.payments.save_webhook_registration('sandbox', dict(first))
        self.assertEqual(await self.store.payments.webhook_registration('sandbox'), first)
        self.assertIs(await self.store.payments.has_webhook_registration('sandbox'), True)
        self.assertIs(await self.store.payments.has_webhook_registration('live'), False, 'each mode has its own registration')
        second = {'_id': 'sandbox', 'webhook_id': 'w2', 'url': 'https://example.invalid/other', 'signing_secret': 'synthetic-two', 'stored_at': T1}
        await self.store.payments.save_webhook_registration('sandbox', dict(second))
        self.assertEqual(await self.store.payments.webhook_registration('sandbox'), second, 'no field of the replaced registration survives')
        await self.store.payments.save_webhook_registration('live', {'_id': 'live', 'webhook_id': 'w3', 'signing_secret': 'synthetic-three'})
        self.assertEqual(sorted(h['webhook_id'] for h in await self.store.payments.webhook_registrations()), ['w2', 'w3'])
        self.assertEqual((await self.store.payments.webhook_registration('sandbox'))['webhook_id'], 'w2')
        self.assertIsNone(await self.store.payments.webhook_registration('other'))

    async def test_webhook_event_is_recorded_once_per_content_key(self):
        await self.store.payments.record_webhook_event('k' * 64, 'ORDER_COMPLETED', 'rev-1', T0)
        with self.assertRaises(self.store.AlreadyExists):
            await self.store.payments.record_webhook_event('k' * 64, 'ORDER_FAILED', 'rev-2', T1)
        await self.store.payments.record_webhook_event('m' * 64, 'ORDER_COMPLETED', 'rev-1', T1)
        await self.store.payments.record_webhook_event('n' * 64, None, None, T1)
        events = await self.events()
        self.assertEqual([(e['event_key'][0], e['event'], e['order_id'], e['received_at']) for e in events],
                         [('k', 'ORDER_COMPLETED', 'rev-1', T0), ('m', 'ORDER_COMPLETED', 'rev-1', T1), ('n', None, None, T1)])


class MongoSpecifics:
    """Limits that exist only because a MongoDB cart is one document; not part of the shared contract."""
    def test_cart_at_the_document_limit_is_too_large_and_unencodable_data_is_invalid(self):
        with self.assertRaises(self.store.ArchiveTooLarge):
            self.store.carts.check_archivable({'padding': 'x' * (16 * 1024 * 1024)})
        with self.assertRaises(self.store.StoredDataInvalid):
            self.store.carts.check_archivable({'value': object()})

    async def test_unavailable_transactions_are_reported_as_store_unavailable(self):
        from pymongo.errors import ConfigurationError
        def refuse(): raise ConfigurationError('synthetic')
        self.store.carts.db = SimpleNamespace(client=SimpleNamespace(start_session=refuse))
        async def work(tx): self.fail('work must not run')
        with self.assertRaises(self.store.StoreUnavailable):
            await self.store.carts.in_transaction(work)


class PostgresSpecifics:
    """What only the PostgreSQL stores have to state; not part of the shared contract."""
    async def test_instants_are_kept_to_the_millisecond_like_the_previous_store(self):
        fine = NOW + timedelta(microseconds=123987)
        await self.store.accounts.create_session('1' * 64, 'user_a', 'c', fine)
        self.assertEqual(instant((await self.store.accounts.session('1' * 64))['expires_at']), NOW + timedelta(microseconds=123000))
        await self.store.accounts.record_login_failure('a@example.invalid', fine)
        self.assertEqual(await self.store.accounts.count_login_failures('a@example.invalid', NOW + timedelta(microseconds=123500)), 1)
        await self.store.accounts.create_password_reset('a' * 64, 'user_a', fine)
        self.assertIsNone(await self.store.accounts.consume_password_reset('a' * 64, NOW + timedelta(microseconds=123400)), 'expired at its stored instant')
        await self.seed('outbox', [mail('dated', claimed_at=datetime(2026, 11, 14, 12, 0, 0, 123987))])
        self.assertEqual((await self.store.outbox.get('dated'))['claimed_at'], datetime(2026, 11, 14, 12, 0, 0, 123000), 'a stored instant comes back without a zone')

    async def test_the_protective_size_limit_and_unstorable_data_are_reported_as_before(self):
        with self.assertRaises(self.store.ArchiveTooLarge):
            self.store.carts.check_archivable({'padding': 'x' * (16 * 1024 * 1024)})
        with self.assertRaises(self.store.StoredDataInvalid):
            self.store.carts.check_archivable({'value': object()})
        self.assertIsNone(self.store.carts.check_archivable({'padding': 'x' * 1024}))

    async def test_amounts_that_are_not_whole_cents_never_reach_the_table(self):
        for field, value in (('total_cents', 19.95), ('total_cents', '1995'), ('subtotal_cents', -1), ('shipping_cents', float('nan')), ('paid_transitions', 2), ('note', 'a\x00b')):
            with self.subTest(field=field, value=value), self.assertRaises(self.store.StoredDataInvalid):
                await self.store.orders.add(order('bad', **{field: value}))
            self.assertIsNone(await self.store.orders.get('bad'))
        await self.store.orders.add(order('o1'))
        with self.assertRaises(self.store.StoredDataInvalid):
            await self.store.orders.change_delivery_state('o1', None, {'total_cents': 0.5})
        self.assertEqual(await self.store.orders.get('o1'), order('o1'), 'the rejected change left the order as ordered')

    async def test_expired_sessions_tokens_and_old_failures_are_removed_on_request_only(self):
        await self.store.accounts.create_session('1' * 64, 'user_a', 'c', NOW - timedelta(seconds=1))
        await self.store.accounts.create_session('2' * 64, 'user_a', 'c', NOW + timedelta(seconds=1))
        await self.store.accounts.create_password_reset('a' * 64, 'user_a', NOW)
        await self.store.accounts.create_password_reset('b' * 64, 'user_a', NOW + timedelta(minutes=1))
        await self.store.accounts.record_login_failure('a@example.invalid', NOW - timedelta(seconds=901))
        await self.store.accounts.record_login_failure('a@example.invalid', NOW - timedelta(seconds=899))
        self.assertIsNotNone(await self.store.accounts.session('1' * 64), 'nothing expires by itself; the caller checks the instant')
        self.assertEqual(await self.store.accounts.purge_expired(NOW, 900), 3)
        self.assertIsNone(await self.store.accounts.session('1' * 64))
        self.assertIsNotNone(await self.store.accounts.session('2' * 64))
        self.assertEqual(await self.store.accounts.count_login_failures('a@example.invalid', NOW - timedelta(days=1)), 1)
        self.assertEqual((await self.store.accounts.consume_password_reset('b' * 64, NOW))['user_id'], 'user_a')
        self.assertEqual(await self.store.accounts.purge_expired(NOW, 900), 0)

    async def test_two_state_changes_that_wait_on_the_same_row_have_one_winner(self):
        # Both callers are held at the row until it is released. Each has to judge the state it finds after the
        # other one wrote, not the state from before the wait.
        import asyncio
        import psycopg
        await self.store.orders.add(order('o1')); await self.store.outbox.add('k1', 'a@example.invalid', 'S', 'H', 'T', '', T0)
        holder = await psycopg.AsyncConnection.connect(self.fixture.dsn_for(self.database_name))
        self.addAsyncCleanup(holder.close)
        await holder.execute("select 1 from shop.orders where id = 'o1' for update")
        await holder.execute("select 1 from shop.outbox where id = 'k1' for update")
        paid = [asyncio.ensure_future(self.store.orders.mark_paid('o1', at)) for at in (T0, T1)]
        claimed = [asyncio.ensure_future(self.store.outbox.claim('k1', claim, T0, 5)) for claim in ('first', 'second')]
        await asyncio.sleep(0.5)
        self.assertFalse(any(task.done() for task in paid + claimed), 'every caller waits for the row')
        await holder.rollback()
        self.assertEqual(sorted(await asyncio.gather(*paid)), [False, True])
        stored = await self.store.orders.get('o1')
        self.assertEqual((stored['status'], stored['paid_transitions']), ('bezahlt', 1))
        self.assertIn(stored['paid_at'], (T0, T1))
        self.assertEqual(sorted(result is not None for result in await asyncio.gather(*claimed)), [False, True])
        self.assertIn((await self.store.outbox.get('k1'))['claim_id'], ('first', 'second'))

    async def test_two_concurrent_merges_of_one_cart_take_its_items_exactly_once(self):
        import asyncio
        await self.store.carts.replace_items('guest:one', None, [ITEM], create=True)
        both_have_read, runs = asyncio.Event(), []
        async def merge(target):
            async def work(tx):
                guest = await self.store.carts.get('guest:one', tx=tx)
                runs.append((target, guest['revision']))
                if len(runs) >= 2: both_have_read.set()
                await asyncio.wait_for(both_have_read.wait(), 5)
                await self.store.carts.replace_items(target, None, guest['items'], create=True, tx=tx)
                await self.store.carts.replace_items('guest:one', guest['revision'], [], create=False, tx=tx, archive_entry={'id': target, 'taken': len(guest['items'])})
            await self.store.carts.in_transaction(work)
        await asyncio.gather(merge('user:two'), merge('user:three'))
        self.assertEqual(sorted(revision for _, revision in runs), [1, 1, 2], 'both read the same state; the loser was run again on the new one')
        guest = await self.store.carts.get('guest:one')
        self.assertEqual((guest['items'], guest['revision']), ([], 3))
        self.assertEqual([entry['taken'] for entry in guest['merge_history']], [1, 0], 'the second merge found the cart already emptied')
        taken = sorted([len((await self.store.carts.get(owner))['items']) for owner in ('user:two', 'user:three')])
        self.assertEqual(taken, [0, 1], 'the position exists once, not in both accounts')


class InMemoryCatalog(CatalogContract, InMemoryBinding): pass
class InMemoryCarts(CartContract, MongoSpecifics, InMemoryBinding): pass
class InMemoryAccounts(AccountContract, InMemoryBinding): pass
class InMemoryWorkshops(WorkshopContract, InMemoryBinding): pass
class InMemoryRequests(RequestContract, InMemoryBinding): pass
class InMemoryOutbox(OutboxContract, InMemoryBinding): pass
class InMemoryOrders(OrderContract, InMemoryBinding): pass
class InMemoryPayments(PaymentContract, InMemoryBinding): pass
class InMemorySettings(SettingsContract, InMemoryBinding): pass
class DisposableMongoCatalog(CatalogContract, DisposableMongoBinding): pass
class DisposableMongoCarts(CartContract, DisposableMongoBinding): pass
class DisposableMongoAccounts(AccountContract, DisposableMongoBinding): pass
class DisposableMongoWorkshops(WorkshopContract, DisposableMongoBinding): pass
class DisposableMongoRequests(RequestContract, DisposableMongoBinding): pass
class DisposableMongoOutbox(OutboxContract, DisposableMongoBinding): pass
class DisposableMongoOrders(OrderContract, DisposableMongoBinding): pass
class DisposableMongoPayments(PaymentContract, DisposableMongoBinding): pass
class DisposableMongoSettings(SettingsContract, DisposableMongoBinding): pass
class DisposablePostgresCatalog(CatalogContract, DisposablePostgresBinding): pass
class DisposablePostgresCarts(CartContract, DisposablePostgresBinding): pass
class DisposablePostgresAccounts(AccountContract, DisposablePostgresBinding): pass
class DisposablePostgresWorkshops(WorkshopContract, DisposablePostgresBinding): pass
class DisposablePostgresRequests(RequestContract, DisposablePostgresBinding): pass
class DisposablePostgresOutbox(OutboxContract, DisposablePostgresBinding): pass
class DisposablePostgresOrders(OrderContract, DisposablePostgresBinding): pass
class DisposablePostgresPayments(PaymentContract, DisposablePostgresBinding): pass
class DisposablePostgresSettings(SettingsContract, DisposablePostgresBinding): pass
class DisposablePostgresSpecifics(PostgresSpecifics, DisposablePostgresBinding): pass


if __name__ == '__main__': unittest.main()
