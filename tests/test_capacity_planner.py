"""Synthetic fixtures are calculation examples, not measured production values."""
import copy
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('capacity_planner', ROOT / 'tools/capacity_planner.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
NOW = datetime(2026, 10, 26, tzinfo=timezone.utc)


def fixture():
    evidence = {'kind':'measured','evidence_ref':'synthetic-test-fixture','sha256':'a'*64,'measured_at':'2026-10-25T00:00:00Z'}
    host = {'id':'h1','project':'agency','tenant':'t1','residency':'DE','affinities':['api'], 'measurement':dict(evidence,host_id='h1',window_seconds=600),'capacity_basis':'physical_host_no_cgroup',
        'capacity':dict(cpu_cores=8,ram_bytes=1000000000,disk_bytes=100000000000,disk_iops=10000,network_bytes_per_second=10000000),
        'baseline_peak':dict(cpu_cores=1,ram_bytes=100000000,disk_bytes=1000000000,disk_iops=100,network_bytes_per_second=1000)}
    workload = {'id':'w1','host_id':'h1','project':'agency','tenant':'t1','residency':'DE','affinity':'api','dependencies':[],
        'measurement':dict(evidence,host_id='h1',window_seconds=600,workload_sha256='b'*64,input_class='synthetic',cache_state='cold',concurrency_min=0,concurrency_max=100),'profile':dict(known_rps_min=0,known_rps_max=100,cpu_seconds_per_request=.1,
        mean_latency_seconds=.2,peak_inflight_per_rps=.4,resident_ram_bytes=10000000,ram_bytes_per_inflight_request=1000000,
        disk_resident_bytes=100000000,disk_growth_bytes_per_request=100,retention_seconds=3600,backup_copies=1,
        iops_per_request=2,network_bytes_per_request=2000),'external_api':None}
    return {'schema_version':1,'hosts':[host],'workloads':[workload],'scenarios':[{'id':'normal','horizon_seconds':86400,'rps_by_workload':{'w1':10}}]}


class CapacityTests(unittest.TestCase):
    def setUp(self):
        self.doc=fixture(); self.policy=json.loads((ROOT/'config/capacity-policy.json').read_text())
    def run_plan(self):
        return m.plan(self.doc,self.policy,now=NOW)
    def test_cpu_ram_little_law_disk_retention_backups_and_no_sideeffects(self):
        before=copy.deepcopy(self.doc); out=self.run_plan(); scenario=out['scenarios'][0]
        self.assertEqual(scenario['status'],'planning_envelope_fits_measured_range')
        row=scenario['workloads'][0]
        self.assertEqual(row['mean_inflight_little_law'],2)
        self.assertEqual(row['planning_inflight_from_measured_peak_ratio'],4)
        self.assertEqual(row['incremental_demand']['cpu_cores'],1)
        self.assertEqual(row['incremental_demand']['ram_bytes'],14000000)
        self.assertEqual(row['incremental_demand']['disk_bytes'],207200000)
        self.assertFalse(out['placement_approved']); self.assertFalse(out['existing_workloads_modified'])
        self.assertEqual(self.doc,before)
    def test_aggregate_nonoversubscription_and_headroom(self):
        self.doc['hosts'][0]['capacity']['cpu_cores']=4
        second=copy.deepcopy(self.doc['workloads'][0]);second['id']='w2';self.doc['workloads'].append(second)
        self.doc['scenarios'][0]['rps_by_workload']={'w1':15,'w2':15}
        out=self.run_plan()['scenarios'][0]
        self.assertIn('h1:insufficient:cpu_cores',out['issues'])
        self.assertEqual(out['hosts'][0]['resources']['cpu_cores']['available_for_incremental_work'],2)
    def test_missing_host_and_workload_measurements_are_not_ready(self):
        self.doc['hosts'][0]['capacity']['disk_iops']=None
        del self.doc['workloads'][0]['profile']['cpu_seconds_per_request']
        self.doc['hosts'][0]['measurement']=None
        out=self.run_plan()['scenarios'][0]
        self.assertEqual(out['status'],'not_ready_for_placement')
        self.assertIn('w1:missing:cpu_seconds_per_request',out['issues'])
        self.assertIn('host:h1:measurement_missing',out['issues'])
        self.doc=fixture();self.doc['workloads'][0]['profile']=None
        output=self.run_plan()
        self.assertEqual(output['scenarios'][0]['status'],'not_ready_for_placement')
        self.assertFalse(output['existing_workloads_modified'])
        self.assertIsNone(self.doc['workloads'][0]['profile'])
        self.assertIsNone(output['scenarios'][0]['hosts'][0]['resources']['cpu_cores']['incremental_demand'])
    def test_assumption_stale_future_metadata_never_becomes_measurement(self):
        for change in [{'kind':'assumed'},{'measured_at':'2025-01-01T00:00:00Z'},{'measured_at':'2027-01-01T00:00:00Z'}]:
            self.doc=fixture();self.doc['workloads'][0]['measurement'].update(change)
            self.assertEqual(self.run_plan()['scenarios'][0]['status'],'not_ready_for_placement')
    def test_forecast_outside_measured_range_requires_benchmark(self):
        self.doc['scenarios'].append({'id':'surge','horizon_seconds':100,'rps_by_workload':{'w1':101}})
        out=self.run_plan()['scenarios']
        self.assertEqual(out[0]['status'],'planning_envelope_fits_measured_range')
        self.assertIn('w1:outside_measured_demand_range',out[1]['issues'])
    def test_peak_concurrency_cannot_be_lower_than_little_law_mean(self):
        self.doc['workloads'][0]['profile']['peak_inflight_per_rps']=.1
        self.assertIn('w1:peak_concurrency_below_little_law_mean',self.run_plan()['scenarios'][0]['issues'])
    def test_concurrency_lower_bound_and_zero_demand_require_measured_coverage(self):
        self.doc['workloads'][0]['measurement']['concurrency_min']=10
        result=self.run_plan()['scenarios'][0]
        self.assertEqual(result['workloads'][0]['planning_inflight_from_measured_peak_ratio'],4)
        self.assertEqual(result['status'],'not_ready_for_placement')
        self.assertIn('w1:outside_measured_concurrency_range',result['issues'])
        self.doc['scenarios'][0]['rps_by_workload']['w1']=0
        self.assertIn('w1:outside_measured_concurrency_range',self.run_plan()['scenarios'][0]['issues'])
        self.doc['workloads'][0]['measurement']['concurrency_min']=0
        self.assertEqual(self.run_plan()['scenarios'][0]['status'],'planning_envelope_fits_measured_range')
        self.doc['scenarios'][0]['rps_by_workload']['w1']=25
        self.doc['workloads'][0]['measurement']['concurrency_min']=10
        self.assertEqual(self.run_plan()['scenarios'][0]['status'],'planning_envelope_fits_measured_range')
    def test_scope_residency_affinity_and_missing_dependency_block(self):
        w=self.doc['workloads'][0];w['tenant']='another';w['residency']='US';w['affinity']='gpu';w['dependencies']=['unknown']
        issues=self.run_plan()['scenarios'][0]['issues']
        self.assertIn('w1:placement_scope_or_affinity_mismatch',issues)
        self.assertIn('w1:missing_dependency:unknown',issues)
    def test_cycle_invalid_dependency_and_inactive_dependency(self):
        self.doc['workloads'][0]['dependencies']=['w1']
        with self.assertRaises(m.PlanError):self.run_plan()
        self.doc=fixture();second=copy.deepcopy(self.doc['workloads'][0]);second['id']='w2';second['tenant']='t2'
        self.doc['workloads'].append(second);self.doc['workloads'][0]['dependencies']=['w2'];self.doc['scenarios'][0]['rps_by_workload']['w2']=0
        issues=self.run_plan()['scenarios'][0]['issues']
        self.assertIn('w1:dependency_scope_mismatch',issues)
        self.assertIn('w1:dependency_has_no_planned_service_demand',issues)
    def test_external_llm_cost_does_not_allocate_vendor_weights_to_ram(self):
        ram=self.run_plan()['scenarios'][0]['workloads'][0]['incremental_demand']['ram_bytes']
        evidence={k:v for k,v in self.doc['hosts'][0]['measurement'].items() if k not in {'host_id','window_seconds'}};evidence['kind']='documented'
        self.doc['workloads'][0]['external_api']=dict(kind='vendor_llm',currency='EUR',rate_evidence=evidence,
            input_tokens_per_request_upper=1000,output_tokens_per_request_upper=500,input_per_million=2,output_per_million=4,
            request_fee_upper=.001,approved_request_budget=900000)
        out=self.run_plan()['scenarios'][0]
        self.assertAlmostEqual(out['external_cost_upper_by_currency']['EUR'],4320)
        self.assertEqual(out['workloads'][0]['incremental_demand']['ram_bytes'],ram)
        self.doc['workloads'][0]['external_api']['approved_request_budget']=10
        self.assertIn('w1:request_budget_exceeded',self.run_plan()['scenarios'][0]['issues'])
        self.doc['workloads'][0]['external_api']['output_per_million']=None
        self.assertIn('w1:external_cost_or_budget_measurement_missing',self.run_plan()['scenarios'][0]['issues'])
    def test_partial_cost_subtotal_is_not_an_upper_bound_and_unknown_currency_is_explicit(self):
        evidence={k:v for k,v in self.doc['hosts'][0]['measurement'].items() if k not in {'host_id','window_seconds'}};evidence['kind']='documented'
        api=dict(kind='vendor_llm',currency='EUR',rate_evidence=evidence,input_tokens_per_request_upper=1000,
            output_tokens_per_request_upper=500,input_per_million=2,output_per_million=4,
            request_fee_upper=.001,approved_request_budget=900000)
        self.doc['workloads'][0]['external_api']=api
        second=copy.deepcopy(self.doc['workloads'][0]);second['id']='w2';second['external_api']['output_per_million']=None
        self.doc['workloads'].append(second);self.doc['scenarios'][0]['rps_by_workload']['w2']=10
        result=self.run_plan()['scenarios'][0]
        self.assertAlmostEqual(result['external_cost_known_subtotal_by_currency']['EUR'],4320)
        self.assertIsNone(result['external_cost_upper_by_currency']['EUR'])
        self.assertFalse(result['external_cost_estimate_complete'])
        self.assertFalse(result['external_cost_currency_unknown'])
        second['external_api']['currency']=None
        result=self.run_plan()['scenarios'][0]
        self.assertTrue(result['external_cost_currency_unknown'])
        self.assertIsNone(result['external_cost_upper_by_currency']['EUR'])
        self.assertEqual(result['status'],'not_ready_for_placement')

    def test_invalid_units_negative_boolean_nonfinite_and_duplicates(self):
        for value in [-1,True,float('nan'),float('inf'),'10ms']:
            self.doc=fixture();self.doc['workloads'][0]['profile']['cpu_seconds_per_request']=value
            with self.assertRaises((m.PlanError,ValueError)):self.run_plan()
        self.doc=fixture();self.doc['hosts'].append(copy.deepcopy(self.doc['hosts'][0]))
        with self.assertRaises(m.PlanError):self.run_plan()
        with self.assertRaises(m.PlanError):m.parse('{"a":1,"a":2}')
    def test_limits_and_unknown_units_fail(self):
        self.policy['max_workloads']=1;self.doc['workloads']*=2
        with self.assertRaises(m.PlanError):self.run_plan()
        self.doc=fixture();self.doc['workloads'][0]['profile']['cpu_ms']=100
        with self.assertRaises(m.PlanError):self.run_plan()
    def test_reader_rejects_symlinks_hardlinks_fifo_secrets_and_size(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);file=root/'profile.json';file.write_text('{}')
            self.assertEqual(m.bounded_read(file,10),b'{}')
            (root/'link.json').symlink_to(file);os.link(file,root/'hard.json');os.mkfifo(root/'pipe.json')
            for name in ('profile.json','link.json','hard.json','pipe.json'):
                with self.assertRaises((m.PlanError,OSError)):m.bounded_read(root/name,10)
            (root/'large.json').write_text('x'*20)
            with self.assertRaises(m.PlanError):m.bounded_read(root/'large.json',10)
            (root/'secret.json').write_text('{}')
            with self.assertRaises(m.PlanError):m.bounded_read(root/'secret.json',10)


if __name__=='__main__':unittest.main()
