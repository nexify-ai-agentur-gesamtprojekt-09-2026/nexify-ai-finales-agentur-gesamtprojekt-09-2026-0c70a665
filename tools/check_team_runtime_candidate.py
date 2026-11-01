#!/usr/bin/env python3
"""Check a source-bound team candidate; never install, dispatch or grant rights."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import remediation_queue as rq

ROOT = Path(__file__).resolve().parents[1]
CONFIG = 'config/integrations/nexify-team-runtime-candidate.json'
STAGES = ['WRITE', 'INDEX', 'EXACT_READ_BACK', 'CONTENT_COMPARE']
ROLE_IDS = {'companion','baumeister','pruefer','recherche','triage','angebot','wissen','orchestrator','waechter'}
ROLE_RUNTIMES = {'companion':'managed-gateway','baumeister':'codex-existing','pruefer':'codex-code-review','recherche':'session-native','triage':'hermes-candidate','angebot':'hermes-candidate','wissen':'local-control','orchestrator':'existing-coordinator','waechter':'systemmaster-read-only'}
ACTIVATION_KEYS = {'new_daemon','new_scheduler','automatic_external_messages','public_cutover','global_tool_or_model_config_changed'}
SOURCE_FILES_DIGEST = '1bc88e95a55c44cf3c0a14a7a8cc081cdbe5c539f0ee1b549f8e2161c8c3b7b9'
ORIGINAL_INVENTORY = '4f6eda6f2d56a3080bb39506eb897c494c8ba4be7c267034e14e89e49d17105e'


def need(condition, code):
    if not condition:
        raise ValueError(code)


def validate_candidate(config, roles, catalogue, skill_library, llm_policy):
    """Static consistency only; success is deliberately NOT runtime acceptance."""
    need(config['schema_version'] == 1 and config['status'] == 'candidate_not_runtime_activation', 'candidate_scope')
    need(config['controller'] == 'existing_NeX_Agentic_AIFly_no_second_queue', 'controller_replacement')
    need(config['canonical_roles_path'] == 'config/brain/agents.json' and config['skill_library_ref'] == 'config/integrations/small-business.json', 'canonical_reference')
    need(config['model_policy_ref'] == 'config/llm-policy.json', 'model_policy_reference')
    need(set(config['activation'])==ACTIVATION_KEYS and all(value is False for value in config['activation'].values()), 'unexpected_activation')
    profiles=config['profiles']
    need(isinstance(profiles,list) and len(profiles)==9 and {p['role_id'] for p in profiles} == ROLE_IDS == set(roles['agenten']), 'role_identity_or_duplicate')
    need(all(p['runtime_id']==ROLE_RUNTIMES[p['role_id']] for p in profiles), 'runtime_assignment')
    need(all(p['delegation'] is False and p['connected_worker_id'] is None and p['tool_bindings']==[] for p in profiles), 'unverified_worker_or_tool_binding')
    bounds=config['delegation_bounds']
    need(all(type(bounds[key]) is int and 1 <= bounds[key] <= maximum for key,maximum in [('max_concurrency',4),('max_depth',1),('max_steps',20),('max_wall_seconds',900)]), 'unbounded_delegation')
    need(bounds['writer_per_physical_resource']==1 and bounds['paid_calls_enabled'] is False and bounds['shared_monetary_budget'] is None, 'unfunded_or_duplicate_writer')
    memory=config['memory']
    need(memory['scope']=='tenant_project' and memory['stages']==STAGES and memory['connected'] is False and memory['shared_private_customer_index'] is False and memory['external_transcript_export'] is False, 'memory_scope_or_receipt_shortcut')
    migration=config['migration']
    need(migration['mode']=='audit_shadow' and migration['preserve_existing_jobs'] is True and migration['preserve_AGENTS_writer'] is True and migration['cross_tenant_state_clone'] is False and migration['automatic_replacement'] is False, 'unsafe_migration')
    reference=config['enterprise_reference']
    need(reference['roles']==reference['skills']==44 and reference['originals_immutable'] is True, 'catalogue_claim')
    er=catalogue['enterprise_roles']['roles']; skills=catalogue['original_skill_ids']
    manifest=skill_library['source_files']
    need(skill_library['source']['commit']=='33d3dea41a341b341d4f5da2e8801ae0c89be2b8' and hashlib.sha256(json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()).hexdigest()==SOURCE_FILES_DIGEST, 'skill_manifest_drift')
    canonical_skills={row['path'].split('/')[2] for row in manifest if row['path'].startswith('small-business/skills/') and row['path'].endswith('/SKILL.md') and len(row['path'].split('/'))==4}
    need(len(canonical_skills)==44 and set(skills)==canonical_skills and catalogue['original_skill_inventory_sha256']==ORIGINAL_INVENTORY, 'canonical_skill_binding')
    need(len(er)==44 and {r['id'] for r in er}=={f'ER-{n:02}' for n in range(1,45)}, 'enterprise_role_count_or_identity')
    need(len(skills)==44 and len(set(skills))==44 and skill_library['skills_count']==44 and skill_library['plugin']['modified_upstream_files'] is False, 'original_skill_count_or_mutation')
    need(all(r['executorAssignment'] is None and set(r['anthropicSkillIds']) <= set(skills) for r in er), 'catalogue_is_not_executor')
    need(len(catalogue['enterprise_roles']['clusters'])==8 and sorted(r for c in catalogue['enterprise_roles']['clusters'] for r in c['roleIds'])==sorted(r['id'] for r in er), 'cluster_coverage')
    engines={r['id']:r for r in config['runtime_candidates']}
    need(len(engines)==len(config['runtime_candidates'])==2, 'runtime_candidate_identity')
    hermes=engines['hermes-candidate']; claw=engines['openclaw-candidate']
    need(hermes['commit']=='bf0203a794a07aac3ff764972ab9087baa4e4f4e' and hermes['release']=='v0.22.5' and hermes['supported_python_major_minor']==[3,14], 'hermes_source_drift')
    need(hermes['connected'] is False and hermes['installed_by_this_work'] is False and hermes['profile_is_sandbox'] is False and hermes['sampling_enabled'] is False and hermes['unrestricted_shell'] is False and hermes['automatic_skill_mutation'] is False, 'hermes_unverified_activation_or_scope')
    need(claw['commit']=='8b18b5578f66eab1501cba4cef2310d88bfb9a41' and claw['release']=='v2026.10.9' and claw['selected_for_install'] is False and claw['connected'] is False, 'openclaw_source_or_activation')
    need(claw['gateway_trust_domain']=='one_mutual_trust_domain_not_shared_across_untrusted_tenants', 'openclaw_trust_domain')
    need(llm_policy['model']['id']=='deepseek/deepseek-v4.1-flash-1017' and llm_policy['model']['reasoning_effort']=='high', 'managed_model_drift')
    review=config['review']
    need(review['required']=='Codex_Code_Review_at_exact_commit' and review['settings_verified'] is False and review['AGENTS_changed_by_this_work'] is False and review['independent_source_review_is_not_native_Codex_review'] is True, 'review_shortcut')
    need(config['adaptation']['weight_fine_tuning_performed'] is False and config['adaptation']['training_dataset_approved'] is False, 'unverified_weight_training')
    return {'status':'configuration_consistent_not_runtime_ready','operational_profiles':9,'enterprise_roles':44,'original_skills':44,
            'can_dispatch_external_worker':False,'production_accepted':False,'provider_calls':0,
            'open_gates':['actual_runtime_inventory','role_scoped_authenticated_adapters','durable_task_and_lease_binding','funding_and_capacity','tenant_memory_receipts','native_codex_review','runtime_restart_cancel_recovery_tests']}


def check(root=ROOT):
    paths=[CONFIG,'config/brain/agents.json','config/integrations/small-business.json','config/llm-policy.json']
    raw={path:rq.read_source(root,path) for path in paths}
    config=json.loads(raw[CONFIG]); reference=config['enterprise_reference']
    need(reference['path']=='docs/source-snapshots/team-blueprint-20261101/role-catalogue.json', 'catalogue_reference')
    snapshot=rq.read_source(root,reference['path'])
    need(hashlib.sha256(snapshot).hexdigest()==reference['sha256'], 'catalogue_hash_drift')
    result=validate_candidate(config,json.loads(raw[paths[1]]),json.loads(snapshot),json.loads(raw[paths[2]]),json.loads(raw[paths[3]]))
    result['source_hashes']={path:hashlib.sha256(value).hexdigest() for path,value in raw.items()}
    result['source_hashes'][reference['path']]=reference['sha256']
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--require-runtime-ready',action='store_true')
    args=parser.parse_args()
    try:
        result=check(); print(json.dumps(result,ensure_ascii=False,sort_keys=True))
        return 3 if args.require_runtime_ready else 0
    except (ValueError,KeyError,TypeError,OSError,rq.QueueError):
        print(json.dumps({'status':'candidate_invalid','can_dispatch_external_worker':False,'production_accepted':False}))
        return 2


if __name__=='__main__':
    raise SystemExit(main())
