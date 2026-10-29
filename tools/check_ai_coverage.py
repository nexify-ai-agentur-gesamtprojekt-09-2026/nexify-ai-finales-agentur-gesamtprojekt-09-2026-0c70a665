#!/usr/bin/env python3
"""Bounded, offline source-inventory drift gate; not semantic/runtime authorization.

No paths or exclusions supplied by the inventory can expand source access or shrink
this scan. Registration is a review assertion, never permission to execute code.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = 'config/ai-enforcement-coverage.json'
SCAN_ROOTS = ('api', 'apps', 'packages', 'tools', 'scripts', '.github/workflows', 'prototypen/lib', 'hooks')
EXTENSIONS = frozenset(('.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.sh', '.yml', '.yaml'))
EXCLUDED_DIRS = frozenset(('node_modules', 'vendor', 'dist', 'build', 'coverage', 'tests', 'test', '__tests__',
                          'fixtures', 'reference', 'public', 'static', 'assets', 'generated', 'cache', '__pycache__'))
STATUSES = frozenset(('source_enforced', 'disabled_fail_closed', 'deterministic_no_model',
                      'metadata_only_no_inference', 'unverified_legacy_egress', 'declaration_only',
                      'test_only_not_live', 'reviewed_false_positive', 'external_unverified'))
# Deliberately lexical: aliases, obfuscation, dynamic endpoints and arbitrary
# network wrappers cannot be comprehensively identified by a finite pattern list.
MARKERS = {
    'provider_host': r'\b(?:openrouter\.ai|api\.openai\.com|api\.anthropic\.com|ai-gateway\.vercel\.sh|generativelanguage\.googleapis\.com|api\.deepseek\.com|api\.mistral\.ai|api\.cohere\.(?:com|ai)|api\.groq\.com|api\.together\.xyz|api\.fireworks\.ai)\b',
    'inference_path': r'/(?:v\d+/)?(?:chat/completions|completions|responses|embeddings|generateContent|generate|api/chat)\b',
    'sdk_generation': r'\b(?:generateText|streamText|generateObject|streamObject|ToolLoopAgent|createOpenRouter|createOpenAI|createAnthropic|OpenAI|Anthropic|ChatOpenAI|ChatAnthropic|LiteLLM)\s*\(',
    'sdk_client_call': r'\b(?:chat\s*\.\s*completions|responses|messages|embeddings)\s*\.\s*(?:create|stream)\s*\(',
    'sdk_provider_import': r'(?:@ai-sdk/(?:openai|anthropic|gateway|google)|@openrouter/ai-sdk-provider|\b(?:from|import)\s+(?:openai|anthropic|litellm)\b)',
    'external_jeff': r'\bnx-jeff\b|\bNX_ORAKEL_ENDPOINT\b',
    'model_callback': r'\.\s*(?:modell|generateContent|generate_content|invoke|ainvoke)\s*\(',
    'ollama_call': r'\bollama\b|\b(?:litellm|completion_with_retries)\s*\.\s*(?:completion|acompletion)\s*\(',
    'credentialed_inference_hint': r'\b(?:OPENROUTER_API_KEY|AI_GATEWAY_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|NINEROUTER_URL)\b',
}
PATTERNS = {name: re.compile(pattern, re.IGNORECASE) for name, pattern in MARKERS.items()}
MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_TOTAL_BYTES = 32 * 1024 * 1024
MAX_FILES = 10000
MAX_DIRECTORIES = 2000
MAX_TREE_ENTRIES = 20000
_DIR_FLAGS = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW


class CoverageError(Exception):
    pass


def _require(condition, code):
    if not condition:
        raise CoverageError(code)


def _sensitive(name):
    lowered = name.lower()
    return (lowered.startswith('.') or any(word in lowered for word in ('secret', 'credential', 'private-key'))
            or lowered in ('id_rsa', 'id_ed25519', 'modelle.env')
            or lowered.endswith(('.env', '.pem', '.key', '.p12', '.pfx')))


def _source_name(name):
    return (not _sensitive(name) and Path(name).suffix.lower() in EXTENSIONS
            and not re.search(r'(?:^test_|(?:\.test|\.spec)\.)', name, re.IGNORECASE))


def _parts(relative):
    _require(isinstance(relative, str) and relative and '\\' not in relative and '\x00' not in relative,
             'invalid_source_path')
    path = PurePosixPath(relative)
    _require(not path.is_absolute() and str(path) == relative and all(p not in ('.', '..', '') for p in path.parts),
             'invalid_source_path')
    return path.parts


def _source_path(relative):
    parts = _parts(relative)
    prefix = next((root for root in SCAN_ROOTS if relative.startswith(root + '/')), None)
    _require(prefix is not None, 'registered_path_outside_owned_roots')
    suffix = parts[len(PurePosixPath(prefix).parts):]
    _require(suffix and _source_name(suffix[-1])
             and not any(_sensitive(p) or p in EXCLUDED_DIRS for p in suffix[:-1]), 'registered_path_excluded')
    return relative


def _root_fd(root):
    path = Path(root).absolute()
    fd = os.open('/', _DIR_FLAGS)
    try:
        for part in path.parts[1:]:
            child = os.open(part, _DIR_FLAGS, dir_fd=fd)
            os.close(fd)
            fd = child
        return fd
    except BaseException:
        os.close(fd)
        raise


def _directory_fd(root_fd, relative):
    fd = os.dup(root_fd)
    try:
        for part in _parts(relative):
            child = os.open(part, _DIR_FLAGS, dir_fd=fd)
            os.close(fd)
            fd = child
        return fd
    except BaseException:
        os.close(fd)
        raise


def _read_file(directory_fd, name, limit):
    fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory_fd)
    try:
        before = os.fstat(fd)
        _require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1, 'non_regular_or_hardlinked_source')
        _require(before.st_size <= limit, 'source_byte_limit')
        data = bytearray()
        while True:
            part = os.read(fd, min(65536, limit + 1 - len(data)))
            if not part:
                break
            data.extend(part)
            _require(len(data) <= limit, 'source_byte_limit')
        after = os.fstat(fd)
        _require((before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns) ==
                 (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns), 'source_changed_during_read')
        return bytes(data)
    finally:
        os.close(fd)


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        _require(key not in result, 'duplicate_json_key')
        result[key] = value
    return result


def _load_registry(root_fd):
    fd = _directory_fd(root_fd, 'config')
    try:
        raw = _read_file(fd, 'ai-enforcement-coverage.json', MAX_FILE_BYTES)
        return json.loads(raw.decode('utf-8'), object_pairs_hook=_unique_object,
                          parse_constant=lambda value: (_ for _ in ()).throw(CoverageError('non_finite_json')))
    finally:
        os.close(fd)


def _registry_entries(document):
    _require(isinstance(document, dict) and type(document.get('schema_version')) is int
             and document['schema_version'] == 1, 'invalid_registry_schema')
    scanner = document.get('scanner')
    _require(isinstance(scanner, dict), 'scanner_contract_missing')
    roots, extensions = scanner.get('roots'), scanner.get('extensions')
    _require(isinstance(roots, list) and len(roots) == len(SCAN_ROOTS) and set(roots) == set(SCAN_ROOTS),
             'fixed_scan_roots_mismatch')
    _require(isinstance(extensions, list) and len(extensions) == len(EXTENSIONS)
             and set(extensions) == EXTENSIONS, 'fixed_source_extensions_mismatch')
    entries = document.get('entries')
    _require(isinstance(entries, list) and entries, 'nonempty_registered_inventory_required')
    indexed, identities = {}, set()
    for entry in entries:
        _require(isinstance(entry, dict), 'invalid_inventory_entry')
        path = _source_path(entry.get('path'))
        identity = entry.get('id')
        _require(isinstance(identity, str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}', identity), 'invalid_entry_identity')
        _require(path not in indexed and identity not in identities, 'duplicate_inventory_entry')
        _require(isinstance(entry.get('sha256'), str) and re.fullmatch(r'[0-9a-f]{64}', entry['sha256']), 'invalid_source_hash')
        status = entry.get('status')
        _require(status in STATUSES, 'unknown_entry_status')
        enforcement = entry.get('enforcement')
        _require(isinstance(enforcement, dict) and enforcement.get('state') == status,
                 'status_enforcement_mismatch')
        _require(isinstance(enforcement.get('checks'), list) and isinstance(enforcement.get('gaps'), list),
                 'checks_and_gaps_required')
        _require(all(isinstance(value, str) and value.strip()
                     for value in enforcement['checks'] + enforcement['gaps']), 'invalid_check_or_gap_description')
        _require(status != 'source_enforced' or bool(enforcement['checks']), 'source_enforcement_checks_required')
        _require(entry.get('runtime_deployment_verified') is False, 'source_inventory_cannot_certify_runtime')
        _require(isinstance(entry.get('source_role'), str) and entry['source_role'].strip(), 'source_role_required')
        _require(type(entry.get('reviewed_non_inference')) is bool, 'review_classification_required')
        _require(status != 'reviewed_false_positive' or entry['reviewed_non_inference'] is True,
                 'false_positive_review_required')
        _require(isinstance(entry.get('owner'), str) and entry['owner'].strip()
                 and isinstance(entry.get('next_action'), str) and entry['next_action'].strip(), 'review_ownership_required')
        indexed[path] = entry
        identities.add(identity)
    return indexed


def _scan(root_fd):
    files, total, seen, errors = {}, 0, 0, []
    directories, tree_entries = 0, 0

    def walk(fd, prefix):
        nonlocal total, seen, directories, tree_entries
        directories += 1
        _require(directories <= MAX_DIRECTORIES, 'source_directory_count_limit')
        names = []
        # Bound enumeration before allocating/sorting an entire enormous folder.
        with os.scandir(fd) as iterator:
            for item in iterator:
                tree_entries += 1
                _require(tree_entries <= MAX_TREE_ENTRIES, 'source_tree_entry_limit')
                names.append(item.name)
        for name in sorted(names):
            if _sensitive(name) or name in EXCLUDED_DIRS:
                continue
            path = prefix + '/' + name
            info = os.stat(name, dir_fd=fd, follow_symlinks=False)
            if stat.S_ISLNK(info.st_mode):
                # Never follow a linked source tree/file; fail if it could hide code.
                errors.append({'code': 'symlink_in_owned_source_tree', 'path': path})
                continue
            if stat.S_ISDIR(info.st_mode):
                child = os.open(name, _DIR_FLAGS, dir_fd=fd)
                try:
                    walk(child, path)
                finally:
                    os.close(child)
            elif _source_name(name):
                seen += 1
                _require(seen <= MAX_FILES, 'source_file_count_limit')
                data = _read_file(fd, name, MAX_FILE_BYTES)
                total += len(data)
                _require(total <= MAX_TOTAL_BYTES, 'total_source_byte_limit')
                text = data.decode('utf-8')
                markers = []
                for marker, pattern in PATTERNS.items():
                    found = pattern.search(text)
                    if found:
                        markers.append({'marker': marker, 'line': text.count('\n', 0, found.start()) + 1})
                files[path] = {'sha256': hashlib.sha256(data).hexdigest(), 'markers': markers}

    for root in SCAN_ROOTS:
        try:
            fd = _directory_fd(root_fd, root)
        except FileNotFoundError:
            continue
        try:
            walk(fd, root)
        finally:
            os.close(fd)
    return files, errors, total


def check_repository(root=ROOT):
    """Only trusted local test/embedding may override root; CLI always uses repo root."""
    try:
        fd = _root_fd(root)
        try:
            entries = _registry_entries(_load_registry(fd))
            files, errors, total = _scan(fd)
        finally:
            os.close(fd)
        for path, entry in entries.items():
            if path not in files:
                errors.append({'code': 'registered_source_missing_or_excluded', 'path': path})
            elif files[path]['sha256'] != entry['sha256']:
                errors.append({'code': 'registered_source_drift_requires_review', 'path': path})
        for path, source in files.items():
            if source['markers'] and path not in entries:
                errors.append({'code': 'unregistered_ai_source_candidate', 'path': path,
                               'markers': source['markers']})
        counts = {status: sum(e['status'] == status for e in entries.values()) for status in sorted(STATUSES)}
        gaps = [{'id': entry['id'], 'status': entry['status'], 'gap_count': len(entry['enforcement']['gaps'])}
                for entry in entries.values() if entry['enforcement']['gaps']
                or entry['status'] in ('unverified_legacy_egress', 'external_unverified', 'declaration_only')]
        return {'status': 'blocked' if errors else 'inventory_review_current', 'errors': errors,
                'registered_sources': len(entries), 'scanned_sources': len(files), 'scanned_bytes': total,
                'candidate_sources': sum(bool(source['markers']) for source in files.values()),
                'status_counts': counts, 'open_review_gaps': gaps, 'runtime_authorized': False,
                'semantic_completeness_verified': False, 'automatic_hash_refresh': False}
    except (CoverageError, OSError, UnicodeError, ValueError, TypeError, RecursionError):
        # Contents, tokens, malformed input and arbitrary exception details never leave the scanner.
        return {'status': 'blocked', 'errors': [{'code': 'source_inventory_unreadable_or_invalid'}],
                'runtime_authorized': False, 'semantic_completeness_verified': False,
                'automatic_hash_refresh': False}


def audit_repository(root=ROOT):
    """Observe the strict result without activating a runtime or cutover gate.

    Even an unavailable inventory is a successful *audit invocation*, never a
    passed source review. Identical bounded readers/exclusions apply in both modes.
    """
    observation = check_repository(root)
    inventory_status = observation.pop('status')
    if inventory_status == 'inventory_review_current':
        status = 'audit_complete'
    elif 'scanned_sources' in observation:
        status = 'audit_partial'
    else:
        status = 'audit_unavailable'
    return {**observation, 'status': status, 'inventory_status': inventory_status,
            'mode': 'audit', 'enforcement_active': False,
            'exit_zero_means': 'audit_invoked_not_inventory_passed_or_runtime_authorized'}


def main(argv=None, *, root=ROOT):
    # root is trusted local embedding only; there is no CLI path/refresh option.
    args = sys.argv[1:] if argv is None else argv
    if args not in ([], ['--audit']):
        print(json.dumps({'status': 'blocked', 'errors': [{'code': 'no_external_paths_or_refresh_arguments'}]}))
        return 1
    result = audit_repository(root) if args == ['--audit'] else check_repository(root)
    print(json.dumps(result, ensure_ascii=True, sort_keys=True))
    if args == ['--audit']:
        return 0
    return 0 if result['status'] == 'inventory_review_current' else 1


if __name__ == '__main__':
    raise SystemExit(main())
