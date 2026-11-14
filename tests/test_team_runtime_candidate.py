import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import check_team_runtime_candidate as candidate


class TeamCandidateTests(unittest.TestCase):
    def setUp(self):
        self.c=json.loads((ROOT/candidate.CONFIG).read_text())
        self.roles=json.loads((ROOT/'config/brain/agents.json').read_text())
        self.catalogue=json.loads((ROOT/self.c['enterprise_reference']['path']).read_text())
        self.skills=json.loads((ROOT/'config/integrations/small-business.json').read_text())
        self.policy=json.loads((ROOT/'config/llm-policy.json').read_text())

    def validate(self):
        return candidate.validate_candidate(self.c,self.roles,self.catalogue,self.skills,self.policy)

    def test_consistent_candidate_never_claims_dispatch_or_production(self):
        result=candidate.check(ROOT)
        self.assertEqual(result['status'],'configuration_consistent_not_runtime_ready')
        self.assertFalse(result['can_dispatch_external_worker'])
        self.assertFalse(result['production_accepted'])

    def test_duplicate_or_unknown_role_is_rejected(self):
        self.c['profiles'][-1]['role_id']='companion'
        with self.assertRaisesRegex(ValueError,'role_identity'):self.validate()

    def test_catalogue_assignments_do_not_become_workers(self):
        self.catalogue['enterprise_roles']['roles'][0]['executorAssignment']='made-up-worker'
        with self.assertRaisesRegex(ValueError,'not_executor'):self.validate()

    def test_skill_mutation_and_missing_roles_are_rejected(self):
        self.skills['plugin']['modified_upstream_files']=True
        with self.assertRaises(ValueError):self.validate()
        self.skills['plugin']['modified_upstream_files']=False
        self.catalogue['enterprise_roles']['roles'].pop()
        with self.assertRaises(ValueError):self.validate()

    def test_unverified_tool_binding_or_activation_is_rejected(self):
        self.c['profiles'][0]['tool_bindings']=['shell.exec']
        with self.assertRaises(ValueError):self.validate()
        self.c['profiles'][0]['tool_bindings']=[]
        self.c['activation']['new_daemon']=True
        with self.assertRaises(ValueError):self.validate()

    def test_unbounded_delegation_is_rejected_including_bool_integers(self):
        for field,value in [('max_wall_seconds',0),('max_concurrency',100),('max_steps',True)]:
            old=self.c['delegation_bounds'][field];self.c['delegation_bounds'][field]=value
            with self.assertRaisesRegex(ValueError,'unbounded'):self.validate()
            self.c['delegation_bounds'][field]=old

    def test_shared_customer_memory_or_missing_stage_is_rejected(self):
        self.c['memory']['shared_private_customer_index']=True
        with self.assertRaises(ValueError):self.validate()
        self.c['memory']['shared_private_customer_index']=False
        self.c['memory']['stages'].pop()
        with self.assertRaises(ValueError):self.validate()

    def test_self_declared_review_is_rejected(self):
        self.c['review']['settings_verified']=True
        with self.assertRaisesRegex(ValueError,'review_shortcut'):self.validate()

    def test_profiles_are_not_sandbox_and_fallback_is_not_allowed(self):
        self.c['runtime_candidates'][0]['profile_is_sandbox']=True
        with self.assertRaises(ValueError):self.validate()
        self.c['runtime_candidates'][0]['profile_is_sandbox']=False
        self.policy['model']['id']='different-model'
        with self.assertRaisesRegex(ValueError,'model_drift'):self.validate()

    def test_cross_tenant_clone_and_automatic_replacement_are_rejected(self):
        self.c['migration']['cross_tenant_state_clone']=True
        with self.assertRaises(ValueError):self.validate()

    def test_training_is_not_config_adaptation(self):
        self.c['adaptation']['weight_fine_tuning_performed']=True
        with self.assertRaisesRegex(ValueError,'weight_training'):self.validate()

    def test_same_count_with_invalid_skill_ids_is_rejected(self):
        self.catalogue['enterprise_roles']['roles'][0]['anthropicSkillIds']=['unknown-skill']
        with self.assertRaisesRegex(ValueError,'not_executor'):self.validate()

    def test_empty_activation_schema_is_rejected(self):
        self.c['activation']={}
        with self.assertRaisesRegex(ValueError,'unexpected_activation'):self.validate()

    def test_unknown_runtime_cannot_occupy_known_role(self):
        self.c['profiles'][0]['runtime_id']='unregistered-worker-runtime'
        with self.assertRaisesRegex(ValueError,'runtime_assignment'):self.validate()

    def test_coordinated_skill_rename_cannot_forge_upstream_identity(self):
        self.catalogue['original_skill_ids']=['invented' if s=='ticket-deflector' else s for s in self.catalogue['original_skill_ids']]
        for role in self.catalogue['enterprise_roles']['roles']:
            role['anthropicSkillIds']=['invented' if s=='ticket-deflector' else s for s in role['anthropicSkillIds']]
        with self.assertRaisesRegex(ValueError,'canonical_skill_binding'):self.validate()

    def test_manifest_modification_is_not_accepted_from_self_consistent_counts(self):
        self.skills['source_files'][0]['bytes']+=1
        with self.assertRaisesRegex(ValueError,'skill_manifest_drift'):self.validate()

    def test_cross_tenant_gateway_trust_domain_is_rejected(self):
        self.c['runtime_candidates'][1]['gateway_trust_domain']='shared_across_untrusted_tenants'
        with self.assertRaisesRegex(ValueError,'openclaw_trust_domain'):self.validate()

    # D-019: Hermes ist gewählte Orchestrierungs-Laufzeit, Kandidat bleibt nicht aktiviert.
    def test_d019_records_hermes_as_orchestration_runtime_without_activation(self):
        result=self.validate()
        block=self.c['orchestration_runtime']
        self.assertEqual(block['decision'],'DECISIONS.md#D-019')
        self.assertEqual(block['runtime_candidate_id'],'hermes-candidate')
        self.assertEqual(block['status'],'owner_selected_not_activated')
        self.assertEqual(self.c['status'],'candidate_not_runtime_activation')
        self.assertTrue(all(value is False for value in self.c['activation'].values()))
        self.assertEqual(result['orchestration_runtime'],'hermes-candidate_owner_selected_D-019_not_activated')
        self.assertIn('hermes_function_proof_and_per_profile_runtime_decision',result['open_gates'])
        self.assertFalse(result['can_dispatch_external_worker'])

    def test_missing_or_extended_orchestration_block_is_rejected(self):
        saved=self.c.pop('orchestration_runtime')
        with self.assertRaises(KeyError):self.validate()
        self.c['orchestration_runtime']={**saved,'activated':True}
        with self.assertRaisesRegex(ValueError,'orchestration_runtime_drift'):self.validate()
        self.c['orchestration_runtime']={k:v for k,v in saved.items() if k!='open'}
        with self.assertRaisesRegex(ValueError,'orchestration_runtime_drift'):self.validate()

    def test_orchestration_decision_cannot_claim_activation_authority_or_controller(self):
        for field,value in [('status','active'),('function_proof',True),('replaces_controller',True),
                            ('profile_runtime_assignment_changed',True),('grants_execution_authority',True),
                            ('repository_access','read_write'),('approvals_mode','off'),('third_party_message_channel',True),
                            ('function_proof',0),('decision','DECISIONS.md#D-014'),('runtime_candidate_id','openclaw-candidate'),
                            ('kind','role')]:
            with self.subTest(field=field,value=value):
                old=self.c['orchestration_runtime'][field];self.c['orchestration_runtime'][field]=value
                with self.assertRaisesRegex(ValueError,'orchestration_runtime_drift'):self.validate()
                self.c['orchestration_runtime'][field]=old
        self.validate()

    def test_open_points_of_d019_cannot_be_dropped_silently(self):
        self.c['orchestration_runtime']['open'].pop()
        with self.assertRaisesRegex(ValueError,'orchestration_runtime_drift'):self.validate()

    def test_execution_authority_is_unchanged_for_every_role(self):
        self.assertEqual({p['execution_authority'] for p in self.c['profiles']},{candidate.EXECUTION_AUTHORITY})
        for index in range(len(self.c['profiles'])):
            with self.subTest(role=self.c['profiles'][index]['role_id']):
                old=self.c['profiles'][index]['execution_authority'];self.c['profiles'][index]['execution_authority']='granted_by_D-019'
                with self.assertRaisesRegex(ValueError,'execution_authority_changed'):self.validate()
                self.c['profiles'][index]['execution_authority']=old

    def test_d019_does_not_move_roles_onto_hermes(self):
        self.assertEqual({p['role_id'] for p in self.c['profiles'] if p['runtime_id']=='hermes-candidate'},{'triage','angebot'})
        for role in ('orchestrator','pruefer','waechter','baumeister'):
            profile=next(p for p in self.c['profiles'] if p['role_id']==role)
            old=profile['runtime_id'];profile['runtime_id']='hermes-candidate'
            with self.assertRaisesRegex(ValueError,'runtime_assignment'):self.validate()
            profile['runtime_id']=old

    def test_controller_is_not_replaced_by_d019(self):
        self.c['controller']='hermes'
        with self.assertRaisesRegex(ValueError,'controller_replacement'):self.validate()

    def test_hermes_installation_claim_is_bound_to_the_server_finding(self):
        hermes=self.c['runtime_candidates'][0]
        self.assertTrue((ROOT/hermes['remote_installation_source']).is_file())
        for field,value in [('remote_installation','installed_and_verified'),('remote_installation_source','ops/hermes/README.md'),('local_cli_detected',True)]:
            old=hermes[field];hermes[field]=value
            with self.assertRaisesRegex(ValueError,'hermes_installation_claim'):self.validate()
            hermes[field]=old
        for field in ('connected','installed_by_this_work','sampling_enabled','unrestricted_shell','automatic_skill_mutation'):
            hermes[field]=True
            with self.assertRaisesRegex(ValueError,'hermes_unverified_activation_or_scope'):self.validate()
            hermes[field]=False


class AutomationOrchestrationTests(unittest.TestCase):
    """config/automation.json sagt dasselbe wie D-019 und der Kandidat."""
    def setUp(self):
        self.entries={e['id']:e for e in json.loads((ROOT/'config/automation.json').read_text())['integrations']}

    def test_paperclip_is_kept_as_superseded_history(self):
        paperclip=self.entries['paperclip']
        self.assertEqual(paperclip['status'],'superseded_by_owner_decision_not_pursued')
        self.assertEqual(paperclip['previous_status'],'user_selected_not_verified')
        self.assertEqual((paperclip['superseded_by'],paperclip['decision']),('hermes','DECISIONS.md#D-019'))
        self.assertIs(paperclip['tool_exposed'],False)

    def test_hermes_is_selected_but_claims_no_operation_or_acceptance(self):
        hermes=self.entries['hermes']
        self.assertEqual(hermes['status'],'owner_selected_container_reported_not_verified')
        self.assertEqual(hermes['decision'],'DECISIONS.md#D-019')
        self.assertIs(hermes['tool_exposed'],False)
        self.assertIs(hermes['activated_by_repository'],False)
        self.assertIs(hermes['production_accepted'],False)
        observed=hermes['observed']
        self.assertEqual(observed['container_running_on'],'srv1941843')
        for field in ('version_verified','model_and_route_verified','server_configuration_verified','real_model_call_verified'):
            self.assertIs(observed[field],False,field)
        for ref in (hermes['model_policy_ref'],hermes['candidate_ref'],hermes['preparation_ref'],observed['source']):
            self.assertTrue((ROOT/ref).is_file(),ref)

    def test_automation_and_candidate_agree_on_d019(self):
        config=json.loads((ROOT/candidate.CONFIG).read_text())
        self.assertEqual(self.entries['hermes']['candidate_ref'],candidate.CONFIG)
        self.assertEqual(config['orchestration_runtime']['decision'],self.entries['hermes']['decision'])
        self.assertEqual(config['model_policy_ref'],self.entries['hermes']['model_policy_ref'])
        self.assertEqual(config['runtime_candidates'][0]['remote_installation_source'],self.entries['hermes']['observed']['source'])
        self.assertIn('D-019',(ROOT/'DECISIONS.md').read_text(encoding='utf-8'))

    def test_no_integration_is_exposed_as_tool(self):
        self.assertTrue(all(e['tool_exposed'] is False for e in self.entries.values()))


if __name__=='__main__':unittest.main()
