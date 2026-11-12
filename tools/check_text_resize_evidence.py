#!/usr/bin/env python3
"""Validate bounded stored resize evidence; this is not a browser execution."""
import hashlib
import json
from pathlib import Path

CURRENT_RESIZE_REPORT = Path('evidence/resize-2026-11-10/text-spacing.json')

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


def source_hashes(root):
    root = root.resolve()
    config = json.loads((root / 'config/text-resize-sources.json').read_text())
    paths = set(config['files'])
    for directory in config['directories']:
        base = root / directory
        if base.is_symlink() or not base.resolve().is_relative_to(root):
            raise ValueError('unsafe resize source directory')
        for path in base.rglob('*'):
            if path.is_symlink():
                raise ValueError('linked resize source forbidden')
            if path.is_file() and path.suffix in config['extensions']:
                paths.add(path.relative_to(root).as_posix())
    result = {}
    for relative in sorted(paths):
        path = root / relative
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise ValueError('unsafe resize source path')
        result[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def check_bound_resize(root):
    mapping = json.loads((root / 'config/site-map.json').read_text())
    paths = {p['path'] for p in mapping['pages'] if p['id'] in mapping['public_allowlist'] and p['access']['visibility'] == 'public' and p['access']['auth_required'] is False}
    report = json.loads((root / CURRENT_RESIZE_REPORT).read_text())
    if report.get('completed') is not True or report.get('source_sha256') != source_hashes(root):
        raise ValueError('missing or stale resize source binding')
    if report.get('runtime_error_capture') is not True or report.get('runtime_errors') != []:
        raise ValueError('runtime error capture and clean resize execution required')
    return check_resize(report, paths)


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    print(json.dumps({'scope': 'stored measured source-bound text-resize evidence only', 'routes': check_bound_resize(root)}))
