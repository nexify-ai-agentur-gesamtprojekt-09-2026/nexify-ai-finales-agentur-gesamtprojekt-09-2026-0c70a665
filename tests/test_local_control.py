"""Persistent local orchestration, synthetic inputs only; no MCP, SSH or provider."""
from concurrent.futures import ThreadPoolExecutor
import copy
import importlib.util
import json
import multiprocessing
from pathlib import Path
import tempfile
import time
import unittest
from unittest import mock

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('local_control_test',ROOT/'tools/local_control.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


def claim_process(root, request_id, worker, output):
    c=m.LocalControl(root=root,tenant='fixture-tenant',project='canonical_agency_project')
    output.put(c.claim(request_id,worker))


class LocalControlTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        paths=[m.POLICY,'config/remediation-policy.json','config/project-skills.json',
               'tools/local_control.py','tools/remediation_queue.py','tools/context_executor.py','tools/brain_ingestion.py',
               'skills/nexify-governed-delivery/SKILL.md','skills/nexify-knowledge-operations/SKILL.md',*m.context_executor.CORE]
        for path in paths:
            out=self.root/path;out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes((ROOT/path).read_bytes())
        (self.root/'docs').mkdir(exist_ok=True);(self.root/'docs/source.md').write_text('# Synthetic local fixture\nNo customer data.\n')
        self.clock=time.time();self.c=self.reopen()

    def reopen(self,tenant='fixture-tenant'):
        return m.LocalControl(root=self.root,tenant=tenant,project='canonical_agency_project',now=lambda:self.clock)

    def job(self,name='check',operation='source.verify',**updates):
        intent={'source.verify':'verify_source','context.select':'inspect_context','brain.preview':'preview_knowledge'}[operation]
        inputs={'task':'local source inspection'} if operation=='context.select' else {'path':'docs/source.md','sha256':m.rq.digest((self.root/'docs/source.md').read_bytes())}
        job=dict(id=name,intent=intent,operation=operation,effect='local_read',target=str(self.root),inputs=inputs,
                 health_id=self.c.probe(operation)['id'],dependencies=[],start_dependencies=[],source_reported_status='todo',max_attempts=3)
        job.update(updates);return job

    def definition(self,jobs=None,**updates):
        value=dict(id='fixture-request',revision='1',tenant='fixture-tenant',project='canonical_agency_project',title='Synthetic local verification',
                   data_class='synthetic',deadline=self.clock+600,jobs=jobs or [self.job()]);value.update(updates);return value

    def submit(self,jobs=None,**updates):return self.c.submit(self.definition(jobs,**updates))['id']

    def reviewed(self,jid,reviewer='independent-fixture-reviewer'):
        with self.c.queue.connection() as db:row=dict(self.c._job(db,jid))
        receipt=dict(job_id=jid,reviewer=reviewer,result_hash=row['result_hash'],contract_hash=row['contract_hash'],decision='accept',proof_scope='local_only')
        path='docs/review-'+jid+'.json';(self.root/path).write_text(json.dumps(receipt))
        return self.c.review(jid,reviewer=reviewer,result_hash=row['result_hash'],evidence_path=path,evidence_sha256=m.rq.digest((self.root/path).read_bytes()))

    def test_first_review_respects_deadline_but_historical_replay_survives(self):
        request=self.submit();ticket=self.c.claim(request,'worker');self.c.execute(ticket)
        self.clock+=601
        with self.assertRaisesRegex(m.rq.QueueError,'job_deadline_expired'):self.reviewed(ticket['job_id'])
        request=self.submit(id='second-request');ticket=self.c.claim(request,'worker');self.c.execute(ticket)
        self.reviewed(ticket['job_id']);self.clock+=3601
        self.assertTrue(self.reviewed(ticket['job_id'])['replayed'])

    def test_dense_32_job_dag_is_bounded(self):
        jobs=[self.job('j'+str(i),start_dependencies=['j'+str(k) for k in range(i)]) for i in range(32)]
        start=time.monotonic();self.submit(jobs)
        self.assertLess(time.monotonic()-start,2)

    def test_all_waiting_jobs_record_expired_deadline(self):
        request=self.submit([self.job('a'),self.job('b',start_dependencies=['a'])])
        self.clock+=601;self.assertIsNone(self.c.claim(request,'worker'))
        for job in self.c.status(request)['jobs']:
            self.assertEqual(job['blocked_reason'],'job_deadline_expired')
            self.assertIsNotNone(job['gap_id'])

    def test_pending_review_can_refresh_only_matching_unexpired_contract(self):
        request=self.submit(deadline=self.clock+7200)
        ticket=self.c.claim(request,'worker');result=self.c.execute(ticket)
        self.clock+=3601
        with self.assertRaisesRegex(m.rq.QueueError,'stale_operation_evidence'):self.reviewed(ticket['job_id'])
        fresh=self.c.probe('source.verify')['id']
        refreshed=self.c.refresh_review(ticket['job_id'],health_id=fresh)
        self.assertEqual(refreshed['attempts_preserved'],1)
        self.assertEqual(self.c.status(request)['jobs'][0]['result_hash'],result['sha256'])
        self.reviewed(ticket['job_id'])

    def test_pending_review_refresh_rejects_source_drift_and_expiry(self):
        request=self.submit(deadline=self.clock+7200);ticket=self.c.claim(request,'worker');self.c.execute(ticket)
        (self.root/'docs/source.md').write_text('Changed source')
        with self.assertRaisesRegex(m.rq.QueueError,'source_hash_changed'):
            self.c.refresh_review(ticket['job_id'],health_id=self.c.probe('source.verify')['id'])
        self.clock+=7201
        with self.assertRaisesRegex(m.rq.QueueError,'job_deadline_expired'):
            self.c.refresh_review(ticket['job_id'],health_id=self.c.probe('source.verify')['id'])

    def test_immutable_intake_replay_and_conflicting_revision(self):
        definition=self.definition();first=self.c.submit(definition)
        self.assertTrue(self.reopen().submit(definition)['deduplicated'])
        changed=copy.deepcopy(definition);changed['title']='Different intent'
        with self.assertRaisesRegex(m.rq.QueueError,'immutable_revision'):self.c.submit(changed)
        self.assertEqual(len(self.c.status(first['id'])['jobs']),1)

    def test_late_request_replay_reads_history_without_restarting_expired_work(self):
        definition=self.definition();first=self.c.submit(definition);self.clock+=700
        self.assertTrue(self.c.submit(definition)['deduplicated'])
        self.assertIsNone(self.c.claim(first['id'],'worker'))
        self.assertEqual(self.c.status(first['id'])['jobs'][0]['blocked_reason'],'job_deadline_expired')

    def test_start_dependencies_separate_from_completion_aggregation(self):
        parent=self.job('coordinate','context.select',dependencies=['verify'])
        child=self.job('verify',start_dependencies=['coordinate'],source_reported_status='done')
        request=self.submit([parent,child]);ticket=self.c.claim(request,'fixture-worker')
        self.c.execute(ticket)
        with self.assertRaisesRegex(m.rq.QueueError,'completion_dependencies'):self.reviewed(ticket['job_id'])
        next_ticket=self.c.claim(request,'fixture-worker');self.c.execute(next_ticket)
        self.reviewed(next_ticket['job_id']);self.reviewed(ticket['job_id'])
        report=self.reopen().status(request)
        self.assertEqual(report['state'],'verified_complete');self.assertFalse(report['production_accepted'])
        self.assertTrue(self.reviewed(ticket['job_id'])['replayed'])

    def test_unknown_status_cycle_missing_dependency_and_unbounded_attempts_rejected(self):
        jobs=[self.job('a'),self.job('b')]
        variants=[]
        for field in ('dependencies','start_dependencies'):
            bad=copy.deepcopy(jobs);bad[0][field]=['b'];bad[1][field]=['a'];variants.append(bad)
        bad=copy.deepcopy(jobs);bad[0]['start_dependencies']=['absent'];variants.append(bad)
        bad=copy.deepcopy(jobs);bad[0]['source_reported_status']='finished';variants.append(bad)
        bad=copy.deepcopy(jobs);bad[0]['max_attempts']=0;variants.append(bad)
        for bad in variants:
            with self.subTest(bad=bad),self.assertRaises(m.rq.QueueError):self.submit(bad)

    def test_tenant_scope_and_single_registry_enforced(self):
        request=self.submit()
        with self.assertRaisesRegex(m.rq.QueueError,'scoped_request'):self.reopen('other-tenant').status(request)
        with self.assertRaisesRegex(m.rq.QueueError,'tenant_or_project'):self.reopen('other-tenant').submit(self.definition())
        with self.assertRaisesRegex(m.rq.QueueError,'single_existing_registry'):m.LocalControl(root=self.root,database='.local/remediation/other.sqlite3',tenant='fixture-tenant',project='canonical_agency_project')
        self.assertFalse((self.root/'.local/remediation/other.sqlite3').exists())

    def test_unknown_operation_host_effect_skill_and_pagination_are_blocked_without_fallback(self):
        for index,changes in enumerate([{'operation':'execute_command'},{'operation':'ssh'}, {'target':'srv1941843'},
                                       {'effect':'remote_write'},{'intent':'invented'},{'inputs':{'command':'never execute'}}]):
            job=self.job();job.update(changes)
            request=self.submit([job],id='fixture-'+str(index))
            self.assertIsNone(self.c.claim(request,'fixture-worker'))
            status=self.c.status(request);self.assertEqual(status['state'],'blocked_not_reviewed')
            self.assertTrue(status['jobs'][0]['gap_id'])
        job=self.job();(self.root/'skills/nexify-governed-delivery/SKILL.md').unlink()
        request=self.submit([job],id='missing-skill');self.assertEqual(self.c.status(request)['state'],'blocked_not_reviewed')

    def test_stale_wrong_scope_or_incomplete_evidence_blocks(self):
        for index,column,value in [(1,'expires',self.clock-1),(2,'pagination_complete',0),(3,'tenant','other'),(4,'operation','brain.preview')]:
            job=self.job()
            with self.c.queue.transaction() as db:db.execute('UPDATE control_health SET '+column+'=? WHERE id=?',(value,job['health_id']))
            request=self.submit([job],id='health-'+str(index));self.assertIsNone(self.c.claim(request,'worker'))
            self.assertEqual(self.c.status(request)['state'],'blocked_not_reviewed')

    def test_multi_process_claim_has_one_writer(self):
        request=self.submit();ctx=multiprocessing.get_context('fork');output=ctx.Queue()
        workers=[ctx.Process(target=claim_process,args=(str(self.root),request,'worker-'+str(i),output)) for i in range(4)]
        for worker in workers:worker.start()
        for worker in workers:worker.join(10);self.assertEqual(worker.exitcode,0)
        values=[output.get(timeout=2) for _ in workers]
        self.assertEqual(sum(v is not None for v in values),1)
        output.close();output.join_thread()

    def test_expired_worker_cannot_commit_or_heartbeat_after_restart(self):
        request=self.submit();first=self.c.claim(request,'old-worker');self.clock+=31
        second=self.reopen().claim(request,'new-worker');self.assertGreater(second['fence'],first['fence'])
        with self.assertRaisesRegex(m.rq.QueueError,'lease'):self.c.execute(first)
        with self.assertRaisesRegex(m.rq.QueueError,'lease'):self.c.heartbeat(first)
        self.c.execute(second);self.assertEqual(self.c.status(request)['jobs'][0]['attempts'],2)

    def test_heartbeat_retains_exclusivity_and_crash_retries_are_bounded(self):
        request=self.submit();ticket=self.c.claim(request,'worker');self.clock+=20;self.c.heartbeat(ticket);self.clock+=20
        self.assertIsNone(self.reopen().claim(request,'competitor'))
        self.clock+=31
        self.assertIsNotNone(self.c.claim(request,'restart-2'));self.clock+=31
        self.assertIsNotNone(self.c.claim(request,'restart-3'));self.clock+=31
        self.assertIsNone(self.c.claim(request,'restart-4'))
        status=self.c.status(request);self.assertEqual(status['jobs'][0]['blocked_reason'],'attempts_exhausted');self.assertTrue(status['jobs'][0]['gap_id'])

    def test_crash_after_checkpoint_then_restart_and_exactly_one_persisted_result(self):
        request=self.submit();ticket=self.c.claim(request,'crashed-worker')
        with mock.patch.object(self.c,'_adapter',side_effect=SystemExit('synthetic crash')):
            with self.assertRaises(SystemExit):self.c.execute(ticket)
        before=self.c.status(request)['jobs'][0];self.assertIn('validated_before_local_read',before['checkpoint'])
        self.clock+=31;reopened=self.reopen();result=reopened.execute(reopened.claim(request,'replacement-worker'))
        self.assertEqual(result['state'],'review_pending');self.assertIsNone(reopened.claim(request,'duplicate'))
        with self.c.queue.connection() as db:self.assertEqual(db.execute("SELECT count(*) FROM control_events WHERE event='result_persisted'").fetchone()[0],1)

    def test_lease_loss_during_adapter_prevents_late_effect_and_preserves_checkpoint(self):
        request=self.submit();ticket=self.c.claim(request,'slow-worker');original=self.c._adapter
        def slow(spec):self.clock+=31;return original(spec)
        with mock.patch.object(self.c,'_adapter',side_effect=slow),self.assertRaisesRegex(m.rq.QueueError,'lease'):self.c.execute(ticket)
        self.assertIsNone(self.c.status(request)['jobs'][0]['result_hash'])

    def test_explicit_remediation_resume_checks_current_source_and_preserves_attempts(self):
        request=self.submit();ticket=self.c.claim(request,'worker');path=self.root/'docs/source.md';original=path.read_bytes();path.write_text('changed')
        with self.assertRaisesRegex(m.rq.QueueError,'source_hash_changed'):self.c.execute(ticket)
        job=self.c.status(request)['jobs'][0];self.assertTrue(job['gap_id'])
        path.write_bytes(original);fresh=self.c.probe('source.verify')['id']
        result=self.c.resume(job['id'],health_id=fresh);self.assertEqual(result['attempts_preserved'],1)
        self.c.execute(self.c.claim(request,'worker'))
        self.assertEqual(self.c.queue.status(job['gap_id'])[0]['state'],'resolved')

    def test_review_requires_separate_actor_exact_receipt_and_native_recheck(self):
        request=self.submit();ticket=self.c.claim(request,'worker');self.c.execute(ticket)
        with self.assertRaisesRegex(m.rq.QueueError,'separate_reviewer'):self.reviewed(ticket['job_id'],'worker')
        (self.root/'docs/source.md').write_text('new source')
        with self.assertRaisesRegex(m.rq.QueueError,'source_hash_changed'):self.reviewed(ticket['job_id'])
        self.assertEqual(self.c.status(request)['state'],'in_progress_limited')

    def test_brain_preview_uses_existing_redaction_and_never_indexes(self):
        (self.root/'docs/source.md').write_text('# Synthetic note\napi_key: fixture-value\n')
        request=self.submit([self.job(operation='brain.preview')]);result=self.c.execute(self.c.claim(request,'worker'))['result']
        self.assertGreater(result['redactions'],0);self.assertTrue(result['chunk_hashes']);self.assertFalse(result['remote_write']);self.assertIsNone(result['external_indexed'])
        with self.c.queue.connection() as db:self.assertNotIn('fixture-value',db.execute('SELECT result FROM control_jobs').fetchone()[0])

    def test_symlink_fifo_sensitive_metadata_and_customer_class_are_rejected(self):
        with self.assertRaisesRegex(m.rq.QueueError,'customer_or_private'):self.submit(data_class='customer')
        definition=self.definition();definition['title']='sk-proj-'+'a'*30
        with self.assertRaises(m.rq.QueueError):self.c.submit(definition)
        source=self.root/'docs/source.md';source.unlink();source.symlink_to(ROOT/'AGENTS.md')
        job=self.job();request=self.submit([job]);self.assertEqual(self.c.status(request)['state'],'blocked_not_reviewed')

    def test_unknown_write_outcome_or_authorization_fields_are_not_accepted(self):
        definition=self.definition();definition['jobs'][0]['inputs']['ssh_fallback']='root'
        request=self.c.submit(definition)['id'];self.assertEqual(self.c.status(request)['state'],'blocked_not_reviewed')
        definition=self.definition();definition['approvals']={'remote_write':True}
        with self.assertRaisesRegex(m.rq.QueueError,'schema'):self.c.submit(definition)
