#!/usr/bin/env python3
"""Verify five owned project skills; explicit install never replaces an existing target.

No network, model calls, credential lookup, global paths or manifest refresh.
Verification checks integrity and scope, not semantic approval or live readiness.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'config/project-skills.json'
NAMES = frozenset({
    'nexify-governed-delivery', 'nexify-knowledge-operations',
    'nexify-research-content', 'nexify-platform-integrations',
    'nexify-quality-learning',
})
SCOPE = 'canonical_agency_project'
MAX_BYTES = 512 * 1024


class SkillError(Exception):
    """Stable error code; never echo untrusted content or credentials."""


def require(condition, code):
    if not condition:
        raise SkillError(code)


def relative_parts(value):
    require(isinstance(value, str) and value and '\\' not in value
            and not any(ord(c) < 32 or ord(c) == 127 for c in value), 'unsafe_path')
    path = PurePosixPath(value)
    require(not path.is_absolute() and path.as_posix() == value
            and all(p not in {'.', '..', ''} for p in path.parts), 'unsafe_path')
    require(not any('affilinet' in p.casefold() or p.casefold() in
                    {'reference', 'customer', 'customers', 'credentials', 'secrets', '.git', '.aws', '.ssh'}
                    or p.startswith('.env') for p in path.parts), 'forbidden_source_scope')
    require(not re.search(r'(?i)(?:^|/)(?:auth\.json|.*(?:private[-_]?key|access[-_]?token|refresh[-_]?token))$', value),
            'forbidden_source_scope')
    return path.parts


def directory_fd(root, parts=(), create=False):
    """Open every ancestor without following symlinks; caller closes returned FD."""
    root = Path(root).absolute()
    require(root != Path('/') and '..' not in root.parts, 'unsafe_project_root')
    fd = os.open('/', os.O_RDONLY | os.O_DIRECTORY)
    try:
        for component in root.parts[1:]:
            nxt = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = nxt
        for component in parts:
            if create:
                try:
                    os.mkdir(component, mode=0o755, dir_fd=fd)
                except FileExistsError:
                    pass
            nxt = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = nxt
        return fd
    except BaseException:
        os.close(fd)
        raise


def read_file(root, relative, metadata_only=False):
    parts = relative_parts(relative)
    fd = directory_fd(root, parts[:-1])
    try:
        file_fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
        with os.fdopen(file_fd, 'rb') as stream:
            info = os.fstat(stream.fileno())
            require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, 'source_not_regular_or_linked')
            if metadata_only:
                return None
            require(info.st_size <= MAX_BYTES, 'source_byte_limit')
            data = stream.read(MAX_BYTES + 1)
            require(len(data) <= MAX_BYTES, 'source_byte_limit')
            return data
    finally:
        os.close(fd)


def json_object(raw):
    def pairs(items):
        out = {}
        for key, value in items:
            require(key not in out, 'duplicate_manifest_key')
            out[key] = value
        return out
    try:
        value = json.loads(raw.decode('utf-8'), object_pairs_hook=pairs,
                           parse_constant=lambda _: (_ for _ in ()).throw(SkillError('invalid_json_constant')))
    except (UnicodeError, ValueError):
        raise SkillError('invalid_manifest_json') from None
    require(isinstance(value, dict), 'invalid_manifest_shape')
    return value


def verified_sources(root):
    manifest = json_object(read_file(root, MANIFEST))
    require(set(manifest) == {'schema_version', 'id', 'version', 'scope', 'authority_order',
                             'complements', 'model_policy', 'review_policy', 'workflow', 'known_gaps', 'skills'},
            'invalid_manifest_shape')
    require(type(manifest['schema_version']) is int and manifest['schema_version'] == 1
            and manifest['id'] == 'nexify-owned-project-skills'
            and manifest['scope'] == SCOPE
            and manifest['model_policy'] == 'config/llm-policy.json', 'invalid_manifest_scope')
    require(re.fullmatch(r'\d+\.\d+\.\d+', manifest['version']) is not None, 'invalid_manifest_version')
    review = manifest['review_policy']
    require(isinstance(review, dict) and all(type(x) is bool for x in review.values())
            and review == {'auto_refresh': False, 'review_required_on_missing_or_changed': True,
                       'version_change_required_for_skill_content_change': True,
                       'verification_is_not_review_approval': True}, 'invalid_review_policy')
    require(manifest['workflow'] == 'docs/workflows/context-to-delivery.md', 'invalid_workflow_scope')
    read_file(root, manifest['workflow'], metadata_only=True)
    records = manifest['skills']
    require(isinstance(records, list) and len(records) == len(NAMES), 'invalid_skill_allowlist')
    require(all(isinstance(x, dict) for x in records), 'invalid_skill_record')
    require({x.get('name') for x in records} == NAMES, 'invalid_skill_allowlist')
    verified = {}
    fields = {'name', 'version', 'owner', 'source_path', 'sha256', 'scope', 'install_path',
              'triggers', 'inputs', 'outputs', 'source_refs', 'review_triggers', 'definition_of_done'}
    for item in records:
        require(set(item) == fields, 'invalid_skill_record')
        name = item['name']
        # Validate path syntax before the stronger exact-name/path binding.
        relative_parts(item['source_path'])
        relative_parts(item['install_path'])
        require(item['source_path'] == f'skills/{name}/SKILL.md'
                and item['install_path'] == f'.agents/skills/{name}/SKILL.md'
                and item['scope'] == SCOPE, 'invalid_skill_path_or_scope')
        require(isinstance(item['owner'], str) and re.fullmatch(r'D\d{2}', item['owner']), 'invalid_owner')
        require(isinstance(item['version'], str) and re.fullmatch(r'\d+\.\d+\.\d+', item['version']),
                'invalid_skill_version')
        require(isinstance(item['sha256'], str) and re.fullmatch(r'[0-9a-f]{64}', item['sha256']),
                'invalid_skill_hash')
        for key in ('triggers', 'inputs', 'outputs', 'source_refs', 'review_triggers', 'definition_of_done'):
            require(isinstance(item[key], list) and item[key]
                    and all(isinstance(x, str) and x.strip() for x in item[key]), 'invalid_skill_list')
        for reference in item['source_refs']:
            parts = relative_parts(reference)
            require(reference in {'AGENTS.md', '.harness/arch-rules.json', 'scripts/verify-feature.sh'}
                    or parts[0] in {'config', 'docs', 'tools', 'tests', 'apps', 'packages'},
                    'forbidden_reference_scope')
            require(reference == '.harness/arch-rules.json'
                    or not any(part.startswith('.') for part in parts), 'forbidden_reference_scope')
            read_file(root, reference, metadata_only=True)
        raw = read_file(root, item['source_path'])
        require(hashlib.sha256(raw).hexdigest() == item['sha256'], 'skill_hash_drift_requires_review_and_version')
        try:
            text = raw.decode('utf-8')
        except UnicodeError:
            raise SkillError('invalid_skill_utf8') from None
        require(text.startswith('---\n') and '\n---\n' in text[4:], 'invalid_skill_frontmatter')
        front = text.split('\n---\n', 1)[0]
        require(re.search(r'^name:\s*' + re.escape(name) + r'\s*$', front, re.M)
                and re.search(r'^version:\s*' + re.escape(item['version']) + r'\s*$', front, re.M),
                'skill_name_or_version_mismatch')
        verified[name] = (item, raw)
    return manifest, verified


def verify(root=ROOT):
    _, sources = verified_sources(root)
    return {'status': 'verified_project_skill_sources', 'skills': len(sources),
            'installed_by_this_command': False, 'global_installation': False,
            'semantic_review_or_live_activation_claimed': False,
            'versions': {name: item['version'] for name, (item, _) in sorted(sources.items())}}


def install(root, names):
    require(isinstance(names, list) and names and len(names) == len(set(names))
            and all(name in NAMES for name in names), 'install_name_not_owned')
    _, sources = verified_sources(root)
    # Parent directory creation occurs only for explicit install, never verify.
    parent = directory_fd(root, ('.agents', 'skills'), create=True)
    created = []
    statuses = []
    try:
        # Preflight all selected destinations before writing any skill.
        for name in names:
            try:
                child = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
            except FileNotFoundError:
                continue
            try:
                require(os.listdir(child) == ['SKILL.md'], 'existing_destination_requires_review')
                expected = sources[name][1]
                actual = read_file(root, f'.agents/skills/{name}/SKILL.md')
                require(actual == expected, 'existing_destination_requires_review')
                statuses.append({'name': name, 'status': 'identical_unchanged'})
            finally:
                os.close(child)
        unchanged = {x['name'] for x in statuses}
        for name in names:
            if name in unchanged:
                continue
            # mkdir/O_EXCL refuse a target that appeared after preflight.
            os.mkdir(name, mode=0o755, dir_fd=parent)
            created.append((name, None))
            child = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
            try:
                fd = os.open('SKILL.md', os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                             0o644, dir_fd=child)
                info = os.fstat(fd)
                created[-1] = (name, (info.st_dev, info.st_ino))
                with os.fdopen(fd, 'wb') as stream:
                    stream.write(sources[name][1])
                    stream.flush()
                    os.fsync(stream.fileno())
            finally:
                os.close(child)
            require(read_file(root, f'.agents/skills/{name}/SKILL.md') == sources[name][1],
                    'install_readback_mismatch')
            statuses.append({'name': name, 'status': 'copied_and_exactly_read_back'})
        return {'status': 'project_local_skills_present', 'skills': statuses,
                'global_installation': False, 'third_party_overwritten': False,
                'remote_registration_or_activation': False}
    except BaseException:
        # Best effort rollback of only directories created by this call; never
        # recursively delete unknown content or modify pre-existing skills.
        for name, identity in reversed(created):
            try:
                child = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
                try:
                    info = os.stat('SKILL.md', dir_fd=child, follow_symlinks=False) if identity else None
                    if (info is not None and (info.st_dev, info.st_ino) == identity
                            and os.listdir(child) == ['SKILL.md']):
                        os.unlink('SKILL.md', dir_fd=child)
                finally:
                    os.close(child)
                os.rmdir(name, dir_fd=parent)
            except OSError:
                pass
        raise
    finally:
        os.close(parent)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command')
    commands.add_parser('verify')
    copying = commands.add_parser('install')
    copying.add_argument('--name', action='append', required=True, choices=sorted(NAMES))
    args = parser.parse_args(argv)
    try:
        result = install(ROOT, args.name) if args.command == 'install' else verify(ROOT)
    except (SkillError, OSError, TypeError, KeyError, ValueError) as error:
        code = str(error) if isinstance(error, SkillError) else 'source_or_destination_unavailable_requires_review'
        print(json.dumps({'status': 'review_required', 'code': code,
                          'automatic_hash_refresh': False, 'global_installation': False}))
        return 2
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
