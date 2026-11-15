"""Isolated adapter/router tests: no real database, provider, seed or SMTP request."""
import asyncio
import copy
import importlib.util
import hashlib
import json
import os
import sys
import tempfile
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
       'SHOP_VAT_PERCENT': '19', 'REVOLUT_MODE': 'sandbox'}  # synthetic only, no price approval


class Cursor:
    def __init__(self, data): self.data = data
    async def to_list(self, length=None): return copy.deepcopy(self.data if length is None else self.data[:length])


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
        self.indexes = {name: {'_id_': {'key': [('_id', 1)]}} for name in ADAPTER.COLLECTIONS}
        for name, specs in ADAPTER.INDEXES.items():
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


# Synthetic, clearly fake project IDs: each appears in an env value that must never be echoed.
ALLOWED_PROJECT = 'prj_AllowedSentinel0000000000000'
LISTED_PROJECT = 'prj_ListedSentinel00000000000000'
FOREIGN_PROJECT = 'prj_ForeignSentinel0000000000000'
SENTINELS = (ALLOWED_PROJECT, LISTED_PROJECT, FOREIGN_PROJECT)
ALLOWLIST = 'SHOP_ALLOWED_PROJECT_IDS'


def env_for(project, allowed=None):
    """ENV bound to `project`; `allowed=None` leaves the allowlist variable unset."""
    env = {**ENV, 'VERCEL_PROJECT_ID': project}
    if allowed is not None:
        env[ALLOWLIST] = allowed
    return env


class ProjectAllowlistTests(unittest.TestCase):
    def rejected(self, env):
        with self.assertRaises(ADAPTER.BindingError) as caught:
            ADAPTER.resolve_binding(env)
        self.assertEqual(str(caught.exception), 'project_binding_unverified')

    def test_default_without_variable_is_exactly_the_historic_project(self):
        # Pinned literal: the default must stay the project that owns the namespace.
        self.assertEqual(ADAPTER.PROJECT_ID, 'prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh')
        self.assertEqual(ADAPTER.ALLOWED_PROJECT_IDS_ENV, ALLOWLIST)
        self.assertEqual(ADAPTER.allowed_project_ids({}), frozenset({ADAPTER.PROJECT_ID}))
        self.assertTrue(ADAPTER.project_binding_verified({'VERCEL_PROJECT_ID': ADAPTER.PROJECT_ID}))
        self.assertEqual(ADAPTER.resolve_binding(ENV).namespace, ADAPTER.PLANNED_NAMESPACE)
        self.rejected(env_for(FOREIGN_PROJECT))

    def test_listed_project_binds_and_unlisted_project_does_not(self):
        self.assertEqual(ADAPTER.resolve_binding(env_for(ALLOWED_PROJECT, ALLOWED_PROJECT)).namespace, ADAPTER.PLANNED_NAMESPACE)
        self.rejected(env_for(FOREIGN_PROJECT, ALLOWED_PROJECT))

    def test_several_ids_and_surrounding_whitespace_are_tolerated(self):
        for raw in (f'{ALLOWED_PROJECT},{LISTED_PROJECT}', f' {ALLOWED_PROJECT} , {LISTED_PROJECT} ',
                    f'\t{ALLOWED_PROJECT}\n,\t{LISTED_PROJECT}  ', f'{ALLOWED_PROJECT},,{LISTED_PROJECT},'):
            with self.subTest(raw=raw):
                self.assertEqual(ADAPTER.allowed_project_ids({ALLOWLIST: raw}), frozenset({ALLOWED_PROJECT, LISTED_PROJECT}))
                for project in (ALLOWED_PROJECT, LISTED_PROJECT):
                    self.assertEqual(ADAPTER.resolve_binding(env_for(project, raw)).namespace, ADAPTER.PLANNED_NAMESPACE)
                self.rejected(env_for(FOREIGN_PROJECT, raw))

    def test_blank_list_means_not_configured_and_falls_back_to_default_never_to_open(self):
        for raw in ('', '   ', ' , , ', ',', '\t\n', None, 5):
            with self.subTest(raw=raw):
                env = {**ENV, ALLOWLIST: raw}
                self.assertEqual(ADAPTER.allowed_project_ids(env), frozenset({ADAPTER.PROJECT_ID}))
                self.assertEqual(ADAPTER.resolve_binding(env).namespace, ADAPTER.PLANNED_NAMESPACE)
                self.rejected({**env, 'VERCEL_PROJECT_ID': FOREIGN_PROJECT})

    def test_configured_list_replaces_the_default_and_never_matches_by_pattern_or_emptiness(self):
        # The list is the explicit approval: the historic project is not implicitly kept.
        self.rejected(env_for(ADAPTER.PROJECT_ID, ALLOWED_PROJECT))
        for pattern in ('*', 'prj_*', '.*', '%'):
            with self.subTest(pattern=pattern):
                self.rejected(env_for(FOREIGN_PROJECT, pattern))
                self.rejected(env_for(ADAPTER.PROJECT_ID, pattern))
        # Empty list entries are dropped, so a missing or empty project ID matches nothing.
        self.rejected({k: v for k, v in env_for(ALLOWED_PROJECT, f'{ALLOWED_PROJECT},,').items() if k != 'VERCEL_PROJECT_ID'})
        self.rejected(env_for('', f'{ALLOWED_PROJECT},,'))
        # Only the list is trimmed; the runtime project ID is compared exactly and case-sensitively.
        self.rejected(env_for(' ' + ALLOWED_PROJECT, ALLOWED_PROJECT))
        self.rejected(env_for(ALLOWED_PROJECT.lower(), ALLOWED_PROJECT))
        self.rejected(env_for(['not', 'a', 'string'], ALLOWED_PROJECT))

    def test_namespace_identity_does_not_follow_the_allowlist(self):
        self.assertIn(ADAPTER.PROJECT_ID, ADAPTER.SCHEMA_MARKER)
        for sentinel in SENTINELS:
            self.assertNotIn(sentinel, ADAPTER.SCHEMA_MARKER)
        self.assertEqual(ADAPTER.resolve_binding(env_for(ALLOWED_PROJECT, ALLOWED_PROJECT)).namespace, ADAPTER.PLANNED_NAMESPACE)

    def test_listed_project_passes_the_http_gate_and_unlisted_gets_a_fixed_code_without_values(self):
        calls = []
        router = APIRouter()
        @router.get('/api/shop/cart')
        async def cart():
            return {'synthetic': True}
        def loader(binding):
            calls.append(binding.namespace)
            return [router], Database()
        raw = f'{ALLOWED_PROJECT}, {LISTED_PROJECT}'
        with TestClient(ADAPTER.create_app(env_for(ALLOWED_PROJECT, raw), loader=loader)) as client:
            self.assertEqual(client.get('/api/shop/cart').status_code, 200)
        self.assertEqual(calls, [ADAPTER.PLANNED_NAMESPACE])
        calls.clear()
        with TestClient(ADAPTER.create_app(env_for(FOREIGN_PROJECT, raw), loader=loader)) as client:
            for response in (client.get('/api/shop/cart'), client.post('/api/shop/cart', json={})):
                self.assertEqual(response.status_code, 503)
                self.assertEqual(response.json()['detail'], {'error': 'runtime_binding_unavailable', 'reason': 'project_binding_unverified'})
                self.assertFalse(response.json()['available'])
                for sentinel in SENTINELS:
                    self.assertNotIn(sentinel, response.text)
                    self.assertNotIn(sentinel, repr(dict(response.headers)))
        self.assertEqual(calls, [])

    def test_diagnostic_is_a_fixed_code_in_exception_and_logs(self):
        raw = f'{ALLOWED_PROJECT},{LISTED_PROJECT}'
        with self.assertNoLogs():
            with self.assertRaises(ADAPTER.BindingError) as caught:
                ADAPTER.resolve_binding(env_for(FOREIGN_PROJECT, raw))
        error = caught.exception
        self.assertEqual(error.args, ('project_binding_unverified',))
        self.assertIsNone(error.__cause__)
        self.assertIsNone(error.__context__)
        for sentinel in SENTINELS:
            self.assertNotIn(sentinel, str(error))
            self.assertNotIn(sentinel, repr(error))


class MetadataTests(unittest.IsolatedAsyncioTestCase):
    async def test_metadata_only_checks_existing_index_contract_without_writes(self):
        db = Database()
        self.assertIsNone(await ADAPTER.check_metadata(db))
        self.assertGreater(db.metadata_reads, 1)
        self.assertEqual(db.document_reads, 0)
        self.assertEqual(db.writes, [])

    async def test_per_run_claim_is_only_valid_for_its_fixed_collection_and_project(self):
        db = Database()
        claim = next(row for row in db.metadata if row['name']==ADAPTER.CLAIM_COLLECTION)
        claim['options']['validator']['$jsonSchema']['description'] = ADAPTER.SCHEMA_MARKER+'/claim/'+'a'*32
        self.assertIsNone(await ADAPTER.check_metadata(db))
        claim['options']['validator']['$jsonSchema']['description'] = ADAPTER.SCHEMA_MARKER+'/claim/'+'A'*32
        self.assertIsNotNone(await ADAPTER.check_metadata(db))
        db = Database()
        db.metadata[0]['options']['validator']['$jsonSchema']['description'] = ADAPTER.SCHEMA_MARKER+'/claim/'+'a'*32
        self.assertIsNotNone(await ADAPTER.check_metadata(db))

    async def test_missing_foreign_schema_view_partial_sparse_and_ttl_never_enable_dispatch(self):
        for change in ('missing', 'foreign_marker', 'view', 'unique', 'partial', 'sparse', 'ttl', 'keys', 'warn', 'off', 'capped', 'validator', 'unexpected_unique', 'extra_index', 'prepare_unique', 'id_option', 'extra_collection'):
            with self.subTest(change=change):
                db = Database()
                if change == 'missing': db.metadata.pop()
                elif change == 'foreign_marker': db.metadata[0]['options']['validator']['$jsonSchema']['description'] = 'other-project'
                elif change == 'view': db.metadata[0]['type'] = 'view'
                elif change == 'unique': db.indexes['orders']['0']['unique'] = False
                elif change == 'partial': db.indexes['orders']['0']['partialFilterExpression'] = {'active': True}
                elif change == 'sparse': db.indexes['orders']['0']['sparse'] = True
                elif change == 'ttl': db.indexes['sessions']['1']['expireAfterSeconds'] = 10
                elif change == 'keys': db.indexes['orders']['0']['key'].reverse()
                elif change == 'warn': db.metadata[0]['options']['validationAction'] = 'warn'
                elif change == 'off': db.metadata[0]['options']['validationLevel'] = 'off'
                elif change == 'capped': db.metadata[0]['options']['capped'] = True
                elif change == 'validator': db.metadata[0]['options']['validator']['$jsonSchema']['required'] = ['foreign_field']
                elif change == 'unexpected_unique': db.indexes['products']['2']['unique'] = True
                elif change == 'prepare_unique': db.indexes['products']['2']['prepareUnique'] = True
                elif change == 'id_option': db.indexes['products']['_id_']['prepareUnique'] = True
                elif change == 'extra_index': db.indexes['outbox']['foreign'] = {'key': [('foreign_id', 1)], 'unique': True}
                else: db.metadata.append({'name': 'foreign_collection', 'type': 'collection'})
                self.assertIsNotNone(await ADAPTER.check_metadata(db))
                self.assertEqual(db.writes, [])
                self.assertEqual(db.document_reads, 0)


class AdditionalWriteOriginTests(unittest.TestCase):
    """SHOP_ADDITIONAL_WRITE_ORIGINS: the shop on its own domain next to the agency domain. Default: none."""
    NAME = 'SHOP_ADDITIONAL_WRITE_ORIGINS'
    SHOP = 'https://own-shop.example.invalid'

    def app(self, env, calls):
        router = APIRouter()
        async def endpoint():
            calls.append('cart')
            return {'synthetic': True}
        router.add_api_route('/api/shop/cart', endpoint, methods=['GET', 'POST'])
        return ADAPTER.create_app(env, loader=lambda binding: ([router], Database()))

    def test_default_without_variable_is_exactly_the_public_origin(self):
        self.assertEqual(ADAPTER.ADDITIONAL_WRITE_ORIGINS_ENV, self.NAME)
        self.assertNotIn(self.NAME, ENV)
        for env in (ENV, {**ENV, self.NAME: ''}, {**ENV, self.NAME: ' , ,'}):
            binding = ADAPTER.resolve_binding(env)
            self.assertEqual(binding.write_origins, frozenset({ENV['PREVIEW_PUBLIC_ORIGIN']}))
            self.assertEqual(binding.origin, ENV['PREVIEW_PUBLIC_ORIGIN'])
        calls = []
        with TestClient(self.app(ENV, calls)) as client:
            self.assertEqual(client.post('/api/shop/cart', headers={'Origin': ENV['PREVIEW_PUBLIC_ORIGIN']}).status_code, 200)
            self.assertEqual(client.post('/api/shop/cart', headers={'Origin': self.SHOP}).status_code, 403)
        self.assertEqual(calls, ['cart'])

    def test_listed_origin_may_write_and_everything_else_stays_rejected(self):
        env = {**ENV, self.NAME: ' ' + self.SHOP + '/ , https://second.example.invalid'}
        binding = ADAPTER.resolve_binding(env)
        self.assertEqual(binding.write_origins, frozenset({ENV['PREVIEW_PUBLIC_ORIGIN'], self.SHOP, 'https://second.example.invalid'}))
        # Links, payment return, webhook and mail keep the one public origin.
        self.assertEqual(binding.origin, ENV['PREVIEW_PUBLIC_ORIGIN'])
        calls = []
        with TestClient(self.app(env, calls)) as client:
            for origin in (ENV['PREVIEW_PUBLIC_ORIGIN'], self.SHOP, self.SHOP + '/', 'https://second.example.invalid'):
                self.assertEqual(client.post('/api/shop/cart', headers={'Origin': origin}).status_code, 200, origin)
            for origin in ('https://foreign.invalid', 'http://own-shop.example.invalid', 'https://www.own-shop.example.invalid',
                           'https://own-shop.example.invalid.evil.invalid', 'https://own-shop.example.invalid:8443', 'null'):
                response = client.post('/api/shop/cart', headers={'Origin': origin})
                self.assertEqual(response.status_code, 403, origin)
                self.assertEqual(response.json(), {'detail': {'error': 'origin_rejected'}})
        self.assertEqual(len(calls), 4)

    def test_malformed_entry_fails_closed_with_a_fixed_code_and_no_value(self):
        for raw in ('http://own-shop.example.invalid', 'own-shop.example.invalid', 'https://user:secret@own-shop.example.invalid',
                    'https://own-shop.example.invalid/pfad', 'https://own-shop.example.invalid:8443', '*', 'https://*.example.invalid/x',
                    self.SHOP + ',http://second.example.invalid', 7):
            with self.subTest(raw=raw):
                env = {**ENV, self.NAME: raw}
                with self.assertRaises(ADAPTER.BindingError) as caught:
                    ADAPTER.resolve_binding(env)
                self.assertEqual(str(caught.exception), 'additional_origin_unbound')
                calls = []
                with TestClient(self.app(env, calls)) as client:
                    response = client.get('/api/shop/cart')
                    self.assertEqual(response.status_code, 503)
                    self.assertEqual(response.json()['detail']['reason'], 'additional_origin_unbound')
                    self.assertNotIn('example.invalid', response.text)
                self.assertEqual(calls, [])


class DispatchTests(unittest.TestCase):
    def fake_app(self, db):
        self.calls, self.loaded = [], []
        router = APIRouter()
        for path in ('/api/shop/cart', '/api/shop/orders/id', '/api/auth/login', '/api/shop/products'):
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
            for path in ('/api/shop/cart', '/api/shop/orders/id', '/api/auth/login', '/api/shop/products'):
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

    def test_payment_mode_never_defaults_to_live_and_catalog_remains_read_only(self):
        for mode in (None, "", "unknown"):
            env = dict(ENV)
            if mode is None: env.pop('REVOLUT_MODE')
            else: env['REVOLUT_MODE'] = mode
            loaded = []
            router = APIRouter()
            @router.get('/api/shop/products')
            async def products(): return {'synthetic': True}
            def loader(binding):
                loaded.append(True)
                return [router], Database()
            with TestClient(ADAPTER.create_app(env, loader=loader)) as client:
                for method, path in [('post', '/api/shop/orders'), ('get', '/api/shop/orders/id'), ('post', '/api/auth/login')]:
                    self.assertEqual(getattr(client, method)(path).status_code, 503)
                self.assertEqual(loaded, [])
                self.assertEqual(client.get('/api/shop/products').status_code, 200)
                self.assertFalse(client.get('/api/health').json()['payment_mode_configured'])

    def test_auth_me_reads_real_session_without_payment_mode_and_keeps_auth_checks(self):
        class MatchCollection(Collection):
            async def find_one(self, query, projection=None):
                self.database.document_reads += 1
                value = self.database.documents.get(self.name)
                return copy.deepcopy(value) if value and all(value.get(k)==v for k,v in query.items()) else None
        class AuthDatabase(Database):
            def __getitem__(self, name): return MatchCollection(self, name)
        db = AuthDatabase()
        class MotorClient:
            def __getitem__(self, name): return db
        env = {k:v for k,v in ENV.items() if k!='REVOLUT_MODE'}
        existing = set(sys.modules)
        try:
            with patch.dict(os.environ, env, clear=True), patch('motor.motor_asyncio.AsyncIOMotorClient', return_value=MotorClient()), patch('httpx.AsyncClient', side_effect=AssertionError('no provider calls')):
                routers, _ = ADAPTER.load_existing(ADAPTER.resolve_binding(env))
                with TestClient(ADAPTER.create_app(env, loader=lambda _: (routers, db))) as client:
                    self.assertEqual(client.get('/api/auth/me').status_code,401)
                    token = 'synthetic-valid-token'
                    db.documents['sessions'] = {'token_hash':hashlib.sha256(token.encode()).hexdigest(), 'user_id':'synthetic-customer','expires_at':datetime.now(timezone.utc)+timedelta(hours=1)}
                    db.documents['users'] = {'user_id':'synthetic-customer','email':'synthetic@example.invalid','role':'customer'}
                    self.assertEqual(client.get('/api/auth/me',headers={'Authorization':'Bearer foreign-token','X-Tenant-Id':'pretend-admin'}).status_code,401)
                    headers = {'Authorization':'Bearer '+token}
                    result = client.get('/api/auth/me',headers=headers)
                    self.assertEqual(result.status_code,200)
                    self.assertEqual(result.json()['role'],'customer')
                    db.documents['sessions']['expires_at'] = datetime.now(timezone.utc)-timedelta(seconds=1)
                    self.assertEqual(client.get('/api/auth/me',headers=headers).status_code,401)
                    db.documents['sessions']['expires_at'] = datetime.now(timezone.utc)+timedelta(hours=1)
                    db.indexes['sessions']['1']['expireAfterSeconds'] = 10
                    self.assertEqual(client.get('/api/auth/me',headers=headers).status_code,503)
                    self.assertEqual(client.post('/api/auth/login',json={}).status_code,503)
                    self.assertEqual(db.writes,[])
                    self.assertNotIn('REVOLUT_MODE',os.environ)
        finally:
            for name in set(sys.modules)-existing:
                if name=='shop' or name.startswith('shop.') or name=='bigbuy_get': sys.modules.pop(name,None)

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
        with patch.dict(os.environ, {**ENV, 'MONGO_URL': '', 'DB_NAME': ''}, clear=True), patch('motor.motor_asyncio.AsyncIOMotorClient', return_value=Client()), patch('subprocess.Popen', side_effect=AssertionError('no subprocess')):
            # Remove only test-created module references on exit, preserving caller state.
            existing = set(sys.modules)
            try:
                routers, bound = ADAPTER.load_existing(ADAPTER.resolve_binding(ENV))
                self.assertNotIn('shop.main', sys.modules)
                self.assertIs(bound, db)
                self.assertEqual(os.environ['MONGO_URL'], ENV['MONGODB_URI'])
                self.assertEqual(os.environ['DB_NAME'], ADAPTER.PLANNED_NAMESPACE)
                self.assertEqual(os.environ['REVOLUT_MODE'], 'sandbox')
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


class HelperPackagingTests(unittest.TestCase):
    def test_only_byte_identical_canonical_helper_is_staged_without_execution(self):
        spec = importlib.util.spec_from_file_location('prepare_shop_service', ROOT/'apps/shop-api/prepare_vercel.py')
        prepare = importlib.util.module_from_spec(spec); spec.loader.exec_module(prepare)
        with tempfile.TemporaryDirectory() as temp:
            service = Path(temp)/'apps/shop-api'; service.mkdir(parents=True)
            source = service.parent/'agent-gateway/bigbuy_get.py'; source.parent.mkdir()
            canonical = (ROOT/'apps/agent-gateway/bigbuy_get.py').read_bytes()
            source.write_bytes(canonical)
            target = prepare.prepare(service)
            self.assertEqual(target.read_bytes(), canonical)
            self.assertEqual(target.relative_to(service).as_posix(), 'vercel_support/bigbuy_get.py')
            source.write_text('raise RuntimeError("must never execute")')
            with self.assertRaisesRegex(RuntimeError, 'source changed'):
                prepare.prepare(service)
            self.assertEqual(target.read_bytes(), canonical)
            missing = Path(temp)/'other/shop-api'; missing.mkdir(parents=True)
            with self.assertRaisesRegex(RuntimeError, 'source missing'):
                prepare.prepare(missing)


class RoutingTests(unittest.TestCase):
    def test_services_keep_headers_and_only_owned_api_prefixes(self):
        config = json.loads((ROOT/'vercel.json').read_text())
        self.assertEqual(config['services']['frontend']['root'], 'apps/web')
        self.assertEqual(config['services']['shop']['entrypoint'], 'vercel_app:app')
        self.assertNotIn('runtime', config['services']['shop'])
        self.assertEqual(config['services']['shop']['buildCommand'], 'python3 prepare_vercel.py')
        self.assertEqual(config['services']['shop']['functions']['vercel_app.py']['includeFiles'], 'vercel_support/bigbuy_get.py')
        self.assertEqual((ROOT/'apps/shop-api/.python-version').read_text().strip(), '3.12')
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
