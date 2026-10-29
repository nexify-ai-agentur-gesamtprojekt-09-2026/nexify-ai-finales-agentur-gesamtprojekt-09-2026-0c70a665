"""The source reconciliation must not turn reports into acceptance or originals."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('reconciliation', ROOT / 'tools/verify_requirements_reconciliation.py')
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class ReconciliationTests(unittest.TestCase):
    def setUp(self):
        self.document = json.loads((ROOT / checker.REGISTER).read_text())
        self.record = self.document['requirements_reconciliation']

    def test_register_and_human_view_match(self):
        self.assertEqual(checker.validate(self.document, ROOT), [])
        self.assertEqual((ROOT / checker.VIEW).read_text(), checker.render(self.document))

    def test_register_cannot_claim_its_own_recursive_source_hash(self):
        self.document['source_sha256'][str(checker.REGISTER)] = '0' * 64
        self.assertIn('Register self-hash is recursive; bind it with commit/package manifest instead', checker.validate(self.document, ROOT))

    def test_recorded_source_hashes_match_actual_bytes(self):
        for relative, expected in self.document['source_sha256'].items():
            with self.subTest(source=relative):
                self.assertEqual(hashlib.sha256((ROOT / relative).read_bytes()).hexdigest(), expected)

    def test_missing_implementation_bindings_are_rejected(self):
        row = next(r for r in self.record['requirements'] if r['requirement_id'] == 'REC-LEGAL-FOOTER-01')
        for relative in row['implementation_files']:
            if relative == str(checker.REGISTER):
                continue
            with self.subTest(source=relative):
                changed = copy.deepcopy(self.document)
                changed['source_sha256'].pop(relative, None)
                self.assertIn('Unbound implementation source: ' + relative, checker.validate(changed, ROOT))

    def test_changed_implementation_bytes_do_not_pass_with_old_binding(self):
        for relative in ('apps/site/tests/browser-legal-footer.mjs',
                         'evidence/legal-footer-2026-10-28/browser.json',
                         'evidence/legal-footer-2026-10-28/next-browser.json'):
            with self.subTest(source=relative):
                changed = copy.deepcopy(self.document)
                changed['source_sha256'][relative] = '0' * 64
                self.assertIn('Stale implementation source: ' + relative, checker.validate(changed, ROOT))

    def test_footer_evidence_requires_actual_fr_matrix(self):
        original = Path.read_text
        def without_fr(path, *args, **kwargs):
            raw = original(path, *args, **kwargs)
            if path == ROOT / 'evidence/legal-footer-2026-10-28/browser.json':
                report = json.loads(raw)
                report['views'] = [r for r in report['views'] if r['locale'] != 'fr']
                return json.dumps(report)
            return raw
        with patch.object(Path, 'read_text', without_fr):
            self.assertIn('Incomplete or stale legal footer browser evidence: browser.json',
                          checker.validate_legal_footer_evidence(ROOT))

    def test_footer_evidence_rejects_stale_sources_and_wrong_site_routes(self):
        original = Path.read_text
        for mutation in ('source', 'route'):
            def changed(path, *args, **kwargs):
                raw = original(path, *args, **kwargs)
                if path == ROOT / 'evidence/legal-footer-2026-10-28/next-browser.json':
                    report = json.loads(raw)
                    if mutation == 'source':
                        report['source_sha256']['apps/site/tests/browser-legal-footer.mjs'] = '0' * 64
                    else:
                        next(r for r in report['views'] if r['legal_context'] == 'teileklar')['legal_paths'] = ['/datenschutz']
                    return json.dumps(report)
                return raw
            with self.subTest(mutation=mutation), patch.object(Path, 'read_text', changed):
                self.assertIn('Incomplete or stale legal footer browser evidence: next-browser.json',
                              checker.validate_legal_footer_evidence(ROOT))

    def test_report_cannot_be_promoted_to_original(self):
        source = next(s for s in self.record['sources'] if s['acquisition'] == 'parent_verified_excerpt')
        source['original_seen_here'] = True
        self.assertIn('Reported excerpt cannot be a direct original read', checker.validate(self.document, ROOT))

    def test_unknown_source_and_missing_owner_are_rejected(self):
        row = self.record['requirements'][0]
        row['source_ids'] = ['not-an-original']
        row['owner_area'] = ''
        errors = checker.validate(self.document, ROOT)
        self.assertIn('Unresolved requirement source', errors)
        self.assertIn('Incomplete requirement: owner_area', errors)

    def test_no_automatic_acceptance_or_private_source_escape(self):
        row = self.record['requirements'][0]
        row['full_requirement_accepted'] = True
        row['implementation_files'] = ['../outside', '/etc/passwd']
        errors = checker.validate(self.document, ROOT)
        self.assertIn('This bounded reconciliation cannot grant full acceptance', errors)
        self.assertEqual(sum(error.startswith('Invalid implementation') for error in errors), 2)

    def test_duplicate_source_and_requirement_identity_rejected(self):
        self.record['sources'].append(copy.deepcopy(self.record['sources'][0]))
        self.record['requirements'].append(copy.deepcopy(self.record['requirements'][0]))
        errors = checker.validate(self.document, ROOT)
        self.assertIn('Missing or duplicate source ID', errors)
        self.assertIn('Missing or duplicate requirement ID', errors)
