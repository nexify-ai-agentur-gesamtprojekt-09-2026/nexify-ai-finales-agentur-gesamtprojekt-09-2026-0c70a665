"""Reject customer-project imports while permitting documented component reuse."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("source_boundaries", ROOT / "tools/check_source_boundaries.py")
boundary = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(boundary)


class SourceBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.policy = json.loads((ROOT / "config/source-boundaries.json").read_text())
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self): self.tmp.cleanup()

    def test_paused_customer_without_import_is_valid(self):
        self.assertEqual(boundary.validate(self.policy, self.root, []), [])

    def test_customer_tree_or_ancestry_rejected(self):
        (self.root / "apps/portal").mkdir(parents=True)
        self.assertTrue(any("application" in e for e in boundary.validate(self.policy, self.root, [])))
        (self.root / "apps/portal").rmdir()
        head = self.policy["excluded_customer_history_heads"][-1]
        self.assertTrue(any("history" in e for e in boundary.validate(self.policy, self.root, [head])))

    def test_project_cannot_be_reclassified_as_an_agency_dependency(self):
        for change in ({"classification": "agency_system"}, {"status": "active"},
                       {"agency_delivery_dependency": True}, {"whole_project_import_allowed": True}):
            policy = copy.deepcopy(self.policy)
            next(s for s in policy["sources"] if s["id"] == "A1").update(change)
            with self.subTest(change=change): self.assertTrue(boundary.validate(policy, self.root, []))

    def test_selective_reuse_requires_provenance_and_no_customer_configuration(self):
        policy = copy.deepcopy(self.policy)
        policy["adopted_customer_components"] = [{"purpose": "generic helper"}]
        self.assertTrue(boundary.validate(policy, self.root, []))
        component = {"source_repository": "authorized-repository", "source_commit": "pinned-commit",
                     "source_paths": ["generic/helper.py"], "purpose": "idempotency pattern",
                     "target_paths": ["packages/idempotency/helper.py"], "license_evidence": "verified-use-authority",
                     "adaptations": ["removed project-specific assumptions"], "tests": ["concurrency counterexample"],
                     "contains_customer_data_or_configuration": False}
        policy["adopted_customer_components"] = [component]
        self.assertEqual(boundary.validate(policy, self.root, []), [])
        component["contains_customer_data_or_configuration"] = True
        self.assertTrue(boundary.validate(policy, self.root, []))

    def test_actual_agency_branch_excludes_customer_history(self):
        ancestors = subprocess.check_output(["git", "-C", str(ROOT), "rev-list", "HEAD"], text=True).splitlines()
        self.assertEqual(boundary.validate(self.policy, ROOT, ancestors), [])

    def test_missing_empty_or_malformed_exclusion_lists_fail_closed(self):
        for field in ("forbidden_agency_paths", "excluded_customer_history_heads"):
            for value in (None, [], "not-a-list", [None]):
                policy = copy.deepcopy(self.policy)
                policy[field] = value
                with self.subTest(field=field, value=value):
                    self.assertTrue(boundary.validate(policy, self.root, self.policy["excluded_customer_history_heads"]))
            policy = copy.deepcopy(self.policy)
            del policy[field]
            self.assertTrue(boundary.validate(policy, self.root, self.policy["excluded_customer_history_heads"]))


if __name__ == "__main__": unittest.main()
