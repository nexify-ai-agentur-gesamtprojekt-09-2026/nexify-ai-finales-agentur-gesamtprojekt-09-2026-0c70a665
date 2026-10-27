#!/usr/bin/env python3
"""Offline verification of the existing WorkflowRecord contract; never activates work."""
import argparse
import hashlib
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGES = ('documented', 'built', 'locally_tested', 'connected', 'live_tested', 'accepted')


def require(value, code):
    if not value:
        raise ValueError(code)


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    require(parsed.utcoffset() is not None, 'timezone_required')
    return parsed


def indexed(rows):
    require(isinstance(rows, list), 'records_required')
    result = {}
    for row in rows:
        require(isinstance(row.get('id'), str) and row['id'] and row['id'] not in result, 'unique_id_required')
        result[row['id']] = row
    return result


def local_hash(root, ref):
    path = Path(ref)
    require(not path.is_absolute() and '..' not in path.parts, 'local_reference_required')
    target = root / path
    require(not any(p.is_symlink() for p in [target, *target.parents]), 'symlink_forbidden')
    require(target.is_file() and target.stat().st_nlink == 1 and target.stat().st_size <= 2_000_000,
            'bounded_regular_file_required')
    return hashlib.sha256(target.read_bytes()).hexdigest()


def verify(record, root=ROOT):
    root = Path(root).absolute()
    require(record['schema_version'] == 1 and record['controller'] == 'AIFly', 'workflow_version_or_controller')
    sources, evidence, tasks = (indexed(record[key]) for key in ('sources', 'evidence', 'tasks'))
    for source in sources.values():
        timestamp(source['observed_at'])
        if source['status'] == 'missing':
            require(source['sha256'] is None, 'missing_source_cannot_have_verified_hash')
        else:
            require(source['status'] == 'verified_local' and local_hash(root, source['path']) == source['sha256'], 'source_drift')
    for item in evidence.values():
        timestamp(item['observed_at'])
        require(local_hash(root, item['path']) == item['sha256'], 'evidence_drift')
        require(item['source_hashes'] and all(key in sources and sources[key]['status'] == 'verified_local'
                    and sources[key]['sha256'] == value for key, value in item['source_hashes'].items()), 'evidence_source_binding')
    for task in tasks.values():
        for field in ('owner', 'project', 'next_step', 'rollback'):
            require(isinstance(task[field], str) and task[field].strip(), 'task_field_required:' + field)
        require(task['tenant'] is None or isinstance(task['tenant'], str) and task['tenant'].strip(), 'tenant_required_or_explicit_unknown')
        require(task['status'] in {'open', 'in_progress', 'blocked', 'delivered_with_gaps', 'done'}, 'task_status')
        require(timestamp(task['updated_at']) >= timestamp(task['created_at']), 'task_time_order')
        timestamp(task['due_at'])
        require(task['source_ids'] and all(s in sources for s in task['source_ids']), 'task_sources')
        require(all(d in tasks and d != task['id'] for d in task['dependencies']), 'dependency_reference')
        require(set(task['stages']) == set(STAGES), 'separate_delivery_stages_required')
        require(all(type(v) is bool for v in task['stages'].values()), 'stage_boolean_required')
        seen_unverified = False
        for stage in STAGES:
            completed = task['stages'][stage]
            require(not completed or not seen_unverified, 'stage_order')
            seen_unverified |= not completed
            refs = task['evidence'].get(stage, [])
            require(not completed or refs, 'stage_evidence_required')
            for ref in refs:
                require(ref in evidence, 'unknown_evidence')
                item = evidence[ref]
                require(item['stage'] == stage and item['project'] == task['project'] and item['tenant'] == task['tenant'], 'evidence_scope_or_stage')
                require(all(s in item['source_hashes'] for s in task['source_ids']), 'task_evidence_source_binding')
            if completed and stage in {'connected', 'live_tested', 'accepted'}:
                require(task['tenant'] is not None, 'verified_runtime_tenant_required')
                require(all(evidence[r]['kind'] == 'runtime_receipt' for r in refs), 'runtime_receipt_required')
            if completed and stage == 'accepted':
                require(all(evidence[r].get('reviewer') not in {None, '', task['owner']} and
                            evidence[r].get('rollback_test_ref') in evidence for r in refs), 'independent_review_and_restore_required')
        require(task['status'] != 'done' or task['stages']['accepted'], 'done_requires_acceptance')
        if task['stages']['connected']:
            require(all(tasks[d]['stages']['connected'] for d in task['dependencies']), 'runtime_dependency_not_ready')
        if task.get('integration') == 'external_brain' and task['stages']['connected']:
            chain = task.get('brain_receipts', [])
            require([r['action'] for r in chain] == ['WRITE', 'INDEX', 'EXACT_READ_BACK', 'CONTENT_COMPARE'], 'brain_receipt_chain')
            for receipt in chain:
                require(receipt['evidence_id'] in task['evidence']['connected'], 'brain_receipt_evidence')
                require(receipt['tenant'] == task['tenant'] and receipt['project'] == task['project'], 'brain_scope')
            require(len({r['target'] for r in chain}) == 1 and bool(chain[0]['target']), 'brain_target')
            require(len({r['content_sha256'] for r in chain}) == 1 and
                    len(chain[0]['content_sha256']) == 64 and all(c in '0123456789abcdef' for c in chain[0]['content_sha256']), 'brain_content_compare')
            times = [timestamp(r['observed_at']) for r in chain]
            require(times == sorted(times), 'brain_receipt_order')
    def walk(key, ancestors):
        require(key not in ancestors, 'dependency_cycle')
        for child in tasks[key]['dependencies']:
            walk(child, ancestors | {key})
    for key in tasks:
        walk(key, set())
    return {'status': 'offline_contract_verified', 'tasks': len(tasks),
            'runtime_activated': False, 'external_receipts_independently_verified': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('record', nargs='?', default='config/integration-workflow.json')
    args = parser.parse_args()
    try:
        print(json.dumps(verify(json.loads((ROOT / args.record).read_text())), sort_keys=True))
    except (ValueError, KeyError, TypeError, OSError) as exc:
        parser.exit(1, 'workflow contract failed: ' + str(exc) + '\n')
