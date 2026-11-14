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
                if operator == '$exists' and present is not operand: return False
                if operator in ('$gt', '$gte'):
                    try:
                        if value is None or isinstance(value, bool) or not (value > operand or (operator == '$gte' and value == operand)): return False
                    except TypeError:
                        return False
                if operator == '$lte':
                    try:
                        if value is None or isinstance(value, bool) or not value <= operand: return False
                    except TypeError:
                        return False
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
    async def find_one_and_update(self, query, update):
        target = next((d for d in self.docs if matches(d, query)), None)
        if target is None: return None
        before = copy.deepcopy(target); target.update(copy.deepcopy(update.get('$set', {})))
        return before
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
        if any(key in doc and d.get(key) == doc[key] for key in ['_id', *self.unique] for d in self.docs):
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
                            'settings': Collection(), 'carts': Collection(unique=['owner']), 'users': Collection(),
                            'sessions': Collection(), 'login_failures': Collection(), 'password_resets': Collection(),
                            'workshops': Collection(), 'workshop_requests': Collection()}
        self.client = SimpleNamespace(start_session=lambda: Session(self))
    def __getattr__(self, name): return self.collections[name]


class InMemoryBinding(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.database = Database()
        self.store = load_store(self.database)
        await self.store.accounts.ensure_indexes(900)

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
        # Motor, because that is the driver shop/db.py binds in production. pymongo's own
        # AsyncMongoClient differs (aggregate() is a coroutine there, a cursor here).
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(disposable_uri(), serverSelectionTimeoutMS=3000)
        self.addCleanup(client.close)
        self.database = client['nexify_store_contract_' + uuid4().hex]
        await self.database.carts.create_index('owner', unique=True)
        self.store = load_store(self.database)
        await self.store.accounts.ensure_indexes(900)

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


class InMemoryCatalog(CatalogContract, InMemoryBinding): pass
class InMemoryCarts(CartContract, MongoSpecifics, InMemoryBinding): pass
class InMemoryAccounts(AccountContract, InMemoryBinding): pass
class InMemoryWorkshops(WorkshopContract, InMemoryBinding): pass
class DisposableMongoCatalog(CatalogContract, DisposableMongoBinding): pass
class DisposableMongoCarts(CartContract, DisposableMongoBinding): pass
class DisposableMongoAccounts(AccountContract, DisposableMongoBinding): pass
class DisposableMongoWorkshops(WorkshopContract, DisposableMongoBinding): pass


if __name__ == '__main__': unittest.main()
