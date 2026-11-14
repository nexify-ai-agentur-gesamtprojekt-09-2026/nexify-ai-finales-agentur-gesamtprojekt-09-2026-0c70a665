"""Contracts of the shop data-access interfaces (shop/store).

Each contract class states what the business code may rely on, using only the
interface plus a ``seed_*`` hook. Every implementation has to pass it: today the
MongoDB one, later a PostgreSQL one (add a binding class, change no assertion).

Bindings here:
* InMemory*: the real Mongo implementation over a small in-memory stand-in for
  the driver. No network, always runs. The stand-in is an assumption about
  MongoDB semantics, limited to the operators these stores use.
* DisposableMongo*: the same contracts against a real, explicitly disposable
  local replica set; skipped unless confirmed like test_cart_merge_replica_contract.
"""
import copy
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
                if operator == '$exists' and present is not operand: return False
                if operator == '$gt' and not (isinstance(value, (int, float)) and not isinstance(value, bool) and value > operand): return False
                if operator == '$regex' and not (isinstance(value, str) and re.search(operand, value, re.I if 'i' in expected.get('$options', '') else 0)): return False
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


class Collection:
    def __init__(self, unique=None): self.docs, self.unique = [], unique
    def _project(self, doc, fields):
        return copy.deepcopy(doc if not fields else {k: v for k, v in doc.items() if k in fields})
    def find(self, query, fields=None, session=None):
        return Cursor([self._project(d, fields) for d in self.docs if matches(d, query)])
    async def find_one(self, query, fields=None, sort=None, session=None):
        rows = self.find(query, fields)
        if sort: rows.sort(sort)
        return rows.rows[0] if rows.rows else None
    async def count_documents(self, query): return sum(matches(d, query) for d in self.docs)
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
        if self.unique and any(d.get(self.unique) == doc.get(self.unique) for d in self.docs):
            raise DuplicateKeyError('duplicate')
        self.docs.append(doc)
    async def update_one(self, query, update, upsert=False, session=None):
        target = next((d for d in self.docs if matches(d, query)), None)
        created = target is None and upsert
        if created:
            target = {k: v for k, v in query.items() if not isinstance(v, dict)}
        if target is None:
            return SimpleNamespace(matched_count=0, upserted_id=None)
        target.update(copy.deepcopy(update.get('$set', {})))
        for key, amount in update.get('$inc', {}).items(): target[key] = target.get(key, 0) + amount
        for key, entry in update.get('$push', {}).items(): target.setdefault(key, []).append(copy.deepcopy(entry))
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
                            'settings': Collection(), 'carts': Collection(unique='owner')}
        self.client = SimpleNamespace(start_session=lambda: Session(self))
    def __getattr__(self, name): return self.collections[name]


class InMemoryBinding(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.database = Database()
        self.store = load_store(self.database)

    async def seed(self, collection, docs): await getattr(self.database, collection).insert_many(docs)


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
        from pymongo import AsyncMongoClient
        client = AsyncMongoClient(disposable_uri(), serverSelectionTimeoutMS=3000)
        self.addAsyncCleanup(client.close)
        self.database = client['nexify_store_contract_' + uuid4().hex]
        await self.database.carts.create_index('owner', unique=True)
        self.store = load_store(self.database)

    async def seed(self, collection, docs): await self.database[collection].insert_many(copy.deepcopy(docs))


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


class InMemoryCatalog(CatalogContract, InMemoryBinding): pass
class DisposableMongoCatalog(CatalogContract, DisposableMongoBinding): pass


if __name__ == '__main__': unittest.main()
