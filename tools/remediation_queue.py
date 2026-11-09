#!/usr/bin/env python3
"""Local remediation lifecycle with bound native checks; never a command runner."""
import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import sqlite3
import stat
import subprocess
import sys
import tempfile
import time
import types
import uuid

ROOT = Path(__file__).resolve().parents[1]
POLICY = 'config/remediation-policy.json'
LOCAL_REGRESSIONS = {
    'context_reader_regression': ('tools/context_executor.py', 'tests/test_context_executor.py'),
    'brain_ingestion_regression': ('tools/brain_ingestion.py', 'tests/test_brain_ingestion.py'),
    'seo_atomicity_regression': ('tools/seo_catalog.py', 'tests/test_seo_catalog.py', 'config/seo-workflow.json'),
}
BROWSER_SOURCES = ('apps/web/components/HomeContent.tsx', 'apps/web/components/Workspace.tsx',
    'apps/web/components/PageConcept.css', 'config/site-map.json',
    'apps/web/components/PublicOrientationChat.tsx', 'apps/web/components/PublicOrientationChat.css',
    'api/agent-chat.ts', 'packages/agent-runtime/public-orientation.ts', 'tools/agent-preview.mjs',
    'docs/design/detail-browser-evidence.json')
KINDS = {'local_control_prerequisites', 'local_file_sha256', 'project_skills_integrity', 'managed_llm_policy', 'external_readback_required', 'browser_evidence_binding', *LOCAL_REGRESSIONS}
STATES = {'blocked', 'in_progress', 'awaiting_external', 'verify', 'resolved'}
SHA = re.compile(r'^[a-f0-9]{64}$')
IDENT = re.compile(r'^[A-Za-z0-9_./:-]{1,160}$')
SECRET = re.compile(r'(?i)\b(?:sk-(?:or-v1-|proj-)?[A-Za-z0-9_-]{16,}|(?:sk|rk)_(?:live|test)_[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{16,})|://[^\s/@:]+:[^\s/@]+@|-----BEGIN .*PRIVATE KEY')


class QueueError(Exception):
    pass


def require(condition, code):
    if not condition:
        raise QueueError(code)


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def digest(value):
    return hashlib.sha256(value.encode() if isinstance(value, str) else value).hexdigest()


def text(value, maximum=2000):
    require(isinstance(value, str) and 0 < len(value) <= maximum
            and not any(ord(c) < 32 or ord(c) == 127 for c in value)
            and not SECRET.search(value), 'invalid_or_sensitive_metadata')
    return value


def identifier(value):
    require(isinstance(value, str) and IDENT.fullmatch(value) is not None and not SECRET.search(value), 'invalid_identifier')
    require('affilinet' not in value.casefold(), 'customer_scope_forbidden')
    return value


def directory_fd(path, create=False):
    path = Path(path).absolute()
    require(path != Path('/') and '..' not in path.parts, 'unsafe_directory')
    fd = os.open('/', os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in path.parts[1:]:
            if create:
                try:
                    os.mkdir(part, mode=0o700, dir_fd=fd)
                except FileExistsError:
                    pass
            nxt = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = nxt
        return fd
    except BaseException:
        os.close(fd)
        raise


def source_parts(path):
    require(isinstance(path, str) and '\\' not in path and not any(ord(c) < 32 for c in path), 'unsafe_source')
    parts = PurePosixPath(path).parts
    require(parts and not PurePosixPath(path).is_absolute() and PurePosixPath(path).as_posix() == path
            and '..' not in parts and (path in {'AGENTS.md', 'apps/web/components/WorkspaceRebuild.css', *BROWSER_SOURCES} or parts[0] in {'config', 'docs', 'skills', 'tools', 'tests'}), 'unsafe_source')
    require(not any(part.startswith('.') or 'affilinet' in part.casefold() or part.casefold() in
                    {'reference', 'customers', 'customer', 'secrets', 'credentials', 'node_modules'} for part in parts), 'unsafe_source')
    require(PurePosixPath(path).suffix in {'.json', '.md', '.py', '.mjs', '.ts', '.tsx', '.css'}
            and not re.search(r'(?i)secret|credential|private[-_]?key|access[-_]?token|refresh[-_]?token', parts[-1]), 'unsafe_source')
    return parts


def read_source(root, path, maximum=524288):
    parts = source_parts(path)
    fd = directory_fd(Path(root).absolute().joinpath(*parts[:-1]))
    try:
        child = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
        with os.fdopen(child, 'rb') as stream:
            before = os.fstat(stream.fileno())
            require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and before.st_size <= maximum, 'source_type_or_limit')
            raw = stream.read(maximum + 1)
            after = os.fstat(stream.fileno())
        require(len(raw) <= maximum and (before.st_size, before.st_mtime_ns, before.st_ctime_ns)
                == (after.st_size, after.st_mtime_ns, after.st_ctime_ns), 'source_changed_or_limit')
        return raw
    finally:
        os.close(fd)


def json_value(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'duplicate_json_key')
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=lambda _: (_ for _ in ()).throw(QueueError('invalid_json_number')))


class RemediationQueue:
    def __init__(self, database=None, *, root=ROOT, read_only=False):
        self.root = Path(root).absolute()
        self.read_only = read_only
        self.policy = json_value(read_source(self.root, POLICY))
        require(self.policy.get('schema_version') == 1 and self.policy.get('scope') == 'canonical_agency_project'
                and set(self.policy.get('verifiers', [])) == KINDS, 'unsupported_policy')
        for key, maximum in [('max_items', 10000), ('max_source_bytes', 524288), ('max_source_refs', 32),
                             ('default_due_seconds', 604800), ('max_attempts', 10), ('max_history_records', 100000)]:
            require(type(self.policy.get(key)) is int and 1 <= self.policy[key] <= maximum, 'invalid_policy_limit')
        delays = self.policy.get('retry_delays_seconds')
        require(isinstance(delays, list) and len(delays) == self.policy['max_attempts']
                and all(type(v) is int and 1 <= v <= 86400 for v in delays), 'invalid_retry_policy')
        identifier(self.policy['escalation_owner'])
        selected = Path(database) if database is not None else Path(self.policy['default_database'])
        self.path = (selected if selected.is_absolute() else self.root / selected).absolute()
        require('..' not in self.path.parts and self.path.is_relative_to(self.root / '.local/remediation')
                and self.path.suffix == '.sqlite3', 'database_outside_private_registry')
        # SQLite operates in a private fixed directory; reject aliases/hardlinks.
        parent = directory_fd(self.path.parent, create=not read_only)
        try:
            flags = os.O_RDONLY if read_only else os.O_RDWR | os.O_CREAT
            child = os.open(self.path.name, flags | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600, dir_fd=parent)
            info = os.fstat(child)
            os.close(child)
            require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, 'unsafe_database')
            if not read_only:
                os.chmod(self.path, 0o600, follow_symlinks=False)
        finally:
            os.close(parent)
        if read_only:
            return
        with self.connection() as db:
            db.executescript('''
              PRAGMA journal_mode=WAL;
              CREATE TABLE IF NOT EXISTS items(
                id TEXT PRIMARY KEY,scope TEXT NOT NULL,scope_hash TEXT NOT NULL,check_spec TEXT NOT NULL,
                source_refs TEXT NOT NULL,fingerprint TEXT NOT NULL,owner TEXT NOT NULL,next_action TEXT NOT NULL,
                due_at REAL NOT NULL,state TEXT NOT NULL,generation INTEGER NOT NULL,attempts INTEGER NOT NULL,
                retry_at REAL,escalated INTEGER NOT NULL,escalation_reason TEXT,active_ticket TEXT,
                created_at REAL NOT NULL,updated_at REAL NOT NULL);
              CREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,item_id TEXT NOT NULL,generation INTEGER NOT NULL,
                fingerprint TEXT NOT NULL,scope_hash TEXT NOT NULL,state TEXT NOT NULL,started_at REAL NOT NULL);
              CREATE TABLE IF NOT EXISTS observations(ticket_id TEXT PRIMARY KEY,item_id TEXT NOT NULL,
                generation INTEGER NOT NULL,fingerprint TEXT NOT NULL,scope_hash TEXT NOT NULL,
                outcome TEXT NOT NULL,evidence TEXT NOT NULL,observed_at REAL NOT NULL);
              CREATE TABLE IF NOT EXISTS events(event_key TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,result TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,item_id TEXT NOT NULL,event TEXT NOT NULL,
                generation INTEGER NOT NULL,at REAL NOT NULL);
            ''')

    @contextmanager
    def connection(self, *, read_only=False):
        for suffix in ('', '-wal', '-shm', '-journal'):
            target = Path(str(self.path) + suffix)
            try:
                info = target.lstat()
            except FileNotFoundError:
                continue  # SQLite may unlink its own WAL between connections.
            # A concurrent SQLite close can unlink a WAL/SHM/journal while
            # lstat is returning its regular inode with zero links. Recheck
            # that path once; never relax the type/link check or the main DB.
            if suffix and stat.S_ISREG(info.st_mode) and info.st_nlink == 0:
                try:
                    info = target.lstat()
                except FileNotFoundError:
                    continue
            require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, 'unsafe_database_sidecar')
        readonly = self.read_only or read_only
        db = sqlite3.connect(self.path.as_uri() + '?mode=ro' if readonly else self.path,
                             uri=readonly, timeout=15, isolation_level=None)
        db.row_factory = sqlite3.Row
        try:
            yield db
        finally:
            db.close()

    @contextmanager
    def transaction(self):
        require(not self.read_only, 'read_only_registry')
        with self.connection() as db:
            db.execute('BEGIN IMMEDIATE')
            try:
                count = sum(db.execute('SELECT count(*) FROM ' + table).fetchone()[0] for table in ('tickets', 'observations', 'events', 'audit'))
                require(count + 8 <= self.policy['max_history_records'], 'history_limit_requires_local_operator_archive')
                yield db
                db.execute('COMMIT')
            except BaseException:
                db.execute('ROLLBACK')
                raise

    def _spec(self, scope, check, paths):
        require(isinstance(scope, dict) and set(scope) == {'project', 'component', 'resource', 'requirement'}, 'invalid_scope')
        require(scope['project'] == 'canonical_agency_project', 'customer_scope_forbidden')
        for value in scope.values():
            identifier(value)
        require(isinstance(check, dict) and check.get('kind') in KINDS, 'unsupported_check')
        kind = check['kind']
        fields = {'kind', 'job_id', 'tenant'} if kind == 'local_control_prerequisites' else {'kind', 'path', 'expected_sha256'} if kind == 'local_file_sha256' else {'kind', 'evidence_requirement'} if kind == 'external_readback_required' else {'kind'}
        require(set(check) == fields, 'unexpected_check_field')
        if kind == 'local_control_prerequisites':
            identifier(check['tenant']); identifier(check['job_id'])
            require(SHA.fullmatch(check['job_id']) is not None, 'invalid_job_id')
        if kind == 'local_file_sha256':
            source_parts(check['path'])
            require(isinstance(check['expected_sha256'], str) and SHA.fullmatch(check['expected_sha256']), 'invalid_expected_hash')
        if kind == 'external_readback_required':
            text(check['evidence_requirement'])
        require(isinstance(paths, list) and 1 <= len(paths) <= self.policy['max_source_refs'] and all(isinstance(p, str) for p in paths), 'invalid_source_refs')
        required = [POLICY]
        if kind == 'local_control_prerequisites':
            required += ['tools/local_control.py', 'config/local-control.json']
        if kind in LOCAL_REGRESSIONS:
            required += list(LOCAL_REGRESSIONS[kind]) + ['tools/remediation_queue.py']
        if kind == 'browser_evidence_binding':
            required += list(BROWSER_SOURCES) + ['tools/check_browser_evidence.py', 'tests/test_browser_evidence.py', 'tools/remediation_queue.py']
        if kind == 'local_file_sha256':
            required += [check['path']]
        if kind == 'project_skills_integrity':
            required += ['tools/project_skills.py', 'config/project-skills.json']
            manifest = json_value(read_source(self.root, 'config/project-skills.json', self.policy['max_source_bytes']))
            skills = manifest.get('skills', [])
            require(isinstance(skills, list) and len(skills) <= 20, 'invalid_skill_manifest')
            required += [item['source_path'] for item in skills]
        if kind == 'managed_llm_policy':
            required += ['tools/check_llm_policy.py', 'config/llm-policy.json', 'config/automation.json',
                         'config/selfservice-policy.json', 'config/brain/agents.json', 'config/llm-verbindungen.json']
        paths = sorted(set(paths + required))
        require(len(paths) <= self.policy['max_source_refs'], 'invalid_source_refs')
        refs = [{'path': path, 'sha256': digest(read_source(self.root, path, self.policy['max_source_bytes']))} for path in paths]
        fingerprint = digest(canonical({'scope': scope, 'check': check, 'sources': refs}))
        return refs, fingerprint

    def _current(self, row):
        try:
            refs = json.loads(row['source_refs'])
            return all(digest(read_source(self.root, ref['path'], self.policy['max_source_bytes'])) == ref['sha256'] for ref in refs)
        except (OSError, QueueError, ValueError):
            return False

    def _item(self, db, item_id):
        row = db.execute('SELECT * FROM items WHERE id=?', (item_id,)).fetchone()
        require(row is not None, 'item_not_found')
        return row

    def _event(self, db, key, payload):
        identifier(key)
        previous = db.execute('SELECT * FROM events WHERE event_key=?', (key,)).fetchone()
        if previous:
            require(previous['payload_hash'] == digest(canonical(payload)), 'event_key_conflict')
            return json.loads(previous['result'])
        return None

    def _record(self, db, key, payload, result):
        db.execute('INSERT INTO events VALUES(?,?,?)', (key, digest(canonical(payload)), canonical(result)))
        return result

    def register(self, scope, check, *, source_paths, owner, next_action, due_at=None, now=None):
        now = time.time() if now is None else now
        identifier(owner); text(next_action)
        refs, fingerprint = self._spec(scope, check, source_paths)
        item_id = digest(canonical(scope))
        due_at = now + self.policy['default_due_seconds'] if due_at is None else due_at
        require(type(due_at) in {int, float} and 0 <= due_at < 10**12, 'invalid_due_time')
        with self.transaction() as db:
            previous = db.execute('SELECT * FROM items WHERE id=?', (item_id,)).fetchone()
            if previous and previous['fingerprint'] == fingerprint:
                # A repeated detector must preserve an owner's newer plan and deadline.
                return {'id': item_id, 'generation': previous['generation'], 'state': previous['state'], 'deduplicated': True}
            require(previous is not None or db.execute('SELECT count(*) FROM items').fetchone()[0] < self.policy['max_items'], 'queue_item_limit')
            generation = previous['generation'] + 1 if previous else 1
            if previous and previous['state'] != 'resolved':
                due_at = min(due_at, previous['due_at'])
            created = previous['created_at'] if previous else now
            db.execute('''INSERT INTO items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET scope=excluded.scope,scope_hash=excluded.scope_hash,check_spec=excluded.check_spec,
              source_refs=excluded.source_refs,fingerprint=excluded.fingerprint,owner=excluded.owner,next_action=excluded.next_action,
              due_at=excluded.due_at,state='blocked',generation=excluded.generation,attempts=0,retry_at=NULL,escalated=0,
              escalation_reason=NULL,active_ticket=NULL,updated_at=excluded.updated_at''',
              (item_id, canonical(scope), digest(canonical(scope)), canonical(check), canonical(refs), fingerprint, owner,
               next_action, due_at, 'blocked', generation, 0, None, 0, None, None, created, now))
            db.execute('INSERT INTO audit(item_id,event,generation,at) VALUES(?,?,?,?)', (item_id, 'registered_or_reopened', generation, now))
            return {'id': item_id, 'generation': generation, 'state': 'blocked', 'deduplicated': False}

    def transition(self, item_id, *, owner, state, next_action, reason, event_key, now=None):
        now = time.time() if now is None else now
        require(state in {'in_progress', 'awaiting_external'}, 'resolution_requires_native_verification')
        identifier(owner); text(next_action); text(reason)
        payload = {'id': item_id, 'owner': owner, 'state': state, 'next_action': next_action, 'reason': reason}
        with self.transaction() as db:
            replay = self._event(db, event_key, payload)
            if replay:
                return replay
            row = self._item(db, item_id)
            require(row['owner'] == owner and row['state'] != 'resolved', 'owner_or_state_mismatch')
            db.execute('UPDATE items SET state=?,next_action=?,active_ticket=NULL,updated_at=? WHERE id=?', (state, next_action, now, item_id))
            db.execute('INSERT INTO audit(item_id,event,generation,at) VALUES(?,?,?,?)', (item_id, state, row['generation'], now))
            return self._record(db, event_key, payload, {'id': item_id, 'state': state, 'generation': row['generation']})

    def begin_verification(self, item_id, *, event_key, now=None):
        now = time.time() if now is None else now
        payload = {'id': item_id, 'operation': 'begin_verification'}
        with self.transaction() as db:
            replay = self._event(db, event_key, payload)
            if replay:
                return replay
            row = self._item(db, item_id)
            require(row['attempts'] < self.policy['max_attempts'], 'retry_exhausted_requires_owner_replan')
            require(row['retry_at'] is None or row['retry_at'] <= now, 'retry_not_due')
            ticket = uuid.uuid4().hex
            db.execute('INSERT INTO tickets VALUES(?,?,?,?,?,?,?)', (ticket, item_id, row['generation'], row['fingerprint'], row['scope_hash'], 'pending', now))
            db.execute("UPDATE items SET state='verify',active_ticket=?,attempts=attempts+1,updated_at=? WHERE id=?", (ticket, now, item_id))
            return self._record(db, event_key, payload, {'ticket': ticket, 'id': item_id, 'generation': row['generation'], 'state': 'verify'})

    def _native_module(self, name):
        # Only these fixed, source-bound modules may be invoked. Never import a supplied path.
        require(name in {'project_skills', 'check_llm_policy', 'check_browser_evidence', 'local_control'}, 'unsupported_verifier_module')
        # Code always comes from this application's trusted checkout, never a
        # supplied data root. Execute precisely the safe-read bytes, not a path
        # reopened by importlib after its validation.
        source = ROOT / 'tools' / (name + '.py')
        raw = read_source(ROOT, 'tools/' + name + '.py', self.policy['max_source_bytes'])
        module = types.ModuleType('_remediation_' + name)
        module.__file__ = str(source)
        exec(compile(raw, str(source), 'exec'), module.__dict__)
        return module

    def _check(self, check):
        kind = check['kind']
        if kind == 'external_readback_required':
            return {'outcome': 'awaiting_external', 'code': 'actual_authorized_external_adapter_and_readback_required'}
        try:
            if kind == 'local_control_prerequisites':
                module = self._native_module('local_control')
                control = module.LocalControl(root=self.root, tenant=check['tenant'], project='canonical_agency_project', read_only=True)
                return control.check_prerequisites(check['job_id'])
            if kind == 'browser_evidence_binding':
                module = self._native_module('check_browser_evidence')
                def bounded_read(root, path):
                    require(path in BROWSER_SOURCES, 'unexpected_browser_source')
                    return read_source(root, path, self.policy['max_source_bytes'])
                module._read = bounded_read
                result = module.check_evidence(self.root)
                require(result['status'] == 'passed', 'browser_binding_failed')
                return {'outcome': 'passed', 'code': 'stored_browser_evidence_binding_only',
                        'sdk_source_count': result['sdk_source_count'], 'live_browser_or_remote_proof': False}
            if kind in LOCAL_REGRESSIONS:
                require(self.root == ROOT, 'regression_requires_fixed_application_checkout')
                test = LOCAL_REGRESSIONS[kind][1]
                # Fixed commands only. No inherited keys, CLI-controlled paths,
                # shell, output logs or arbitrary environment/provider adapters.
                with tempfile.TemporaryDirectory(prefix='nx-remediation-') as temporary:
                    env = {'PATH': '/workspace/.onboarding/tools/node_modules/.bin:/usr/bin:/bin',
                           'HOME': temporary, 'TMPDIR': temporary, 'LANG': 'C.UTF-8'}
                    process = subprocess.Popen([sys.executable, '-I', '-B', '-m', 'unittest', 'discover', '-s', 'tests', '-p', Path(test).name],
                        cwd=ROOT, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                        start_new_session=True)
                    try:
                        code = process.wait(timeout=60)
                    except subprocess.TimeoutExpired:
                        import signal
                        os.killpg(process.pid, signal.SIGKILL)
                        process.wait(timeout=5)
                        return {'outcome': 'failed', 'code': 'fixed_local_regression_timeout', 'test_source': test}
                return {'outcome': 'passed' if code == 0 else 'failed', 'code': 'fixed_local_regression_completed',
                        'test_source': test, 'exit_code': code, 'live_browser_or_remote_proof': False}
            if kind == 'local_file_sha256':
                actual = digest(read_source(self.root, check['path'], self.policy['max_source_bytes']))
                return {'outcome': 'passed' if actual == check['expected_sha256'] else 'failed', 'code': 'local_file_hash_checked', 'artifact_sha256': actual}
            if kind == 'project_skills_integrity':
                _, verified = self._native_module('project_skills').verified_sources(self.root)
                return {'outcome': 'passed', 'code': 'owned_skill_sources_verified', 'verified_sources': len(verified)}
            module = self._native_module('check_llm_policy')
            configs = {path: json_value(read_source(self.root, path, self.policy['max_source_bytes'])) for path in module.SOURCES}
            module.validate(configs)
            return {'outcome': 'passed', 'code': 'managed_config_binding_verified_not_live'}
        except Exception:
            return {'outcome': 'failed', 'code': 'native_check_failed_or_source_unavailable'}

    def finish_verification(self, ticket, *, now=None):
        now = time.time() if now is None else now
        with self.transaction() as db:
            attempt = db.execute('SELECT * FROM tickets WHERE id=?', (ticket,)).fetchone()
            require(attempt is not None, 'ticket_not_found')
            row = self._item(db, attempt['item_id'])
            require(attempt['state'] == 'pending' and row['active_ticket'] == ticket and row['generation'] == attempt['generation']
                    and row['fingerprint'] == attempt['fingerprint'] and row['scope_hash'] == attempt['scope_hash'], 'stale_or_superseded_observation')
            require(now >= attempt['started_at'], 'observation_before_check')
            result = self._check(json.loads(row['check_spec'])) if self._current(row) else {'outcome': 'failed', 'code': 'bound_source_changed_requires_review'}
            if not self._current(row):
                result = {'outcome': 'failed', 'code': 'bound_source_changed_requires_review'}
            outcome = result['outcome']
            state = 'resolved' if outcome == 'passed' else 'awaiting_external' if outcome == 'awaiting_external' else 'blocked'
            retry_at = now + self.policy['retry_delays_seconds'][min(row['attempts'] - 1, self.policy['max_attempts'] - 1)] if outcome == 'failed' else None
            escalated = row['escalated'] or row['attempts'] >= self.policy['max_attempts'] or now >= row['due_at']
            reason = 'attempts_exhausted_or_overdue' if escalated and state != 'resolved' else row['escalation_reason']
            action = 'No pending remediation; revalidate the bound source before reuse.' if state == 'resolved' else row['next_action']
            db.execute('INSERT INTO observations VALUES(?,?,?,?,?,?,?,?)', (ticket, row['id'], row['generation'], row['fingerprint'], row['scope_hash'], outcome, canonical(result), now))
            db.execute("UPDATE tickets SET state='done' WHERE id=?", (ticket,))
            db.execute('UPDATE items SET state=?,next_action=?,retry_at=?,attempts=?,escalated=?,escalation_reason=?,active_ticket=NULL,updated_at=? WHERE id=?',
                       (state, action, retry_at, 0 if state == 'resolved' else row['attempts'], int(escalated), reason, now, row['id']))
            db.execute('INSERT INTO audit(item_id,event,generation,at) VALUES(?,?,?,?)', (row['id'], 'verification_' + outcome, row['generation'], now))
            return {'id': row['id'], 'generation': row['generation'], 'state': state, 'ticket': ticket,
                    'scope': json.loads(row['scope']), 'source_fingerprint': row['fingerprint'], 'evidence': result,
                    'unblocks_only_bound_local_predicate': state == 'resolved', 'remote_or_production_activation': False}

    def verify(self, item_id, *, event_key, now=None):
        ticket = self.begin_verification(item_id, event_key=event_key, now=now)
        def replay():
            with self.connection() as db:
                previous = db.execute('SELECT * FROM observations WHERE ticket_id=?', (ticket['ticket'],)).fetchone()
            if previous:
                current = self.status(item_id)[0]
                return {'id': item_id, 'ticket': ticket['ticket'], 'historical_replay': True,
                        'state': current['state'], 'current_status': current,
                        'unblocks_only_bound_local_predicate': current['state'] == 'resolved' and current['generation'] == previous['generation']
                            and current['source_fingerprint'] == previous['fingerprint'],
                        'evidence': json.loads(previous['evidence'])}
            return None
        previous = replay()
        if previous:
            return previous
        try:
            return self.finish_verification(ticket['ticket'], now=now)
        except QueueError:
            previous = replay()  # Concurrent same-event completion may have won.
            if previous:
                return previous
            raise

    def replan(self, item_id, *, owner, next_action, reason, event_key, now=None):
        now = time.time() if now is None else now
        payload = {'id': item_id, 'owner': owner, 'next_action': text(next_action), 'reason': text(reason), 'operation': 'replan'}
        with self.transaction() as db:
            replay = self._event(db, event_key, payload)
            if replay:
                return replay
            row = self._item(db, item_id)
            require(row['owner'] == owner and row['state'] != 'resolved', 'owner_or_state_mismatch')
            db.execute("UPDATE items SET state='in_progress',next_action=?,attempts=0,retry_at=NULL,active_ticket=NULL,updated_at=? WHERE id=?", (next_action, now, item_id))
            db.execute('INSERT INTO audit(item_id,event,generation,at) VALUES(?,?,?,?)', (item_id, 'owner_replan_not_approval', row['generation'], now))
            return self._record(db, event_key, payload, {'id': item_id, 'state': 'in_progress', 'approval_granted': False})

    def status(self, item_id=None, *, now=None):
        now = time.time() if now is None else now
        with self.connection() as db:
            rows = db.execute('SELECT * FROM items' + (' WHERE id=?' if item_id else '') + ' ORDER BY created_at,id', (item_id,) if item_id else ()).fetchall()
            result = []
            for row in rows:
                current = self._current(row)
                last = db.execute('SELECT outcome,observed_at,evidence FROM observations WHERE item_id=? ORDER BY observed_at DESC,rowid DESC LIMIT 1', (row['id'],)).fetchone()
                spec = json.loads(row['check_spec'])
                # Read-only status never starts a test subprocess. Its previous
                # successful regression remains bound to exact code/test hashes.
                predicate_current = row['state'] != 'resolved' or (current and
                    (spec['kind'] in LOCAL_REGRESSIONS or self._check(spec)['outcome'] == 'passed'))
                state = 'blocked' if row['state'] == 'resolved' and not predicate_current else row['state']
                result.append({'id': row['id'], 'scope': json.loads(row['scope']), 'source_fingerprint': row['fingerprint'],
                    'source_current': current, 'predicate_current': predicate_current, 'verification_required': state != 'resolved',
                    'generation': row['generation'], 'state': state, 'stored_state': row['state'],
                    'owner': row['owner'], 'next_action': row['next_action'] if current and predicate_current else 'Review changed source or predicate and repair/re-register this exact prerequisite.',
                    'due_at': row['due_at'], 'attempts': row['attempts'], 'retry_at': row['retry_at'],
                    'escalated': bool(row['escalated']), 'escalation_required': state != 'resolved' and (now >= row['due_at'] or row['attempts'] >= self.policy['max_attempts']),
                    'escalation_owner': self.policy['escalation_owner'], 'last_observation': dict(last) if last else None})
            return result

    def due(self, *, now=None):
        now = time.time() if now is None else now
        return [row for row in self.status(now=now) if row['state'] != 'resolved' and (row['retry_at'] is None or row['retry_at'] <= now)]

    def sweep(self, *, now=None):
        now = time.time() if now is None else now
        items = [row for row in self.status(now=now) if row['escalation_required']]
        with self.transaction() as db:
            for item in items:
                db.execute("UPDATE items SET escalated=1,escalation_reason='attempts_exhausted_or_overdue' WHERE id=?", (item['id'],))
        return {'escalation_recorded': len(items), 'notifications_sent': 0}

    def import_project_gaps(self, *, now=None):
        manifest = json_value(read_source(self.root, 'config/project-skills.json', self.policy['max_source_bytes']))
        gaps = manifest.get('known_gaps')
        require(isinstance(gaps, list) and len(gaps) <= 100, 'invalid_gap_manifest')
        imported = []
        for gap in gaps:
            require(isinstance(gap, dict), 'invalid_gap_manifest')
            gap_id = identifier(gap.get('id')); owner = identifier(gap.get('owner'))
            status = text(gap.get('status'))
            scope = {'project': 'canonical_agency_project', 'component': 'project_skills', 'resource': gap_id, 'requirement': 'actual_scoped_evidence'}
            imported.append(self.register(scope, {'kind': 'external_readback_required', 'evidence_requirement': status},
                source_paths=['config/project-skills.json'], owner=owner,
                next_action='Obtain the authorized identity, version, scope and real read-back evidence for ' + gap_id + '; use a reviewed native adapter, not a claimed success.', now=now))
        return {'imported': imported, 'remote_checks_executed': 0, 'actions_executed': 0}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('import-project-gaps')
    sub.add_parser('due'); sub.add_parser('sweep')
    status = sub.add_parser('status'); status.add_argument('--id'); status.add_argument('--require-resolved', action='store_true')
    register = sub.add_parser('register')
    for option in ['scope', 'check', 'owner', 'next-action']:
        register.add_argument('--' + option, required=True)
    register.add_argument('--source', action='append', required=True)
    register.add_argument('--due-at', type=float)
    for name in ['start', 'wait', 'retry', 'verify']:
        action = sub.add_parser(name); action.add_argument('--id', required=True); action.add_argument('--event-key')
        if name != 'verify':
            action.add_argument('--owner', required=True); action.add_argument('--next-action', required=True); action.add_argument('--reason', required=True)
    args = parser.parse_args(argv)
    try:
        queue = RemediationQueue(args.database, read_only=args.command in {'status', 'due'})
        if args.command == 'register':
            result = queue.register(json_value(args.scope), json_value(args.check), source_paths=args.source, owner=args.owner, next_action=args.next_action, due_at=args.due_at)
        elif args.command == 'import-project-gaps':
            result = queue.import_project_gaps()
        elif args.command == 'status':
            result = {'items': queue.status(args.id), 'local_registry_only': True}
            if args.require_resolved:
                result['gate_passed'] = bool(result['items']) and all(item['state'] == 'resolved' for item in result['items'])
        elif args.command == 'due':
            result = {'items': queue.due(), 'scheduler_installed': False}
        elif args.command == 'sweep':
            result = queue.sweep()
        elif args.command == 'verify':
            result = queue.verify(args.id, event_key=args.event_key or uuid.uuid4().hex)
        elif args.command == 'retry':
            result = queue.replan(args.id, owner=args.owner, next_action=args.next_action, reason=args.reason, event_key=args.event_key or uuid.uuid4().hex)
        else:
            result = queue.transition(args.id, owner=args.owner, state='in_progress' if args.command == 'start' else 'awaiting_external',
                next_action=args.next_action, reason=args.reason, event_key=args.event_key or uuid.uuid4().hex)
        print(canonical(result))
        if args.command == 'status' and args.require_resolved and not result['gate_passed']:
            return 2
        return 0
    except (QueueError, OSError, ValueError, KeyError, TypeError, sqlite3.Error):
        print('{"status":"blocked","error":"local_remediation_operation_rejected","approval_granted":false}')
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
