"""Real isolated source-tree/registry fixtures; no provider calls or secrets."""
import hashlib
import importlib.util
import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

SPEC = importlib.util.spec_from_file_location('coverage_gate', Path(__file__).resolve().parents[1] / 'tools/check_ai_coverage.py')
gate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gate)


class CoverageTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        (self.root / 'config').mkdir()
        self.entries = []

    def source(self, path='api/review.ts', text="const endpoint = 'https://openrouter.ai/api/v1/chat/completions';\n", status='source_enforced'):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)
        entry = {'id': 'source-' + str(len(self.entries)), 'path': path,
                 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'status': status,
                 'classification': 'fixture', 'source_role': 'controlled_fixture',
                 'reviewed_non_inference': status == 'reviewed_false_positive',
                 'enforcement': {'state': status, 'checks': ['tests/fixture.test'], 'gaps': []},
                 'owner': 'fixture-owner', 'next_action': 'retain explicit reviewed source boundary',
                 'runtime_deployment_verified': False}
        self.entries.append(entry)
        return target, entry

    def registry(self, **overrides):
        data = {'schema_version': 1, 'scanner': {'roots': list(gate.SCAN_ROOTS),
                 'extensions': sorted(gate.EXTENSIONS), 'marker_pattern': gate.MARKERS,
                 'exclusions': sorted(gate.EXCLUDED_DIRS)}, 'entries': self.entries}
        data.update(overrides)
        path = self.root / gate.REGISTRY
        path.write_text(json.dumps(data))
        return path

    def run_gate(self):
        self.registry()
        return gate.check_repository(self.root)

    def test_registered_source_is_inventory_evidence_not_runtime_acceptance(self):
        self.source()
        result = self.run_gate()
        self.assertEqual(result['status'], 'inventory_review_current')
        self.assertEqual(result['status_counts']['source_enforced'], 1)
        self.assertFalse(result['runtime_authorized'])
        self.assertFalse(result['semantic_completeness_verified'])

    def test_new_unregistered_source_candidate_blocks_and_has_no_contents(self):
        self.source()
        new = self.root / 'tools/new_route.py'
        new.parent.mkdir()
        new.write_text("TOKEN = 'SYNTHETIC_NOT_A_REAL_CREDENTIAL'\nanswer = client.responses.create(model='x')\n")
        result = self.run_gate()
        self.assertEqual(result['status'], 'blocked')
        item = next(x for x in result['errors'] if x['code'] == 'unregistered_ai_source_candidate')
        self.assertEqual(item['path'], 'tools/new_route.py')
        self.assertEqual(item['markers'][0]['line'], 2)
        self.assertNotIn('SYNTHETIC_NOT_A_REAL_CREDENTIAL', json.dumps(result))

    def test_registered_hash_drift_fails_without_refreshing_registry(self):
        target, entry = self.source()
        registry = self.registry()
        before = registry.read_bytes()
        target.write_text(target.read_text() + '// changed after review\n')
        result = gate.check_repository(self.root)
        self.assertIn('registered_source_drift_requires_review', [e['code'] for e in result['errors']])
        self.assertEqual(registry.read_bytes(), before)
        self.assertNotEqual(hashlib.sha256(target.read_bytes()).hexdigest(), entry['sha256'])

    def test_disabled_and_unverified_are_reported_without_enforced_count(self):
        self.source('tools/legacy.py', '# NX_ORAKEL_ENDPOINT\nraise RuntimeError("disabled")\n', 'disabled_fail_closed')
        self.source('hooks/old.mjs', '// nx-jeff external unknown\n', 'external_unverified')
        self.entries[-1]['enforcement']['gaps'] = ['external implementation not verified']
        result = self.run_gate()
        self.assertEqual(result['status'], 'inventory_review_current')
        self.assertEqual(result['status_counts']['source_enforced'], 0)
        self.assertEqual(result['status_counts']['disabled_fail_closed'], 1)
        self.assertEqual(result['open_review_gaps'][0]['status'], 'external_unverified')

    def test_disabled_cannot_claim_enforced(self):
        _, entry = self.source(status='disabled_fail_closed')
        entry['enforcement']['state'] = 'source_enforced'
        self.assertEqual(self.run_gate()['status'], 'blocked')

    def test_runtime_claim_is_rejected_in_source_only_inventory(self):
        _, entry = self.source()
        entry['runtime_deployment_verified'] = True
        self.assertEqual(self.run_gate()['status'], 'blocked')

    def test_false_positive_needs_explicit_review(self):
        _, entry = self.source(status='reviewed_false_positive')
        entry['reviewed_non_inference'] = False
        self.assertEqual(self.run_gate()['status'], 'blocked')
        entry['reviewed_non_inference'] = True
        self.assertEqual(self.run_gate()['status'], 'inventory_review_current')

    def test_declared_scanner_exclusions_cannot_disable_owned_scan(self):
        self.source()
        path = self.registry()
        doc = json.loads(path.read_text())
        doc['scanner']['roots'].remove('hooks')
        path.write_text(json.dumps(doc))
        self.assertEqual(gate.check_repository(self.root)['status'], 'blocked')
        doc['scanner']['roots'] = list(gate.SCAN_ROOTS)
        doc['scanner']['exclusions'] = ['api']
        path.write_text(json.dumps(doc))
        extra = self.root / 'api/new.ts'
        extra.write_text('streamText({});')
        result = gate.check_repository(self.root)
        self.assertIn('unregistered_ai_source_candidate', [e['code'] for e in result['errors']])

    def test_hooks_workflows_and_legacy_callback_are_scanned(self):
        self.source()
        for path, text in [('hooks/hook.mjs', "run('nx-jeff');"),
                           ('.github/workflows/ai.yml', 'env: { OPENROUTER_API_KEY: placeholder }'),
                           ('prototypen/lib/pipeline.js', 'await d.modell(payload)')]:
            p = self.root / path
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text)
        errors = self.run_gate()['errors']
        self.assertEqual({x['path'] for x in errors}, {'hooks/hook.mjs', '.github/workflows/ai.yml', 'prototypen/lib/pipeline.js'})

    def test_vendor_refs_tests_build_and_credentials_are_never_opened(self):
        self.source()
        excluded = ['apps/.env', 'apps/.env.production', 'apps/credentials.py',
                    'apps/private-key.ts', 'apps/site/node_modules/pkg/run.js',
                    'apps/site/dist/bundle.js', 'tools/tests/test_route.py',
                    'tools/test_route.py', 'apps/site/src/route.test.ts',
                    'reference/handoff-n2/tools/route.py', 'docs/example.py']
        for path in excluded:
            p = self.root / path
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text('streamText({}); # FIXTURE_ONLY_NOT_A_SECRET')
        reads = []
        original = gate._read_file
        def reader(fd, name, limit):
            reads.append(name)
            return original(fd, name, limit)
        with mock.patch.object(gate, '_read_file', side_effect=reader), mock.patch('socket.socket', side_effect=AssertionError('network forbidden')):
            result = self.run_gate()
        self.assertEqual(result['status'], 'inventory_review_current')
        self.assertEqual(sorted(reads), ['ai-enforcement-coverage.json', 'review.ts'])

    def test_registered_path_cannot_escape_or_read_secret(self):
        for path in ['../outside.py', '/tmp/outside.py', 'docs/file.py', 'tools/.env', 'tools/secret.py', 'tools/tests/case.py', 'tools/../api/x.ts']:
            with self.subTest(path=path):
                self.entries = []
                _, entry = self.source()
                entry['path'] = path
                with mock.patch.object(gate, '_scan', side_effect=AssertionError('invalid path must fail before scan')):
                    self.assertEqual(self.run_gate()['status'], 'blocked')

    def test_symlink_and_hardlink_sources_fail_without_following(self):
        target, _ = self.source()
        (self.root / 'api/linked.ts').symlink_to(target)
        result = self.run_gate()
        self.assertEqual(result['status'], 'blocked')
        self.assertIn('symlink_in_owned_source_tree', [e['code'] for e in result['errors']])
        (self.root / 'api/linked.ts').unlink()
        os.link(target, self.root / 'api/hard.ts')
        self.assertEqual(self.run_gate()['status'], 'blocked')

    def test_missing_registered_source_and_invalid_utf8_fail_closed(self):
        target, _ = self.source()
        target.unlink()
        self.assertEqual(self.run_gate()['status'], 'blocked')
        target.write_bytes(b'\xff')
        self.assertEqual(self.run_gate()['status'], 'blocked')

    def test_oversized_and_nonregular_sources_are_bounded(self):
        target, _ = self.source()
        with mock.patch.object(gate, 'MAX_FILE_BYTES', 4):
            self.assertEqual(self.run_gate()['status'], 'blocked')
        fifo = self.root / 'api/source.py'
        os.mkfifo(fifo)
        self.assertEqual(self.run_gate()['status'], 'blocked')

    def test_duplicate_id_path_status_and_json_keys_rejected(self):
        self.source()
        self.entries.append(dict(self.entries[0]))
        self.assertEqual(self.run_gate()['status'], 'blocked')
        self.entries.pop()
        self.entries[0]['status'] = 'fully_verified'
        self.assertEqual(self.run_gate()['status'], 'blocked')
        path = self.registry()
        path.write_text('{"schema_version":1,"schema_version":1}')
        self.assertEqual(gate.check_repository(self.root)['status'], 'blocked')

    def test_non_ai_code_need_not_be_registered(self):
        self.source()
        (self.root / 'api/simple.ts').write_text('export const sum = (a, b) => a + b;')
        self.assertEqual(self.run_gate()['status'], 'inventory_review_current')

    def test_empty_checks_cannot_support_source_enforcement(self):
        _, entry = self.source()
        entry['enforcement']['checks'] = []
        self.assertEqual(self.run_gate()['status'], 'blocked')
        entry['enforcement']['checks'] = [None]
        self.assertEqual(self.run_gate()['status'], 'blocked')

    def test_tree_enumeration_limits_fail_instead_of_silently_omitting(self):
        self.source()
        for i in range(3):
            (self.root / 'api' / f'folder{i}').mkdir()
        with mock.patch.object(gate, 'MAX_DIRECTORIES', 2):
            self.assertEqual(self.run_gate()['status'], 'blocked')
        with mock.patch.object(gate, 'MAX_TREE_ENTRIES', 2):
            self.assertEqual(self.run_gate()['status'], 'blocked')

    def cli(self, args):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = gate.main(args, root=self.root)
        return code, json.loads(output.getvalue())

    def test_audit_observes_real_source_drift_without_activating_strict_gate(self):
        target, _ = self.source()
        registry = self.registry()
        before = registry.read_bytes()
        target.write_text(target.read_text() + '// new unreviewed source change\n')
        strict_code, strict = self.cli([])
        audit_code, audit = self.cli(['--audit'])
        self.assertEqual(strict_code, 1)
        self.assertEqual(audit_code, 0)
        self.assertEqual(audit['status'], 'audit_partial')
        self.assertEqual(audit['inventory_status'], 'blocked')
        self.assertEqual(audit['errors'], strict['errors'])
        self.assertIn('registered_source_drift_requires_review', [x['code'] for x in audit['errors']])
        self.assertFalse(audit['enforcement_active'])
        self.assertFalse(audit['runtime_authorized'])
        self.assertEqual(registry.read_bytes(), before)

    def test_audit_new_candidate_and_unavailable_or_unsafe_inventory_never_pass_review(self):
        self.source()
        registry = self.registry()
        (self.root / 'api/new.ts').write_text('streamText({});')
        code, result = self.cli(['--audit'])
        self.assertEqual(code, 0)
        self.assertEqual(result['status'], 'audit_partial')
        self.assertIn('unregistered_ai_source_candidate', [x['code'] for x in result['errors']])
        self.assertFalse(result['runtime_authorized'])
        registry.unlink()
        code, result = self.cli(['--audit'])
        self.assertEqual((code, result['status']), (0, 'audit_unavailable'))
        self.assertEqual(result['inventory_status'], 'blocked')
        self.entries[0]['path'] = '../not-authorized.py'
        self.registry()
        with mock.patch.object(gate, '_scan', side_effect=AssertionError('unsafe paths must not be read')):
            code, result = self.cli(['--audit'])
        self.assertEqual((code, result['status']), (0, 'audit_unavailable'))
        self.assertFalse(result['semantic_completeness_verified'])


if __name__ == '__main__':
    unittest.main()
