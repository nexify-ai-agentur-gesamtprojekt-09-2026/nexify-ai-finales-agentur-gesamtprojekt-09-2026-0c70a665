"""Real SQLite lifecycle tests; no provider, shell commands or external services."""
from concurrent.futures import ThreadPoolExecutor
import contextlib
import hashlib
import importlib.util
import io
import json
import os
import stat
from types import SimpleNamespace
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SOURCE_ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('remediation_queue', SOURCE_ROOT / 'tools/remediation_queue.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class RemediationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'config').mkdir()
        (self.root / 'docs').mkdir()
        self.policy = json.loads((SOURCE_ROOT / 'config/remediation-policy.json').read_text())
        (self.root / m.POLICY).write_text(json.dumps(self.policy))
        (self.root / 'docs/source.md').write_text('Approved prerequisite v1\n')
        (self.root / 'docs/artifact.md').write_text('ready\n')
        self.q = m.RemediationQueue(root=self.root)
        self.scope = dict(project='canonical_agency_project', component='test', resource='one', requirement='artifact')
        self.check = dict(kind='local_file_sha256', path='docs/artifact.md', expected_sha256=m.digest(b'ready\n'))

    def register(self, **kw):
        values = dict(source_paths=['docs/source.md'], owner='D07', next_action='Repair the artifact and verify its exact scope.', now=100)
        values.update(kw)
        return self.q.register(self.scope, self.check, **values)['id']

    def test_unlinked_regular_sidecar_is_rechecked_before_sqlite_open(self):
        wal = Path(str(self.q.path) + '-wal')
        original = Path.lstat
        observed = []
        def disappear(path, *args, **kwargs):
            if path == wal and not observed:
                observed.append('unlinked')
                return SimpleNamespace(st_mode=stat.S_IFREG | 0o600, st_nlink=0)
            return original(path, *args, **kwargs)
        with patch.object(Path, 'lstat', disappear):
            with self.q.connection() as db:
                self.assertEqual(db.execute('SELECT 1').fetchone()[0], 1)
        self.assertEqual(observed, ['unlinked'])

    def test_recheck_accepts_only_fresh_single_link_regular_sidecar(self):
        for mode, links, accepted in [(stat.S_IFREG, 1, True), (stat.S_IFREG, 0, False),
                                      (stat.S_IFREG, 2, False), (stat.S_IFLNK, 1, False),
                                      (stat.S_IFIFO, 1, False)]:
            with self.subTest(mode=mode, links=links):
                wal = Path(str(self.q.path) + '-wal')
                original = Path.lstat
                count = []
                def replace(path, *args, **kwargs):
                    if path == wal:
                        count.append(1)
                        return SimpleNamespace(st_mode=(stat.S_IFREG if len(count)==1 else mode) | 0o600,
                                               st_nlink=0 if len(count)==1 else links)
                    return original(path, *args, **kwargs)
                with patch.object(Path, 'lstat', replace):
                    if accepted:
                        with self.q.connection() as db:
                            self.assertEqual(db.execute('SELECT 1').fetchone()[0], 1)
                    else:
                        with patch.object(m.sqlite3, 'connect') as connect:
                            with self.assertRaisesRegex(m.QueueError, 'unsafe_database_sidecar'):
                                with self.q.connection():
                                    self.fail('unsafe sidecar reached SQLite')
                            connect.assert_not_called()
                self.assertEqual(len(count), 2)

    def test_main_database_zero_links_and_real_unsafe_sidecars_stay_rejected(self):
        original = Path.lstat
        def unlinked_database(path, *args, **kwargs):
            if path == self.q.path:
                return SimpleNamespace(st_mode=stat.S_IFREG | 0o600, st_nlink=0)
            return original(path, *args, **kwargs)
        with patch.object(Path, 'lstat', unlinked_database), patch.object(m.sqlite3, 'connect') as connect:
            with self.assertRaisesRegex(m.QueueError, 'unsafe_database_sidecar'):
                with self.q.connection():
                    self.fail('unlinked main database reached SQLite')
            connect.assert_not_called()
        outside = self.root / 'docs/outside-canary'
        outside.write_bytes(b'UNCHANGED')
        for suffix in ['-wal', '-shm', '-journal']:
            target = Path(str(self.q.path) + suffix)
            for kind in ['symlink', 'hardlink', 'fifo']:
                with self.subTest(suffix=suffix, kind=kind):
                    if kind == 'symlink':target.symlink_to(outside)
                    elif kind == 'hardlink':os.link(outside, target)
                    else:os.mkfifo(target)
                    try:
                        with patch.object(m.sqlite3, 'connect') as connect:
                            with self.assertRaisesRegex(m.QueueError, 'unsafe_database_sidecar'):
                                with self.q.connection():
                                    self.fail('unsafe sidecar reached SQLite')
                            connect.assert_not_called()
                        self.assertEqual(outside.read_bytes(), b'UNCHANGED')
                    finally:target.unlink()

    def test_persistence_dedup_owner_plan_deadline(self):
        item = self.register(due_at=200)
        self.q.transition(item, owner='D07', state='in_progress', next_action='Finish repair.', reason='Started', event_key='start', now=101)
        self.assertTrue(self.q.register(self.scope, self.check, source_paths=['docs/source.md'], owner='D07', next_action='Initial detector action.', now=110)['deduplicated'])
        resumed = m.RemediationQueue(root=self.root).status(item, now=111)[0]
        self.assertEqual((resumed['state'], resumed['next_action'], resumed['due_at']), ('in_progress', 'Finish repair.', 200))

    def test_only_actual_check_closes_and_replay_is_idempotent(self):
        item = self.register()
        first = self.q.verify(item, event_key='verify-once', now=101)
        second = self.q.verify(item, event_key='verify-once', now=102)
        self.assertEqual(first['state'], 'resolved')
        self.assertTrue(second['historical_replay'])
        self.assertTrue(second['unblocks_only_bound_local_predicate'])
        with self.q.connection() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM observations').fetchone()[0], 1)

    def test_same_event_concurrency_one_observation(self):
        item = self.register()
        def run(_):
            return m.RemediationQueue(root=self.root).verify(item, event_key='same-event', now=101)
        with ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(run, range(4)))
        self.assertTrue(all(result['state'] == 'resolved' for result in results))
        with self.q.connection() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM observations').fetchone()[0], 1)

    def test_concurrent_detection_stable_key(self):
        with ThreadPoolExecutor(max_workers=4) as executor:
            ids = list(executor.map(lambda _: self.register(), range(12)))
        self.assertEqual(len(set(ids)), 1)
        self.assertEqual(len(self.q.status()), 1)

    def test_out_of_order_ticket_cannot_close(self):
        item = self.register()
        old = self.q.begin_verification(item, event_key='old', now=101)
        new = self.q.begin_verification(item, event_key='new', now=102)
        with self.assertRaises(m.QueueError):
            self.q.finish_verification(old['ticket'], now=103)
        self.assertEqual(self.q.finish_verification(new['ticket'], now=104)['state'], 'resolved')

    def test_changed_source_generation_invalidates_success_and_replay(self):
        item = self.register()
        self.q.verify(item, event_key='once', now=101)
        (self.root / 'docs/source.md').write_text('v2\n')
        self.assertEqual(self.q.status(item)[0]['state'], 'blocked')
        self.register(now=102)
        replay = self.q.verify(item, event_key='once', now=103)
        self.assertFalse(replay['unblocks_only_bound_local_predicate'])
        self.assertEqual(replay['state'], 'blocked')
        self.assertEqual(self.q.status(item)[0]['generation'], 2)

    def test_source_changes_between_begin_finish_and_past_timestamp(self):
        item = self.register()
        ticket = self.q.begin_verification(item, event_key='start-check', now=101)
        with self.assertRaises(m.QueueError):
            self.q.finish_verification(ticket['ticket'], now=100)
        (self.root / 'docs/source.md').write_text('changed')
        self.assertEqual(self.q.finish_verification(ticket['ticket'], now=102)['state'], 'blocked')

    def test_resolved_predicate_rechecked_without_registry_write(self):
        item = self.register()
        self.q.verify(item, event_key='ready', now=101)
        (self.root / 'docs/artifact.md').write_text('broken')
        row = self.q.status(item)[0]
        self.assertEqual((row['state'], row['stored_state']), ('blocked', 'resolved'))
        self.assertFalse(row['predicate_current'])
        self.assertTrue(row['verification_required'])

    def test_owner_and_boolean_cannot_resolve_or_execute(self):
        item = self.register()
        for owner, state in [('wrong', 'in_progress'), ('D07', 'resolved')]:
            with self.assertRaises(m.QueueError):
                self.q.transition(item, owner=owner, state=state, next_action='Done.', reason='Claim', event_key=owner)
        with self.assertRaises(TypeError):
            self.q.finish_verification('missing', success=True)
        for check in [dict(kind='shell', command='anything'), dict(self.check, success=True), dict(self.check, command='anything')]:
            with self.assertRaises(m.QueueError):
                self.q.register(self.scope, check, source_paths=['docs/source.md'], owner='D07', next_action='Repair.')

    def test_external_claim_never_resolves(self):
        item = self.q.register(self.scope, dict(kind='external_readback_required', evidence_requirement='Independent authorized read-back, not a claimed receipt.'), source_paths=['docs/source.md'], owner='D06', next_action='Acquire the scoped adapter evidence.', now=100)['id']
        result = self.q.verify(item, event_key='external', now=101)
        self.assertEqual(result['state'], 'awaiting_external')
        self.assertFalse(result['unblocks_only_bound_local_predicate'])

    def test_retry_due_escalation_replan_and_event_conflict(self):
        item = self.register(due_at=102)
        (self.root / 'docs/artifact.md').write_text('broken')
        self.q.verify(item, event_key='fail1', now=101)
        with self.assertRaises(m.QueueError):
            self.q.verify(item, event_key='early', now=102)
        self.assertEqual(self.q.due(now=102), [])
        self.assertEqual(self.q.sweep(now=103)['escalation_recorded'], 1)
        self.q.verify(item, event_key='fail2', now=162)
        self.q.verify(item, event_key='fail3', now=463)
        with self.assertRaises(m.QueueError):
            self.q.verify(item, event_key='exhausted', now=3000)
        self.q.replan(item, owner='D07', next_action='Repair after new investigation.', reason='New plan', event_key='replan', now=3001)
        with self.assertRaises(m.QueueError):
            self.q.replan(item, owner='D07', next_action='Different payload.', reason='New plan', event_key='replan', now=3001)
        (self.root / 'docs/artifact.md').write_text('ready\n')
        self.assertEqual(self.q.verify(item, event_key='fixed', now=3002)['state'], 'resolved')

    def test_missing_symlink_hardlink_fifo_and_customer_scope_rejected(self):
        outside = self.root / 'outside.md'; outside.write_text('x')
        (self.root / 'docs/link.md').symlink_to(outside)
        os.link(outside, self.root / 'docs/hard.md')
        os.mkfifo(self.root / 'docs/pipe.md')
        for path in ['docs/missing.md', 'docs/link.md', 'docs/hard.md', 'docs/pipe.md', '../outside.md', 'reference/docs/a.md', 'config/.env', 'docs/access-token.json']:
            with self.assertRaises((m.QueueError, OSError)):
                m.read_source(self.root, path)
        with self.assertRaises(m.QueueError):
            self.q.register(dict(self.scope, project='affilinet'), self.check, source_paths=['docs/source.md'], owner='D07', next_action='No.')
        with self.assertRaises(m.QueueError):
            m.RemediationQueue(self.root / 'outside.sqlite3', root=self.root)

    def test_limits_sensitive_metadata_and_history_cap(self):
        (self.root / 'docs/large.md').write_bytes(b'x' * (self.policy['max_source_bytes'] + 1))
        with self.assertRaises(m.QueueError):
            self.register(source_paths=['docs/large.md'])
        with self.assertRaises(m.QueueError):
            self.register(next_action='glpat-' + 'x' * 24)
        with self.assertRaises(m.QueueError):
            self.register(owner='glpat-' + 'x' * 24)
        with self.assertRaises(m.QueueError):
            self.q.register(dict(self.scope, resource='glpat-' + 'x' * 24), self.check,
                            source_paths=['docs/source.md'], owner='D07', next_action='Repair.')
        item = self.register()
        with self.assertRaises(m.QueueError):
            self.q.verify(item, event_key='glpat-' + 'x' * 24)
        self.q.policy['max_items'] = 1
        self.register()
        with self.assertRaises(m.QueueError):
            self.q.register(dict(self.scope, resource='two'), self.check, source_paths=['docs/source.md'], owner='D07', next_action='Repair.')
        self.q.policy['max_history_records'] = 8
        with self.assertRaises(m.QueueError):
            self.q.verify(m.digest(m.canonical(self.scope)), event_key='limit', now=101)

    def test_project_manifest_import_is_actual_deduplicated_and_external(self):
        manifest = dict(known_gaps=[dict(id='GAP-ONE', owner='D06', status='real_external_evidence_missing')])
        (self.root / 'config/project-skills.json').write_text(json.dumps(manifest))
        self.assertEqual(len(self.q.import_project_gaps(now=100)['imported']), 1)
        self.q.import_project_gaps(now=101)
        self.assertEqual(len(self.q.status()), 1)
        self.assertEqual(self.q.status()[0]['owner'], 'D06')

    def test_fixed_native_verifiers_no_arbitrary_imports(self):
        for name in ['tools/arbitrary.py', 'os', 'subprocess']:
            with self.assertRaises(m.QueueError):
                self.q._native_module(name)
        tools = self.root / 'tools'; tools.mkdir()
        (tools / 'project_skills.py').write_text('def verified_sources(root):\n return {}, {"one": (None, b"ok")}\n')
        (self.root / 'config/project-skills.json').write_text('{}')
        item = self.q.register(self.scope, dict(kind='project_skills_integrity'), source_paths=['docs/source.md'], owner='D07', next_action='Repair skills.', now=100)['id']
        result = self.q.verify(item, event_key='native', now=101)
        # A supplied data root cannot substitute its own checker implementation.
        self.assertEqual(result['state'], 'blocked')
        self.assertEqual(result['evidence']['code'], 'native_check_failed_or_source_unavailable')

    def test_target_is_automatically_fingerprint_bound(self):
        item = self.register()
        self.q.verify(item, event_key='target-pass', now=101)
        with self.q.connection() as db:
            refs = json.loads(db.execute('SELECT source_refs FROM items WHERE id=?', (item,)).fetchone()[0])
        self.assertIn('docs/artifact.md', [ref['path'] for ref in refs])
        (self.root / 'docs/artifact.md').write_text('changed target')
        result = self.q.register(self.scope, self.check, source_paths=['docs/source.md'], owner='D07', next_action='Repair changed target.', now=102)
        self.assertEqual((result['generation'], result['state'], result['deduplicated']), (2, 'blocked', False))

    def test_native_executes_validated_bytes_without_path_reopen(self):
        tools = self.root / 'tools'; tools.mkdir()
        (tools / 'check_llm_policy.py').write_text('raise RuntimeError("path must not be executed")')
        validated = b'def validate(configs):\n return "validated bytes"\n'
        with patch.object(m, 'ROOT', self.root), patch.object(m, 'read_source', return_value=validated):
            module = self.q._native_module('check_llm_policy')
        self.assertEqual(module.validate({}), 'validated bytes')

    def test_fixed_regression_runner_uses_whitelist_and_no_output_or_shell(self):
        with patch.object(m, 'ROOT', self.root), patch.object(m.subprocess, 'Popen') as launch:
            launch.return_value.wait.return_value = 0
            result = self.q._check({'kind': 'brain_ingestion_regression'})
        self.assertEqual(result['outcome'], 'passed')
        args, kw = launch.call_args
        self.assertEqual(args[0][-1], 'test_brain_ingestion.py')
        self.assertEqual(args[0][1:3], ['-I', '-B'])
        self.assertNotIn('shell', kw)
        self.assertEqual(set(kw['env']), {'PATH', 'HOME', 'TMPDIR', 'LANG'})
        self.assertEqual(kw['stdout'], m.subprocess.DEVNULL)
        self.assertEqual(kw['stderr'], m.subprocess.DEVNULL)
        launch.return_value.wait.assert_called_once_with(timeout=60)
        with self.assertRaises(m.QueueError):
            self.q.register(self.scope, {'kind': 'brain_ingestion_regression', 'command': 'anything'}, source_paths=['docs/source.md'], owner='D07', next_action='Repair.')

    def test_regression_timeout_fails_and_terminates_only_own_group(self):
        with patch.object(m, 'ROOT', self.root), patch.object(m.subprocess, 'Popen') as launch, patch.object(m.os, 'killpg') as kill:
            launch.return_value.pid = 12345
            launch.return_value.wait.side_effect = [m.subprocess.TimeoutExpired('fixed-test', 60), -9]
            result = self.q._check({'kind': 'brain_ingestion_regression'})
        self.assertEqual(result['outcome'], 'failed')
        self.assertEqual(result['code'], 'fixed_local_regression_timeout')
        self.assertEqual(kill.call_args.args[0], 12345)
        self.assertTrue(launch.call_args.kwargs['start_new_session'])

    def test_read_only_status_never_launches_regression_process(self):
        item = self.register()
        with self.q.transaction() as db:
            db.execute("UPDATE items SET state='resolved',check_spec=? WHERE id=?", (json.dumps({'kind': 'brain_ingestion_regression'}), item))
        with patch.object(m.subprocess, 'Popen', side_effect=AssertionError('status must not execute tests')):
            self.assertEqual(self.q.status(item)[0]['state'], 'resolved')

    def test_read_only_registry_does_not_create_and_cannot_write(self):
        q = m.RemediationQueue(root=self.root, read_only=True)
        self.assertEqual(q.status(), [])
        with self.assertRaises(m.QueueError):
            with q.transaction():
                pass
        with self.assertRaises(OSError):
            m.RemediationQueue('.local/remediation/missing.sqlite3', root=self.root, read_only=True)
        self.assertFalse((self.root / '.local/remediation/missing.sqlite3').exists())

    def test_cli_gate_fails_empty_open_and_passes_current_local_proof(self):
        with patch.object(m, 'RemediationQueue', return_value=self.q), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(m.main(['status', '--require-resolved']), 2)
            item = self.register()
            self.assertEqual(m.main(['status', '--id', item, '--require-resolved']), 2)
            self.q.verify(item, event_key='gate', now=101)
            self.assertEqual(m.main(['status', '--id', item, '--require-resolved']), 0)
            self.assertEqual(m.main(['status', '--id', 'unknown', '--require-resolved']), 2)


if __name__ == '__main__':
    unittest.main()
