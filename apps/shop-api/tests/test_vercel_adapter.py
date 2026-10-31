"""Isolated adapter/router tests: no real database, provider, seed or SMTP request."""
import asyncio
import copy
import importlib.util
import json
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi import APIRouter
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[3]
SPEC = importlib.util.spec_from_file_location('release_shop_adapter', ROOT / 'apps/shop-api/vercel_app.py')
ADAPTER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = ADAPTER
SPEC.loader.exec_module(ADAPTER)
ENV = {'VERCEL_PROJECT_ID': ADAPTER.PROJECT_ID,
       'MONGODB_URI': 'mongodb://isolated.invalid/' + ADAPTER.PLANNED_NAMESPACE,
       'DB_NAME': ADAPTER.PLANNED_NAMESPACE, 'PREVIEW_PUBLIC_ORIGIN': 'https://shop.example.invalid',
       'SHOP_VAT_PERCENT': '19'}  # synthetic only, no price approval


class Cursor:
    def __init__(self, data): self.data = data
    async def to_list(self, length=None): return copy.deepcopy(self.data)


class Collection:
    def __init__(self, database, name): self.database, self.name = database, name
    async def index_information(self):
        self.database.metadata_reads += 1
        return copy.deepcopy(self.database.indexes.get(self.name, {}))
    async def find_one(self, query, projection=None):
        self.database.document_reads += 1
        return copy.deepcopy(self.database.documents.get(self.name))
    def __getattr__(self, name):
        async def forbidden(*args, **kwargs):
            self.database.writes.append((self.name, name))
            raise AssertionError('Unexpected fake DB action: ' + name)
        return forbidden


class Database:
    def __init__(self):
        self.name = ADAPTER.PLANNED_NAMESPACE
        self.metadata_reads = self.document_reads = 0
        self.writes, self.documents = [], {}
        self.metadata = [{'name': name, 'type': 'collection', 'options': {'validator': {'$jsonSchema': {'bsonType': 'object', 'description': ADAPTER.SCHEMA_MARKER}}}} for name in ADAPTER.COLLECTIONS]
        self.indexes = {}
        for name, specs in ADAPTER.INDEXES.items():
            self.indexes[name] = {}
            for n, (keys, unique, ttl) in enumerate(specs):
                index = {'key': [(key, 1) for key in keys]}
                if unique: index['unique'] = True
                if ttl is not None: index['expireAfterSeconds'] = ttl
                self.indexes[name][str(n)] = index
    def __getitem__(self, name): return Collection(self, name)
    def __getattr__(self, name): return self[name]
    async def list_collections(self, **kwargs):
        self.metadata_reads += 1
        return Cursor(self.metadata)


class BindingTests(unittest.TestCase):
    def test_missing_conflicting_and_random_namespaces_fail_closed_without_values(self):
        candidates = [{}, {**ENV, 'VERCEL_PROJECT_ID': 'foreign-project'},
                      {**ENV, 'DB_NAME': 'random_database'},
                      {**ENV, 'MONGO_URL': 'mongodb://other.invalid/foreign'},
                      {**ENV, 'MONGODB_URI': 'mongodb://localhost/' + ADAPTER.PLANNED_NAMESPACE},
                      {**ENV, 'PREVIEW_PUBLIC_ORIGIN': 'https://user:secret@shop.example.invalid'},
                      {**ENV, 'SHOP_VAT_PERCENT': 'NaN'}]
        for env in candidates:
            calls = []
            with TestClient(ADAPTER.create_app(env, loader=lambda _: calls.append(1))) as client:
                result = client.post('/api/shop/cart', headers={'X-Tenant-Id': 'pretend-admin'}, json={})
                self.assertEqual(result.status_code, 503)
                self.assertFalse(result.json()['available'])
                self.assertNotIn('mongodb', result.text)
                self.assertNotIn('secret', result.text)
                self.assertEqual(calls, [])

    def test_uri_path_only_is_accepted_only_for_exact_new_plan_not_random_database(self):
        env = {k: v for k, v in ENV.items() if k != 'DB_NAME'}
        self.assertEqual(ADAPTER.resolve_binding(env).namespace, ADAPTER.PLANNED_NAMESPACE)
        self.assertNotIn('mongodb', repr(ADAPTER.resolve_binding(env)))
        with self.assertRaises(ADAPTER.BindingError):
            ADAPTER.resolve_binding({**env, 'MONGODB_URI': 'mongodb://isolated.invalid/random_database'})


class MetadataTests(unittest.IsolatedAsyncioTestCase):
    async def test_metadata_only_checks_existing_index_contract_without_writes(self):
        db = Database()
        self.assertIsNone(await ADAPTER.check_metadata(db))
        self.assertGreater(db.metadata_reads, 1)
        self.assertEqual(db.document_reads, 0)
        self.assertEqual(db.writes, [])

    async def test_missing_foreign_schema_view_partial_sparse_and_ttl_never_enable_dispatch(self):
        for change in ('missing', 'foreign_marker', 'view', 'unique', 'partial', 'sparse', 'ttl', 'keys'):
            with self.subTest(change=change):
                db = Database()
                if change == 'missing': db.metadata.pop()
                elif change == 'foreign_marker': db.metadata[0]['options']['validator']['$jsonSchema']['description'] = 'other-project'
                elif change == 'view': db.metadata[0]['type'] = 'view'
                elif change == 'unique': db.indexes['orders']['0']['unique'] = False
                elif change == 'partial': db.indexes['orders']['0']['partialFilterExpression'] = {'active': True}
                elif change == 'sparse': db.indexes['orders']['0']['sparse'] = True
                elif change == 'ttl': db.indexes['sessions']['1']['expireAfterSeconds'] = 10
                else: db.indexes['orders']['0']['key'].reverse()
                self.assertIsNotNone(await ADAPTER.check_metadata(db))
                self.assertEqual(db.writes, [])
                self.assertEqual(db.document_reads, 0)


class DispatchTests(unittest.TestCase):
    def fake_app(self, db):
        self.calls, self.loaded = [], []
        router = APIRouter()
        for path in ('/api/shop/cart', '/api/shop/orders/id', '/api/auth/login'):
            async def endpoint(path=path):
                self.calls.append(path)
                return {'synthetic': True}
            router.add_api_route(path, endpoint, methods=['GET', 'POST'])
        def loader(binding):
            self.loaded.append(binding.namespace)
            return [router], db
        return ADAPTER.create_app(ENV, loader=loader)

    def test_startup_does_not_import_routers_or_touch_database_and_all_gets_are_gated(self):
        db = Database(); db.metadata = []
        with TestClient(self.fake_app(db)) as client:
            self.assertEqual(self.loaded, [])
            self.assertEqual(db.metadata_reads, 0)
            for path in ('/api/shop/cart', '/api/shop/orders/id', '/api/auth/login'):
                self.assertEqual(client.get(path).status_code, 503)
            self.assertEqual(self.calls, [])
            self.assertEqual(db.writes, [])

    def test_success_then_metadata_revocation_origin_and_non_owned_paths(self):
        db = Database()
        with TestClient(self.fake_app(db)) as client:
            self.assertEqual(client.get('/api/health').status_code, 200)
            self.assertEqual(client.get('/api/shop/cart').status_code, 200)
            self.assertEqual(client.post('/api/shop/cart', headers={'Origin': 'https://foreign.invalid'}).status_code, 403)
            self.assertEqual(client.get('/api/agent-chat').status_code, 404)
            self.assertEqual(client.get('/api/internal/workspace').status_code, 404)
            db.metadata = []
            self.assertEqual(client.post('/api/shop/cart').status_code, 503)
            self.assertEqual(self.calls, ['/api/shop/cart'])
            self.assertEqual(db.writes, [])

    def test_bad_driver_never_leaks_exception_or_uri(self):
        def broken(binding): raise RuntimeError('mongodb://REAL_SECRET_SENTINEL')
        with TestClient(ADAPTER.create_app(ENV, loader=broken)) as client:
            response = client.get('/api/shop/products')
            self.assertEqual(response.status_code, 503)
            self.assertNotIn('REAL_SECRET_SENTINEL', response.text)

    def test_existing_routers_and_auth_are_reused_without_main_seed_or_worker(self):
        db = Database()
        class Client:
            def __getitem__(self, name): return db
        with patch.dict(os.environ, ENV, clear=True), patch('motor.motor_asyncio.AsyncIOMotorClient', return_value=Client()), patch('subprocess.Popen', side_effect=AssertionError('no subprocess')):
            # Remove only test-created module references on exit, preserving caller state.
            existing = set(sys.modules)
            try:
                routers, bound = ADAPTER.load_existing(ADAPTER.resolve_binding(ENV))
                self.assertNotIn('shop.main', sys.modules)
                self.assertIs(bound, db)
                self.assertEqual(len(routers), len(ADAPTER.MODULES))
                with TestClient(ADAPTER.create_app(ENV, loader=lambda _: (routers, db))) as client:
                    self.assertEqual(client.get('/api/health').status_code, 200)
                    self.assertEqual(db.writes, [])
                    self.assertEqual(client.get('/api/admin/settings').status_code, 401)
                    db.documents['sessions'] = {'user_id': 'synthetic-customer', 'expires_at': datetime.now(timezone.utc)+timedelta(hours=1)}
                    db.documents['users'] = {'user_id': 'synthetic-customer', 'role': 'customer'}
                    result = client.get('/api/admin/settings', headers={'Authorization': 'Bearer synthetic-session'})
                    self.assertEqual(result.status_code, 403)
                    self.assertEqual(db.writes, [])
            finally:
                for name in set(sys.modules)-existing:
                    if name == 'shop' or name.startswith('shop.') or name == 'bigbuy_get':
                        sys.modules.pop(name, None)


class RoutingTests(unittest.TestCase):
    def test_services_keep_headers_and_only_owned_api_prefixes(self):
        config = json.loads((ROOT/'vercel.json').read_text())
        self.assertEqual(config['services']['frontend']['root'], 'apps/web')
        self.assertEqual(config['services']['shop']['entrypoint'], 'vercel_app:app')
        for field in ('framework','functions','buildCommand','installCommand','outputDirectory'):
            self.assertNotIn(field, config)
        rules = config['rewrites']
        self.assertFalse(any(r['source'] in ('/api/(.*)', '/api/:path*') for r in rules))
        self.assertEqual(rules[-1], {'source':'/(.*)','destination':{'service':'frontend'}})
        backend = {r['source'] for r in rules if r['destination']['service']=='shop'}
        self.assertEqual({p+'/:path*' for p in ADAPTER.PREFIXES} - backend, set())
        for path in ['/api/agent-chat', '/api/agent-runtime-status', '/api/internal/workspace', '/api/session', '/api/shopper']:
            self.assertFalse(ADAPTER.owns(path))
        self.assertEqual(config['services']['frontend']['functions']['app/api/agent-chat/route.ts']['maxDuration'],10)
