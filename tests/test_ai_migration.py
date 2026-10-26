"""Offline transition decisions only: no live processes, credentials, or persistent store."""
import concurrent.futures
import copy
import json
import os
import subprocess
import sys
import tempfile
from unittest import mock
from datetime import datetime, timedelta, timezone
import importlib.util
from pathlib import Path
import threading
import unittest

SPEC=importlib.util.spec_from_file_location('migration',Path(__file__).parents[1]/'tools/ai_migration.py')
migration=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(migration)


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.policy=migration.load_policy()
        self.now=datetime(2026,10,26,12,tzinfo=timezone.utc)
        self.context=dict(repository=self.policy['scope']['repository'],ownership='agency_owned',runtime_id='agency-suite',tenant_id='tenant-a',project_id='project-a',source_version='sha-source-v1',execution_environment='repository_local')
        self.state=migration.initial_state(self.context)

    def request(self, state, target, **changes):
        request=dict(context=copy.deepcopy(state['context']),target_phase=target,expected_revision=state['revision'],decision_id='decision-'+str(state['revision']),replacement_version='replacement-v1',adapter_capability='managed_chat',active_customer_jobs=0,action='advance')
        request.update(changes);return request

    def evidence(self, state, kinds):
        return [dict(kind=kind,context=copy.deepcopy(state['context']),replacement_version='replacement-v1',source_sha256='a'*64,receipt_ref='receipt-'+kind,outcome='pass',observed_at=self.now.isoformat(),expires_at=(self.now+timedelta(minutes=10)).isoformat()) for kind in kinds]

    def advance(self, state, target):
        request=self.request(state,target)
        records=self.evidence(state,self.policy['transition_evidence'][state['phase']+'->'+target])
        result=migration.evaluate(state,request,records,now=self.now)
        self.assertEqual(result['status'],'decision_recorded_only',result)
        self.assertTrue(result['existing_runtime_unchanged']);self.assertFalse(result['runtime_execution_authorized'])
        return result['state']

    def canary(self):
        state=self.state
        for target in ['shadow','validated','canary']:state=self.advance(state,target)
        return state

    def test_default_shadow_keeps_existing_jobs_and_runtime_unchanged(self):
        request=self.request(self.state,'shadow',active_customer_jobs=7,replacement_version=None,adapter_capability=None)
        result=migration.evaluate(self.state,request,[],now=self.now)
        self.assertEqual(result['status'],'decision_recorded_only');self.assertEqual(result['state']['phase'],'shadow')
        self.assertEqual(self.state['phase'],'inventory');self.assertTrue(result['existing_work_allowed'])
        self.assertFalse(result['runtime_execution_authorized'])

    def test_missing_replacement_or_dependency_refuses_only_switch(self):
        shadow=self.advance(self.state,'shadow')
        required=self.policy['transition_evidence']['shadow->validated']
        for changes,records in [(dict(replacement_version=None),self.evidence(shadow,required)),({},self.evidence(shadow,[k for k in required if k!='dependency_readiness']))]:
            result=migration.evaluate(shadow,self.request(shadow,'validated',**changes),records,now=self.now)
            self.assertEqual(result['status'],'switch_refused');self.assertEqual(result['state'],shadow)
            self.assertTrue(result['existing_work_allowed']);self.assertTrue(result['existing_runtime_unchanged'])
        records=self.evidence(shadow,required);records[1]['outcome']='fail'
        result=migration.evaluate(shadow,self.request(shadow,'validated'),records,now=self.now)
        self.assertIn('evidence_failed_existing_work_continues',result['reasons'])

    def test_active_customer_job_blocks_cutover_until_drain_evidence(self):
        state=self.canary();required=self.policy['transition_evidence']['canary->cutover']
        records=self.evidence(state,required)
        result=migration.evaluate(state,self.request(state,'cutover',active_customer_jobs=1),records,now=self.now)
        self.assertEqual(result['status'],'switch_refused');self.assertTrue(result['existing_work_allowed'])
        missing=[r for r in records if r['kind']!='drain_complete']
        self.assertEqual(migration.evaluate(state,self.request(state,'cutover'),missing,now=self.now)['status'],'switch_refused')
        cutover=self.advance(state,'cutover');retired=self.advance(cutover,'retired');self.assertEqual(retired['phase'],'retired')

    def test_rollback_is_reviewed_proposal_not_a_process_command(self):
        state=self.advance(self.canary(),'cutover')
        request=self.request(state,'validated',action='rollback')
        result=migration.evaluate(state,request,self.evidence(state,self.policy['rollback_evidence']),now=self.now)
        self.assertEqual(result['state']['phase'],'validated');self.assertFalse(result['runtime_execution_authorized'])
        command=self.request(state,'validated',action='rollback',command='stop-existing-runtime')
        refused=migration.evaluate(state,command,[],now=self.now)
        self.assertIn('unsupported_request_fields_no_commands_allowed',refused['reasons'])
        self.assertTrue(refused['existing_work_allowed'])

    def test_context_and_replacement_changes_require_reinventory_or_revalidation(self):
        state=self.canary();request=self.request(state,'cutover')
        for key in ['tenant_id','project_id','source_version','runtime_id']:
            changed=copy.deepcopy(request);changed['context'][key]='changed'
            self.assertEqual(migration.evaluate(state,changed,[],now=self.now)['status'],'switch_refused')
        request['replacement_version']='replacement-v2'
        self.assertIn('replacement_context_changed_revalidation_required',migration.evaluate(state,request,[],now=self.now)['reasons'])

    def test_duplicate_and_concurrent_decisions_have_one_revision(self):
        coordinator=migration.MigrationCoordinator(self.state)
        request=self.request(self.state,'shadow');start=threading.Barrier(2)
        def run(_):start.wait(timeout=5);return coordinator.apply(request,[],now=self.now)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(run,range(2)))
        self.assertEqual(sorted(r['status'] for r in results),['decision_already_recorded','decision_recorded_only'])
        self.assertEqual(coordinator.readback()['revision'],1)
        changed=dict(request,active_customer_jobs=1)
        self.assertIn('idempotency_key_payload_conflict',coordinator.apply(changed,[],now=self.now)['reasons'])
        other=dict(request,decision_id='different-id')
        self.assertIn('revision_conflict_retry_from_authoritative_readback',coordinator.apply(other,[],now=self.now)['reasons'])

    def test_unknown_external_host_auditable_but_not_switchable(self):
        context=dict(self.context,execution_environment='unknown-external-host')
        inventory=migration.initial_state(context);shadow=self.advance(inventory,'shadow')
        result=migration.evaluate(shadow,self.request(shadow,'validated'),self.evidence(shadow,self.policy['transition_evidence']['shadow->validated']),now=self.now)
        self.assertIn('external_execution_environment_unverified',result['reasons']);self.assertTrue(result['existing_work_allowed'])
        for invalid in [dict(self.context,ownership='customer_project'),dict(self.context,repository='Affilinet Portal Aachen')]:
            with self.assertRaises(ValueError):migration.initial_state(invalid)

    def test_stale_lease_and_wrong_scope_evidence_refuse_switch(self):
        state=self.canary();records=self.evidence(state,self.policy['transition_evidence']['canary->cutover'])
        stale=copy.deepcopy(records);stale[-1]['expires_at']=self.now.isoformat()
        self.assertIn('stale_or_future_evidence',migration.evaluate(state,self.request(state,'cutover'),stale,now=self.now)['reasons'])
        wrong=copy.deepcopy(records);wrong[0]['context']['tenant_id']='other-tenant'
        self.assertIn('evidence_scope_or_replacement_mismatch',migration.evaluate(state,self.request(state,'cutover'),wrong,now=self.now)['reasons'])


    def test_cli_rejects_fifo_links_and_oversized_input_without_blocking(self):
        tool=Path(migration.__file__).resolve()
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            fifo=root/'scenario-fifo.json';os.mkfifo(fifo)
            regular=root/'scenario.json';regular.write_text('{}')
            hard=root/'hard.json';os.link(regular,hard)
            symlink=root/'linked.json';symlink.symlink_to(regular)
            actual_dir=root/'actual';actual_dir.mkdir();(actual_dir/'scenario.json').write_text('{}')
            dir_link=root/'linked-dir';dir_link.symlink_to(actual_dir,target_is_directory=True)
            large=root/'large.json';large.write_bytes(b' '*(migration.SCENARIO_MAX_BYTES+1))
            for path in [fifo,hard,symlink,dir_link/'scenario.json',large]:
                with self.subTest(path=path.name):
                    result=subprocess.run([sys.executable,str(tool),'--scenario',str(path)],capture_output=True,text=True,timeout=3)
                    self.assertEqual(result.returncode,2,result.stderr)
                    body=json.loads(result.stdout);self.assertEqual(body['status'],'scenario_rejected')
                    self.assertTrue(body['existing_runtime_unchanged']);self.assertTrue(body['existing_work_allowed'])
                    self.assertEqual(result.stderr,'')

    def test_scenario_reader_enforces_actual_read_limit_and_sensitive_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);scenario=root/'scenario.json';scenario.write_text('{}')
            # Simulates growth after an initially acceptable stat: actual bytes remain bounded.
            with mock.patch.object(migration.os,'read',return_value=b'x'*65536):
                with self.assertRaises(ValueError):migration.read_scenario(scenario)
            sensitive=root/'auth.json';sensitive.write_text('DO_NOT_READ_SYNTHETIC')
            with mock.patch.object(migration.os,'open',side_effect=AssertionError('must reject before opening')):
                with self.assertRaises(ValueError):migration.read_scenario(sensitive)
            scenario.write_text(json.dumps(dict(state=self.state,request=self.request(self.state,'shadow'),evidence=[],now=self.now.isoformat())))
            self.assertEqual(migration.read_scenario(scenario)['state'],self.state)


if __name__=='__main__':unittest.main()
