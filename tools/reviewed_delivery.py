"""Bounded reviewed-branch push and draft PR, default read-only. No merge/mirror."""
import argparse
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import selectors
import stat
import subprocess
import time
from urllib.parse import urlencode
from tools.project_skills import directory_fd, SkillError

REPO = 'nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665'
OWNER = 'nexifyai-dev'
ORIGIN = 'https://github.com/' + REPO + '.git'
SHA = re.compile(r'^[0-9a-f]{40}$')
HEX = re.compile(r'^[0-9a-f]{64}$')
BRANCH = re.compile(r'^integration/[A-Za-z0-9][A-Za-z0-9._/-]{0,150}$')
MAX_OUTPUT = 1024 * 1024
GATES = {'check', 'test', 'e2e', 'check-arch'}


class DeliveryRejected(ValueError):
    pass


def require(ok, code):
    if not ok:
        raise DeliveryRejected(code)


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=True, separators=(',', ':'), allow_nan=False).encode()


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def parse(raw):
    require(isinstance(raw, bytes) and len(raw) <= MAX_OUTPUT, 'json_byte_limit')
    def pairs(rows):
        out = {}
        for key, value in rows:
            require(key not in out, 'duplicate_json_key')
            out[key] = value
        return out
    try:
        return json.loads(raw, object_pairs_hook=pairs,
                          parse_constant=lambda _: require(False, 'nonfinite_json'))
    except (ValueError, UnicodeError, RecursionError):
        raise DeliveryRejected('invalid_json') from None


def request_binding(value):
    require(isinstance(value, dict) and set(value) == {
        'schema_version', 'branch', 'head', 'base_sha', 'title', 'body', 'review', 'gates', 'required_ci'},
        'request_fields')
    require(type(value['schema_version']) is int and value['schema_version'] == 1, 'request_version')
    branch = value['branch']
    require(isinstance(branch, str) and BRANCH.fullmatch(branch) and '..' not in branch
            and '@{' not in branch and not branch.endswith(('/', '.', '.lock'))
            and all(p not in ('', '.', '..') and not p.startswith('.') and not p.endswith('.lock')
                    for p in branch.split('/')), 'own_integration_branch_required')
    require(all(isinstance(value[k], str) and SHA.fullmatch(value[k]) for k in ('head', 'base_sha')), 'exact_sha_required')
    for key, limit in [('title', 200), ('body', 20000)]:
        require(isinstance(value[key], str) and 0 < len(value[key]) <= limit
                and '\x00' not in value[key], 'invalid_pr_' + key)
    review = value['review']
    require(isinstance(review, dict) and set(review) == {'head', 'base_sha', 'status', 'reviewer', 'artifact_sha256', 'artifact_path'}
            and review['head'] == value['head'] and review['base_sha'] == value['base_sha']
            and review['status'] == 'passed' and isinstance(review['reviewer'], str)
            and 0 < len(review['reviewer']) <= 128 and isinstance(review['artifact_sha256'], str)
            and HEX.fullmatch(review['artifact_sha256']), 'review_evidence_not_bound_or_passed')
    require(isinstance(value['gates'], list) and len(value['gates']) == len(GATES), 'local_gate_set_required')
    names = set()
    for gate in value['gates']:
        require(isinstance(gate, dict) and set(gate) == {'name', 'head', 'status', 'artifact_sha256', 'artifact_path'}
                and isinstance(gate['name'], str) and gate['name'] in GATES and gate['name'] not in names
                and gate['head'] == value['head'] and gate['status'] == 'passed'
                and isinstance(gate['artifact_sha256'], str) and HEX.fullmatch(gate['artifact_sha256']),
                'local_gate_not_bound_or_passed')
        names.add(gate['name'])
    require(isinstance(value['required_ci'], list) and 1 <= len(value['required_ci']) <= 20
            and all(isinstance(s, str) and 0 < len(s) <= 100 and not any(ord(c) < 32 for c in s)
                    for s in value['required_ci']) and len(set(value['required_ci'])) == len(value['required_ci']),
            'required_ci_names_required')
    for evidence in [review, *value['gates']]:
        _evidence_parts(evidence['artifact_path'])
    return parse(canonical(value))


def _evidence_parts(value):
    require(isinstance(value, str) and 0 < len(value) <= 1024 and '\\' not in value
            and not value.startswith('/') and not any(ord(c) < 32 for c in value), 'unsafe_evidence_path')
    parts = value.split('/')
    require(all(p not in ('', '.', '..', '.git', '.ssh', '.aws', '.codex', '.agents')
                and not p.lower().startswith(('.env', 'credentials', 'secrets')) for p in parts), 'unsafe_evidence_path')
    return parts


def verify_evidence(workspace, request):
    for evidence in [request['review'], *request['gates']]:
        parts = _evidence_parts(evidence['artifact_path'])
        fd = directory_fd(workspace, parts[:-1])
        try:
            file = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
            with os.fdopen(file, 'rb') as stream:
                info = os.fstat(stream.fileno())
                require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_size <= 8192, 'unsafe_evidence_file')
                raw = stream.read(8193)
        finally:
            os.close(fd)
        require(len(raw) <= 8192 and hashlib.sha256(raw).hexdigest() == evidence['artifact_sha256'], 'evidence_hash_mismatch')
        expected = {'schema_version': 1, 'kind': 'gate' if 'name' in evidence else 'review',
                    'head': request['head'], 'base_sha': request['base_sha'], 'status': 'passed'}
        expected['name' if 'name' in evidence else 'reviewer'] = evidence.get('name', evidence.get('reviewer'))
        value = parse(raw)
        require(value == expected and type(value.get('schema_version')) is int, 'evidence_scope_or_status_mismatch')


def at(value, *keys):
    for key in keys:
        if not isinstance(value, dict):
            return None
        value = value.get(key)
    return value


class Commands:
    """No shell, bounded combined output, timeout, no raw command/error logging."""
    def run(self, argv, *, cwd, timeout=30):
        env = dict(os.environ)
        for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE', 'GIT_NAMESPACE'):
            env.pop(key, None)
        env.update({'GIT_TERMINAL_PROMPT': '0', 'GH_PROMPT_DISABLED': '1'})
        try:
            process = subprocess.Popen(argv, cwd=cwd, env=env, stdout=subprocess.PIPE,
                                       stderr=subprocess.PIPE, shell=False, start_new_session=True)
        except OSError:
            return {'returncode': None, 'stdout': b'', 'unknown': True}
        selector = selectors.DefaultSelector()
        for pipe in (process.stdout, process.stderr):
            selector.register(pipe, selectors.EVENT_READ)
        stdout, total, began = bytearray(), 0, time.monotonic()
        unknown = False
        try:
            while selector.get_map():
                if time.monotonic() - began > timeout:
                    unknown = True
                    break
                for entry, _ in selector.select(0.1):
                    chunk = os.read(entry.fd, 65536)
                    if not chunk:
                        selector.unregister(entry.fileobj)
                        continue
                    total += len(chunk)
                    if total > MAX_OUTPUT:
                        unknown = True
                        break
                    if entry.fileobj is process.stdout:
                        stdout.extend(chunk)
                if unknown:
                    break
            if unknown:
                os.killpg(process.pid, 9)
            code = process.wait(timeout=5)
        except (OSError, subprocess.TimeoutExpired):
            try:
                os.killpg(process.pid, 9)
            except ProcessLookupError:
                pass
            code, unknown = None, True
        finally:
            selector.close()
            process.stdout.close()
            process.stderr.close()
        return {'returncode': code, 'stdout': bytes(stdout), 'unknown': unknown}


class Flow:
    def __init__(self, workspace, commands):
        self.workspace, self.commands, self.calls = str(workspace), commands, 0

    def call(self, argv, *, acceptable=(0,), write=False):
        self.calls += 1
        require(self.calls <= 120, 'command_budget')
        reply = self.commands.run(argv, cwd=self.workspace, timeout=30)
        require(isinstance(reply, dict) and isinstance(reply.get('stdout'), bytes)
                and len(reply['stdout']) <= MAX_OUTPUT and type(reply.get('unknown')) is bool, 'command_reply_invalid')
        if write:
            return reply
        require(not reply['unknown'] and reply['returncode'] in acceptable, 'read_command_unavailable')
        return reply

    def git(self, *args, **kwargs):
        return self.call(['git', '--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'http.followRedirects=false',
                          '-c', 'push.followTags=false', '-c', 'protocol.allow=never',
                          '-c', 'protocol.https.allow=always', *args], **kwargs)

    def api(self, endpoint, *, payload=None):
        args = ['gh', 'api', '--hostname', 'github.com', '--method', 'GET' if payload is None else 'POST',
                '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2026-03-10', endpoint]
        if payload is not None:
            args += ['--input', str(payload)]
        reply = self.call(args, write=payload is not None)
        return reply if payload is not None else parse(reply['stdout'])

    def pages(self, endpoint, params, *, key=None):
        rows, expected = [], None
        for page in range(1, 6):
            value = self.api(endpoint + '?' + urlencode({**params, 'per_page': 100, 'page': page}))
            part = value if key is None else value.get(key) if isinstance(value, dict) else None
            require(isinstance(part, list) and len(part) <= 100, 'pagination_shape')
            if key is not None:
                count = value.get('total_count')
                require(type(count) is int and count >= 0 and (expected is None or expected == count), 'pagination_total_changed')
                expected = count
            rows.extend(part)
            require(len(rows) <= 400, 'pagination_budget')
            if len(part) < 100:
                require(expected is None or expected == len(rows), 'pagination_incomplete')
                return rows
        raise DeliveryRejected('pagination_incomplete')

    def remote_head(self, branch):
        ref = 'refs/heads/' + branch
        raw = self.git('ls-remote', '--refs', 'origin', ref)['stdout'].decode().strip()
        if not raw:
            return None
        parts = raw.split()
        require(len(parts) == 2 and SHA.fullmatch(parts[0]) and parts[1] == ref, 'remote_ref_ambiguous')
        return parts[0]

    def local(self, request):
        verify_evidence(self.workspace, request)
        require(not self.git('status', '--porcelain=v1', '--untracked-files=all')['stdout'], 'worktree_not_clean')
        require(self.git('rev-parse', '--verify', 'HEAD^{commit}')['stdout'].decode().strip() == request['head'], 'local_head_changed')
        require(self.git('symbolic-ref', '--quiet', '--short', 'HEAD')['stdout'].decode().strip() == request['branch'], 'local_branch_changed')
        self.git('check-ref-format', '--branch', request['branch'])
        self.git('merge-base', '--is-ancestor', request['base_sha'], request['head'])

    def remote_identity(self):
        rewrites = self.git('config', '--name-only', '--get-regexp', r'^url\..*\.(insteadof|pushinsteadof)$', acceptable=(0, 1))
        require(not rewrites['stdout'], 'url_rewrite_not_allowed')
        unsafe = self.git('config', '--name-only', '--get-regexp',
                          r'^remote\.origin\.(mirror|receivepack|uploadpack|pushoption|proxy|vcs)$', acceptable=(0, 1))
        require(not unsafe['stdout'], 'remote_transport_override_not_allowed')
        names = self.git('remote')['stdout'].decode().splitlines()
        require('origin' in names, 'github_origin_unbound')
        for option in ([], ['--push']):
            urls = self.git('remote', 'get-url', *option, '--all', 'origin')['stdout'].decode().splitlines()
            require(len(urls) == 1 and urls[0] in (ORIGIN, ORIGIN.removesuffix('.git')), 'github_origin_identity_mismatch')
        user = self.api('user')
        require(isinstance(user, dict) and user.get('login') == OWNER, 'github_actor_not_bound')
        repo = self.api('repos/' + REPO)
        require(isinstance(repo, dict) and repo.get('full_name') == REPO and repo.get('default_branch') == 'main'
                and isinstance(repo.get('permissions'), dict) and repo['permissions'].get('push') is True,
                'github_repo_or_permission_not_bound')

    def own_pr(self, request, *, exact=False):
        rows = self.pages('repos/' + REPO + '/pulls', {'state': 'all', 'head': OWNER + ':' + request['branch'], 'base': 'main'})
        require(len(rows) <= 1, 'branch_pr_history_ambiguous')
        if not rows:
            return None
        value = rows[0]
        require(isinstance(value, dict) and type(value.get('number')) is int and value['number'] > 0
                and at(value, 'base', 'repo', 'full_name') == REPO
                and at(value, 'base', 'ref') == 'main'
                and at(value, 'head', 'repo', 'full_name') == REPO
                and at(value, 'head', 'ref') == request['branch']
                and at(value, 'user', 'login') == OWNER
                and value.get('state') in ('open', 'closed'), 'pr_identity_mismatch')
        if value.get('merged_at') is not None:
            return {'number': value['number'], 'state': 'merged'}
        require(value['state'] == 'open', 'branch_pr_closed_do_not_recreate')
        head = at(value, 'head', 'sha')
        require(value.get('draft') is True and isinstance(head, str) and SHA.fullmatch(head)
                and (not exact or head == request['head']), 'existing_pr_not_exact_draft')
        return {'number': value['number'], 'state': 'draft', 'head': head}

    def overlaps(self, request, own):
        raw = self.git('diff', '--name-only', '-z', '--no-renames', request['base_sha'], request['head'])['stdout']
        paths = set(raw.decode().strip('\x00').split('\x00')) if raw else set()
        require(0 < len(paths) <= 2000 and all(p and len(p) <= 4096 and not any(ord(c) < 32 for c in p) for p in paths),
                'changed_file_set_invalid_or_empty')
        prs = self.pages('repos/' + REPO + '/pulls', {'state': 'open', 'base': 'main'})
        for pr in prs:
            number = pr.get('number') if isinstance(pr, dict) else None
            require(type(number) is int and number > 0, 'open_pr_shape')
            if own is not None and number == own['number']:
                continue
            files = self.pages('repos/' + REPO + '/pulls/' + str(number) + '/files', {})
            foreign = set()
            for item in files:
                require(isinstance(item, dict) and isinstance(item.get('filename'), str), 'pr_file_shape')
                foreign.add(item['filename'])
                if 'previous_filename' in item:
                    require(isinstance(item['previous_filename'], str), 'pr_file_shape')
                    foreign.add(item['previous_filename'])
            require(not paths & foreign, 'foreign_pr_file_overlap')
        return len(paths)

    def ci(self, request):
        try:
            checks = self.pages('repos/' + REPO + '/commits/' + request['head'] + '/check-runs', {'filter': 'latest'}, key='check_runs')
            statuses = self.api('repos/' + REPO + '/commits/' + request['head'] + '/status?per_page=100')
            require(isinstance(statuses, dict) and statuses.get('sha') == request['head']
                    and isinstance(statuses.get('statuses'), list)
                    and type(statuses.get('total_count')) is int
                    and statuses['total_count'] == len(statuses['statuses']) <= 100, 'ci_status_incomplete_or_wrong_sha')
            observed = {}
            def add(name, status):
                require(isinstance(name, str), 'ci_context_invalid')
                if name in request['required_ci']:
                    require(name not in observed, 'ci_context_ambiguous')
                    observed[name] = status
            for row in checks:
                require(isinstance(row, dict) and row.get('head_sha') == request['head'], 'ci_check_wrong_sha')
                state, conclusion = row.get('status'), row.get('conclusion')
                add(row.get('name'), 'passed' if state == 'completed' and conclusion == 'success' else
                    'failed' if conclusion in ('failure', 'cancelled', 'timed_out', 'action_required') else
                    'pending' if state != 'completed' else 'unavailable')
            for row in statuses['statuses']:
                require(isinstance(row, dict), 'ci_status_shape')
                add(row.get('context'), {'success': 'passed', 'failure': 'failed', 'error': 'failed', 'pending': 'pending'}.get(row.get('state'), 'unavailable'))
            selected = {name: observed.get(name, 'unavailable') for name in request['required_ci']}
            state = ('passed' if all(v == 'passed' for v in selected.values()) else
                     'failed' if 'failed' in selected.values() else 'pending' if 'pending' in selected.values() else 'unavailable')
            return {'head': request['head'], 'status': state, 'checks': selected}
        except DeliveryRejected:
            return {'head': request['head'], 'status': 'unavailable', 'checks': {}}


@contextmanager
def checkpoint_store(directory):
    path = Path(directory).absolute()
    fd = directory_fd(path.parent, (path.name,), create=True)
    lock = os.open('.delivery.lock', os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600, dir_fd=fd)
    try:
        info = os.fstat(lock)
        require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, 'unsafe_checkpoint_lock')
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise DeliveryRejected('delivery_busy') from None
        yield fd
    finally:
        os.close(lock)
        os.close(fd)


def load_checkpoint(fd, name, key):
    try:
        file = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
    except FileNotFoundError:
        return {'schema_version': 1, 'request_sha256': key, 'push': 'not_started', 'pr': 'not_started'}
    with os.fdopen(file, 'rb') as stream:
        info = os.fstat(stream.fileno())
        require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_size <= 65536, 'unsafe_checkpoint')
        value = parse(stream.read(65537))
    require(isinstance(value, dict) and set(value) == {'schema_version', 'request_sha256', 'push', 'pr'}
            and type(value['schema_version']) is int and value['schema_version'] == 1
            and value['request_sha256'] == key
            and value['push'] in ('not_started', 'pending', 'verified')
            and value['pr'] in ('not_started', 'pending', 'verified'), 'checkpoint_binding')
    return value


def save_checkpoint(fd, name, value):
    tmp = '.delivery-' + secrets.token_hex(16)
    file = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=fd)
    try:
        with os.fdopen(file, 'wb') as stream:
            stream.write(canonical(value)); stream.flush(); os.fsync(stream.fileno())
        os.replace(tmp, name, src_dir_fd=fd, dst_dir_fd=fd)
        os.fsync(fd)
    finally:
        try: os.unlink(tmp, dir_fd=fd)
        except FileNotFoundError: pass


def deliver(request, *, workspace, state_directory, execute=False, retry_reconciled=False, commands=None):
    """Plan by default. Only explicit execute permits fixed branch push/draft POST."""
    report = {'repository': REPO, 'state': 'blocked', 'pushed': False, 'push_attempted': False, 'branch_verified': False,
              'pr_create_attempted': False, 'pr': None, 'final_readback_verified': False,
              'merged': False, 'gitlab': {'status': 'unbound', 'mirror_performed': False, 'mr_created': False},
              'ci': {'status': 'unavailable'}}
    try:
        request = request_binding(request)
        require(type(execute) is bool and type(retry_reconciled) is bool, 'explicit_execution_mode')
        key = digest(request)
        report.update({'head': request['head'], 'branch': request['branch'], 'request_sha256': key})
        flow = Flow(workspace, commands or Commands())
        with checkpoint_store(state_directory) as fd:
            name = 'delivery-' + key + '.json'
            checkpoint = load_checkpoint(fd, name, key)
            flow.local(request)
            flow.remote_identity()
            own = flow.own_pr(request)
            if own is not None and own['state'] == 'merged':
                report.update(state='already_merged', pr=own['number'])
                return report
            require(flow.remote_head('main') == request['base_sha'], 'remote_main_changed')
            report['changed_files'] = flow.overlaps(request, own)
            before = flow.remote_head(request['branch'])
            require(own is None or own['head'] == before, 'existing_pr_head_not_remote_branch')
            if before != request['head'] and before is not None:
                flow.git('cat-file', '-e', before + '^{commit}')
                flow.git('merge-base', '--is-ancestor', before, request['head'])
            if not execute:
                report.update(state='plan_ready', actions=(['push_exact_branch'] if before != request['head'] else [])
                              + (['create_draft_pr'] if own is None else []))
                report['ci'] = flow.ci(request)
                return report
            if before != request['head']:
                require(checkpoint['push'] != 'pending' or retry_reconciled, 'push_unknown_reconciled_retry_required')
                flow.local(request)
                require(flow.remote_head('main') == request['base_sha'], 'remote_main_changed')
                require(flow.remote_head(request['branch']) == before, 'remote_branch_changed')
                checkpoint['push'] = 'pending'; save_checkpoint(fd, name, checkpoint)
                report.update(push_attempted=True, pushed=None)
                flow.git('push', '--porcelain', 'origin', request['head'] + ':refs/heads/' + request['branch'], write=True)
                require(flow.remote_head(request['branch']) == request['head'], 'push_outcome_unconfirmed')
            report['pushed'] = report['push_attempted']
            report['branch_verified'] = True
            checkpoint['push'] = 'verified'; save_checkpoint(fd, name, checkpoint)
            own = flow.own_pr(request, exact=True)
            if own is not None and own['state'] == 'merged':
                report.update(state='already_merged', pr=own['number'])
                return report
            if own is None:
                require(checkpoint['pr'] != 'pending' or retry_reconciled, 'pr_unknown_reconciled_retry_required')
                flow.local(request)
                require(flow.remote_head('main') == request['base_sha'], 'remote_main_changed')
                require(flow.remote_head(request['branch']) == request['head'], 'remote_branch_changed')
                flow.overlaps(request, None)
                checkpoint['pr'] = 'pending'; save_checkpoint(fd, name, checkpoint)
                payload = Path(state_directory) / ('draft-' + key + '.json')
                # Exact JSON body, no shell or -F file/magic interpolation.
                body = {'title': request['title'], 'body': request['body'], 'head': request['branch'],
                        'base': 'main', 'draft': True, 'maintainer_can_modify': False}
                save_checkpoint(fd, payload.name, body)
                report['pr_create_attempted'] = True
                flow.api('repos/' + REPO + '/pulls', payload=payload.absolute())
                own = flow.own_pr(request, exact=True)
                require(own is not None and own['state'] == 'draft', 'pr_outcome_unconfirmed')
            checkpoint['pr'] = 'verified'; save_checkpoint(fd, name, checkpoint)
            report.update(pr=own['number'], pr_url='https://github.com/' + REPO + '/pull/' + str(own['number']))
            require(flow.remote_head(request['branch']) == request['head'], 'remote_branch_changed')
            report['ci'] = flow.ci(request)
            require(flow.remote_head('main') == request['base_sha'], 'remote_main_changed')
            require(flow.remote_head(request['branch']) == request['head'], 'remote_branch_changed')
            require(flow.own_pr(request, exact=True) == own, 'pr_readback_changed')
            report.update(state='draft_verified', final_readback_verified=True)
            return report
    except (DeliveryRejected, OSError, UnicodeError, SkillError) as exc:
        report['state'] = 'blocked'
        report['final_readback_verified'] = False
        report['reason'] = str(exc) if isinstance(exc, DeliveryRejected) else 'local_or_command_io_unavailable'
        return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--workspace', required=True, type=Path)
    parser.add_argument('--state-directory', required=True, type=Path)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--retry-reconciled', action='store_true')
    args = parser.parse_args(argv)
    try:
        file = os.open(args.input, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(file, 'rb') as stream:
            info = os.fstat(stream.fileno())
            require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_size <= 65536, 'unsafe_input')
            request = parse(stream.read(65537))
        result = deliver(request, workspace=args.workspace, state_directory=args.state_directory,
                         execute=args.execute, retry_reconciled=args.retry_reconciled)
    except (DeliveryRejected, OSError):
        result = {'state': 'blocked', 'reason': 'invalid_local_input'}
    print(canonical(result).decode())
    return 2 if result['state'] == 'blocked' else 0


if __name__ == '__main__':
    raise SystemExit(main())
