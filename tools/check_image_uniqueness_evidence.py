#!/usr/bin/env python3
"""Validate bounded stored image-uniqueness evidence; this is not a browser execution.

Enforces the owner rule 'every image exactly once, fitting its area' in the only way that holds
without the real unique photos: the stored report (produced by apps/site/tests/browser-image-uniqueness.mjs)
must show no multiply-used image OUTSIDE the documented baseline, and must be bound by hash to the gate
script, the baseline and the route source so a drift or a new duplicate fails closed.
"""
import hashlib
import json
from pathlib import Path

BOUND = ["apps/site/tests/browser-image-uniqueness.mjs", "config/image-uniqueness-baseline.json", "config/site-map.json"]
EVIDENCE = "evidence/image-uniqueness-2026-11-05/report.json"


def source_hashes(root):
    root = root.resolve()
    result = {}
    for relative in BOUND:
        path = root / relative
        if path.is_symlink() or not path.resolve().is_relative_to(root) or not path.is_file():
            raise ValueError('unsafe or missing uniqueness source: ' + relative)
        result[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def check_bound_uniqueness(root):
    root = Path(root)
    report = json.loads((root / EVIDENCE).read_text())
    if report.get('source_sha256') != source_hashes(root):
        raise ValueError('missing or stale image-uniqueness source binding')
    if report.get('passed') is not True or report.get('neu') != 0 or report.get('neue_mehrfachbilder') != []:
        raise ValueError('new duplicate image outside the baseline')
    baseline = json.loads((root / 'config/image-uniqueness-baseline.json').read_text()).get('bekannte_mehrfachbilder', [])
    if report.get('baseline') != len(baseline):
        raise ValueError('baseline count drift between report and config')
    if type(report.get('routes')) is not int or report['routes'] <= 0:
        raise ValueError('route coverage missing')
    return report['routes']


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    print(json.dumps({'scope': 'stored source-bound image-uniqueness evidence only', 'routes': check_bound_uniqueness(root)}))
