#!/usr/bin/env python3
"""Local, tenant-scoped Markdown staging. Never executes content or indexes remotely."""
from __future__ import annotations
import argparse
from contextlib import contextmanager
import hashlib
import fcntl
import json
import os
from pathlib import Path
import re
import sqlite3
import stat
import time
import unicodedata
import uuid

MAX_FILE_BYTES = 1024 * 1024
MAX_SCAN_BYTES = 256 * 1024 * 1024
MAX_MARKDOWN_FILES = 20000
CHUNK_CHARACTERS = 4000
SKIP_COMPONENTS = {'.git', 'node_modules', '.env', '.aws', '.ssh', '.gnupg', '.local', '.onboarding',
                   '.venv', '__pycache__', '.cache', 'secrets', 'credentials'}
CUSTOMER_COMPONENTS = {'affilinet-portal-aachen-final', 'customer-separation'}
KEY_PATTERN = re.compile(r'\b(?:sk-(?:or-v1-|or-|proj-)?[A-Za-z0-9_-]{12,}|(?:sk|rk)_(?:live|test)_[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{16,}|rot_[A-Za-z0-9_-]{16,}|(?:AKIA|ASIA)[A-Z0-9]{16}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b')
ASSIGNMENT = re.compile(r'''(?im)(\b(?:[A-Za-z0-9_]*api[ _-]?key|[A-Za-z0-9_]*secret|[A-Za-z0-9_]*token|password|passwd|authorization)\b["']?[ \t]*[:=][ \t]*)([^\r\n]*)''')


class StagingError(Exception):
    pass


def sha(value):
    return hashlib.sha256(value).hexdigest()


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,63}', value):
        raise StagingError('invalid_scope_identifier')
    return value


def forbidden(parts):
    lowered = [part.casefold() for part in parts]
    return (any(part in SKIP_COMPONENTS or part.startswith('.env') or part in CUSTOMER_COMPONENTS for part in lowered)
            or any(Path(part).stem in {'secret', 'secrets', 'credential', 'credentials', 'id_rsa', 'id_ed25519', 'private-key', 'private_key'} for part in lowered)
            or any('affilinet' in part for part in lowered)
            or any(left == 'apps' and right == 'portal' for left, right in zip(lowered, lowered[1:])))


def authorized_root(value):
    path = Path(value).absolute()
    if path != path.resolve() or path.is_symlink() or not path.is_dir():
        raise StagingError('source_root_must_be_explicit_real_directory')
    if path in {Path('/'), Path('/workspace'), Path('/tmp'), Path('/home'), Path('/root'), Path('/etc')} or forbidden(path.parts):
        raise StagingError('source_root_outside_authorized_project_scope')
    return path


def redact(raw):
    try:
        content = raw.decode('utf-8-sig')
    except UnicodeError:
        raise StagingError('invalid_utf8') from None
    if '\x00' in content:
        raise StagingError('binary_content')
    content = unicodedata.normalize('NFC', content.replace('\r\n', '\n').replace('\r', '\n'))
    if len(re.findall(r'-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----', content)) != len(re.findall(r'-----END (?:[A-Z ]+)?PRIVATE KEY-----', content)):
        raise StagingError('incomplete_private_key_requires_review')
    # An ambiguous multiline credential is quarantined, not partially retained.
    for match in ASSIGNMENT.finditer(content):
        if match.group(2).strip() in {'', '|', '>', '|-', '>-', '|+', '>+'}:
            raise StagingError('multiline_secret_requires_review')
    count = 0
    def replacement(_):
        nonlocal count
        count += 1
        return '[REDACTED]'
    content = re.sub(r'-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z ]+)?PRIVATE KEY-----', replacement, content)
    def assignment(match):
        nonlocal count
        count += 1
        return match.group(1) + '[REDACTED]'
    content = ASSIGNMENT.sub(assignment, content)
    content = KEY_PATTERN.sub(replacement, content)
    content = re.sub(r'(?i)(?<=://)[^\s/@:]+:[^\s/@]+@', replacement, content)
    candidates = []
    if content.startswith('---\n'):
        candidates.append('metadata_candidate')
    if re.search(r'(?im)^\s*(?:[-*] \[[ xX]\]|#{1,6} .*\b(?:task|todo|aufgabe))', content):
        candidates.append('task_candidate')
    if re.search(r'(?im)^#{1,6} .*\b(?:policy|policies|rule|regel|instruction|vorgabe)', content):
        candidates.append('policy_candidate')
    return content, count, candidates


def chunks(content, version):
    output, buffer, start, end, heading, fence = [], [], 1, 1, '', False
    def flush():
        nonlocal buffer
        if buffer:
            index = len(output)
            output.append({'id': sha(f'{version}:{index}:{start}:{end}'.encode()), 'index': index,
                           'start_line': start, 'end_line': end, 'heading': heading, 'text': '\n'.join(buffer)})
            buffer = []
    for number, line in enumerate(content.splitlines() or [''], 1):
        is_fence = bool(re.match(r'^\s*(```|~~~)', line))
        found = re.match(r'^(#{1,6})\s+(.+)$', line) if not fence else None
        if found:
            flush(); heading = found.group(2)[:240]
        if is_fence:
            fence = not fence
        segments = [line[i:i + CHUNK_CHARACTERS] for i in range(0, len(line), CHUNK_CHARACTERS)] or ['']
        for segment in segments:
            if buffer and (sum(len(item) + 1 for item in buffer) + len(segment) > CHUNK_CHARACTERS or number - start >= 80):
                flush()
            if not buffer:
                start = number
            end = number; buffer.append(segment)
    flush()
    return output


def secure_read(root_fd, relative):
    """Open every path component beneath an already-open root without symlinks."""
    directory = os.dup(root_fd)
    try:
        for component in relative.parts[:-1]:
            next_fd = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=directory)
            os.close(directory); directory = next_fd
        file_fd = os.open(relative.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
        try:
            before = os.fstat(file_fd)
            if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1:
                raise StagingError('non_regular_or_linked_file')
            if before.st_size > MAX_FILE_BYTES:
                raise StagingError('file_size_limit')
            raw = bytearray()
            while len(raw) <= MAX_FILE_BYTES:
                part = os.read(file_fd, min(65536, MAX_FILE_BYTES + 1 - len(raw)))
                if not part:
                    break
                raw.extend(part)
            after = os.fstat(file_fd)
            if len(raw) > MAX_FILE_BYTES:
                raise StagingError('file_size_limit')
            if (before.st_mtime_ns, before.st_size) != (after.st_mtime_ns, after.st_size):
                raise StagingError('file_changed_during_read')
            return bytes(raw), after.st_mtime_ns
        finally:
            os.close(file_fd)
    except OSError:
        raise StagingError('unreadable_or_changed_scope') from None
    finally:
        os.close(directory)


class Store:
    def __init__(self, database):
        self.path = Path(database).absolute()
        if self.path != self.path.resolve() or self.path.is_symlink():
            raise StagingError('database_path_must_be_local_real_file')
        self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        if not self.path.exists():
            descriptor = os.open(self.path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
            os.close(descriptor)
        self.path.chmod(0o600)
        with self.connect() as db:
            db.executescript('''
              PRAGMA journal_mode=WAL;
              CREATE TABLE IF NOT EXISTS brain_sources(tenant TEXT,project TEXT,source_id TEXT,source_root TEXT,authority TEXT,
                PRIMARY KEY(tenant,project,source_id));
              CREATE TABLE IF NOT EXISTS brain_jobs(id TEXT PRIMARY KEY,tenant TEXT,project TEXT,source_id TEXT,source_root TEXT,created INTEGER,report TEXT);
              CREATE TABLE IF NOT EXISTS brain_documents(id TEXT PRIMARY KEY,tenant TEXT,project TEXT,source_id TEXT,relative_path TEXT,current_version TEXT,
                UNIQUE(tenant,project,source_id,relative_path));
              CREATE TABLE IF NOT EXISTS brain_versions(id TEXT PRIMARY KEY,document_id TEXT REFERENCES brain_documents(id),original_sha256 TEXT,
                normalized_sha256 TEXT,source_version TEXT,mtime_ns INTEGER,authority TEXT,data_class TEXT,content TEXT,candidates TEXT,redactions INTEGER,
                UNIQUE(document_id,original_sha256));
              CREATE TABLE IF NOT EXISTS brain_chunks(id TEXT PRIMARY KEY,version_id TEXT REFERENCES brain_versions(id),payload TEXT);
              CREATE TABLE IF NOT EXISTS brain_inbox(version_id TEXT PRIMARY KEY,tenant TEXT,project TEXT,state TEXT);
              CREATE TABLE IF NOT EXISTS brain_outbox(version_id TEXT PRIMARY KEY,tenant TEXT,project TEXT,state TEXT,external_id TEXT);
              CREATE TABLE IF NOT EXISTS brain_audit(id INTEGER PRIMARY KEY,job_id TEXT,version_id TEXT,event TEXT,details TEXT);
              CREATE TABLE IF NOT EXISTS brain_manifest(job_id TEXT,version_id TEXT,outcome TEXT,PRIMARY KEY(job_id,version_id));
              CREATE TABLE IF NOT EXISTS brain_tombstones(id TEXT PRIMARY KEY,tenant TEXT,project TEXT,source_id TEXT,
                document_id TEXT,version_id TEXT,job_id TEXT,removed_at INTEGER);
            ''')
            if 'tombstoned_at' not in {row['name'] for row in db.execute('PRAGMA table_info(brain_documents)')}:
                db.execute('ALTER TABLE brain_documents ADD COLUMN tombstoned_at INTEGER')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        try:
            with db:
                yield db
        finally:
            db.close()

    def read_version(self, tenant, project, version):
        identifier(tenant); identifier(project)
        with self.connect() as db:
            row = db.execute('SELECT v.*,d.tenant,d.project,d.source_id,d.relative_path FROM brain_versions v JOIN brain_documents d ON d.id=v.document_id WHERE v.id=? AND d.tenant=? AND d.project=?', (version, tenant, project)).fetchone()
            if row is None:
                raise StagingError('version_not_found')
            result = dict(row)
            result['chunks'] = [json.loads(item[0]) for item in db.execute('SELECT payload FROM brain_chunks WHERE version_id=? ORDER BY rowid', (version,))]
            return result

    def manifest(self, tenant, project, job):
        identifier(tenant); identifier(project)
        with self.connect() as db:
            if db.execute('SELECT 1 FROM brain_jobs WHERE id=? AND tenant=? AND project=?', (job, tenant, project)).fetchone() is None:
                raise StagingError('job_not_found')
            return [dict(row) for row in db.execute('SELECT m.version_id,m.outcome,d.source_id,d.relative_path,v.original_sha256,v.normalized_sha256,v.source_version,v.authority,v.data_class FROM brain_manifest m JOIN brain_versions v ON v.id=m.version_id JOIN brain_documents d ON d.id=v.document_id WHERE m.job_id=? AND d.tenant=? AND d.project=? ORDER BY d.relative_path', (job, tenant, project))]

    def stage(self, *, job, tenant, project, source_id, relative, raw, mtime_ns, authority):
        content, redactions, candidates = redact(raw)  # before any durable content write
        original, normalized = sha(raw), sha(content.encode())
        document = sha(json.dumps([tenant, project, source_id, relative], separators=(',', ':')).encode())
        version = sha(f'{document}:{original}'.encode())
        pieces = chunks(content, version)
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            old = db.execute('SELECT current_version FROM brain_documents WHERE id=?', (document,)).fetchone()
            existing = db.execute('SELECT source_version,mtime_ns FROM brain_versions WHERE id=?', (version,)).fetchone()
            expected_source_version = existing['source_version'] if existing else f'sha256:{original}:mtime_ns:{mtime_ns}'
            expected_mtime = existing['mtime_ns'] if existing else mtime_ns
            # Authority is immutable per source identity; changing its meaning
            # requires a new authorized source-id, never a silent privilege lift.
            prior = db.execute('SELECT authority FROM brain_versions WHERE document_id=? LIMIT 1', (document,)).fetchone()
            if prior and prior['authority'] != authority:
                raise StagingError('source_authority_change_requires_new_source_id')
            outcome = ('unchanged' if old and old['current_version'] == version else 'reactivated') if existing else 'changed' if old else 'staged'
            # Observation alone does not change the active source view. Only a
            # successfully completed source scan may reconcile current versions.
            db.execute('INSERT INTO brain_documents(id,tenant,project,source_id,relative_path,current_version) VALUES(?,?,?,?,?,NULL) ON CONFLICT(id) DO NOTHING',
                       (document, tenant, project, source_id, relative))
            if not existing:
                db.execute('INSERT INTO brain_versions VALUES(?,?,?,?,?,?,?,?,?,?,?)', (version, document, original, normalized,
                           f'sha256:{original}:mtime_ns:{mtime_ns}', mtime_ns, authority, 'project_internal', content, json.dumps(candidates), redactions))
                db.executemany('INSERT INTO brain_chunks VALUES(?,?,?)', [(piece['id'], version, json.dumps(piece)) for piece in pieces])
                for table in ('brain_inbox', 'brain_outbox'):
                    if table == 'brain_inbox':
                        db.execute('INSERT INTO brain_inbox VALUES(?,?,?,?)', (version, tenant, project, 'pending_readback'))
                    else:
                        db.execute('INSERT INTO brain_outbox VALUES(?,?,?,?,NULL)', (version, tenant, project, 'pending_readback'))
            db.execute('INSERT INTO brain_manifest VALUES(?,?,?)', (job, version, outcome))
            db.execute('INSERT INTO brain_audit(job_id,version_id,event,details) VALUES(?,?,?,?)',
                       (job, version, outcome, json.dumps({'candidate_only': True, 'redactions': redactions, 'observed_mtime_ns': mtime_ns, 'external_indexed': None})))
        # Open a new connection after COMMIT and compare exact identity/content.
        back = self.read_version(tenant, project, version)
        if (back['id'], back['source_id'], back['relative_path'], back['original_sha256'], back['normalized_sha256'], back['source_version'], back['mtime_ns'], back['authority'], back['data_class'], back['content'], back['chunks']) != (version, source_id, relative, original, normalized, expected_source_version, expected_mtime, authority, 'project_internal', content, pieces):
            raise StagingError('durable_exact_readback_failed')
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute("UPDATE brain_inbox SET state='pending_scan_reconciliation' WHERE version_id=? AND state='pending_readback'", (version,))
            db.execute("UPDATE brain_outbox SET state='pending_scan_reconciliation' WHERE version_id=? AND state='pending_readback'", (version,))
        return outcome, version

    def reconcile(self, tenant, project, source_id, job, observed_paths, blocked_prefixes):
        """Local source view only. Caller holds the whole-scan database lock."""
        pending = ('pending_readback', 'pending_scan_reconciliation', 'pending_ingestion')
        removable = []
        superseded = 0
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            job_scope = db.execute('SELECT tenant,project,source_id FROM brain_jobs WHERE id=?', (job,)).fetchone()
            if job_scope is None or tuple(job_scope) != (tenant, project, source_id):
                raise StagingError('reconciliation_job_scope_mismatch')
            documents = db.execute('SELECT * FROM brain_documents WHERE tenant=? AND project=? AND source_id=?', (tenant, project, source_id)).fetchall()
            rows = db.execute('SELECT v.id,v.document_id FROM brain_manifest m JOIN brain_versions v ON v.id=m.version_id JOIN brain_documents d ON d.id=v.document_id WHERE m.job_id=? AND d.tenant=? AND d.project=? AND d.source_id=?', (job, tenant, project, source_id)).fetchall()
            for row in rows:
                for table in ('brain_inbox', 'brain_outbox'):
                    count = db.execute(f"UPDATE {table} SET state='superseded' WHERE version_id IN (SELECT id FROM brain_versions WHERE document_id=?) AND version_id<>? AND state IN (?,?,?)", (row['document_id'], row['id'], *pending)).rowcount
                    if table == 'brain_outbox': superseded += count
                    db.execute(f"UPDATE {table} SET state='pending_ingestion' WHERE version_id=? AND state IN ('pending_scan_reconciliation','superseded','source_removed')", (row['id'],))
                db.execute('UPDATE brain_documents SET current_version=?,tombstoned_at=NULL WHERE id=?', (row['id'], row['document_id']))
            for document in documents:
                path = document['relative_path']
                if document['current_version'] is not None and path not in observed_paths and not any(path == prefix or path.startswith(prefix + '/') for prefix in blocked_prefixes):
                    removable.append(document)
            for document in removable:
                for table in ('brain_inbox', 'brain_outbox'):
                    db.execute(f"UPDATE {table} SET state='source_removed' WHERE version_id IN (SELECT id FROM brain_versions WHERE document_id=?) AND state IN (?,?,?)", (document['id'], *pending))
                stamp = int(time.time())
                db.execute('INSERT INTO brain_tombstones VALUES(?,?,?,?,?,?,?,?)', (uuid.uuid4().hex, tenant, project, source_id, document['id'], document['current_version'], job, stamp))
                db.execute('UPDATE brain_documents SET current_version=NULL,tombstoned_at=? WHERE id=?', (stamp, document['id']))
                db.execute('INSERT INTO brain_audit(job_id,version_id,event,details) VALUES(?,?,?,?)', (job, document['current_version'], 'source_tombstoned', json.dumps({'source_id': source_id, 'path': document['relative_path'], 'external_indexed': None})))
        return {'tombstoned': len(removable), 'superseded_versions': superseded}


@contextmanager
def scan_lock(database):
    """Serialize complete local scans, including first database creation/recovery.

    This Linux advisory lock is local to one SQLite database, not a distributed
    lease. The operating system releases it after process failure.
    """
    path = Path(database).absolute()
    if path != path.resolve(): raise StagingError('database_path_must_be_local_real_file')
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    descriptor = os.open(str(path) + '.scan.lock', os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        info = os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1: raise StagingError('invalid_scan_lock_file')
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        yield
    finally:
        os.close(descriptor)


def scan(*, source_root, tenant, project, database, source_id, authority='reference'):
    authorized_root(source_root)
    identifier(tenant); identifier(project); identifier(source_id)
    with scan_lock(database):
        return _scan_locked(source_root=source_root, tenant=tenant, project=project, database=database, source_id=source_id, authority=authority)


def _scan_locked(*, source_root, tenant, project, database, source_id, authority):
    tenant, project, source_id = identifier(tenant), identifier(project), identifier(source_id)
    if authority not in {'reference', 'project_instruction'}:
        raise StagingError('invalid_authority')
    root = authorized_root(source_root)
    store = Store(database)
    job = uuid.uuid4().hex
    report = {'job_id': job, 'mode': 'local_markdown_staging_only', 'tenant': tenant, 'project': project, 'source_id': source_id,
              'staged': 0, 'changed': 0, 'unchanged': 0, 'suppressed': 0, 'quarantine': 0, 'observed_markdown_files': 0,
              'scan_complete': True, 'external_indexed': None, 'remote_model_calls': 0}
    report.update({'reactivated': 0, 'walk_errors': 0, 'reconciliation_applied': False, 'tombstoned': 0, 'superseded_versions': 0})
    with store.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        bound = db.execute('SELECT source_root,authority FROM brain_sources WHERE tenant=? AND project=? AND source_id=?', (tenant, project, source_id)).fetchone()
        if bound and (bound['source_root'], bound['authority']) != (str(root), authority):
            raise StagingError('source_root_or_authority_rebinding_requires_new_source_id')
        db.execute('INSERT OR IGNORE INTO brain_sources VALUES(?,?,?,?,?)', (tenant, project, source_id, str(root), authority))
        db.execute('INSERT INTO brain_jobs VALUES(?,?,?,?,?,?,NULL)', (job, tenant, project, source_id, str(root), int(time.time())))
    total_bytes = 0
    observed_paths, blocked_prefixes = set(), set()
    def walk_error(_):
        report['walk_errors'] += 1
        report['scan_complete'] = False
    root_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for directory, directories, files in os.walk(root, followlinks=False, onerror=walk_error):
            kept = []
            for name in sorted(directories):
                path = Path(directory) / name
                if path.is_symlink() or forbidden(path.relative_to(root).parts):
                    report['suppressed'] += 1
                    blocked_prefixes.add(path.relative_to(root).as_posix())
                else:
                    kept.append(name)
            directories[:] = kept
            for name in sorted(files):
                path = Path(directory) / name; relative = path.relative_to(root)
                if path.suffix.casefold() == '.md': observed_paths.add(relative.as_posix())
                if path.is_symlink() or forbidden(relative.parts) or KEY_PATTERN.search(relative.as_posix()) or ASSIGNMENT.search(relative.as_posix()) or path.suffix.casefold() != '.md':
                    report['suppressed'] += 1; continue
                report['observed_markdown_files'] += 1
                if report['observed_markdown_files'] > MAX_MARKDOWN_FILES or total_bytes >= MAX_SCAN_BYTES:
                    report['scan_complete'] = False; break
                try:
                    raw, mtime = secure_read(root_fd, relative)
                    total_bytes += len(raw)
                    if total_bytes > MAX_SCAN_BYTES:
                        report['scan_complete'] = False; break
                    outcome, _ = store.stage(job=job, tenant=tenant, project=project, source_id=source_id, relative=relative.as_posix(),
                                             raw=raw, mtime_ns=mtime, authority=authority)
                    report[outcome if outcome in {'unchanged', 'reactivated'} else 'staged'] += 1
                    if outcome in {'changed', 'reactivated'}: report['changed'] += 1
                except StagingError as error:
                    report['quarantine'] += 1
                    report['scan_complete'] = False
                    with store.connect() as db:
                        db.execute('INSERT INTO brain_audit(job_id,event,details) VALUES(?,?,?)', (job, 'quarantine', json.dumps({'path': relative.as_posix(), 'reason': str(error)})))
            if not report['scan_complete']:
                break
    finally:
        os.close(root_fd)
    if report['scan_complete'] and not report['quarantine'] and not report['walk_errors']:
        report.update(store.reconcile(tenant, project, source_id, job, observed_paths, blocked_prefixes))
        report['reconciliation_applied'] = True
    # Manifest itself is scoped and read back; no inferred remote item count.
    report['manifest_rows'] = len(store.manifest(tenant, project, job))
    with store.connect() as db:
        db.execute('UPDATE brain_jobs SET report=? WHERE id=?', (json.dumps(report), job))
    with store.connect() as db:
        saved = db.execute('SELECT report FROM brain_jobs WHERE id=? AND tenant=? AND project=?', (job, tenant, project)).fetchone()
        if saved is None or json.loads(saved['report']) != report:
            raise StagingError('durable_job_report_readback_failed')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    command = commands.add_parser('scan')
    for option in ('source-root', 'tenant', 'project', 'database', 'source-id'):
        command.add_argument('--' + option, required=True)
    command.add_argument('--authority', choices=('reference', 'project_instruction'), default='reference')
    args = parser.parse_args()
    try:
        report = scan(source_root=args.source_root, tenant=args.tenant, project=args.project, database=args.database,
                      source_id=args.source_id, authority=args.authority)
    except (StagingError, sqlite3.Error, OSError):
        print(json.dumps({'error': 'local_staging_failed', 'external_indexed': None}))
        return 1
    print(json.dumps(report, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
