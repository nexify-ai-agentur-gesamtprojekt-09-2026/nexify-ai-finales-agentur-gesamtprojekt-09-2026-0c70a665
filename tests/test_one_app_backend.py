"""Combined backend flow with synthetic local sessions; no real identity provider."""
import dataclasses
import importlib.util
import json
from pathlib import Path
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from app_backend import LocalAppBackend, Session
import remediation_queue as rq
import test_local_control as fixture

class CombinedBackendTests(unittest.TestCase):
    def setUp(self):
        self.f=fixture.LocalControlTests();self.f.setUp();self.addCleanup(self.f.doCleanups)
        (self.f.root/'config/one-web-app.json').write_bytes((ROOT/'config/one-web-app.json').read_bytes())
        self.backend=LocalAppBackend(self.f.c)
        self.operator=Session('fixture-worker','fixture-tenant','canonical_agency_project','operator',self.f.clock+900)
        self.reviewer=dataclasses.replace(self.operator,actor='fixture-reviewer',role='reviewer')
    def test_context_children_readback_and_parent_join_survive_reopen_and_replay(self):
        jobs=[self.f.job('parent','context.select',dependencies=['read','preview']),
              self.f.job('read',start_dependencies=['parent']),
              self.f.job('preview','brain.preview',start_dependencies=['parent'])]
        definition=self.f.definition(jobs)
        request=self.backend.dispatch(self.operator,'submit',{'definition':definition})['id']
        self.assertTrue(self.backend.dispatch(self.operator,'submit',{'definition':definition})['deduplicated'])
        results=[]
        for i in range(3):
            # New adapter and connection each step, same durable queue.
            self.backend=LocalAppBackend(self.f.reopen())
            results.append(self.backend.dispatch(self.operator,'run-once',{'request_id':request}))
        self.assertEqual(results[2]['result']['remote_write'],False)
        def review(result):
            with self.f.c.queue.connection() as db:row=self.f.c._job(db,result['job_id'])
            receipt=dict(job_id=row['id'],reviewer=self.reviewer.actor,result_hash=row['result_hash'],contract_hash=row['contract_hash'],decision='accept',proof_scope='local_only')
            path='docs/receipt-'+row['id']+'.json';raw=json.dumps(receipt).encode();(self.f.root/path).write_bytes(raw)
            return self.backend.dispatch(self.reviewer,'review',dict(job_id=row['id'],result_hash=row['result_hash'],evidence_path=path,evidence_sha256=rq.digest(raw)))
        with self.assertRaisesRegex(rq.QueueError,'completion_dependencies_pending'):review(results[0])
        review(results[1]);review(results[2]);review(results[0])
        self.assertTrue(review(results[0])['replayed'])
        status=self.backend.dispatch(self.operator,'run-once',{'request_id':request})
        self.assertEqual(status['state'],'verified_complete');self.assertFalse(status['production_accepted'])
        self.assertTrue(all(j['attempts']==1 for j in status['jobs']))
    def test_session_role_tenant_expiry_and_payload_claims_fail_closed(self):
        request=self.f.submit()
        for session in [None,dataclasses.replace(self.operator,tenant='other'),dataclasses.replace(self.operator,role='customer'),dataclasses.replace(self.operator,expires_at=self.f.clock)]:
            with self.subTest(session=session),self.assertRaises(rq.QueueError):self.backend.dispatch(session,'status',{'request_id':request})
        with self.assertRaisesRegex(rq.QueueError,'role_or_operation'):self.backend.dispatch(self.reviewer,'run-once',{'request_id':request})
        with self.assertRaisesRegex(rq.QueueError,'schema'):self.backend.dispatch(self.operator,'status',{'request_id':request,'tenant':'other'})
        with self.assertRaisesRegex(rq.QueueError,'role_or_operation'):self.backend.dispatch(self.operator,'execute_command',{'command':'unused'})
    def test_crashed_claim_restarts_without_old_worker_readback(self):
        request=self.f.submit();old=self.f.c.claim(request,self.operator.actor)
        self.f.clock+=31
        result=LocalAppBackend(self.f.reopen()).dispatch(self.operator,'run-once',{'request_id':request})
        self.assertEqual(result['state'],'review_pending')
        with self.assertRaisesRegex(rq.QueueError,'lease'):self.f.c.execute(old)
        self.assertEqual(self.f.c.status(request)['jobs'][0]['attempts'],2)

if __name__=='__main__':unittest.main()
