"""Real isolated filesystem/SQLite tests; no remote service, model or shell content execution."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from threading import Event
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'tools/brain_ingestion.py'
SPEC = importlib.util.spec_from_file_location('local_brain_staging', SCRIPT)
brain = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(brain)


class BrainIngestionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.source = self.base / 'authorized-project'; self.source.mkdir()
        self.database = self.base / 'state/brain.sqlite'

    def tearDown(self):
        self.temp.cleanup()

    def scan(self, **overrides):
        args = dict(source_root=self.source, tenant='tenant-a', project='factory', database=self.database,
                    source_id='approved-docs', authority='reference')
        args.update(overrides)
        return brain.scan(**args)

    def versions(self, report, tenant='tenant-a', project='factory'):
        store = brain.Store(self.database)
        return [store.read_version(tenant, project, row['version_id']) for row in store.manifest(tenant, project, report['job_id'])]

    def test_replay_real_process_restart_and_exact_manifest_content_readback(self):
        (self.source / 'guide.md').write_text('# Guide\nA local source.\n## Details\nNo remote execution.\n')
        first = self.scan(); original = self.versions(first)[0]
        self.assertEqual(first['staged'], 1); self.assertIsNone(first['external_indexed'])
        command = [sys.executable, str(SCRIPT), 'scan', '--source-root', str(self.source), '--tenant', 'tenant-a',
                   '--project', 'factory', '--database', str(self.database), '--source-id', 'approved-docs', '--authority', 'reference']
        replay = json.loads(subprocess.run(command, check=True, capture_output=True, text=True).stdout)
        self.assertEqual(replay['unchanged'], 1); self.assertEqual(replay['staged'], 0)
        self.assertEqual(self.versions(replay)[0], original)
        self.assertTrue(all(chunk['id'] and chunk['start_line'] <= chunk['end_line'] for chunk in original['chunks']))
        with brain.Store(self.database).connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM brain_versions').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT state FROM brain_outbox').fetchone()[0], 'pending_ingestion')

    def test_symlink_hardlink_secrets_and_customer_scope_are_never_ingested(self):
        (self.source / 'safe.md').write_text('# Authorized\nOnly this document.\n')
        outside = self.base / 'outside.md'; outside.write_text('outside-private-content')
        (self.source / 'linked.md').symlink_to(outside)
        (self.source / 'linked-directory').symlink_to(self.base, target_is_directory=True)
        os.link(outside, self.source / 'hardlink.md')
        for directory in ('.git', 'node_modules', '.env', 'secrets', 'affilinet-portal-aachen-final', 'apps/portal'):
            target = self.source / directory; target.mkdir(parents=True)
            (target / 'private.md').write_text('must-not-read-this-document')
        (self.source / 'credentials.md').write_text('must-not-read-secret-file')
        result = self.scan()
        self.assertEqual(result['staged'], 1); self.assertEqual(result['quarantine'], 1)
        self.assertGreaterEqual(result['suppressed'], 8)
        self.assertEqual([row['relative_path'] for row in self.versions(result)], ['safe.md'])
        customer = self.base / 'affilinet-portal-aachen-final'; customer.mkdir()
        with self.assertRaises(brain.StagingError): self.scan(source_root=customer)
        symlink_root = self.base / 'alias'; symlink_root.symlink_to(self.source, target_is_directory=True)
        with self.assertRaises(brain.StagingError): self.scan(source_root=symlink_root)
        with self.assertRaises(brain.StagingError): self.scan(source_root=Path('/workspace'))

    def test_changed_versions_bom_normalization_and_tenant_project_isolation(self):
        path = self.source / 'same.md'; path.write_bytes(b'\xef\xbb\xbf# First\r\nOriginal\r\n')
        initial = self.scan(); old = self.versions(initial)[0]
        self.assertEqual(old['content'], '# First\nOriginal\n')
        path.write_text('# Updated\nChanged\n')
        changed = self.scan(); new = self.versions(changed)[0]
        self.assertEqual(changed['changed'], 1); self.assertEqual(changed['staged'], 1)
        self.assertNotEqual(old['id'], new['id']); self.assertNotEqual(old['source_version'], new['source_version'])
        store = brain.Store(self.database)
        self.assertEqual(store.read_version('tenant-a', 'factory', old['id'])['content'], '# First\nOriginal\n')
        with self.assertRaises(brain.StagingError): store.read_version('tenant-b', 'factory', old['id'])
        with self.assertRaises(brain.StagingError): store.manifest('tenant-a', 'another-project', initial['job_id'])
        other = self.scan(tenant='tenant-b'); foreign = self.versions(other, tenant='tenant-b')[0]
        self.assertNotEqual(foreign['id'], new['id']); self.assertEqual(foreign['tenant'], 'tenant-b')
        with self.assertRaises(brain.StagingError): self.scan(authority='project_instruction')

    def test_secret_redaction_precedes_durable_storage_and_unsafe_inputs_are_quarantined(self):
        secret = 'sk-or-fixturePrivateSecret123456789'
        password = 'fixture-password-value-never-store'
        (self.source / 'redact.md').write_text(f'# Reference\nOPENROUTER_API_KEY={secret}\npassword: {password}\n"password": "{password}"\nInline {secret}\n')
        (self.source / 'multiline.md').write_text('api_key: |\n  ambiguous-secret\n')
        (self.source / 'invalid.md').write_bytes(b'\xff')
        (self.source / 'large.md').write_bytes(b'x' * (brain.MAX_FILE_BYTES + 1))
        result = self.scan(); record = self.versions(result)[0]
        self.assertEqual(result['staged'], 1); self.assertEqual(result['quarantine'], 3)
        self.assertIn('[REDACTED]', record['content']); self.assertGreaterEqual(record['redactions'], 3)
        self.assertNotEqual(record['original_sha256'], record['normalized_sha256'])
        with brain.Store(self.database).connect() as db:
            dumped = '\n'.join(db.iterdump())
        for value in (secret, password, 'ambiguous-secret'):
            self.assertNotIn(value, dumped)
        for file in self.database.parent.iterdir():
            if file.is_file():
                self.assertNotIn(secret.encode(), file.read_bytes()); self.assertNotIn(password.encode(), file.read_bytes())

    def test_thousand_markdown_files_stage_without_model_calls_and_commands_remain_candidates(self):
        marker = self.base / 'must-not-exist'
        for index in range(1000):
            (self.source / f'document-{index:04}.md').write_text(f'# Document {index}\nA bounded fixture.\n')
        commands = f'---\nkind: policy\n---\n# Policy instructions\n- [ ] TODO\n```sh\ntouch {marker}\n```\n'
        (self.source / 'document-0000.md').write_text(commands)
        result = self.scan(authority='project_instruction')
        self.assertEqual(result['staged'], 1000); self.assertEqual(result['manifest_rows'], 1000)
        self.assertTrue(result['scan_complete']); self.assertIsNone(result['external_indexed']); self.assertEqual(result['remote_model_calls'], 0)
        self.assertFalse(marker.exists())
        record = next(row for row in self.versions(result) if row['relative_path'] == 'document-0000.md')
        self.assertEqual(set(json.loads(record['candidates'])), {'metadata_candidate', 'task_candidate', 'policy_candidate'})
        self.assertIn('touch ', record['content'])
        self.assertTrue(all(len(chunk['text']) <= brain.CHUNK_CHARACTERS for chunk in record['chunks']))

    def test_fifo_is_quarantined_without_waiting_for_writer(self):
        os.mkfifo(self.source / 'pipe.md')
        command = [sys.executable, str(SCRIPT), 'scan', '--source-root', str(self.source), '--tenant', 'tenant-a',
                   '--project', 'factory', '--database', str(self.database), '--source-id', 'approved-docs']
        result = subprocess.run(command, capture_output=True, text=True, timeout=3, check=True)
        report = json.loads(result.stdout)
        self.assertEqual(report['quarantine'], 1)
        self.assertEqual(report['staged'], 0)

    def test_unassigned_common_provider_tokens_are_redacted_before_database_write(self):
        tokens = ['glpat-' + 'a' * 24, 'gho_' + 'b' * 30, 'sk_live_' + 'c' * 30,
                  'rot_' + 'd' * 30, 'sk-or-v1-' + 'e' * 30]
        (self.source / 'reference.md').write_text('# Fixture\n' + '\n'.join(tokens) + '\n')
        report = self.scan()
        self.assertEqual(report['staged'], 1)
        with brain.Store(self.database).connect() as db:
            dumped = '\n'.join(db.iterdump())
        for token in tokens:
            self.assertNotIn(token, dumped)
            for path in self.database.parent.iterdir():
                if path.is_file():
                    self.assertNotIn(token.encode(), path.read_bytes())

    def test_changed_and_reverted_versions_supersede_only_obsolete_pending_work(self):
        path = self.source / 'guide.md'; path.write_text('# A\nVersion A\n')
        first = self.scan(); version_a = self.versions(first)[0]['id']
        path.write_text('# B\nVersion B\n'); second = self.scan(); version_b = self.versions(second)[0]['id']
        self.assertEqual(second['superseded_versions'], 1)
        path.write_text('# A\nVersion A\n'); reverted = self.scan()
        self.assertEqual(reverted['reactivated'], 1); self.assertEqual(reverted['staged'], 0)
        self.assertEqual(self.versions(reverted)[0]['id'], version_a)
        with brain.Store(self.database).connect() as db:
            states = dict(db.execute('SELECT version_id,state FROM brain_outbox'))
            self.assertEqual(states[version_a], 'pending_ingestion'); self.assertEqual(states[version_b], 'superseded')
            self.assertEqual(db.execute('SELECT current_version FROM brain_documents').fetchone()[0], version_a)
            self.assertEqual(db.execute('SELECT count(*) FROM brain_versions').fetchone()[0], 2)

    def test_deletion_tombstone_restart_and_identical_reappearance_preserve_scoped_history(self):
        path = self.source / 'guide.md'; content = '# Original\nKeep the version history.\n'; path.write_text(content)
        first = self.scan(); version = self.versions(first)[0]['id']
        other = self.scan(tenant='tenant-b'); other_version = self.versions(other, tenant='tenant-b')[0]['id']
        path.unlink(); deleted = self.scan()
        self.assertTrue(deleted['reconciliation_applied']); self.assertEqual(deleted['tombstoned'], 1)
        command = [sys.executable, str(SCRIPT), 'scan', '--source-root', str(self.source), '--tenant', 'tenant-a',
                   '--project', 'factory', '--database', str(self.database), '--source-id', 'approved-docs']
        after_restart = json.loads(subprocess.run(command, check=True, capture_output=True, text=True).stdout)
        self.assertEqual(after_restart['tombstoned'], 0)
        with brain.Store(self.database).connect() as db:
            self.assertIsNone(db.execute("SELECT current_version FROM brain_documents WHERE tenant='tenant-a'").fetchone()[0])
            self.assertEqual(db.execute('SELECT state FROM brain_outbox WHERE version_id=?', (version,)).fetchone()[0], 'source_removed')
            self.assertEqual(db.execute('SELECT state FROM brain_outbox WHERE version_id=?', (other_version,)).fetchone()[0], 'pending_ingestion')
        path.write_text(content); restored = self.scan()
        self.assertEqual(restored['reactivated'], 1); self.assertEqual(self.versions(restored)[0]['id'], version)
        store = brain.Store(self.database)
        self.assertEqual(store.read_version('tenant-a', 'factory', version)['content'], content)
        with store.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM brain_tombstones').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT state FROM brain_outbox WHERE version_id=?', (version,)).fetchone()[0], 'pending_ingestion')

    def test_quarantine_budget_and_walk_error_never_reconcile_missing_documents(self):
        first = self.source / 'a.md'; missing = self.source / 'b.md'
        first.write_text('# A\nOriginal\n'); missing.write_text('# B\nRetain until complete scan.\n')
        self.scan(); missing.unlink(); first.write_bytes(b'\xff')
        quarantined = self.scan()
        self.assertFalse(quarantined['scan_complete']); self.assertFalse(quarantined['reconciliation_applied'])
        first.write_text('# A\nOriginal\n')
        with patch.object(brain, 'MAX_MARKDOWN_FILES', 0): partial = self.scan()
        self.assertFalse(partial['scan_complete']); self.assertEqual(partial['tombstoned'], 0)
        def failed_walk(*args, **kwargs):
            kwargs['onerror'](PermissionError('fixture denied subtree'))
            return iter(())
        with patch.object(brain.os, 'walk', side_effect=failed_walk): denied = self.scan()
        self.assertEqual(denied['walk_errors'], 1); self.assertFalse(denied['reconciliation_applied'])
        with brain.Store(self.database).connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM brain_documents WHERE current_version IS NOT NULL').fetchone()[0], 2)
            self.assertEqual(db.execute('SELECT count(*) FROM brain_tombstones').fetchone()[0], 0)
        complete = self.scan()
        self.assertEqual(complete['tombstoned'], 1); self.assertTrue(complete['reconciliation_applied'])

    def test_concurrent_scans_are_serialized_and_only_later_complete_scan_can_tombstone(self):
        path = self.source / 'guide.md'; path.write_text('# Stable\nBefore deletion.\n'); self.scan()
        entered, release, second_started = Event(), Event(), Event()
        original_read = brain.secure_read
        def paused_read(*args):
            if not entered.is_set():
                entered.set(); self.assertTrue(release.wait(3))
            return original_read(*args)
        def second_scan():
            second_started.set(); return self.scan()
        with patch.object(brain, 'secure_read', side_effect=paused_read), ThreadPoolExecutor(max_workers=2) as pool:
            first = pool.submit(self.scan); self.assertTrue(entered.wait(2))
            second = pool.submit(second_scan); self.assertTrue(second_started.wait(2))
            try:
                with self.assertRaises(TimeoutError): second.result(timeout=.1)
                path.unlink()
            finally:
                release.set()
            first_report, second_report = first.result(timeout=4), second.result(timeout=4)
        self.assertFalse(first_report['reconciliation_applied']); self.assertEqual(first_report['quarantine'], 1)
        self.assertTrue(second_report['reconciliation_applied']); self.assertEqual(second_report['tombstoned'], 1)
        with brain.Store(self.database).connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM brain_versions').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT count(*) FROM brain_tombstones').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT state FROM brain_outbox').fetchone()[0], 'source_removed')


if __name__ == '__main__':
    unittest.main()
