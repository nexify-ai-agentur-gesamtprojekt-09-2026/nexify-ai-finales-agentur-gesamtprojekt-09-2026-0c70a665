"""Isolated local transport tests; no real messages, provider or mail dispatch."""
from dataclasses import replace
import hashlib
import json
import sqlite3
import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from app_backend import LocalAppBackend
from mail_app_backend import MailAppBackend
from mail_workspace import MailWorkspace
import test_workspace_read as workspace_fixture


def source_message(identifier='synthetic-message', revision=1):
    return {'provider_id': identifier, 'rfc_message_id': '<'+identifier+'@example.invalid>',
            'subject': 'Synthetic local conversation', 'from': 'sender@example.invalid',
            'to': ['operator@example.invalid'], 'cc': ['colleague@example.invalid'],
            'reply_to': ['reply@example.invalid'], 'text': '<img src="https://example.invalid/tracker">',
            'revision': revision, 'attachments': [{'id':'attachment-1','filename':'sample.txt',
                                                  'content_type':'text/plain','size':12}],
            'provider_metadata': {'labels': [], 'classification':'unknown'}}


class MailBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.fixture = workspace_fixture.WorkspaceReadTests(); self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.session = self.fixture.session
        self.mail = MailWorkspace(self.fixture.f.c.queue, self.session.tenant, self.session.project)
        for provider in ('gmail', 'hostinger'):
            self.mail.provision_mailbox(provider, 'mailbox-1', 'operator@example.invalid')
            self.mail.ingest_page(provider, 'mailbox-1', [source_message()], cursor=None,
                                  next_cursor=None, complete=True)
        self.backend = MailAppBackend(self.fixture.backend, self.mail)

    def prepare(self, **updates):
        value = dict(action='prepare', provider='gmail', mailbox_id='mailbox-1',
                     message_id='synthetic-message', mode='reply', expected_revision=1,
                     to=['reply@example.invalid'], cc=[], bcc=[], reply_to=[], text='Synthetic draft',
                     signature_text='', signature_html='', idempotency_key='synthetic-action')
        value.update(updates)
        return value

    def call(self, session=None, method='GET', payload=None):
        return self.backend.response(self.session if session is None else session,
                                     method=method, payload={} if payload is None else payload)

    def test_reads_do_not_mutate_and_restart_retains_prepared_draft(self):
        before = hashlib.sha256(self.mail.queue.path.read_bytes()).hexdigest()
        code, headers, view = self.call()
        self.assertEqual(code, 200); self.assertEqual(len(view['mailboxes']), 2)
        self.assertEqual(headers['Cache-Control'], 'private, no-store')
        self.assertEqual(before, hashlib.sha256(self.mail.queue.path.read_bytes()).hexdigest())
        first = self.call(method='POST', payload=self.prepare())
        again = self.call(method='POST', payload=self.prepare())
        self.assertEqual(first, again); self.assertEqual(first[0], 200)
        self.assertEqual(first[2]['outbox']['state'], 'prepared')
        reopened = MailWorkspace(self.fixture.f.reopen().queue, self.session.tenant, self.session.project)
        self.assertEqual(reopened.snapshot()['outbox'], [first[2]['outbox']])

    def test_auth_scope_role_and_unknown_request_fields_fail_closed(self):
        for session, code in [(False,401), (replace(self.session,tenant='foreign'),404),
                              (replace(self.session,project='foreign'),404),
                              (replace(self.session,expires_at=self.fixture.f.clock),401),
                              (replace(self.session,revoked=True),401),
                              (replace(self.session,role='customer'),403)]:
            with self.subTest(code=code):self.assertEqual(self.call(session=session)[0], code)
        reader = replace(self.session, role='reviewer')
        self.assertEqual(self.call(session=reader)[0], 200)
        self.assertEqual(self.call(session=reader,method='POST',payload=self.prepare())[0],403)
        for body in [self.prepare(sender='other@example.invalid'),self.prepare(tenant='foreign'),
                     {'action':'send'}, {'action':'delete'}, [], self.prepare(provider='other')]:
            with self.subTest(body=type(body).__name__):
                self.assertEqual(self.call(method='POST',payload=body)[0],400)
        self.assertEqual(self.call(payload={'tenant':'foreign'})[0],400)
        self.assertEqual(self.call(method='DELETE')[0],405)

    def test_stale_reply_undo_and_provider_separation(self):
        state = dict(action='local_state',provider='gmail',mailbox_id='mailbox-1',
                     message_id='synthetic-message',expected_revision=1,read=True,
                     task_status=None,local_archived=True)
        code, _, result = self.call(method='POST',payload=state)
        self.assertEqual(code,200); self.assertEqual(result['message']['task_status'],'open')
        self.assertEqual(self.call(method='POST',payload=self.prepare())[0],409)
        self.assertEqual(self.call(method='POST',payload=self.prepare(provider='hostinger'))[0],200)
        state.update(expected_revision=2,read=None,local_archived=False)
        self.assertEqual(self.call(method='POST',payload=state)[2]['message']['local_archived'],False)
        self.mail.ingest_page('gmail','mailbox-1',[source_message(revision=2)],
                              cursor=None,next_cursor=None,complete=True)
        self.assertEqual(self.call(method='POST',payload=self.prepare(expected_revision=3))[0],409)

    def test_storage_failure_has_no_private_error_details(self):
        with patch.object(self.mail,'snapshot',side_effect=sqlite3.OperationalError('private path')):
            code,headers,body=self.call()
        self.assertEqual(code,503);self.assertEqual(body,{'error':'mail_binding_unavailable'})
        self.assertEqual(headers['Cache-Control'],'private, no-store')

    def test_corrupted_persisted_state_is_unavailable_not_request_success(self):
        self.assertEqual(self.call(method='POST',payload=self.prepare())[0],200)
        for malformed in ('[]','null','{"state":"unknown"}'):
            with self.subTest(malformed=malformed):
                with self.mail.queue.connection() as db:
                    db.execute('UPDATE mail_outbox SET result=?',(malformed,))
                for method,payload in [('GET',{}),('POST',self.prepare())]:
                    code,headers,body=self.call(method=method,payload=payload)
                    self.assertEqual(code,503)
                    self.assertEqual(body,{'error':'mail_binding_unavailable'})
                    self.assertEqual(headers['Cache-Control'],'private, no-store')

    def test_production_entry_remains_unbound_inside_existing_auth_boundary(self):
        root = Path(__file__).resolve().parents[1]
        route = (root/'apps/web/app/api/internal/workspace/mail/route.ts').read_text()
        proxy = (root/'apps/web/proxy.ts').read_text()
        self.assertIn('mail_binding_not_configured',route)
        self.assertIn('status:503',route)
        self.assertNotIn('process.env',route)
        self.assertIn("'/api/internal/workspace'",proxy)
        self.assertNotIn('mail_workspace', (root/'tools/mail.mjs').read_text())


if __name__ == '__main__': unittest.main()
