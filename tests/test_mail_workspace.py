"""Synthetic example.test mail only; no provider requests or private fixtures."""
import concurrent.futures
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import remediation_queue as rq
from mail_workspace import MailWorkspace

ROOT = Path(__file__).resolve().parents[1]


def message(ident='m1', rev=1):
    return {'provider_id':ident,'rfc_message_id':f'<{ident}@example.test>','subject':'Same synthetic subject','from':'sender@example.test','to':['own@example.test','other@example.test'],'cc':['copy@example.test','own@example.test'],'reply_to':['reply@example.test'],'text':'Synthetic plain text','revision':rev,'attachments':[],'provider_metadata':{'labels':[],'classification':'unknown'}}


class MailWorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        (root/'config').mkdir()
        (root/'config/remediation-policy.json').write_bytes((ROOT/'config/remediation-policy.json').read_bytes())
        self.q = rq.RemediationQueue(root=root)
        self.mail = MailWorkspace(self.q,'tenant','canonical_agency_project')
        self.mail.provision_mailbox('gmail','box','own@example.test')
        self.mail.ingest_page('gmail','box',[message()],cursor=None,next_cursor=None,complete=True)

    def tearDown(self):
        self.temp.cleanup()

    def prepare(self, key='click', **overrides):
        args = dict(to=['reply@example.test'],cc=[],bcc=[],reply_to=[],text='Synthetic draft',signature_text='Plain signature',signature_html='<b>Inert signature</b>',idempotency_key=key)
        args.update(overrides)
        return self.mail.prepare('gmail','box','m1','reply',1,**args)

    def test_correct_recipient_plan_and_forward(self):
        plan = self.mail.recipient_plan('gmail','box','m1','reply-all')
        self.assertEqual(plan['to'],['reply@example.test','other@example.test'])
        self.assertEqual(plan['cc'],['copy@example.test'])
        self.assertEqual(plan['sender'],'own@example.test')
        self.assertEqual(self.mail.recipient_plan('gmail','box','m1','forward')['to'],[])
        result = self.prepare()
        self.assertEqual(result['state'],'prepared')
        self.assertEqual(result['send_status'],'unavailable')
        self.assertEqual(result['signature_html'],'<b>Inert signature</b>')
        self.assertEqual(result['in_reply_to'],'<m1@example.test>')

    def test_doubleclick_and_concurrent_replay(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            rows = list(pool.map(lambda _:self.prepare(),range(8)))
        self.assertEqual(len({row['id'] for row in rows}),1)
        self.assertEqual(len(self.mail.snapshot()['outbox']),1)
        with self.assertRaisesRegex(rq.QueueError,'idempotency_conflict'):
            self.prepare(text='different')

    def test_provider_tenant_project_isolation(self):
        other = MailWorkspace(self.q,'other','canonical_agency_project')
        self.assertEqual(other.snapshot()['mailboxes'],[])
        other_project = MailWorkspace(self.q,'tenant','another-project')
        self.assertEqual(other_project.snapshot()['mailboxes'],[])
        with self.assertRaisesRegex(rq.QueueError,'not_connected'):
            self.mail.messages('hostinger','box')
        self.mail.provision_mailbox('hostinger','box','second@example.test')
        self.mail.ingest_page('hostinger','box',[message()],cursor=None,next_cursor=None,complete=True)
        self.assertEqual(self.mail.messages('hostinger','box')['mailbox']['address'],'second@example.test')
        self.assertEqual(self.mail.messages('gmail','box')['mailbox']['address'],'own@example.test')

    def test_same_subject_source_update_stale_reply(self):
        self.mail.ingest_page('gmail','box',[message('m2')],cursor=None,next_cursor=None,complete=True)
        self.assertEqual(len(self.mail.messages('gmail','box')['messages']),2)
        self.mail.ingest_page('gmail','box',[message(rev=2)],cursor=None,next_cursor=None,complete=True)
        with self.assertRaisesRegex(rq.QueueError,'stale_mail_revision'):
            self.prepare()
        with self.assertRaisesRegex(rq.QueueError,'stale_mail_source'):
            self.mail.ingest_page('gmail','box',[message()],cursor=None,next_cursor=None,complete=True)

    def test_local_read_task_archive_and_undo_are_separate(self):
        row = self.mail.set_local_state('gmail','box','m1',1,read=True)
        self.assertTrue(row['read'])
        self.assertEqual(row['task_status'],'open')
        row = self.mail.set_local_state('gmail','box','m1',2,task_status='done',local_archived=True)
        self.assertTrue(row['local_archived'])
        row = self.mail.set_local_state('gmail','box','m1',3,local_archived=False)
        self.assertFalse(row['local_archived'])
        with self.assertRaisesRegex(rq.QueueError,'stale_mail_revision'):
            self.mail.set_local_state('gmail','box','m1',3,read=False)

    def test_pagination_no_totals_or_repeated_cursor(self):
        self.mail.ingest_page('gmail','box',[],cursor=None,next_cursor='page-2',complete=False)
        self.mail.ingest_page('gmail','box',[],cursor='page-2',next_cursor='page-3',complete=False)
        with self.assertRaisesRegex(rq.QueueError,'cursor_stale_or_repeated'):
            self.mail.ingest_page('gmail','box',[],cursor=None,next_cursor=None,complete=True)
        with self.assertRaisesRegex(rq.QueueError,'cursor_stale_or_repeated'):
            self.mail.ingest_page('gmail','box',[],cursor='page-2',next_cursor=None,complete=True)
        view = self.mail.messages('gmail','box')
        self.assertEqual(view['pagination']['coverage'],'partial')
        self.assertNotIn('total',view['pagination'])
        self.mail.ingest_page('gmail','box',[],cursor='page-3',next_cursor=None,complete=True)
        with self.assertRaises(rq.QueueError):
            self.mail.ingest_page('gmail','box',[],cursor='page-3',next_cursor=None,complete=True)

    def test_exact_schema_headers_and_safe_attachments(self):
        for change in ({'from':'x@example.test\nBcc:other@example.test'}, {'subject':'bad\r\nheader'}, {'unknown':True}, {'html':'<script>alert(1)</script>'}):
            source = {**message(),**change}
            with self.subTest(change=change), self.assertRaises(rq.QueueError):
                self.mail.ingest_page('gmail','box',[source],cursor=None,next_cursor=None,complete=True)
        for recipient in ['Name <a@example.test>','invalid','a@example.test\nCc:b@example.test','a@bad-.example.test','.a@example.test']:
            with self.assertRaises(rq.QueueError):
                self.prepare(to=[recipient])
        source = message('unsafe')
        source['attachments'] = [{'id':'a','filename':'../file','content_type':'text/plain','size':1}]
        with self.assertRaises(rq.QueueError):
            self.mail.ingest_page('gmail','box',[source],cursor=None,next_cursor=None,complete=True)
        with self.assertRaisesRegex(rq.QueueError,'identity_locked'):
            self.mail.provision_mailbox('gmail','box','another@example.test')
        with self.assertRaisesRegex(rq.QueueError,'identity_locked'):
            self.prepare(reply_to=['another@example.test'])

    def test_concurrent_local_changes_and_atomic_page_failure(self):
        def change(_):
            try:
                self.mail.set_local_state('gmail','box','m1',1,read=True)
                return 'changed'
            except rq.QueueError as exc:
                return str(exc)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(change,range(2)))
        self.assertEqual(sorted(outcomes),['changed','stale_mail_revision'])
        conflict = message()
        conflict['text'] = 'Changed without provider revision'
        with self.assertRaisesRegex(rq.QueueError,'mail_source_revision_conflict'):
            self.mail.ingest_page('gmail','box',[message('new'),conflict],cursor=None,next_cursor=None,complete=True)
        self.assertEqual(len(self.mail.messages('gmail','box')['messages']),1)

    def test_safe_attachment_metadata_and_explicit_provider_classification(self):
        source = message('metadata')
        source['attachments'] = [{'id':'att-1','filename':'synthetic.txt','content_type':'text/plain','size':20}]
        source['provider_metadata'] = {'labels':['provider-label'],'classification':'security'}
        self.mail.ingest_page('gmail','box',[source],cursor=None,next_cursor=None,complete=True)
        row = self.mail.messages('gmail','box')['messages'][1]
        self.assertEqual(row['attachments'],source['attachments'])
        self.assertEqual(row['provider_metadata']['classification'],'security')
        source['attachments'][0]['download_url'] = 'https://example.test/file'
        with self.assertRaisesRegex(rq.QueueError,'unknown_or_missing_schema_field'):
            self.mail.ingest_page('gmail','box',[source],cursor=None,next_cursor=None,complete=True)

    def test_persistence_unknown_send_state_guard_and_no_dispatch(self):
        row = self.prepare()
        restarted = MailWorkspace(self.q,'tenant','canonical_agency_project')
        self.assertEqual(restarted.snapshot()['outbox'][0]['id'],row['id'])
        self.assertEqual(restarted.snapshot()['mailboxes'][0]['connector_status'],'not_connected')
        self.assertFalse(hasattr(restarted,'send'))
        self.assertFalse(hasattr(restarted,'dispatch'))
        row['state'] = 'sent'
        with self.q.connection() as db:
            db.execute('UPDATE mail_outbox SET result=?',(json.dumps(row),))
        with self.assertRaisesRegex(rq.QueueError,'unknown_mail_send_state'):
            self.prepare()
        with self.assertRaisesRegex(rq.QueueError,'unknown_mail_send_state'):
            restarted.snapshot()

    def test_bounds_and_no_guess_classification(self):
        source = message('new')
        source['subject'] = 'Advertising security alert'
        self.mail.ingest_page('gmail','box',[source],cursor=None,next_cursor=None,complete=True)
        self.assertEqual(self.mail.messages('gmail','box')['messages'][1]['provider_metadata']['classification'],'unknown')
        with self.assertRaises(rq.QueueError):
            self.mail.ingest_page('gmail','box',[message(str(i)) for i in range(101)],cursor=None,next_cursor=None,complete=True)
        source['provider_metadata']['classification'] = 'guessed'
        with self.assertRaises(rq.QueueError):
            self.mail.ingest_page('gmail','box',[source],cursor=None,next_cursor=None,complete=True)

    def test_malformed_types_fail_closed_across_scopes(self):
        for scoped in (self.mail, MailWorkspace(self.q,'other','another-project')):
            with self.subTest(scope=scoped.tenant), self.assertRaises(rq.QueueError):
                scoped.messages([], 'box')
            with self.assertRaises(rq.QueueError):
                scoped.recipient_plan('gmail','box',None,{})
        with self.assertRaises(rq.QueueError):
            self.mail.recipient_plan('gmail','box','m1',{})
        with self.assertRaises(rq.QueueError):
            self.mail.set_local_state('gmail','box','m1',1,task_status=[])
        source = message('bad-type')
        source['provider_metadata']['classification'] = []
        with self.assertRaises(rq.QueueError):
            self.mail.ingest_page('gmail','box',[source],cursor=None,next_cursor=None,complete=True)
        with self.assertRaises(rq.QueueError):
            self.mail.prepare('gmail','box',None,'reply',1,to=['reply@example.test'],cc=[],bcc=[],reply_to=[],text='',signature_text='',signature_html='',idempotency_key='bad')

    def test_null_rfc_identity_retains_distinct_provider_ids(self):
        sources = [message('null-1'),message('null-2')]
        for source in sources:
            source['rfc_message_id'] = None
        self.mail.ingest_page('gmail','box',sources,cursor=None,next_cursor=None,complete=True)
        rows = self.mail.messages('gmail','box')['messages']
        self.assertEqual(len(rows),3)
        self.assertIsNone(rows[1]['rfc_message_id'])
        result = self.mail.prepare('gmail','box','null-1','reply',1,to=['reply@example.test'],cc=[],bcc=[],reply_to=[],text='',signature_text='',signature_html='',idempotency_key='nullable')
        self.assertIsNone(result['in_reply_to'])
        self.assertEqual(self.mail.snapshot()['outbox'][0]['message_id'],'null-1')
        for invalid in ('',123,[], '<bad>','<x@example.test>\nInjected'):
            source = message('bad-rfc')
            source['rfc_message_id'] = invalid
            with self.subTest(invalid=invalid), self.assertRaises(rq.QueueError):
                self.mail.ingest_page('gmail','box',[source],cursor=None,next_cursor=None,complete=True)

    def test_utf8_projection_limit_explicit_no_truncation(self):
        # The limit measures encoded bytes, including the enclosing JSON value.
        self.assertEqual(self.mail._bounded('a'*(2*1024*1024-2)), 'a'*(2*1024*1024-2))
        with self.assertRaisesRegex(rq.QueueError,'mail_projection_limit'):
            self.mail._bounded('a'*(2*1024*1024-1))
        sources = [message(f'large-{i}') for i in range(8)]
        for source in sources:
            source['text'] = '\u20ac' * 100000
        with self.assertRaisesRegex(rq.QueueError,'mail_projection_limit'):
            self.mail.ingest_page('gmail','box',sources,cursor=None,next_cursor=None,complete=True)
        with self.assertRaisesRegex(rq.QueueError,'mail_projection_limit'):
            self.mail.snapshot()
        with self.q.connection(read_only=True) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM mail_messages').fetchone()[0],9)

    def test_corrupt_outbox_shape_always_queue_error(self):
        prepared = self.prepare()
        for malformed in ([],None,{}, {**prepared,'unexpected':True}, {**prepared,'to':{}}, {**prepared,'state':'sent'}):
            with self.q.connection() as db:
                db.execute('UPDATE mail_outbox SET result=?',(json.dumps(malformed),))
            with self.subTest(shape=type(malformed).__name__), self.assertRaisesRegex(rq.QueueError,'unknown_mail_send_state'):
                self.mail.snapshot()
            with self.assertRaisesRegex(rq.QueueError,'unknown_mail_send_state'):
                self.prepare()

    def test_snapshot_consistent_during_interleaved_write(self):
        prepared = self.prepare()
        original = self.mail._list_mailboxes
        def interleaved(db):
            mailboxes = original(db)
            with self.q.connection() as writer:
                writer.execute('UPDATE mail_outbox SET result=?',('[]',))
            return mailboxes
        self.mail._list_mailboxes = interleaved
        result = self.mail.snapshot()
        self.assertEqual(result['outbox'][0]['id'],prepared['id'])
        self.mail._list_mailboxes = original
        with self.assertRaisesRegex(rq.QueueError,'unknown_mail_send_state'):
            self.mail.snapshot()


if __name__ == '__main__':
    unittest.main()
