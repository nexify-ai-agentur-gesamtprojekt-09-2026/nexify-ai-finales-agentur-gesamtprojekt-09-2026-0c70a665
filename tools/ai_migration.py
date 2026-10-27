#!/usr/bin/env python3
"""Offline staged migration decisions. Never changes an existing runtime or executes commands."""
from __future__ import annotations
import argparse
import copy
import hashlib
import json
import os
import stat
from pathlib import Path
import re
import threading
from datetime import datetime, timezone

POLICY_PATH = Path(__file__).resolve().parents[1] / 'config/ai-migration-policy.json'
CONTEXT_FIELDS = {'repository', 'ownership', 'runtime_id', 'tenant_id', 'project_id', 'source_version', 'execution_environment'}
REQUEST_FIELDS = {'context', 'target_phase', 'expected_revision', 'decision_id', 'replacement_version', 'adapter_capability', 'active_customer_jobs', 'action'}
EVIDENCE_FIELDS = {'kind', 'context', 'replacement_version', 'source_sha256', 'receipt_ref', 'outcome', 'observed_at', 'expires_at'}


def load_policy():
    return json.loads(POLICY_PATH.read_text())


def _token(value):
    return isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}', value) is not None


def _context_valid(context, policy):
    return (isinstance(context, dict) and set(context) == CONTEXT_FIELDS
            and context['repository'] == policy['scope']['repository']
            and context['ownership'] == 'agency_owned'
            and all(_token(context[k]) for k in CONTEXT_FIELDS - {'repository', 'ownership'}))


def initial_state(context, policy=None):
    policy = policy or load_policy()
    if not _context_valid(context, policy):
        raise ValueError('Context must identify one owned agency runtime scope')
    return {'context': copy.deepcopy(context), 'phase': 'inventory', 'revision': 0,
            'replacement_version': None, 'adapter_capability': None, 'decisions': {}}


def _timestamp(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timezone required')
    return parsed


def evaluate(state, request, evidence, *, now=None, policy=None):
    """Pure proposal reducer. Evidence records are assertions, not independently authenticated proofs.

    Production use must obtain them from trusted domain adapters and atomically persist the
    decision with the real routing lease. This offline function never grants execution authority.
    """
    policy = policy or load_policy()
    now = now or datetime.now(timezone.utc)
    current = copy.deepcopy(state)
    result = {'status': 'switch_refused', 'reasons': [], 'existing_runtime_unchanged': True,
              'existing_work_allowed': True, 'runtime_execution_authorized': False,
              'external_calls_performed': False, 'state': current}

    def refuse(reason):
        result['reasons'].append(reason)
        return result

    if not isinstance(request, dict) or set(request) - REQUEST_FIELDS:
        return refuse('unsupported_request_fields_no_commands_allowed')
    if not _context_valid(state.get('context'), policy) or request.get('context') != state['context']:
        return refuse('scope_or_source_context_changed_reinventory_required')
    if state.get('phase') not in policy['phases'] or type(state.get('revision')) is not int:
        return refuse('invalid_current_state')
    if not _token(request.get('decision_id')) or not isinstance(evidence, list):
        return refuse('decision_identity_and_evidence_required')
    fingerprint = hashlib.sha256(json.dumps({'request': request, 'evidence': evidence}, sort_keys=True).encode()).hexdigest()
    recorded = state.get('decisions', {}).get(request['decision_id'])
    if recorded:
        if recorded['fingerprint'] != fingerprint:
            return refuse('idempotency_key_payload_conflict')
        # A replay returns readback of the current state; it cannot undo later decisions.
        result.update(status='decision_already_recorded', decision_id=request['decision_id'], recorded_revision=recorded['revision'])
        return result
    if type(request.get('expected_revision')) is not int or request['expected_revision'] != state['revision']:
        return refuse('revision_conflict_retry_from_authoritative_readback')
    action = request.get('action', 'advance')
    target = request.get('target_phase')
    source = state['phase']
    if action == 'rollback':
        if source not in {'canary', 'cutover'} or target != 'validated':
            return refuse('rollback_requires_active_canary_or_cutover_and_validated_target')
        required = policy['rollback_evidence']
    elif action == 'advance':
        key = source + '->' + str(target)
        if key not in policy['transition_evidence']:
            return refuse('only_explicit_next_phase_transition_allowed')
        required = policy['transition_evidence'][key]
    else:
        return refuse('unsupported_action')
    jobs = request.get('active_customer_jobs')
    if type(jobs) is not int or jobs < 0:
        return refuse('authoritative_active_job_count_required')
    if target in policy['active_jobs_block'] and jobs:
        return refuse('active_customer_work_must_drain_before_switch')
    replacement, capability = request.get('replacement_version'), request.get('adapter_capability')
    if target != 'shadow':
        if state['context']['execution_environment'] not in policy['known_owned_execution_environments']:
            return refuse('external_execution_environment_unverified')
        if not _token(replacement) or capability not in policy['fixed_adapter_capabilities']:
            return refuse('ready_replacement_and_fixed_adapter_capability_required')
        if state.get('replacement_version') and (replacement != state['replacement_version'] or capability != state['adapter_capability']):
            return refuse('replacement_context_changed_revalidation_required')
    valid_kinds = set()
    try:
        for item in evidence:
            if not isinstance(item, dict) or set(item) != EVIDENCE_FIELDS:
                return refuse('invalid_evidence_contract')
            if item['context'] != state['context'] or item['replacement_version'] != replacement:
                return refuse('evidence_scope_or_replacement_mismatch')
            if not _token(item['kind']) or not _token(item['receipt_ref']):
                return refuse('invalid_evidence_reference')
            if not isinstance(item['source_sha256'], str) or not re.fullmatch('[0-9a-f]{64}', item['source_sha256']):
                return refuse('source_evidence_hash_required')
            observed, expiry = _timestamp(item['observed_at']), _timestamp(item['expires_at'])
            if observed > now or now >= expiry or expiry <= observed or (now - observed).total_seconds() > policy['evidence']['freshness_seconds']:
                return refuse('stale_or_future_evidence')
            if item['outcome'] != 'pass':
                return refuse('evidence_failed_existing_work_continues')
            valid_kinds.add(item['kind'])
    except (TypeError, ValueError, AttributeError):
        return refuse('invalid_evidence_value')
    missing = set(required) - valid_kinds
    if missing:
        return refuse('missing_evidence:' + ','.join(sorted(missing)))
    current.update(phase=target, revision=state['revision'] + 1)
    if target != 'shadow':
        current.update(replacement_version=replacement, adapter_capability=capability)
    current.setdefault('decisions', {})[request['decision_id']] = {'fingerprint': fingerprint, 'revision': current['revision'], 'target_phase': target}
    result.update(status='decision_recorded_only', decision_id=request['decision_id'], state=current)
    return result


class MigrationCoordinator:
    """Reference process-local CAS coordinator; not a persistent/distributed lease implementation."""
    def __init__(self, state, policy=None):
        self._state = copy.deepcopy(state)
        self._policy = policy or load_policy()
        self._lock = threading.RLock()

    def apply(self, request, evidence, *, now=None):
        with self._lock:
            result = evaluate(self._state, request, evidence, now=now, policy=self._policy)
            if result['status'] == 'decision_recorded_only':
                self._state = copy.deepcopy(result['state'])
            return result

    def readback(self):
        with self._lock:
            return copy.deepcopy(self._state)


SCENARIO_MAX_BYTES = 262144


def read_scenario(path):
    """Read only the explicitly named, bounded regular JSON input; never follow links."""
    path = Path(path).absolute()
    if path.suffix.lower() != '.json' or '..' in path.parts or len(path.parts) > 128:
        raise ValueError('Explicit local scenario JSON required')
    for part in path.parts[1:]:
        name = part.casefold()
        if (name.startswith('.') or any(word in name for word in ('secret', 'credential', 'private-key', 'service-account', 'service_account'))
                or name in {'auth.json', 'token.json', 'tokens.json', 'id_rsa', 'id_ed25519'}):
            raise ValueError('Sensitive paths are not scenario inputs')
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    directory_fd = os.open('/', directory_flags)
    try:
        for part in path.parts[1:-1]:
            child = os.open(part, directory_flags, dir_fd=directory_fd)
            os.close(directory_fd)
            directory_fd = child
        file_fd = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory_fd)
        try:
            before = os.fstat(file_fd)
            if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_size > SCENARIO_MAX_BYTES:
                raise ValueError('Bounded single-link regular scenario file required')
            data = bytearray()
            while True:
                chunk = os.read(file_fd, min(65536, SCENARIO_MAX_BYTES + 1 - len(data)))
                if not chunk:
                    break
                data.extend(chunk)
                if len(data) > SCENARIO_MAX_BYTES:
                    raise ValueError('Scenario byte limit exceeded')
            after = os.fstat(file_fd)
            fields = ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns', 'st_nlink')
            if any(getattr(before, key) != getattr(after, key) for key in fields):
                raise ValueError('Scenario changed during read')
            return json.loads(data.decode('utf-8'))
        finally:
            os.close(file_fd)
    finally:
        os.close(directory_fd)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scenario', required=True, help='Local JSON what-if scenario; no runtime changes')
    args = parser.parse_args(argv)
    try:
        scenario = read_scenario(args.scenario)
        if set(scenario) != {'state', 'request', 'evidence', 'now'}:
            raise ValueError('Scenario fields invalid')
        result = evaluate(scenario['state'], scenario['request'], scenario['evidence'], now=_timestamp(scenario['now']))
        # Echo only bounded decision metadata, never arbitrary context/evidence/source input.
        print(json.dumps({'mode': 'offline_what_if', 'status': result['status'], 'reasons': result['reasons'],
                          'proposed_phase': result['state'].get('phase'), 'proposed_revision': result['state'].get('revision'),
                          'existing_runtime_unchanged': True, 'existing_work_allowed': True,
                          'runtime_execution_authorized': False, 'persistent_state_created': False}))
        return 0 if result['status'] != 'switch_refused' else 1
    except (ValueError, TypeError, OSError, KeyError, AttributeError, RecursionError):
        print(json.dumps({'status': 'scenario_rejected', 'existing_runtime_unchanged': True, 'existing_work_allowed': True, 'runtime_execution_authorized': False}))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
