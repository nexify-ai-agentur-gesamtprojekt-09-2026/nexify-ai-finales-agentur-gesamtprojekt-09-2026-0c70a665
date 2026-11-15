"""Offline execution of actual request functions: no application imports, DB or provider calls."""
import ast
import asyncio
import copy
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
import secrets
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


class ApiFailure(Exception):
    def __init__(self, status_code, detail):
        self.status_code, self.detail = status_code, detail


class Duplicate(Exception):
    pass


class Requests:
    def __init__(self):
        self.rows = {}
        self.interrupt_after_insert = False

    # Stands in for the data-access interface (shop/store/requests.py), not for a database driver.
    async def get(self, request_id):
        await asyncio.sleep(0)
        return copy.deepcopy(self.rows.get(request_id))

    async def count_from_email_since(self, email, since):
        return 0

    async def add(self, doc):
        if doc['_id'] in self.rows:
            raise Duplicate()
        self.rows[doc['_id']] = copy.deepcopy(doc)
        if self.interrupt_after_insert:
            self.interrupt_after_insert = False
            raise TimeoutError('synthetic acknowledgement loss')

    async def record_notification(self, request_id, status):
        self.rows[request_id].update({'notify_status': status, 'notify_recovery_pending': False})

    async def pending_notifications(self, limit):
        return [copy.deepcopy(row) for row in self.rows.values() if row.get('notify_recovery_pending') is True][:limit]


async def _anonymous_requester(request):
    # The real helper reads the shop-API session; these offline cases are anonymous visitors.
    return None


def actual_functions(database, notification):
    tree = ast.parse((ROOT/'apps/shop-api/shop/requests_api.py').read_text())
    functions = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name not in ('notify', '_requester')]
    for node in functions:
        node.decorator_list = []
        node.returns = None
        node.args.defaults = []
        for arg in node.args.args:
            arg.annotation = None
    namespace = {'store': types.SimpleNamespace(requests=database, AlreadyExists=Duplicate), 'notify': notification,
                 'HTTPException': ApiFailure, 'hashlib': hashlib,
                 'json': json, 're': re, 'secrets': secrets, 'datetime': datetime, 'timedelta': timedelta,
                 'timezone': timezone, 'EMAIL': re.compile(r'[^@\s]+@[^@\s]+\.[^@\s]+'),
                 'HOURLY_LIMIT': 5, '_requester': _anonymous_requester, 'RequestReceipt': lambda **fields: fields, 'now_iso': lambda: datetime.now(timezone.utc).isoformat()}
    exec(compile(ast.fix_missing_locations(ast.Module(body=functions,type_ignores=[])), 'requests_api.py', 'exec'), namespace)
    return namespace


class ContactRecovery(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = Requests()
        self.notified = set()
        self.fail_notification = False
        async def notify(doc):
            if self.fail_notification:
                raise RuntimeError('synthetic outbox interruption')
            self.notified.add(doc['number'])
            return 'wartend'
        self.functions = actual_functions(self.db, notify)
        self.body = types.SimpleNamespace(name='Synthetic User', email='user@example.invalid', company='',
                                          message='Synthetic enquiry for offline testing.', consent=True,
                                          page_path='/kontakt', kind='contact',
                                          service='', budget='', timeline='', phone='')

    async def create(self, key='test-contact-key-0001', body=None):
        return await self.functions['create_request'](body or self.body, None, key)

    async def test_concurrent_same_payload_has_one_persistent_request_and_receipt(self):
        results = await asyncio.gather(*(self.create() for _ in range(12)))
        self.assertEqual(len(self.db.rows), 1)
        self.assertTrue(all(result == results[0] for result in results))
        self.assertEqual(self.notified, {results[0]['number']})

    async def test_changed_payload_cannot_reuse_key_or_disclose_previous_receipt(self):
        first = await self.create()
        changed = copy.copy(self.body)
        changed.email = 'other@example.invalid'
        with self.assertRaises(ApiFailure) as caught:
            await self.create(body=changed)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertNotIn(first['number'], json.dumps(caught.exception.detail))
        self.assertEqual(len(self.db.rows), 1)

    async def test_lost_insert_acknowledgement_is_recovered_by_same_key(self):
        self.db.interrupt_after_insert = True
        with self.assertRaises(TimeoutError):
            await self.create()
        receipt = await self.create()
        self.assertEqual(len(self.db.rows), 1)
        self.assertEqual(receipt['number'], next(iter(self.db.rows.values()))['number'])
        await self.functions['recover_request_mail_intents']()
        self.assertEqual(self.notified, {receipt['number']})

    async def test_outbox_failure_keeps_request_accepted_and_intent_for_recovery(self):
        self.fail_notification = True
        receipt = await self.create()
        self.assertEqual(receipt['status'], 'eingegangen')
        self.assertTrue(next(iter(self.db.rows.values()))['notify_recovery_pending'])
        self.fail_notification = False
        await asyncio.gather(self.functions['recover_request_mail_intents'](), self.functions['recover_request_mail_intents']())
        self.assertEqual(self.notified, {receipt['number']})
        self.assertFalse(next(iter(self.db.rows.values()))['notify_recovery_pending'])

    async def test_missing_or_invalid_key_never_writes(self):
        for key in [None, '', 'short', 'a'*129, 'x\n'+'a'*20]:
            with self.assertRaises(ApiFailure) as caught:
                await self.create(key)
            self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(self.db.rows, {})

    async def test_validation_failure_precedes_key_and_never_writes(self):
        self.body.consent = False
        with self.assertRaises(ApiFailure) as caught:
            await self.create(None)
        self.assertEqual(caught.exception.status_code, 422)
        self.assertEqual(self.db.rows, {})

    async def test_display_number_collision_never_merges_notification_intents(self):
        keys = []
        class Mailer:
            @staticmethod
            def setting(_):
                return 'internal@example.invalid'
            @staticmethod
            async def enqueue(key, *args, **kwargs):
                keys.append(key)
                return {'status': 'wartend'}
        tree = ast.parse((ROOT/'apps/shop-api/shop/requests_api.py').read_text())
        node = next(node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == 'notify')
        ns = {'mailer': Mailer, 'mail_templates': types.SimpleNamespace(internal_request=lambda doc: ('subject','html','text'))}
        exec(compile(ast.fix_missing_locations(ast.Module(body=[node],type_ignores=[])), 'requests_api.py', 'exec'), ns)
        for identity in ['request:first', 'request:second']:
            await ns['notify']({'_id':identity,'payload_hash':'hash','number':'NX-COLLISION','email':'user@example.invalid'})
        self.assertEqual(keys, ['request:first','request:second'])
        await ns['notify']({'_id':'old-object-id','number':'NX-LEGACY','email':'user@example.invalid'})
        self.assertEqual(keys[-1], 'request:NX-LEGACY')

    async def test_checkout_recovery_failure_cannot_starve_contact_recovery(self):
        calls = []
        ticks = 0
        async def sleep(_):
            nonlocal ticks
            ticks += 1
            if ticks > 1:
                raise asyncio.CancelledError()
        async def checkout():
            calls.append('checkout')
            raise RuntimeError('synthetic unrelated failure')
        async def requests():
            calls.append('contact')
        async def outbox():
            calls.append('outbox')
        package = types.ModuleType('contact_recovery_fake')
        package.__path__ = []
        checkout_module = types.ModuleType('contact_recovery_fake.checkout_api')
        checkout_module.recover_paid_mail_intents = checkout
        request_module = types.ModuleType('contact_recovery_fake.requests_api')
        request_module.recover_request_mail_intents = requests
        modules = {'contact_recovery_fake':package,'contact_recovery_fake.checkout_api':checkout_module,'contact_recovery_fake.requests_api':request_module}
        tree = ast.parse((ROOT/'apps/shop-api/shop/mailer.py').read_text())
        node = next(node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == 'retry_loop')
        ns = {'__package__':'contact_recovery_fake','asyncio':types.SimpleNamespace(sleep=sleep),'retry_pending':outbox}
        exec(compile(ast.fix_missing_locations(ast.Module(body=[node],type_ignores=[])), 'mailer.py', 'exec'), ns)
        with patch.dict('sys.modules', modules):
            with self.assertRaises(asyncio.CancelledError):
                await ns['retry_loop']()
        self.assertEqual(calls, ['checkout','contact','outbox'])
