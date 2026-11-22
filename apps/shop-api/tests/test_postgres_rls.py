"""Row-level security and grants of the shop schema: everything is closed, one service role is opened.

Runs against a disposable local PostgreSQL only (see pg_fixture); skipped without confirmation.
"""
import importlib
import os
import sys
import unittest
from uuid import uuid4

sys.path.insert(0, os.path.dirname(__file__))
import pg_fixture  # noqa: E402

TABLES = {'products', 'categories', 'imports', 'source_manifests', 'settings', 'price_releases', 'carts', 'users', 'sessions', 'login_failures',
          'password_resets', 'api_keys', 'orders', 'webhook_events', 'revolut_webhooks', 'outbox', 'requests', 'workshops', 'workshop_requests'}
NEVER_DELETED = TABLES - {'sessions', 'login_failures', 'password_resets'}
APPEND_ONLY = {'source_manifests', 'price_releases', 'webhook_events', 'workshop_requests'}
ROW = {'products': "('p', '{\"name\":\"N\"}')", 'orders': "('o', '{\"owner\":\"user:a\",\"idempotency_key\":\"k\",\"total_cents\":100}')",
       'users': "('u', '{\"email\":\"a@example.invalid\",\"user_id\":\"user_a\",\"password_hash\":\"synthetic\"}')",
       'revolut_webhooks': "('sandbox', '{\"signing_secret\":\"synthetic\"}')"}


class ShopRowLevelSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.database = pg_fixture.create_database()
        cls.addClassCleanup(pg_fixture.drop_database, cls.database)
        pg_fixture.run(cls.database, *(f'insert into shop.{table} (id, doc) values {row}' for table, row in ROW.items()),
                       "insert into shop.webhook_events (id, event_key) values ('e', 'k')",
                       "insert into shop.sessions (id, token_hash, user_id, expires_at) values ('s', 'h', 'user_a', now())",
                       'create schema other', 'create table other.t (id int)', 'insert into other.t values (1)')

    def connect(self, user=None):
        import psycopg
        conn = psycopg.connect(pg_fixture.dsn_for(self.database, user), autocommit=True)
        self.addCleanup(conn.close)
        return conn

    def refused(self, conn, statement):
        import psycopg
        with self.assertRaises(psycopg.errors.InsufficientPrivilege, msg=statement):
            conn.execute(statement)

    def test_every_table_has_forced_row_level_security_and_exactly_the_service_policy(self):
        admin = self.connect()
        tables = {row[0]: row[1:] for row in admin.execute(
            "select c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace "
            "where n.nspname = 'shop' and c.relkind = 'r'")}
        self.assertEqual(set(tables), TABLES, 'the test names every table of the schema')
        self.assertEqual({flags for flags in tables.values()}, {(True, True)})
        policies = {(row[0], row[1], tuple(row[2])) for row in admin.execute("select tablename, policyname, roles from pg_policies where schemaname = 'shop'")}
        self.assertEqual(policies, {(table, 'shop_api_all', ('shop_api',)) for table in TABLES})

    def test_the_migration_refuses_an_existing_service_role_that_would_lift_the_boundary(self):
        import psycopg
        migration = (pg_fixture.MIGRATIONS / '0002_shop_rls.sql').read_text(encoding='utf-8')
        for attribute in ('login', 'bypassrls', 'superuser', 'createrole', 'createdb', 'replication'):
            with self.subTest(attribute), psycopg.connect(pg_fixture.dsn_for(self.database)) as conn:
                conn.execute(f'alter role shop_api {attribute}')  # inside the transaction; rolled back below
                with self.assertRaises(psycopg.errors.RaiseException) as caught:
                    conn.execute(migration)
                self.assertIn('refusing', str(caught.exception))
                conn.rollback()
        with psycopg.connect(pg_fixture.dsn_for(self.database)) as conn:
            conn.execute(migration)  # the plain group role passes, as before
            self.assertEqual(conn.execute("select rolcanlogin or rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolreplication from pg_roles where rolname = 'shop_api'").fetchone(), (False,))
            conn.rollback()

    def test_login_without_any_grant_reaches_nothing(self):
        probe = self.connect(pg_fixture.PROBE_LOGIN)
        for table in sorted(TABLES):
            self.refused(probe, f'select * from shop.{table}')
        self.refused(probe, "insert into shop.products (id, doc) values ('x', '{}')")
        self.refused(probe, "select shop.purge_expired(now(), interval '1 minute')")
        self.refused(probe, 'create table shop.mine (id int)')

    def test_browser_roles_reach_nothing(self):
        admin = self.connect()
        for role in ('anon', 'authenticated'):
            admin.execute(f"do $$ begin if not exists (select 1 from pg_roles where rolname = '{role}') then create role {role} nologin; end if; end $$")
            admin.execute(f'set role {role}')
            try:
                for table in ('products', 'orders', 'users', 'revolut_webhooks'):
                    self.refused(admin, f'select * from shop.{table}')
            finally:
                admin.execute('reset role')

    def test_a_table_grant_without_a_policy_sees_no_row_and_writes_none(self):
        admin, role = self.connect(), 'nexify_shop_granted_' + uuid4().hex[:8]
        admin.execute(f'create role {role} nologin')
        self.addCleanup(pg_fixture.run, self.database, f'drop owned by {role}', f'drop role {role}')
        admin.execute(f'grant usage on schema shop to {role}')
        admin.execute(f'grant select, insert, update, delete on all tables in schema shop to {role}')
        admin.execute(f'grant execute on all functions in schema shop to {role}')
        self.assertEqual(admin.execute('select count(*) from shop.orders').fetchone()[0], 1, 'the row exists')
        admin.execute(f'set role {role}')
        try:
            for table in ('products', 'orders', 'users', 'revolut_webhooks', 'sessions', 'webhook_events'):
                self.assertEqual(admin.execute(f'select count(*) from shop.{table}').fetchone()[0], 0, table)
            self.refused(admin, "insert into shop.products (id, doc) values ('x', '{}')")
            self.assertEqual(admin.execute("update shop.orders set doc = '{}' where id = 'o'").rowcount, 0)
            self.assertEqual(admin.execute("delete from shop.orders where id = 'o'").rowcount, 0)
        finally:
            admin.execute('reset role')
        self.assertEqual(admin.execute('select doc ->> \'owner\' from shop.orders').fetchone()[0], 'user:a', 'nothing was changed')

    def test_service_role_reads_and_writes_but_never_deletes_business_records(self):
        service = self.connect(pg_fixture.SERVICE_LOGIN)
        self.assertEqual(service.execute('select count(*) from shop.orders').fetchone()[0], 1)
        service.execute("insert into shop.products (id, doc) values ('p2', '{\"name\":\"M\"}')")
        service.execute("update shop.products set doc = '{\"name\":\"M2\"}' where id = 'p2'")
        for table in sorted(NEVER_DELETED):
            self.refused(service, f'delete from shop.{table}')
            self.refused(service, f'truncate shop.{table}')
        for table in sorted(APPEND_ONLY):
            self.refused(service, f"update shop.{table} set id = id")
        service.execute("delete from shop.sessions where id = 's'")
        self.assertEqual(service.execute('select count(*) from shop.sessions').fetchone()[0], 0, 'expired sessions may be removed')

    def test_service_role_cannot_change_the_schema_or_leave_it(self):
        service = self.connect(pg_fixture.SERVICE_LOGIN)
        self.refused(service, 'create table shop.mine (id int)')
        self.refused(service, 'alter table shop.orders disable row level security')
        self.refused(service, 'drop policy shop_api_all on shop.orders')
        self.refused(service, 'drop table shop.orders')
        self.refused(service, 'select * from other.t')
        self.refused(service, 'create schema mine')

    def test_the_database_rejects_amounts_that_are_not_whole_cents_and_a_second_paid_transition(self):
        import psycopg
        service = self.connect(pg_fixture.SERVICE_LOGIN)
        for doc in ('{"total_cents":19.95}', '{"total_cents":-1}', '{"paid_transitions":2}', '{"shipping_cents":"995x"}', '[]', '{"_id":"x"}'):
            with self.subTest(doc=doc), self.assertRaises((psycopg.errors.DataError, psycopg.errors.CheckViolation)):
                service.execute('insert into shop.orders (id, doc) values (%s, %s::json)', (uuid4().hex, doc))
        with self.assertRaises(psycopg.errors.CheckViolation):
            service.execute("insert into shop.products (id, doc) values ('neg', '{\"purchase_cents\":-5}')")
        self.assertEqual(service.execute('select count(*) from shop.orders').fetchone()[0], 1)


class StoreHidesDriverErrors(unittest.IsolatedAsyncioTestCase):
    async def test_a_login_without_rights_is_reported_as_store_unavailable_without_driver_text(self):
        sys.path.insert(0, os.path.dirname(__file__))
        contract = importlib.import_module('test_store_contract')
        name = pg_fixture.create_database()
        self.addCleanup(pg_fixture.drop_database, name)
        store, _, database = contract.load_pg_store(pg_fixture.dsn_for(name, pg_fixture.PROBE_LOGIN))
        self.addAsyncCleanup(database.close)
        with self.assertRaises(store.StoreUnavailable) as caught:
            await store.catalog.count_published()
        self.assertEqual((str(caught.exception), caught.exception.__cause__, caught.exception.__suppress_context__), ('', None, True))
        unreachable, _, closed = contract.load_pg_store('postgresql://nobody@127.0.0.1:1/none?connect_timeout=1')
        closed._timeout = 2.0
        self.addAsyncCleanup(closed.close)
        with self.assertRaises(unreachable.StoreUnavailable) as caught:
            await unreachable.orders.get('o1')
        self.assertEqual(str(caught.exception), '')


if __name__ == '__main__': unittest.main()
