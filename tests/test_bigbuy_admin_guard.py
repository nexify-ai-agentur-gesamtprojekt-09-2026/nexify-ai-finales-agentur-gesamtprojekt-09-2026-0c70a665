"""HTTP contract for the disabled legacy import, using inert local dependencies."""
import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import test_bigbuy_import_integrity as fixture


class AdminImportGuardTests(unittest.TestCase):
    def setUp(self):
        package_name = '_bigbuy_admin_guard_subject'
        package = ModuleType(package_name)
        package.__path__ = [str(Path(__file__).resolve().parents[1] / 'apps/shop-api/shop')]
        modules = {package_name: package}
        for name in ('auth', 'config', 'fulfillment', 'mail_templates', 'mailer', 'pricing', 'revolut', 'db'):
            module = ModuleType(package_name + '.' + name)
            modules[module.__name__] = module
        async def admin():
            return SimpleNamespace(user_id='fixture-admin')
        modules[package_name + '.auth'].require_admin = admin
        self.db = fixture.FakeDB()
        modules[package_name + '.db'].db = self.db
        modules[package_name + '.db'].now_iso = lambda: 'fixture-time'
        modules[package_name + '.bigbuy_import'] = fixture.IMPORT
        spec = importlib.util.spec_from_file_location(package_name + '.admin_api', Path(package.__path__[0]) / 'admin_api.py')
        self.module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, modules):
            spec.loader.exec_module(self.module)
        app = FastAPI(); app.include_router(self.module.router)
        self.app, self.admin_dependency = app, admin
        self.client = TestClient(app)

    def test_all_import_modes_return_503_without_writes(self):
        for environment in ('production', 'sandbox', 'ftp', 'selection'):
            with self.subTest(environment=environment):
                response = self.client.post('/api/admin/import', json={'environment': environment})
                self.assertEqual(response.status_code, 503)
                self.assertEqual(response.json()['detail']['error'], 'tenant_publication_contract_unverified')
                self.assertEqual(self.db.calls, [])
                self.db.client.start_session.assert_not_called()

    def test_invalid_mode_still_returns_422(self):
        response = self.client.post('/api/admin/import', json={'environment': 'unknown'})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.db.calls, [])

    def test_missing_admin_authorization_still_returns_401(self):
        async def denied():
            raise HTTPException(401, 'not_authenticated')
        self.app.dependency_overrides[self.admin_dependency] = denied
        response = self.client.post('/api/admin/import', json={'environment': 'production'})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.db.calls, [])


if __name__ == '__main__':
    unittest.main()
