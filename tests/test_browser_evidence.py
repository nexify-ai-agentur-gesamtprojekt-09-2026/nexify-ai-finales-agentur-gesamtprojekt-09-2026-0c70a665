"""Saved source-bound fixtures only; these tests do not run a browser."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("browser_evidence_checker", ROOT / "tools/check_browser_evidence.py")
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)


class BrowserEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        for relative in (*checker.SOURCE_PATHS, *checker.SDK_SOURCE_PATHS, *checker.AUXILIARY_SOURCE_PATHS, checker.EVIDENCE_PATH):
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / relative).read_bytes())
        self.evidence = json.loads((self.root / checker.EVIDENCE_PATH).read_text())

    def tearDown(self):
        self.temporary.cleanup()

    def write(self, evidence):
        (self.root / checker.EVIDENCE_PATH).write_text(json.dumps(evidence))

    def test_current_mirrored_fixture_passes_read_only_with_explicit_limited_scope(self):
        before = {str(file.relative_to(self.root)): file.read_bytes() for file in self.root.rglob("*") if file.is_file()}
        result = checker.check_evidence(self.root)
        self.assertEqual(result["scope"], "stored_browser_evidence_binding_only")
        self.assertEqual(result["source_count"], len(checker.SOURCE_PATHS))
        self.assertEqual(result["gutter_rows"], 6)
        after = {str(file.relative_to(self.root)): file.read_bytes() for file in self.root.rglob("*") if file.is_file()}
        self.assertEqual(before, after)

    def test_stale_hash_and_artifact_supplied_source_paths_fail_closed(self):
        source = self.root / checker.SOURCE_PATHS[0]
        original = source.read_bytes(); source.write_bytes(original + b"\n/* changed source */\n")
        with self.assertRaisesRegex(checker.EvidenceError, "stale_source_sha256"):
            checker.check_evidence(self.root)
        source.write_bytes(original)
        malicious = copy.deepcopy(self.evidence)
        malicious["source_sha256"]["../../outside-repository"] = "0" * 64
        self.write(malicious)
        with self.assertRaisesRegex(checker.EvidenceError, "exact_source_path_set_required"):
            checker.check_evidence(self.root)

    def test_stylesheet_drift_cannot_reuse_an_old_browser_pass(self):
        for relative in ("apps/web/components/WorkspaceRebuild.css", "apps/web/components/PublicExperience.tsx", "apps/web/components/OracleCompanion.tsx", "apps/web/components/DeferredChatBoundary.tsx", "apps/web/components/PublicRequestFallback.tsx", "apps/web/public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png"):
            path = self.root / relative
            original = path.read_bytes(); path.write_bytes(original + b"\n/* changed public composition */\n")
            with self.assertRaisesRegex(checker.EvidenceError, "stale_auxiliary_source_sha256"):
                checker.check_evidence(self.root)
            path.write_bytes(original)

    def test_sdk_source_drift_and_missing_mobile_or_context_proof_fail_closed(self):
        source = self.root / checker.SDK_SOURCE_PATHS[0]
        original = source.read_bytes()
        source.write_bytes(original + b'\n/* changed */\n')
        with self.assertRaisesRegex(checker.EvidenceError, 'stale_sdk_source_sha256'):
            checker.check_evidence(self.root)
        source.write_bytes(original)
        for identifier in checker.SDK_CRITICAL_CHECKS:
            evidence = copy.deepcopy(self.evidence)
            evidence['sdk_browser_observations']['checks'].remove(identifier)
            self.write(evidence)
            with self.assertRaisesRegex(checker.EvidenceError, 'critical_sdk_browser_check_missing'):
                checker.check_evidence(self.root)
    def test_missing_critical_check_and_unpassed_recording_are_rejected(self):
        for identifier in checker.CRITICAL_CHECKS:
            with self.subTest(check=identifier):
                evidence = copy.deepcopy(self.evidence)
                evidence["checks"].remove(identifier); self.write(evidence)
                with self.assertRaisesRegex(checker.EvidenceError, "critical_browser_check_missing"):
                    checker.check_evidence(self.root)
        evidence = copy.deepcopy(self.evidence); evidence["passed"] = False; self.write(evidence)
        with self.assertRaisesRegex(checker.EvidenceError, "recorded_browser_pass_required"):
            checker.check_evidence(self.root)

    def test_wrong_routes_and_incomplete_or_false_gutter_measurements_are_rejected(self):
        mutations = (
            lambda value: value["public_routes"].append("/not-a-public-route"),
            lambda value: value["public_routes"].pop(),
            lambda value: value["targeted_supplement_gutter_followup"][0]["gutter"].update(left=23),
            lambda value: value["targeted_supplement_gutter_followup"][0].update(passed=False),
            lambda value: value["targeted_supplement_gutter_followup"][0].update(path="/private"),
            lambda value: value["targeted_supplement_gutter_followup"].pop(),
        )
        for index, mutate in enumerate(mutations):
            with self.subTest(mutation=index):
                evidence = copy.deepcopy(self.evidence); mutate(evidence); self.write(evidence)
                with self.assertRaises(checker.EvidenceError):
                    checker.check_evidence(self.root)



class ShopEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        for relative in (*checker.SHOP_SOURCE_PATHS, checker.SHOP_EVIDENCE_PATH):
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / relative).read_bytes())
        self.evidence = json.loads((self.root / checker.SHOP_EVIDENCE_PATH).read_text())

    def write(self):
        (self.root / checker.SHOP_EVIDENCE_PATH).write_text(json.dumps(self.evidence))

    def test_saved_shop_proof_is_bounded_and_current(self):
        self.assertEqual(checker.check_shop_evidence(self.root)['checks'], 13)

    def test_changed_api_or_fixture_cannot_reuse_saved_success(self):
        for relative in ('apps/agent-gateway/server.py', 'apps/site/tests/fixtures/shop-server.py', 'apps/web/components/PublicExperience.tsx', 'apps/web/components/OracleCompanion.tsx', 'apps/web/components/DeferredChatBoundary.tsx', 'apps/web/components/PublicRequestFallback.tsx', 'apps/web/public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png'):
            path = self.root / relative
            original = path.read_bytes(); path.write_bytes(original + b'\n# changed')
            with self.assertRaisesRegex(checker.EvidenceError, 'stale_shop_source_sha256'):
                checker.check_shop_evidence(self.root)
            path.write_bytes(original)

    def test_missing_reconciliation_case_and_false_effect_claim_rejected(self):
        self.evidence['checks'].remove('aborted create before commit blocks writes until deliberate successful empty readback')
        self.write()
        with self.assertRaisesRegex(checker.EvidenceError, 'shop_critical_check_missing'):
            checker.check_shop_evidence(self.root)
        self.evidence['checks'].append('aborted create before commit blocks writes until deliberate successful empty readback')
        self.evidence['payment_started'] = True; self.write()
        with self.assertRaisesRegex(checker.EvidenceError, 'shop_effect_boundaries_required'):
            checker.check_shop_evidence(self.root)

    def test_static_labels_without_real_http_or_single_persistence_are_rejected(self):
        self.evidence['requests'] = []; self.write()
        with self.assertRaisesRegex(checker.EvidenceError, 'shop_actual_http_boundary_missing'):
            checker.check_shop_evidence(self.root)


if __name__ == "__main__":
    unittest.main()


class CatalogBrowserEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(); self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        for relative in (*checker.CATALOG_SOURCE_PATHS, checker.CATALOG_EVIDENCE_PATH):
            target = self.root / relative; target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / relative).read_bytes())

    def test_source_drift_and_effect_promotion_rejected(self):
        self.assertEqual(checker.check_catalog_evidence(self.root)['checks'], 4)
        for relative in (checker.CATALOG_SOURCE_PATHS[0], 'apps/web/components/PublicExperience.tsx', 'apps/web/components/OracleCompanion.tsx', 'apps/web/components/DeferredChatBoundary.tsx', 'apps/web/components/PublicRequestFallback.tsx', 'apps/web/public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png'):
            path = self.root / relative
            before = path.read_bytes(); path.write_bytes(before+b'\n/* changed source */')
            with self.assertRaisesRegex(checker.EvidenceError, 'stale_catalog'): checker.check_catalog_evidence(self.root)
            path.write_bytes(before)
        evidence_path = self.root / checker.CATALOG_EVIDENCE_PATH
        report = json.loads(evidence_path.read_text()); report['order_started'] = True
        evidence_path.write_text(json.dumps(report))
        with self.assertRaisesRegex(checker.EvidenceError, 'read_only_partial'): checker.check_catalog_evidence(self.root)


class PublicFallbackEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(); self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        for relative in (*checker.PUBLIC_FALLBACK_SOURCES, checker.PUBLIC_FALLBACK_PATH):
            target = self.root / relative; target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / relative).read_bytes())

    def test_current_pass_cannot_survive_a_changed_boundary(self):
        self.assertEqual(checker.check_public_fallbacks(self.root)['checks'], 18)
        path = self.root / 'apps/web/components/DeferredChatBoundary.tsx'
        path.write_bytes(path.read_bytes()+b'\n/* changed boundary */')
        with self.assertRaisesRegex(checker.EvidenceError, 'stale_fallback_source'):
            checker.check_public_fallbacks(self.root)

    def test_missing_mobile_case_or_false_no_effect_claim_is_rejected(self):
        path = self.root / checker.PUBLIC_FALLBACK_PATH
        report = json.loads(path.read_text()); original = copy.deepcopy(report)
        report['checks'].pop(); path.write_text(json.dumps(report))
        with self.assertRaisesRegex(checker.EvidenceError, 'complete_matrix'):
            checker.check_public_fallbacks(self.root)
        original['mutations'] = 1; path.write_text(json.dumps(original))
        with self.assertRaisesRegex(checker.EvidenceError, 'no_external_uncaught_or_mutations'):
            checker.check_public_fallbacks(self.root)
