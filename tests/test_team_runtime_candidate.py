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


if __name__=='__main__':unittest.main()
