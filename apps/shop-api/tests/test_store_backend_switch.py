"""The backend switch of shop/store: MongoDB unless PostgreSQL is chosen explicitly; nothing else is accepted."""
import importlib
import os
from pathlib import Path
import sys
from types import ModuleType
import unittest
from unittest.mock import patch
from uuid import uuid4

SHOP = Path(__file__).resolve().parents[1] / 'shop'
AREAS = ('catalog', 'carts', 'accounts', 'workshops', 'requests', 'outbox', 'orders', 'payments', 'settings')


def load(environment):
    name = '_store_switch_' + uuid4().hex
    package = ModuleType(name); package.__path__ = [str(SHOP)]
    db_module = ModuleType(name + '.db'); db_module.db = object(); db_module.now_iso = lambda: 'switch-time'
    with patch.dict(sys.modules, {name: package, name + '.db': db_module}), patch.dict(os.environ, environment, clear=True):
        return importlib.import_module(name + '.store'), db_module.db


class BackendSwitch(unittest.TestCase):
    def test_without_the_variable_every_area_is_the_mongodb_store_bound_to_the_existing_database(self):
        store, database = load({})
        self.assertEqual(store.BACKEND, 'mongodb')
        for area in AREAS:
            self.assertTrue(type(getattr(store, area)).__name__.startswith('Mongo'), area)
            self.assertIs(getattr(store, area).db, database, area)
        self.assertFalse(any('.store.pg' in name for name in sys.modules if name.startswith(store.__name__)), 'the PostgreSQL code is not even loaded')

    def test_mongodb_named_explicitly_is_the_same_and_ignores_a_postgres_address(self):
        store, _ = load({'SHOP_STORE_BACKEND': 'mongodb', 'SHOP_POSTGRES_DSN': 'postgresql://127.0.0.1:1/none'})
        self.assertEqual({type(getattr(store, area)).__name__[:5] for area in AREAS}, {'Mongo'})

    def test_postgres_binds_every_area_to_one_database_without_connecting(self):
        try:
            import psycopg  # noqa: F401
        except ImportError:
            self.skipTest('psycopg absent')
        store, _ = load({'SHOP_STORE_BACKEND': 'postgres', 'SHOP_POSTGRES_DSN': 'postgresql://127.0.0.1:1/none'})
        self.assertEqual(store.BACKEND, 'postgres')
        self.assertEqual({type(getattr(store, area)).__name__[:2] for area in AREAS}, {'Pg'})
        self.assertEqual(len({id(getattr(store, area).db) for area in AREAS}), 1)
        self.assertIsNone(store.catalog.db._pool, 'no connection is opened at import')
        for error in ('AlreadyExists', 'ArchiveTooLarge', 'RevisionStale', 'StoreUnavailable', 'StoredDataInvalid'):
            self.assertTrue(issubclass(getattr(store, error), Exception))

    def test_postgres_without_an_address_and_any_other_value_stop_the_start(self):
        for environment in ({'SHOP_STORE_BACKEND': 'postgres'}, {'SHOP_STORE_BACKEND': 'postgres', 'SHOP_POSTGRES_DSN': ''},
                            {'SHOP_STORE_BACKEND': 'supabase', 'SHOP_POSTGRES_DSN': 'postgresql://synthetic-host/none'}, {'SHOP_STORE_BACKEND': ''},
                            {'SHOP_STORE_BACKEND': 'Postgres', 'SHOP_POSTGRES_DSN': 'postgresql://synthetic-host/none'}):
            with self.subTest(environment), self.assertRaises(RuntimeError) as caught:
                load(environment)
            self.assertNotIn('synthetic-host', str(caught.exception), 'the message never repeats the address')


if __name__ == '__main__': unittest.main()
