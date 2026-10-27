#!/usr/bin/env python3
"""Validate bounded stored resize evidence; this is not a browser execution."""
import json
from pathlib import Path


def check_resize(report, expected_paths):
    rows = [row for row in report['checks'] if row.get('text_resize_200') is True]
    if len(rows) != len(expected_paths) or {r['path'] for r in rows} != set(expected_paths):
        raise ValueError('exact resize route set required')
    for row in rows:
        actual = row.get('resized', {})
        if actual.get('all_doubled') is not True or type(actual.get('count')) is not int or actual['count'] <= 0:
            raise ValueError('actual rendered text doubling required; root override is insufficient')
        if row.get('overflow') is not False or row.get('content_overflows') != []:
            raise ValueError('resize overflow remains')
    if report.get('issues') != []:
        raise ValueError('bounded geometry issues remain')
    return len(rows)


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    mapping = json.loads((root / 'config/site-map.json').read_text())
    paths = {p['path'] for p in mapping['pages'] if p['id'] in mapping['public_allowlist'] and p['access']['visibility'] == 'public' and p['access']['auth_required'] is False}
    report = json.loads((root / 'evidence/one-app-2026-10-27/text-spacing.json').read_text())
    print(json.dumps({'scope': 'stored measured text-resize evidence only', 'routes': check_resize(report, paths)}))
