#!/usr/bin/env python3
"""Deterministic offline capacity/cost audit; no workload control or deployment."""
from datetime import datetime, timezone
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat

ROOT = Path(__file__).resolve().parents[1]
RESOURCES = ('cpu_cores', 'ram_bytes', 'disk_bytes', 'disk_iops', 'network_bytes_per_second')
PROFILE = ('known_rps_min', 'known_rps_max', 'cpu_seconds_per_request', 'mean_latency_seconds',
           'peak_inflight_per_rps', 'resident_ram_bytes', 'ram_bytes_per_inflight_request',
           'disk_resident_bytes', 'disk_growth_bytes_per_request', 'retention_seconds',
           'backup_copies', 'iops_per_request', 'network_bytes_per_request')
IDENT = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$')
SHA = re.compile(r'^[a-f0-9]{64}$')
SECRET = re.compile(r'(?i)glpat-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{16,}|://[^\s/@:]+:[^\s/@]+@')


class PlanError(ValueError):
    pass


def require(ok, code):
    if not ok:
        raise PlanError(code)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)


def number(value, *, positive=False, maximum=10**18):
    require(type(value) in (int, float) and math.isfinite(value) and 0 <= value <= maximum
            and (not positive or value > 0), 'invalid_nonnegative_number_or_unit')
    return value


def identifier(value):
    require(isinstance(value, str) and IDENT.fullmatch(value) and not SECRET.search(value)
            and 'affilinet' not in value.casefold(), 'invalid_or_customer_identifier')
    return value


def exact(value, keys):
    require(isinstance(value, dict) and set(value) == set(keys), 'unexpected_or_missing_fields')


def bounded_read(path, maximum):
    path = Path(path).absolute()
    require('..' not in path.parts and not any(part.startswith('.') for part in path.parts[1:]), 'unsafe_input_path')
    require(path.suffix == '.json' and not re.search(r'(?i)secret|credential|token|private[-_]?key', path.name), 'unsafe_input_path')
    fd = os.open('/', os.O_RDONLY | os.O_DIRECTORY)
    try:
        for component in path.parts[1:-1]:
            nxt = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd); fd = nxt
        child = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
        with os.fdopen(child, 'rb') as stream:
            before = os.fstat(stream.fileno())
            require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and before.st_size <= maximum, 'input_type_or_size')
            raw = stream.read(maximum + 1)
            after = os.fstat(stream.fileno())
        require(len(raw) <= maximum and (before.st_size, before.st_mtime_ns, before.st_ctime_ns) ==
                (after.st_size, after.st_mtime_ns, after.st_ctime_ns), 'input_changed_or_limit')
        require(not SECRET.search(raw.decode('utf-8')), 'sensitive_input_rejected')
        return raw
    finally:
        os.close(fd)


def parse(raw):
    def pairs(values):
        out = {}
        for key, value in values:
            require(key not in out, 'duplicate_json_key')
            out[key] = value
        return out
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=lambda _: (_ for _ in ()).throw(PlanError('nonfinite_json')))


def measured(evidence, now, max_age, issues, label, *, documented=False, host_id=None, workload=False):
    fields = {'kind', 'evidence_ref', 'sha256', 'measured_at'}
    if host_id is not None:
        fields |= {'host_id', 'window_seconds'}
    if workload:
        fields |= {'workload_sha256', 'input_class', 'cache_state', 'concurrency_min', 'concurrency_max'}
    if not isinstance(evidence, dict) or set(evidence) != fields:
        issues.append(label + ':measurement_missing'); return
    if evidence['kind'] != ('documented' if documented else 'measured'):
        issues.append(label + ':assumption_is_not_measurement')
    require(isinstance(evidence['evidence_ref'], str) and 0 < len(evidence['evidence_ref']) <= 300
            and not SECRET.search(evidence['evidence_ref']) and all(ord(c) >= 32 for c in evidence['evidence_ref']), 'invalid_evidence_ref')
    require(isinstance(evidence['sha256'], str) and SHA.fullmatch(evidence['sha256']), 'invalid_evidence_hash')
    try:
        at = datetime.fromisoformat(evidence['measured_at'].replace('Z', '+00:00'))
        require(at.tzinfo is not None, 'measurement_timezone_required')
    except (ValueError, TypeError, AttributeError):
        raise PlanError('invalid_measurement_timestamp') from None
    age = (now - at).total_seconds()
    if not 0 <= age <= max_age * 86400:
        issues.append(label + ':measurement_stale_or_future')
    if host_id is not None:
        if evidence['host_id'] != host_id:
            issues.append(label + ':measurement_host_mismatch')
        number(evidence['window_seconds'], positive=True, maximum=31 * 86400)
    if workload:
        require(isinstance(evidence['workload_sha256'], str) and SHA.fullmatch(evidence['workload_sha256']), 'invalid_workload_hash')
        identifier(evidence['input_class'])
        require(evidence['cache_state'] in {'cold', 'warm', 'mixed'}, 'cache_state_required')
        number(evidence['concurrency_min']); number(evidence['concurrency_max'])
        require(evidence['concurrency_min'] <= evidence['concurrency_max'], 'invalid_concurrency_measurement_range')


def plan(document, policy, *, now):
    """Pure calculation. Evidence metadata is declared input, not remote attestation."""
    require(isinstance(now, datetime) and now.tzinfo is not None, 'aware_now_required')
    require(isinstance(policy, dict) and policy.get('schema_version') == 1 and
            policy.get('scope') == 'canonical_agency_project' and policy.get('mode') == 'offline_audit_only', 'unsupported_policy')
    fraction = number(policy['required_headroom_fraction'])
    require(0 < fraction < 1 and 1 <= policy['measurement_max_age_days'] <= 365, 'invalid_policy_limits')
    exact(document, ('schema_version', 'hosts', 'workloads', 'scenarios'))
    require(document['schema_version'] == 1, 'unsupported_schema')
    for key, limit in [('hosts', 32), ('workloads', 128), ('scenarios', 16)]:
        maximum = policy['max_' + key]
        require(type(maximum) is int and 1 <= maximum <= limit and isinstance(document[key], list)
                and 1 <= len(document[key]) <= maximum, 'input_record_limit')
    require(len(canonical(document).encode()) <= min(policy['max_input_bytes'], 262144), 'input_byte_limit')
    hosts = {}; workloads = {}; common = []
    for host in document['hosts']:
        exact(host, ('id', 'project', 'tenant', 'residency', 'affinities', 'measurement', 'capacity_basis', 'capacity', 'baseline_peak'))
        for key in ('id', 'project', 'tenant', 'residency'):
            identifier(host[key])
        require(host['id'] not in hosts and isinstance(host['affinities'], list) and 1 <= len(host['affinities']) <= 32, 'duplicate_host_or_affinity')
        for affinity in host['affinities']:
            identifier(affinity)
        require(host['capacity_basis'] in {'effective_cgroup_and_parent_limits', 'physical_host_no_cgroup'}, 'effective_capacity_basis_required')
        measured(host['measurement'], now, policy['measurement_max_age_days'], common, 'host:' + host['id'], host_id=host['id'])
        for field in ('capacity', 'baseline_peak'):
            require(isinstance(host[field], dict) and set(host[field]) <= set(RESOURCES), 'unknown_host_resource_or_unit')
            for resource in RESOURCES:
                if host[field].get(resource) is None:
                    common.append(host['id'] + ':missing:' + field + ':' + resource)
                else:
                    number(host[field][resource], positive=field == 'capacity')
        hosts[host['id']] = host
    for workload in document['workloads']:
        exact(workload, ('id', 'host_id', 'project', 'tenant', 'residency', 'affinity', 'dependencies', 'measurement', 'profile', 'external_api'))
        for key in ('id', 'host_id', 'project', 'tenant', 'residency', 'affinity'):
            identifier(workload[key])
        require(workload['id'] not in workloads and isinstance(workload['dependencies'], list) and len(workload['dependencies']) <= 128, 'duplicate_workload_or_dependency_limit')
        for dependency in workload['dependencies']:
            identifier(dependency)
        measured(workload['measurement'], now, policy['measurement_max_age_days'], common, 'workload:' + workload['id'], host_id=workload['host_id'], workload=True)
        profile = {} if workload['profile'] is None else workload['profile']
        require(isinstance(profile, dict) and set(profile) <= set(PROFILE), 'unknown_profile_field_or_unit')
        for field in PROFILE:
            if field not in profile or profile[field] is None:
                common.append(workload['id'] + ':missing:' + field)
            else:
                number(profile[field])
        if all(profile.get(k) is not None for k in ('known_rps_min', 'known_rps_max')):
            require(profile['known_rps_min'] <= profile['known_rps_max'], 'invalid_measured_range')
        if profile.get('backup_copies') is not None:
            require(type(profile['backup_copies']) is int and profile['backup_copies'] <= 100, 'invalid_backup_count')
        workloads[workload['id']] = dict(workload, profile=profile)
    # Acyclic dependency graph. Missing nodes block readiness; no inferred services.
    def walk(key, visiting, done):
        if key in done: return
        require(key not in visiting, 'cyclic_dependencies')
        visiting.add(key)
        for dependency in workloads[key]['dependencies']:
            if dependency not in workloads:
                common.append(key + ':missing_dependency:' + dependency)
            else:
                walk(dependency, visiting, done)
        visiting.remove(key); done.add(key)
    done = set()
    for key in workloads: walk(key, set(), done)
    results = []; scenario_ids = set()
    for scenario in document['scenarios']:
        exact(scenario, ('id', 'horizon_seconds', 'rps_by_workload'))
        identifier(scenario['id']); require(scenario['id'] not in scenario_ids, 'duplicate_scenario'); scenario_ids.add(scenario['id'])
        horizon = number(scenario['horizon_seconds'], positive=True, maximum=366 * 86400)
        exact(scenario['rps_by_workload'], workloads)
        issues = list(common); totals = {key: {resource: 0 for resource in RESOURCES} for key in hosts}
        detail = []; costs = {}; unknown_host_demand = set()
        unknown_cost_currencies = set(); unknown_cost_currency = False
        def mark_unknown_cost(api):
            nonlocal unknown_cost_currency
            currency = api.get('currency') if isinstance(api, dict) else None
            if isinstance(currency, str) and re.fullmatch('[A-Z]{3}', currency):
                unknown_cost_currencies.add(currency)
            else:
                unknown_cost_currency = True
        for key, workload in workloads.items():
            rps = number(scenario['rps_by_workload'][key], maximum=10**9)
            profile = workload['profile']; host = hosts.get(workload['host_id'])
            if host is None:
                if workload['external_api'] is not None:
                    mark_unknown_cost(workload['external_api'])
                issues.append(key + ':unknown_host'); continue
            if any(host[field] != workload[field] for field in ('project', 'tenant', 'residency')) or workload['affinity'] not in host['affinities']:
                issues.append(key + ':placement_scope_or_affinity_mismatch')
            for dep in workload['dependencies']:
                other = workloads.get(dep)
                if other and any(other[field] != workload[field] for field in ('project', 'tenant', 'residency')):
                    issues.append(key + ':dependency_scope_mismatch')
                if other and rps > 0 and number(scenario['rps_by_workload'][dep]) == 0:
                    issues.append(key + ':dependency_has_no_planned_service_demand')
            if any(profile.get(field) is None for field in PROFILE):
                unknown_host_demand.add(host['id'])
                if workload['external_api'] is not None:
                    mark_unknown_cost(workload['external_api'])
                continue
            if not profile['known_rps_min'] <= rps <= profile['known_rps_max']:
                issues.append(key + ':outside_measured_demand_range')
            average = rps * profile['mean_latency_seconds']
            peak = rps * profile['peak_inflight_per_rps']
            if peak < average:
                issues.append(key + ':peak_concurrency_below_little_law_mean')
            inflight = math.ceil(max(average, peak))
            measurement = workload['measurement'] if isinstance(workload['measurement'], dict) else {}
            concurrency_min = measurement.get('concurrency_min')
            concurrency_max = measurement.get('concurrency_max')
            if ((concurrency_min is not None and inflight < concurrency_min)
                    or (concurrency_max is not None and inflight > concurrency_max)):
                issues.append(key + ':outside_measured_concurrency_range')
            # Existing baseline and new workload increments are disjoint by input contract.
            demand = {'cpu_cores': rps * profile['cpu_seconds_per_request'],
                'ram_bytes': profile['resident_ram_bytes'] + inflight * profile['ram_bytes_per_inflight_request'],
                'disk_bytes': (profile['disk_resident_bytes'] + rps * profile['disk_growth_bytes_per_request'] * min(horizon, profile['retention_seconds'])) * (1 + profile['backup_copies']),
                'disk_iops': rps * profile['iops_per_request'],
                'network_bytes_per_second': rps * profile['network_bytes_per_request']}
            for resource in RESOURCES:
                number(demand[resource]); totals[host['id']][resource] += demand[resource]
            detail.append({'id': key, 'mean_inflight_little_law': average, 'planning_inflight_from_measured_peak_ratio': inflight, 'incremental_demand': demand})
            api = workload['external_api']
            if api is not None:
                fields = ('kind', 'currency', 'rate_evidence', 'input_tokens_per_request_upper', 'output_tokens_per_request_upper', 'input_per_million', 'output_per_million', 'request_fee_upper', 'approved_request_budget')
                require(isinstance(api, dict) and set(api) <= set(fields), 'unexpected_external_cost_field')
                if any(api.get(field) is None for field in fields):
                    mark_unknown_cost(api)
                    issues.append(key + ':external_cost_or_budget_measurement_missing'); continue
                require(api['kind'] == 'vendor_llm', 'unsupported_external_cost_kind')
                require(isinstance(api['currency'], str) and re.fullmatch('[A-Z]{3}', api['currency']), 'currency_required')
                measured(api['rate_evidence'], now, policy['measurement_max_age_days'], issues, key + ':external_rate', documented=True)
                for field in ('input_tokens_per_request_upper', 'output_tokens_per_request_upper', 'input_per_million', 'output_per_million', 'request_fee_upper', 'approved_request_budget'):
                    number(api[field])
                requests = math.ceil(rps * horizon)
                unit = (api['input_tokens_per_request_upper'] * api['input_per_million'] + api['output_tokens_per_request_upper'] * api['output_per_million']) / 1000000 + api['request_fee_upper']
                cost = number(requests * unit)
                costs[api['currency']] = costs.get(api['currency'], 0) + cost
                if requests > api['approved_request_budget']:
                    issues.append(key + ':request_budget_exceeded')
        host_results = []
        for key, host in hosts.items():
            resources = {}
            for resource in RESOURCES:
                if host['capacity'].get(resource) is None or host['baseline_peak'].get(resource) is None:
                    resources[resource] = {'within_planning_envelope': False, 'measurement_missing': True}
                    continue
                capacity = host['capacity'][resource]; baseline = host['baseline_peak'][resource]
                available = capacity * (1 - fraction) - baseline
                if key in unknown_host_demand:
                    resources[resource] = {'capacity': capacity, 'baseline_peak': baseline,
                        'available_for_incremental_work': available, 'incremental_demand': None,
                        'remaining_after_plan': None, 'within_planning_envelope': False, 'workload_measurement_missing': True}
                    continue
                incremental = totals[key][resource]
                fits = available >= incremental
                if not fits: issues.append(key + ':insufficient:' + resource)
                resources[resource] = {'capacity': capacity, 'baseline_peak': baseline, 'reserved_headroom': capacity * fraction,
                    'available_for_incremental_work': available, 'incremental_demand': incremental,
                    'remaining_after_plan': available - incremental, 'within_planning_envelope': fits}
            host_results.append({'id': key, 'resources': resources})
        cost_upper = {currency: None if unknown_cost_currency or currency in unknown_cost_currencies else costs[currency]
                      for currency in sorted(set(costs) | unknown_cost_currencies)}
        results.append({'id': scenario['id'], 'status': 'not_ready_for_placement' if issues else 'planning_envelope_fits_measured_range',
            'issues': sorted(set(issues)), 'hosts': host_results, 'workloads': detail,
            'external_cost_known_subtotal_by_currency': costs, 'external_cost_upper_by_currency': cost_upper,
            'external_cost_estimate_complete': not unknown_cost_currency and not unknown_cost_currencies,
            'external_cost_currency_unknown': unknown_cost_currency})
    return {'schema_version': 1, 'mode': 'offline_audit_only', 'input_sha256': hashlib.sha256(canonical(document).encode()).hexdigest(),
        'as_of': now.isoformat(), 'scenarios': results, 'placement_approved': False, 'existing_workloads_modified': False,
        'measurement_truth_independently_verified': False, 'provider_costs_are_conditional_estimates_not_quotes': True,
        'host_billing_costs': 'unknown_no_billing_contract_in_this_input',
        'assumptions': ['baseline excludes the incremental workloads in this plan', 'headroom is a planning reserve, not failover proof',
            'measured peak concurrency ratio applies only within measured demand range', 'Little law gives mean inflight, never p95',
            'external token and request upper bounds include all billed retries, reasoning and agent steps', 'host RAM excludes vendor model weights']}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        policy = parse(bounded_read(ROOT / 'config/capacity-policy.json', 16384))
        document = parse(bounded_read(args.input, min(policy['max_input_bytes'], 262144)))
        result = plan(document, policy, now=datetime.now(timezone.utc))
        print(canonical(result)); return 0
    except (PlanError, OSError, ValueError, KeyError, TypeError, OverflowError, RecursionError):
        print('{"mode":"offline_audit_only","status":"invalid_input","placement_approved":false,"existing_workloads_modified":false}')
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
