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
        for relative in (*checker.SOURCE_PATHS, *checker.SDK_SOURCE_PATHS, checker.EVIDENCE_PATH):
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
        self.assertEqual(result["source_count"], 4)
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


if __name__ == "__main__":
    unittest.main()
