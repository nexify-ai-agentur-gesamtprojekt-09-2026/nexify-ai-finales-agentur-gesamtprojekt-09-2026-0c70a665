"""Wegwerf-PostgreSQL für die Shop-Tests: je Test eine eigene Datenbank aus einer Vorlage mit den echten Migrationen.

Läuft nur mit ausdrücklicher Bestätigung und nur gegen Loopback:
  NEXIFY_POSTGRES_DISPOSABLE_CONFIRMED=yes
  NEXIFY_TEST_POSTGRES_DSN=postgresql://<rolle>:<nur-testkennwort>@127.0.0.1:<port>/postgres
Die Rolle braucht das Recht, Datenbanken und Rollen anzulegen (lokaler Wegwerf-Cluster). Nie gegen
eine Datenbank mit echten Daten: Es werden Datenbanken angelegt und wieder entfernt, deren Name mit
``nexify_shop_test_`` beginnt, und die Gruppenrolle ``shop_api`` sowie zwei Testrollen angelegt.
"""
import atexit
import os
from pathlib import Path
import unittest
from urllib.parse import urlsplit
from uuid import uuid4

MIGRATIONS = Path(__file__).resolve().parents[1] / 'supabase' / 'migrations'
SERVICE_LOGIN, PROBE_LOGIN, FIXTURE_PASSWORD = 'nexify_shop_fixture', 'nexify_shop_probe', 'fixture-only'
_template = None


def admin_dsn():
    if os.environ.get('NEXIFY_POSTGRES_DISPOSABLE_CONFIRMED') != 'yes':
        raise unittest.SkipTest('Explicit disposable local PostgreSQL confirmation absent')
    dsn = os.environ.get('NEXIFY_TEST_POSTGRES_DSN', '')
    parsed = urlsplit(dsn)
    if parsed.scheme != 'postgresql' or parsed.hostname not in ('localhost', '127.0.0.1', '::1') or parsed.path != '/postgres' or parsed.query:
        raise ValueError('A loopback-only PostgreSQL URI to the maintenance database is required')
    return dsn


def dsn_for(database, user=None):
    admin_dsn()  # skips before the driver is needed
    from psycopg.conninfo import make_conninfo
    extra = {'user': user, 'password': FIXTURE_PASSWORD} if user else {}
    return make_conninfo(admin_dsn(), dbname=database, **extra)


def run(database, *statements):
    admin_dsn()
    import psycopg
    with psycopg.connect(dsn_for(database), autocommit=True) as conn:
        for statement in statements:
            conn.execute(statement)


def template():
    """Vorlage mit Schema und RLS, einmal je Testlauf; die Migrationen laufen zweimal (Wiederholbarkeit)."""
    global _template
    if _template is None:
        name = 'nexify_shop_test_tpl_' + uuid4().hex
        run('postgres', f'create database {name}')
        run(name, "do $$ begin if not exists (select 1 from pg_roles where rolname = 'shop_api') then create role shop_api nologin; end if; end $$",
            *(f"do $$ begin if not exists (select 1 from pg_roles where rolname = '{role}') then "
              f"create role {role} login password '{FIXTURE_PASSWORD}'; end if; end $$" for role in (SERVICE_LOGIN, PROBE_LOGIN)),
            f'grant shop_api to {SERVICE_LOGIN}')
        files = sorted(MIGRATIONS.glob('*.sql'))
        run(name, *(f.read_text(encoding='utf-8') for f in files + files))
        _template = name
        atexit.register(lambda: run('postgres', f'drop database if exists {name} with (force)'))
    return _template


def create_database():
    name = 'nexify_shop_test_' + uuid4().hex
    run('postgres', f'create database {name} template {template()}')
    return name


def drop_database(name):
    run('postgres', f'drop database if exists {name} with (force)')
