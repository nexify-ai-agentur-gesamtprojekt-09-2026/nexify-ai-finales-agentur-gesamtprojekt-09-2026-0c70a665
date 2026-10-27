#!/usr/bin/env python3
"""Read-only local execution-container observation; never a remote capacity test."""
import datetime
import json
import math
import os
from pathlib import Path
import time


def positive(value):
    if value is None or value.strip() == 'max':
        return None
    try:
        result = int(value)
    except (ValueError, TypeError):
        return None
    return result if result >= 0 else None


def cpu_quota(raw):
    if not isinstance(raw, str):
        return None
    fields = raw.split()
    if len(fields) != 2:
        return None
    quota, period = (positive(field) for field in fields)
    return quota / period if quota is not None and period and quota > 0 else None


def counter(raw, name):
    for line in (raw or '').splitlines():
        fields = line.split()
        if len(fields) == 2 and fields[0] == name:
            return positive(fields[1])
    return None


def usage_cores(before, after, elapsed):
    if (before is None or after is None or after < before
            or not isinstance(elapsed, (float, int)) or not math.isfinite(elapsed) or elapsed <= 0):
        return None
    return (after - before) / 1_000_000 / elapsed


def read_fixed(name):
    # Only internal constants call this helper; no CLI-supplied path or server.
    try:
        with (Path('/sys/fs/cgroup') / name).open('r') as stream:
            value = stream.read(65537)
        return value if len(value) <= 65536 else None
    except (OSError, UnicodeError):
        return None


def observe():
    started = time.monotonic()
    before = counter(read_fixed('cpu.stat'), 'usage_usec')
    memory_before = positive(read_fixed('memory.current'))
    time.sleep(1)
    after = counter(read_fixed('cpu.stat'), 'usage_usec')
    elapsed = time.monotonic() - started
    affinity = len(os.sched_getaffinity(0)) if hasattr(os, 'sched_getaffinity') else os.cpu_count()
    quota = cpu_quota(read_fixed('cpu.max'))
    disk = os.statvfs('/workspace')
    return {
        'schema_version': 1,
        'observed_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'environment': 'codex_cloud_workspace_container_not_hostinger_or_production',
        'mode': 'read_only_short_observation_no_load_generation',
        'sample_seconds': elapsed,
        'cpu': {'affinity_logical_cpus': affinity, 'quota_cores': quota,
                'effective_core_ceiling': min(affinity, quota) if affinity and quota else affinity,
                'observed_average_cores': usage_cores(before, after, elapsed),
                'production_peak_cores': None},
        'memory': {'limit_bytes': positive(read_fixed('memory.max')),
                   'observed_before_bytes': memory_before,
                   'observed_after_bytes': positive(read_fixed('memory.current')),
                   'production_peak_bytes': None},
        'workspace_filesystem': {'total_bytes': disk.f_blocks * disk.f_frsize,
                                'available_bytes': disk.f_bavail * disk.f_frsize,
                                'shared_ephemeral_workspace_not_production_storage': True},
        'network_capacity_bps': None, 'disk_iops_capacity': None,
        'production_requests_per_second': None, 'provider_cost_measurement': None,
        'placement_ready': False,
        'limitations': ['One local sample is neither a peak measurement nor a production forecast.',
                        'No remote server, production workload, model or customer process was queried or changed.',
                        'Unknown capacity and workload measurements remain unknown; no four-server inventory is implied.'],
    }


if __name__ == '__main__':
    print(json.dumps(observe(), indent=2, sort_keys=True))
