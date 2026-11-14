"""Every branch of the Vercel entry that can answer before a route: project binding, missing
configuration, database metadata, payment mode, feature schema, diagnostics. Fakes only."""
import ast
import copy
import logging
import sys
import unittest
from pathlib import Path

from fastapi import APIRouter
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'apps/shop-api'))
sys.path.insert(0, str(ROOT / 'apps/shop-api/tests'))
import namespace_operator as OP
from test_namespace_operator import EmptyDatabase
from test_vercel_adapter import ADAPTER, ENV, Database

OTHER_PROJECT = 'prj_SyntheticOtherProject0001'
TOKEN = 'synthetic-diagnostics-token-0123456789abcdef'
SECRET = 'SENTINEL-NEVER-PRINT'


def add_optional(db, name='partner_applications'):
    db.metadata.append({'name': name, 'type': 'collection', 'options': {'validator': {'$jsonSchema': {'bsonType': 'object', 'description': ADAPTER.SCHEMA_MARKER}}}})
    db.indexes[name] = {'_id_': {'key': [('_id', 1)]}}
    for n, (keys, unique, ttl) in enumerate(ADAPTER.OPTIONAL_INDEXES[name]):
        db.indexes[name][str(n)] = {'key': [(key, 1) for key in keys], **({'unique': True} if unique else {})}
    return db


def app_with(env, db, paths, calls=None):
    router = APIRouter()
    for path in paths:
        async def endpoint(path=path):
            if calls is not None:
                calls.append(path)
            return {'synthetic': True}
        router.add_api_route(path, endpoint, methods=['GET', 'POST'])
    return ADAPTER.create_app(env, loader=lambda binding: ([router], db))


class ProjectBinding(unittest.TestCase):
    def test_default_allows_only_the_original_project(self):
        self.assertEqual(ADAPTER.allowed_project_ids({}), frozenset({ADAPTER.NAMESPACE_PROJECT_ID}))
        ADAPTER.resolve_binding(ENV)
        for env in ({**ENV, 'VERCEL_PROJECT_ID': OTHER_PROJECT}, {k: v for k, v in ENV.items() if k != 'VERCEL_PROJECT_ID'}, {**ENV, 'VERCEL_PROJECT_ID': ''}):
            with self.assertRaisesRegex(ADAPTER.BindingError, 'project_binding_unverified'):
                ADAPTER.resolve_binding(env)

    def test_explicit_allowlist_admits_named_projects_and_replaces_the_default(self):
        env = {**ENV, 'VERCEL_PROJECT_ID': OTHER_PROJECT, ADAPTER.ALLOWLIST_VARIABLE: OTHER_PROJECT}
        self.assertEqual(ADAPTER.resolve_binding(env).namespace, ADAPTER.PLANNED_NAMESPACE)
        both = {**env, ADAPTER.ALLOWLIST_VARIABLE: ' %s , %s ' % (ADAPTER.NAMESPACE_PROJECT_ID, OTHER_PROJECT)}
        ADAPTER.resolve_binding(both)
        ADAPTER.resolve_binding({**both, 'VERCEL_PROJECT_ID': ADAPTER.NAMESPACE_PROJECT_ID})
        # The list is the whole truth: once set, the original project is only allowed if it is named.
        with self.assertRaisesRegex(ADAPTER.BindingError, 'project_binding_unverified'):
            ADAPTER.resolve_binding({**env, 'VERCEL_PROJECT_ID': ADAPTER.NAMESPACE_PROJECT_ID})
        with self.assertRaisesRegex(ADAPTER.BindingError, 'project_binding_unverified'):
            ADAPTER.resolve_binding({**env, 'VERCEL_PROJECT_ID': 'prj_AnotherSyntheticProject02'})

    def test_malformed_allowlist_closes_instead_of_guessing(self):
        many = ','.join('prj_Synthetic%08d' % n for n in range(ADAPTER.MAX_ALLOWED_PROJECTS + 1))
        for raw in ('*', 'prj_*', OTHER_PROJECT + ',', ',' + OTHER_PROJECT, 'true', 'nexify-project-name', OTHER_PROJECT + ' ' + OTHER_PROJECT, many, 7):
            with self.subTest(raw=raw):
                with self.assertRaisesRegex(ADAPTER.BindingError, 'project_allowlist_invalid'):
                    ADAPTER.resolve_binding({**ENV, 'VERCEL_PROJECT_ID': OTHER_PROJECT, ADAPTER.ALLOWLIST_VARIABLE: raw})

    def test_schema_marker_is_bound_to_the_namespace_not_to_the_running_project(self):
        self.assertIn(ADAPTER.NAMESPACE_PROJECT_ID, ADAPTER.SCHEMA_MARKER)
        self.assertNotIn(OTHER_PROJECT, ADAPTER.SCHEMA_MARKER)
        env = {**ENV, 'VERCEL_PROJECT_ID': OTHER_PROJECT, ADAPTER.ALLOWLIST_VARIABLE: OTHER_PROJECT}
        with TestClient(app_with(env, Database(), ['/api/shop/products'])) as client:
            self.assertEqual(client.get('/api/health').status_code, 200)
            self.assertEqual(client.get('/api/shop/products').status_code, 200)

    def test_operator_uses_the_same_allowlist(self):
        env = {**ENV, 'VERCEL_PROJECT_ID': OTHER_PROJECT}
        with self.assertRaisesRegex(OP.OperatorError, 'project_binding_unverified'):
            OP.connection_uri(env)
        self.assertEqual(OP.connection_uri({**env, ADAPTER.ALLOWLIST_VARIABLE: OTHER_PROJECT}), ENV['MONGODB_URI'])
        with self.assertRaisesRegex(OP.OperatorError, 'project_allowlist_invalid'):
            OP.connection_uri({**env, ADAPTER.ALLOWLIST_VARIABLE: '*'})


class EveryBlockingReason(unittest.TestCase):
    """One case per code of resolve_binding and of the database gate; each answers 503 with its own code."""
    CASES = {
        'project_binding_unverified': {'VERCEL_PROJECT_ID': OTHER_PROJECT},
        'project_allowlist_invalid': {ADAPTER.ALLOWLIST_VARIABLE: 'not-a-project-id'},
        'database_configuration_conflict': {'MONGO_URL': 'mongodb://other.invalid/' + ADAPTER.PLANNED_NAMESPACE},
        'database_binding_missing_or_unsuitable': {'MONGODB_URI': ''},
        'database_namespace_conflict': {'DB_NAME': 'other_name'},
        'database_namespace_unapproved': {'DB_NAME': '', 'MONGODB_URI': 'mongodb://isolated.invalid/random_database'},
        'public_origin_unbound': {'PREVIEW_PUBLIC_ORIGIN': 'http://shop.example.invalid'},
        'tax_configuration_unbound': {'SHOP_VAT_PERCENT': ''},
    }

    def test_each_configuration_reason_is_reported_with_its_code_and_names(self):
        self.assertEqual(set(self.CASES) | {'payment_mode_unbound'}, set(ADAPTER.REASON_VARIABLES))
        for reason, change in self.CASES.items():
            with self.subTest(reason=reason):
                env, loaded = {**ENV, **change}, []
                with TestClient(ADAPTER.create_app(env, loader=lambda _: loaded.append(1))) as client:
                    for path in ('/api/health', '/api/shop/products', '/api/workshops/search', '/api/auth/login'):
                        result = client.get(path)
                        self.assertEqual((result.status_code, result.json()['detail']['reason']), (503, reason))
                        self.assertEqual(result.headers['cache-control'], 'no-store')
                self.assertEqual(loaded, [])
                report = ADAPTER.diagnose(env)
                self.assertFalse(report['core_configured'])
                self.assertEqual(report['blocking'][0], {'reason': reason, 'variables': list(ADAPTER.REASON_VARIABLES[reason])})

    def test_diagnose_lists_all_unmet_prerequisites_at_once_and_only_names(self):
        report = ADAPTER.diagnose({'MONGODB_URI': 'mongodb://user:%s@host.invalid/x' % SECRET, 'RESEND_API_KEY': SECRET})
        self.assertEqual([item['reason'] for item in report['blocking']],
                         ['project_binding_unverified', 'database_namespace_unapproved', 'public_origin_unbound', 'tax_configuration_unbound'])
        self.assertEqual({item['capability'] for item in report['degraded']}, {'payment', 'mail', 'internal_notification'})
        self.assertEqual((report['variables']['MONGODB_URI'], report['variables']['RESEND_API_KEY'], report['variables']['DB_NAME']), ('set', 'set', 'missing'))
        self.assertNotIn(SECRET, repr(report))
        self.assertEqual(ADAPTER.diagnose(ENV)['blocking'], [])
        full = ADAPTER.diagnose({**ENV, 'REVOLUT_MODE': 'live'})
        self.assertEqual([i['variables'] for i in full['degraded'] if i['capability'] == 'payment'], [['REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION']])

    def test_database_gate_reasons(self):
        def broken_loader(binding):
            raise RuntimeError('mongodb://' + SECRET)
        class Renamed(Database):
            def __init__(self):
                super().__init__()
                self.name = 'other_namespace'
        missing, index = Database(), Database()
        missing.metadata.pop()
        index.indexes['orders']['0']['unique'] = False
        cases = [('database_metadata_unavailable', broken_loader), ('database_namespace_conflict', lambda b: ([APIRouter()], Renamed())),
                 ('namespace_schema_unbound', lambda b: ([APIRouter()], missing)), ('required_index_unverified', lambda b: ([APIRouter()], index))]
        for reason, loader in cases:
            with self.subTest(reason=reason):
                with TestClient(ADAPTER.create_app(ENV, loader=loader)) as client:
                    result = client.get('/api/shop/products')
                    self.assertEqual((result.status_code, result.json()['detail']['reason']), (503, reason))
                    self.assertNotIn(SECRET, result.text)

    def test_log_line_names_variables_and_never_contains_a_value(self):
        env = {**ENV, 'VERCEL_PROJECT_ID': OTHER_PROJECT, 'MONGODB_URI': 'mongodb://user:%s@isolated.invalid/%s' % (SECRET, ADAPTER.PLANNED_NAMESPACE),
               'REVOLUT_MODE': '', 'RESEND_API_KEY': SECRET}
        previous = logging.root.manager.disable
        logging.disable(logging.NOTSET)  # the operator CLI test silences logging process-wide
        self.addCleanup(logging.disable, previous)
        with self.assertLogs('shop.runtime', level=logging.WARNING) as captured:
            with TestClient(ADAPTER.create_app(env, loader=lambda _: None)) as client:
                client.get('/api/health')
                client.get('/api/health')
        text = '\n'.join(captured.output)
        self.assertIn('shop_runtime_unavailable reason=project_binding_unverified variables=%s,VERCEL_PROJECT_ID' % ADAPTER.ALLOWLIST_VARIABLE, text)
        self.assertIn('shop_runtime_degraded capability=payment reason=payment_mode_unbound variables=REVOLUT_MODE', text)
        self.assertEqual(text.count('shop_runtime_unavailable'), 1)  # once per reason, not per request
        for value in (SECRET, OTHER_PROJECT, 'isolated.invalid', 'mongodb://'):
            self.assertNotIn(value, text)


class PartialOperation(unittest.TestCase):
    FREE = ['/api/shop/status', '/api/shop/categories', '/api/shop/products', '/api/shop/products/bb-1', '/api/shop/cart', '/api/shop/cart/items',
            '/api/workshops/search', '/api/workshops/TKW-1/requests', '/api/requests', '/api/auth/login', '/api/auth/register', '/api/auth/me']
    PAID = ['/api/shop/checkout/quote', '/api/shop/orders', '/api/shop/orders/x', '/api/shop/webhooks/revolut', '/api/admin/settings', '/api/admin/orders', '/api/admin/outbox']

    def test_missing_payment_mode_closes_only_payment_dependent_paths(self):
        env, calls = {k: v for k, v in ENV.items() if k != 'REVOLUT_MODE'}, []
        with TestClient(app_with(env, Database(), self.FREE + self.PAID, calls)) as client:
            for path in self.FREE:
                for method in ('get', 'post'):
                    self.assertEqual(getattr(client, method)(path).status_code, 200, path)
            for path in self.PAID:
                for method in ('get', 'post'):
                    result = getattr(client, method)(path)
                    self.assertEqual((result.status_code, result.json()['detail']['reason']), (503, 'payment_mode_unbound'), path)
            self.assertFalse(client.get('/api/health').json()['payment_mode_configured'])
        self.assertEqual(set(calls), set(self.FREE))

    def test_missing_mail_configuration_blocks_nothing(self):
        with TestClient(app_with(ENV, Database(), self.FREE + self.PAID)) as client:
            for path in self.FREE + self.PAID:
                self.assertEqual(client.get(path).status_code, 200, path)

    def test_payment_free_paths_still_need_the_database_and_the_origin_check(self):
        env = {k: v for k, v in ENV.items() if k != 'REVOLUT_MODE'}
        db = Database()
        with TestClient(app_with(env, db, self.FREE)) as client:
            self.assertEqual(client.post('/api/requests', headers={'Origin': 'https://foreign.invalid'}).status_code, 403)
            self.assertEqual(client.post('/api/requests', headers={'Origin': ENV['PREVIEW_PUBLIC_ORIGIN']}).status_code, 200)
            db.metadata = []
            self.assertEqual(client.get('/api/workshops/search').status_code, 503)

    def test_no_payment_free_route_can_reach_payment_code(self):
        """Static proof for the classification: a router module that touches payment has no payment-free route."""
        shop = ROOT / 'apps/shop-api/shop'
        touching, checked = ('revolut', 'fulfillment'), 0
        for name in ADAPTER.MODULES:
            tree = ast.parse((shop / (name + '.py')).read_text())
            imported = {alias.name for node in ast.walk(tree) if isinstance(node, ast.ImportFrom) for alias in node.names}
            uses_payment = bool(imported & set(touching)) or 'revolut_mode' in (shop / (name + '.py')).read_text()
            prefix = next((kw.value.value for node in ast.walk(tree) if isinstance(node, ast.Call) and getattr(node.func, 'id', '') == 'APIRouter'
                           for kw in node.keywords if kw.arg == 'prefix'), '')
            for node in tree.body:
                if not isinstance(node, ast.AsyncFunctionDef):
                    continue
                for decorator in node.decorator_list:
                    if isinstance(decorator, ast.Call) and getattr(decorator.func, 'value', None) is not None and getattr(decorator.func.value, 'id', '') == 'router':
                        path = (prefix + decorator.args[0].value).replace('{', 'x').replace('}', '')
                        checked += 1
                        self.assertTrue(ADAPTER.owns(path), path)
                        if uses_payment:
                            self.assertFalse(ADAPTER.payment_independent(path), path)
        self.assertGreater(checked, 35)


class OptionalFeature(unittest.TestCase):
    PATHS = ['/api/partner-applications', '/api/admin/partner-applications', '/api/shop/products']
    ON = {**ENV, 'TEILEKLAR_PARTNER_APPLICATIONS': 'on'}

    def test_absent_optional_collection_closes_only_its_feature(self):
        with TestClient(app_with(self.ON, Database(), self.PATHS)) as client:
            for path in self.PATHS[:2]:
                result = client.get(path)
                self.assertEqual((result.status_code, result.json()['detail']['reason']), (503, 'feature_schema_unbound'))
            self.assertEqual(client.get('/api/shop/products').status_code, 200)
            self.assertEqual(client.get('/api/health').status_code, 200)

    def test_present_and_matching_optional_collection_opens_the_feature(self):
        with TestClient(app_with(self.ON, add_optional(Database()), self.PATHS)) as client:
            for path in self.PATHS:
                self.assertEqual(client.get(path).status_code, 200)

    def test_switch_off_leaves_the_answer_to_the_router_and_needs_no_collection(self):
        for value in (None, '', 'ON', 'true', '1'):
            env = dict(ENV) if value is None else {**ENV, 'TEILEKLAR_PARTNER_APPLICATIONS': value}
            with TestClient(app_with(env, Database(), self.PATHS)) as client:
                self.assertEqual(client.get('/api/partner-applications').status_code, 200)  # the real router answers 404 itself

    def test_malformed_optional_collection_is_not_tolerated(self):
        for change in ('marker', 'index', 'extra_index', 'view'):
            with self.subTest(change=change):
                db = add_optional(Database())
                if change == 'marker': db.metadata[-1]['options']['validator']['$jsonSchema']['description'] = 'foreign'
                elif change == 'index': db.indexes['partner_applications']['1']['unique'] = False
                elif change == 'extra_index': db.indexes['partner_applications']['x'] = {'key': [('email', 1)]}
                else: db.metadata[-1]['type'] = 'view'
                with TestClient(app_with(self.ON, db, self.PATHS)) as client:
                    self.assertEqual(client.get('/api/shop/products').status_code, 503)
        unknown = Database()
        unknown.metadata.append({'name': 'email_verifications', 'type': 'collection'})
        with TestClient(app_with(ENV, unknown, self.PATHS)) as client:
            self.assertEqual(client.get('/api/shop/products').json()['detail']['reason'], 'namespace_schema_unbound')


class Diagnostics(unittest.TestCase):
    HEADER = {ADAPTER.DIAGNOSTICS_HEADER: TOKEN}

    def test_route_does_not_exist_without_a_configured_and_matching_token(self):
        cases = [(ENV, self.HEADER), ({**ENV, ADAPTER.DIAGNOSTICS_TOKEN_VARIABLE: 'short'}, {ADAPTER.DIAGNOSTICS_HEADER: 'short'}),
                 ({**ENV, ADAPTER.DIAGNOSTICS_TOKEN_VARIABLE: TOKEN}, {}), ({**ENV, ADAPTER.DIAGNOSTICS_TOKEN_VARIABLE: TOKEN}, {ADAPTER.DIAGNOSTICS_HEADER: TOKEN + 'x'})]
        for env, headers in cases:
            with TestClient(app_with(env, Database(), [])) as client:
                result = client.get(ADAPTER.DIAGNOSTICS_PATH, headers=headers)
                self.assertEqual((result.status_code, result.json()), (404, {'error': 'route_not_owned'}))
        with TestClient(app_with({**ENV, ADAPTER.DIAGNOSTICS_TOKEN_VARIABLE: TOKEN}, Database(), [])) as client:
            self.assertEqual(client.post(ADAPTER.DIAGNOSTICS_PATH, headers=self.HEADER).status_code, 404)
            self.assertNotIn(ADAPTER.DIAGNOSTICS_PATH, client.get('/api/openapi.json').text)

    def test_report_names_what_is_missing_even_when_everything_else_is_closed(self):
        env = {ADAPTER.DIAGNOSTICS_TOKEN_VARIABLE: TOKEN, 'MONGODB_URI': 'mongodb://user:%s@host.invalid/x' % SECRET}
        with TestClient(ADAPTER.create_app(env, loader=lambda _: None)) as client:
            self.assertEqual(client.get('/api/health').status_code, 503)
            result = client.get(ADAPTER.DIAGNOSTICS_PATH, headers=self.HEADER)
            self.assertEqual(result.status_code, 200)
            body = result.json()
            self.assertEqual(body['database'], 'project_binding_unverified')
            self.assertEqual(body['blocking'][0]['variables'], ['VERCEL_PROJECT_ID', ADAPTER.ALLOWLIST_VARIABLE])
            self.assertEqual(body['payment_dependent_paths'], 'closed')
            self.assertEqual(result.headers['cache-control'], 'no-store')
            for value in (SECRET, TOKEN, 'host.invalid'):
                self.assertNotIn(value, result.text)

    def test_report_when_ready_shows_feature_state(self):
        env = {**ENV, ADAPTER.DIAGNOSTICS_TOKEN_VARIABLE: TOKEN, 'TEILEKLAR_PARTNER_APPLICATIONS': 'on'}
        with TestClient(app_with(env, Database(), [])) as client:
            body = client.get(ADAPTER.DIAGNOSTICS_PATH, headers=self.HEADER).json()
            self.assertEqual((body['database'], body['core_configured'], body['features']), ('ready', True, {'TEILEKLAR_PARTNER_APPLICATIONS': 'feature_schema_unbound'}))
        with TestClient(app_with(env, add_optional(Database()), [])) as client:
            self.assertEqual(client.get(ADAPTER.DIAGNOSTICS_PATH, headers=self.HEADER).json()['features'], {'TEILEKLAR_PARTNER_APPLICATIONS': 'ready'})
        with TestClient(app_with({**ENV, ADAPTER.DIAGNOSTICS_TOKEN_VARIABLE: TOKEN}, Database(), [])) as client:
            self.assertEqual(client.get(ADAPTER.DIAGNOSTICS_PATH, headers=self.HEADER).json()['features'], {'TEILEKLAR_PARTNER_APPLICATIONS': 'off'})


class OperatorExtend(unittest.IsolatedAsyncioTestCase):
    async def initialised(self):
        db = EmptyDatabase()
        self.assertEqual((await OP.initialize(db, confirmed_plan_sha256=OP.plan_digest()))['state'], 'new_schema_initialized')
        db.ddl.clear()
        return db

    async def test_extend_adds_exactly_one_optional_collection_after_confirmation(self):
        db = await self.initialised()
        with self.assertRaisesRegex(OP.OperatorError, 'plan_confirmation_missing_or_stale'):
            await OP.extend(db, 'partner_applications', confirmed_plan_sha256='0' * 64)
        with self.assertRaisesRegex(OP.OperatorError, 'unknown_optional_collection'):
            OP.extension_plan('users')
        self.assertEqual(db.ddl, [])
        digest = OP.extension_digest('partner_applications')
        result = await OP.extend(db, 'partner_applications', confirmed_plan_sha256=digest)
        self.assertEqual((result['state'], result['created_indexes'], result['seeded_documents']), ('optional_collection_added', 2, 0))
        self.assertEqual(db.ddl, [('collection', 'partner_applications'), ('index', 'partner_applications'), ('index', 'partner_applications')])
        self.assertEqual(await ADAPTER.inspect_metadata(db), (None, ('partner_applications',)))
        self.assertEqual((await OP.preflight(db))['optional_collections_present'], ['partner_applications'])
        again = await OP.extend(db, 'partner_applications', confirmed_plan_sha256=digest)
        self.assertEqual((again['state'], again['metadata_writes']), ('already_present_and_matching', False))
        self.assertEqual(db.document_reads, 0)

    async def test_extend_refuses_an_empty_or_foreign_namespace(self):
        digest = OP.extension_digest('partner_applications')
        empty = EmptyDatabase()
        with self.assertRaisesRegex(OP.OperatorError, 'namespace_not_ready_no_changes_allowed'):
            await OP.extend(empty, 'partner_applications', confirmed_plan_sha256=digest)
        self.assertEqual(empty.ddl, [])
        foreign = await self.initialised()
        foreign.metadata.append({'name': 'foreign', 'type': 'collection', 'options': {}})
        with self.assertRaisesRegex(OP.OperatorError, 'namespace_not_ready_no_changes_allowed'):
            await OP.extend(foreign, 'partner_applications', confirmed_plan_sha256=digest)
        self.assertEqual(foreign.ddl, [])

    def test_arguments(self):
        args = OP.arguments(['extend', '--collection', 'partner_applications', '--confirm-plan-sha256', 'x'])
        self.assertEqual((args.operation, args.collection), ('extend', 'partner_applications'))
        with self.assertRaises(OP.OperatorError):
            OP.arguments(['extend', '--collection', 'users'])


if __name__ == '__main__':
    unittest.main()
