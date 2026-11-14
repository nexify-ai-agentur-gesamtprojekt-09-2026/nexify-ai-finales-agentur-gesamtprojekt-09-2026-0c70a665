"""Google sign-in must not merge into an unverified password account (pre-account takeover), inert doubles only."""
import copy
import importlib.util
import sys
from pathlib import Path
from types import ModuleType
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

SHOP = Path(__file__).resolve().parents[1] / 'apps/shop-api/shop'
ORIGIN = 'https://shop.example.invalid'


def matches(row, query):
    for key, want in query.items():
        have = row.get(key)
        if isinstance(want, dict):
            if '$gte' in want and not (have is not None and have >= want['$gte']):
                return False
            if '$gt' in want and not (have is not None and have > want['$gt']):
                return False
        elif have != want:
            return False
    return True


class Collection:
    def __init__(self):
        self.rows = []

    async def find_one(self, query, projection=None):
        for row in self.rows:
            if matches(row, query):
                out = dict(row)
                for key, keep in (projection or {}).items():
                    if keep == 0:
                        out.pop(key, None)
                return out
        return None

    async def find_one_and_update(self, query, update):
        for row in self.rows:
            if matches(row, query):
                before = dict(row)
                row.update(update.get('$set', {}))
                return before
        return None

    async def insert_one(self, doc):
        self.rows.append(dict(doc))

    async def update_one(self, query, update, upsert=False):
        for row in self.rows:
            if matches(row, query):
                row.update(update.get('$set', {}))
                return

    async def update_many(self, query, update):
        for row in self.rows:
            if matches(row, query):
                row.update(update.get('$set', {}))

    async def delete_many(self, query):
        self.rows = [row for row in self.rows if not matches(row, query)]

    delete_one = delete_many

    async def count_documents(self, query):
        return sum(matches(row, query) for row in self.rows)


class Database:
    def __init__(self):
        self.collections = {}

    def __getattr__(self, name):
        return self.collections.setdefault(name, Collection())


class Reply:
    def __init__(self, status, body):
        self.status_code, self.body = status, body

    def json(self):
        return self.body


class AccountLinkingTests(unittest.TestCase):
    def setUp(self):
        name = '_account_linking_subject'
        package = ModuleType(name); package.__path__ = [str(SHOP)]
        modules = {name: package}
        for suffix in ('config', 'db', 'mail_templates', 'mailer'):
            modules[name + '.' + suffix] = ModuleType(name + '.' + suffix)
        self.db = Database()
        modules[name + '.db'].db = self.db
        modules[name + '.db'].now_iso = lambda: 'fixture-time'
        modules[name + '.config'].PUBLIC_ORIGIN = ORIGIN
        self.reset_links, self.mails = [], []
        templates = modules[name + '.mail_templates']
        templates.welcome = lambda user: ('welcome', '<p>welcome</p>', 'welcome')
        templates.password_reset = lambda link: (self.reset_links.append(link), ('reset', '<p>reset</p>', 'reset'))[1]

        async def enqueue(key, to, subject, html, text):
            self.mails.append((key, to))
            return {'status': 'queued'}
        modules[name + '.mailer'].enqueue = enqueue
        spec = importlib.util.spec_from_file_location(name + '.accounts_api', SHOP / 'accounts_api.py')
        self.accounts = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, modules):
            sys.modules[spec.name] = self.accounts
            spec.loader.exec_module(self.accounts)
        self.profiles, self.broker_calls = {}, []
        test = self

        class Broker:
            def __init__(self, **kwargs): pass
            async def __aenter__(self): return self
            async def __aexit__(self, *exc): return False
            async def get(self, url, headers=None):
                test.broker_calls.append(url)
                profile = test.profiles.get((headers or {}).get('X-Session-ID'))
                return Reply(200, profile) if profile else Reply(404, {})
        patcher = patch.object(self.accounts.httpx, 'AsyncClient', Broker)
        patcher.start(); self.addCleanup(patcher.stop)
        self.app = FastAPI(); self.app.include_router(self.accounts.router)

    def browser(self):
        return TestClient(self.app, base_url=ORIGIN)

    def google(self, email, session='google-session'):
        self.profiles[session] = {'email': email, 'name': 'Inhaberin'}
        client = self.browser()
        return client, client.post('/api/auth/google/session', json={'session_id': session})

    def user(self, email):
        return next(row for row in self.db.users.rows if row['email'] == email)

    def add_user(self, **fields):
        row = {'user_id': 'user_' + fields['email'].split('@')[0], 'role': 'customer', 'created_at': 'fixture-time', **fields}
        self.db.users.rows.append(row)
        return row

    def test_google_does_not_take_over_unverified_password_account(self):
        attacker = self.browser()
        registered = attacker.post('/api/auth/register', json={'email': 'opfer@example.org', 'password': 'angreifer-passwort-1'})
        self.assertEqual(registered.status_code, 201)
        sessions_before = list(self.db.sessions.rows)
        victim, response = self.google('Opfer@Example.org')
        self.assertEqual(response.status_code, 409)
        detail = response.json()['detail']
        self.assertEqual(detail['error'], 'account_exists_unverified')
        self.assertIn('Passwort vergessen', detail['message'])
        self.assertNotIn('tk_session', victim.cookies)
        row = self.user('opfer@example.org')
        self.assertNotIn('google_linked', row)
        self.assertTrue(row['password_hash'])
        self.assertEqual(len(self.db.users.rows), 1)
        self.assertEqual(self.db.sessions.rows, sessions_before)
        self.assertEqual(attacker.get('/api/auth/me').status_code, 200)

    def test_password_reset_verifies_address_and_then_allows_google(self):
        attacker = self.browser()
        user_id = attacker.post('/api/auth/register', json={'email': 'opfer@example.org', 'password': 'angreifer-passwort-1'}).json()['user_id']
        self.assertEqual(self.browser().post('/api/auth/forgot-password', json={'email': 'opfer@example.org'}).status_code, 200)
        token = self.reset_links[-1].split('token=', 1)[1]
        reset = self.browser().post('/api/auth/reset-password', json={'token': token, 'password': 'inhaberin-passwort-1'})
        self.assertEqual(reset.status_code, 200)
        self.assertIs(self.user('opfer@example.org')['email_verified'], True)
        self.assertEqual(attacker.get('/api/auth/me').status_code, 401)
        _, response = self.google('opfer@example.org')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['user_id'], user_id)
        self.assertIs(self.user('opfer@example.org')['google_linked'], True)

    def snapshot(self):
        return copy.deepcopy((self.db.users.rows, self.db.sessions.rows))

    def test_already_linked_unverified_password_account_is_refused_without_writes(self):
        self.add_user(email='alt@example.org', password_hash=self.accounts.hash_password('x' * 12), google_linked=True)
        before = self.snapshot()
        client, response = self.google('alt@example.org')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()['detail']['error'], 'account_exists_unverified')
        self.assertEqual(self.snapshot(), before)
        self.assertNotIn('tk_session', client.cookies)

    def test_only_boolean_true_counts_as_verified(self):
        for index, value in enumerate(('true', 1, 'True', None)):
            with self.subTest(email_verified=value):
                email = f'v{index}@example.org'
                self.add_user(email=email, password_hash=self.accounts.hash_password('x' * 12), email_verified=value)
                before = self.snapshot()
                _, response = self.google(email, session='s-' + email)
                self.assertEqual(response.status_code, 409)
                self.assertEqual(self.snapshot(), before)

    def test_empty_or_none_password_field_still_counts_as_password_account(self):
        for index, value in enumerate(('', None)):
            with self.subTest(password_hash=value):
                email = f'p{index}@example.org'
                self.add_user(email=email, password_hash=value)
                before = self.snapshot()
                client, response = self.google(email, session='s-' + email)
                self.assertEqual(response.status_code, 409)
                self.assertEqual(self.snapshot(), before)
                self.assertNotIn('tk_session', client.cookies)

    def test_role_variants_other_than_customer_are_refused_without_writes(self):
        for index, role in enumerate((None, '', 'Customer', 'ADMIN')):
            with self.subTest(role=role):
                email = f'r{index}@example.org'
                self.add_user(email=email, role=role, email_verified=True)
                before = self.snapshot()
                client, response = self.google(email, session='s-' + email)
                self.assertEqual(response.status_code, 403)
                self.assertEqual(self.snapshot(), before)
                self.assertNotIn('tk_session', client.cookies)
        row = self.add_user(email='ohne@example.org', password_hash=self.accounts.hash_password('x' * 12))
        row.pop('role')
        _, response = self.google('ohne@example.org', session='s-ohne')
        self.assertEqual(response.status_code, 409)

    def test_password_reset_revokes_api_keys_of_the_account(self):
        attacker = self.browser()
        user_id = attacker.post('/api/auth/register', json={'email': 'opfer@example.org', 'password': 'angreifer-passwort-1'}).json()['user_id']
        self.db.api_keys.rows.extend([
            {'key_id': 'k1', 'tenant_id': user_id, 'revoked_at': None},
            {'key_id': 'k2', 'tenant_id': user_id, 'revoked_at': 'earlier'},
            {'key_id': 'k3', 'tenant_id': 'user_other', 'revoked_at': None},
        ])
        self.browser().post('/api/auth/forgot-password', json={'email': 'opfer@example.org'})
        token = self.reset_links[-1].split('token=', 1)[1]
        self.assertEqual(self.browser().post('/api/auth/reset-password', json={'token': token, 'password': 'inhaberin-passwort-1'}).status_code, 200)
        keys = {row['key_id']: row['revoked_at'] for row in self.db.api_keys.rows}
        self.assertEqual(keys, {'k1': 'fixture-time', 'k2': 'earlier', 'k3': None})

    def test_new_google_account_is_verified(self):
        client, response = self.google('neu@example.org')
        self.assertEqual(response.status_code, 200)
        row = self.user('neu@example.org')
        self.assertIs(row['email_verified'], True)
        self.assertIs(row['google_linked'], True)
        self.assertNotIn('password_hash', row)
        self.assertEqual(client.get('/api/auth/me').json()['role'], 'customer')

    def test_privileged_accounts_are_refused_via_google(self):
        cases = (
            {'email': 'chef@example.org', 'role': 'admin', 'password_hash': self.accounts.hash_password('admin-passwort-1')},
            {'email': 'chef2@example.org', 'role': 'admin', 'password_hash': self.accounts.hash_password('admin-passwort-1'),
             'email_verified': True, 'google_linked': True},
            {'email': 'chef3@example.org', 'role': 'admin'},
            {'email': 'kuenftig@example.org', 'role': 'operator', 'email_verified': True, 'google_linked': True},
        )
        for fields in cases:
            with self.subTest(email=fields['email']):
                self.add_user(**dict(fields))
                client, response = self.google(fields['email'], session='s-' + fields['email'])
                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.json()['detail']['error'], 'google_login_not_allowed')
                self.assertNotIn('tk_session', client.cookies)
                self.assertEqual(self.user(fields['email']).get('google_linked'), fields.get('google_linked'))
        self.assertEqual(self.db.sessions.rows, [])

    def test_linked_and_verified_accounts_keep_working(self):
        self.add_user(email='kunde@example.org', password_hash=self.accounts.hash_password('kunden-passwort-1'),
                      email_verified=True, google_linked=True)
        self.add_user(email='alt@example.org', google_linked=True)
        for email in ('kunde@example.org', 'alt@example.org'):
            with self.subTest(email=email):
                client, response = self.google(email, session='s-' + email)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()['user_id'], self.user(email)['user_id'])
                self.assertEqual(client.get('/api/auth/me').status_code, 200)
        self.assertTrue(self.user('kunde@example.org')['password_hash'])
        self.assertEqual(len(self.db.users.rows), 2)


if __name__ == '__main__':
    unittest.main()
