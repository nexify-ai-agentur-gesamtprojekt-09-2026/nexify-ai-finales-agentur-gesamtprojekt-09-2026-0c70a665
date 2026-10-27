"""Offline contract negative tests; no connector, scheduler or acceptance activation."""
import copy
import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('workflow', Path(__file__).resolve().parents[1] / 'tools/verify_workflow_record.py')
workflow = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(workflow)


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'source.md').write_text('synthetic project source')
        (self.root / 'proof.txt').write_text('synthetic local proof')
        self.now = '2026-10-27T04:00:00Z'
        source = dict(id='SRC-1', path='source.md', status='verified_local',
                      sha256=workflow.local_hash(self.root, 'source.md'), observed_at=self.now)
        proof = dict(id='TEST-1', path='proof.txt', sha256=workflow.local_hash(self.root, 'proof.txt'),
                     observed_at=self.now, source_hashes={'SRC-1':source['sha256']},
                     project='fixture', tenant=None, stage='documented', kind='local_record')
        task = dict(id='STEP-1', owner='fixture-author', project='fixture', tenant=None, status='delivered_with_gaps',
                    source_ids=['SRC-1'], dependencies=[], next_step='review', rollback='discard local fixture',
                    created_at=self.now, updated_at=self.now, due_at=self.now,
                    stages={s:s == 'documented' for s in workflow.STAGES}, evidence={'documented':['TEST-1']})
        self.record = dict(schema_version=1, controller='AIFly', sources=[source], evidence=[proof], tasks=[task])

    def test_valid_offline_record_does_not_activate_runtime(self):
        self.assertFalse(workflow.verify(self.record, self.root)['runtime_activated'])

    def test_drift_scope_forgery_missing_evidence_and_stage_skips_fail(self):
        mutations = [
            lambda r: r['sources'][0].update(sha256='0'*64),
            lambda r: r['evidence'][0].update(tenant='other'),
            lambda r: r['tasks'][0].update(evidence={}),
            lambda r: r['tasks'][0]['stages'].update(connected=True),
            lambda r: r['tasks'][0].update(status='done'),
            lambda r: r['tasks'][0].update(dependencies=['MISSING']),
            lambda r: r['sources'].append(copy.deepcopy(r['sources'][0])),
        ]
        for mutate in mutations:
            with self.subTest(mutation=mutate):
                record=copy.deepcopy(self.record); mutate(record)
                with self.assertRaises(ValueError): workflow.verify(record,self.root)

    def test_cycles_and_unknown_runtime_tenant_fail(self):
        record=copy.deepcopy(self.record)
        other=copy.deepcopy(record['tasks'][0]); other['id']='STEP-2'; other['dependencies']=['STEP-1']
        record['tasks'][0]['dependencies']=['STEP-2']; record['tasks'].append(other)
        with self.assertRaisesRegex(ValueError,'dependency_cycle'): workflow.verify(record,self.root)
        record=self.runtime_record()
        record['tasks'][0]['tenant']=None
        for item in record['evidence']: item['tenant']=None
        with self.assertRaisesRegex(ValueError,'verified_runtime_tenant'): workflow.verify(record,self.root)

    def runtime_record(self):
        record=copy.deepcopy(self.record); task=record['tasks'][0]; task['tenant']='fixture-tenant'
        record['evidence']=[]; task['evidence']={}
        for stage in workflow.STAGES[:4]:
            proof=copy.deepcopy(self.record['evidence'][0]); proof.update(id=stage,stage=stage,tenant=task['tenant'],kind='runtime_receipt')
            record['evidence'].append(proof); task['evidence'][stage]=[stage]; task['stages'][stage]=True
        return record

    def test_brain_cannot_claim_connection_without_exact_ordered_content_readback(self):
        record=self.runtime_record(); task=record['tasks'][0]; task['integration']='external_brain'
        with self.assertRaisesRegex(ValueError,'brain_receipt_chain'): workflow.verify(record,self.root)
        task['brain_receipts']=[dict(action=action,evidence_id='connected',tenant=task['tenant'],project=task['project'],
            target='fixture-only',content_sha256='a'*64,observed_at=self.now)
            for action in ['WRITE','INDEX','EXACT_READ_BACK','CONTENT_COMPARE']]
        self.assertFalse(workflow.verify(record,self.root)['external_receipts_independently_verified'])
        task['brain_receipts'][-1]['content_sha256']='b'*64
        with self.assertRaisesRegex(ValueError,'brain_content_compare'): workflow.verify(record,self.root)

    def test_acceptance_requires_independent_review_and_restore(self):
        record=self.runtime_record(); task=record['tasks'][0]
        for stage in ('live_tested','accepted'):
            proof=copy.deepcopy(record['evidence'][-1]); proof.update(id=stage,stage=stage)
            record['evidence'].append(proof); task['evidence'][stage]=[stage]; task['stages'][stage]=True
        with self.assertRaisesRegex(ValueError,'independent_review'): workflow.verify(record,self.root)
