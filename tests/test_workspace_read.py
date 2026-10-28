"""Isolated persistent fixtures, no external identity/provider authority."""
import dataclasses
import hashlib
import json
import sqlite3
import unittest
from unittest import mock
from concurrent.futures import ThreadPoolExecutor
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from app_backend import LocalAppBackend, Session
import remediation_queue as rq
import test_local_control as fixture

class WorkspaceReadTests(unittest.TestCase):
    def setUp(self):
        self.f=fixture.LocalControlTests();self.f.setUp();self.addCleanup(self.f.doCleanups)
        (self.f.root/'config/one-web-app.json').write_bytes((fixture.ROOT/'config/one-web-app.json').read_bytes())
        self.backend=LocalAppBackend(self.f.c)
        self.session=Session('synthetic-reader','fixture-tenant','canonical_agency_project','operator',self.f.clock+900)
    def test_projection_readonly_concurrent_reload_and_no_private_fields(self):
        request=self.f.submit();ticket=self.f.c.claim(request,'worker');self.f.c.execute(ticket)
        dbpath=self.f.c.queue.path
        before=hashlib.sha256(dbpath.read_bytes()).hexdigest()
        with self.f.c.queue.connection() as db:dump='\n'.join(db.iterdump())
        with ThreadPoolExecutor(max_workers=4) as pool:
            snapshots=list(pool.map(lambda _:self.backend.workspace_status(self.session,request),range(12)))
        self.assertTrue(all(s==snapshots[0] for s in snapshots))
        again=LocalAppBackend(self.f.reopen()).workspace_status(self.session,request)
        self.assertEqual(again,snapshots[0])
        with self.f.c.queue.connection() as db:self.assertEqual(dump,'\n'.join(db.iterdump()))
        self.assertEqual(before,hashlib.sha256(dbpath.read_bytes()).hexdigest())
        text=json.dumps(again)
        for private in ['checkpoint','evidence_path','worker','fence','definition','spec',str(self.f.root),'docs/source.md']:
            self.assertNotIn('"'+private+'"',text)
        a=again['approvals'][0];self.assertEqual(a['status'],'review_pending');self.assertIsNone(a['cost_cap'])
        self.assertEqual(a['valid_until'],self.f.clock+600);self.assertIsNone(a['source']['evidence_sha256'])
        with self.f.c.queue.connection(read_only=True) as db:
            with self.assertRaises(sqlite3.OperationalError):db.execute('DELETE FROM control_events')
    def test_gap_sync_not_called_and_blocked_child_prevents_join(self):
        request=self.f.submit([self.f.job('parent',dependencies=['child']),self.f.job('child',target='/unbound')])
        ticket=self.f.c.claim(request,'worker');self.f.c.execute(ticket)
        self.f.c.sync_gaps=lambda _:self.fail('read attempted reconciliation')
        view=self.backend.workspace_status(self.session,request)
        self.assertEqual(view['state'],'blocked_not_reviewed');self.assertFalse(any(j['joined'] for j in view['jobs']))
        self.assertEqual(view['approvals'][0]['status'],'review_pending')
    def test_receipt_join_is_historical_local_review_not_business_permission(self):
        request=self.f.submit();ticket=self.f.c.claim(request,'worker');self.f.c.execute(ticket);self.f.reviewed(ticket['job_id'])
        view=self.backend.workspace_status(self.session,request)
        self.assertEqual(view['state'],'verified_complete');self.assertTrue(view['jobs'][0]['joined'])
        self.assertEqual(view['approvals'][0]['status'],'accepted_local_only')
        self.assertEqual(view['business_approval_binding'],'not_connected');self.assertFalse(view['production_accepted'])
    def test_identity_tenant_role_revocation_expiry_and_contract_drift(self):
        request=self.f.submit()
        for s in [None,dataclasses.replace(self.session,tenant='foreign'),dataclasses.replace(self.session,project='foreign'),dataclasses.replace(self.session,role='admin'),dataclasses.replace(self.session,expires_at=self.f.clock),dataclasses.replace(self.session,revoked=True)]:
            with self.subTest(session=s),self.assertRaises(rq.QueueError):self.backend.workspace_status(s,request)
        other=LocalAppBackend(self.f.reopen(tenant='foreign'))
        with self.assertRaisesRegex(rq.QueueError,'scoped_request_not_found'):
            other.workspace_status(dataclasses.replace(self.session,tenant='foreign'),request)
        p=self.f.root/'config/one-web-app.json';d=json.loads(p.read_text());d['session_contract']['roles']['operator']=[];p.write_text(json.dumps(d))
        with self.assertRaisesRegex(rq.QueueError,'app_contract_changed'):
            self.backend.workspace_status(self.session,request)

    def test_http_contract_exact_query_auth_and_no_store(self):
        request=self.f.submit()
        for session,method,query,expected in [
            (self.session,'GET',{'request_id':request},200),
            (None,'GET',{'request_id':request},401),
            (dataclasses.replace(self.session,tenant='foreign'),'GET',{'request_id':request},404),
            (dataclasses.replace(self.session,role='customer'),'GET',{'request_id':request},403),
            (self.session,'POST',{'request_id':request},405),
            (self.session,'GET',{'request_id':request,'tenant':'foreign'},400),
            (self.session,'GET',{'request_id':None},400),
            (self.session,'GET',{'request_id':'unknown'},404),
        ]:
            with self.subTest(expected=expected,method=method):
                code,headers,body=self.backend.workspace_response(session,method=method,query=query)
                self.assertEqual(code,expected);self.assertEqual(headers['Cache-Control'],'private, no-store')
                if code!=200:self.assertEqual(set(body),{'error'})

    def test_read_infrastructure_failures_are_neutral_unavailable_responses(self):
        request=self.f.submit()
        for error in [OSError('synthetic private path'),sqlite3.OperationalError('synthetic private database'),sqlite3.DatabaseError('synthetic malformed database'),json.JSONDecodeError('private content','x',0)]:
            with self.subTest(error=type(error).__name__),mock.patch.object(self.f.c,'workspace_status',side_effect=error):
                code,headers,body=self.backend.workspace_response(self.session,method='GET',query={'request_id':request})
                self.assertEqual(code,503);self.assertEqual(body,{'error':'workspace_binding_unavailable'});self.assertEqual(headers['Cache-Control'],'private, no-store')
        with mock.patch('app_backend.rq.read_source',side_effect=OSError('private config')):
            self.assertEqual(self.backend.workspace_response(self.session,method='GET',query={'request_id':request})[0],503)

    def test_aggregate_does_not_invent_an_active_worker(self):
        request=self.f.submit()
        self.assertEqual(self.backend.workspace_status(self.session,request)['state'],'open_awaiting_verification')
        ticket=self.f.c.claim(request,'worker')
        self.assertEqual(self.backend.workspace_status(self.session,request)['state'],'in_progress_limited')
        self.f.c.execute(ticket)
        self.assertEqual(self.backend.workspace_status(self.session,request)['state'],'review_pending')

    def test_missing_database_returns_503_without_recreating_it(self):
        request=self.f.submit();p=self.f.c.queue.path;backup=p.with_suffix('.saved');p.rename(backup)
        try:
            code,headers,body=self.backend.workspace_response(self.session,method='GET',query={'request_id':request})
            self.assertEqual(code,503);self.assertFalse(p.exists());self.assertEqual(headers['Cache-Control'],'private, no-store')
        finally:backup.rename(p)
