"""The guidance library is hash bound, tenant scoped, and never an executor."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("small_business", ROOT / "tools/automation/small_business.py")
smb = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(smb)


class SourceLibraryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        raw = b"---\nname: build-agent\n---\n# Prepare a named workflow; do not execute it.\n"
        relative = "small-business/skills/build-agent/SKILL.md"
        path = self.root / relative
        path.parent.mkdir(parents=True)
        path.write_bytes(raw)
        self.config = {"source": {"commit": "a" * 40}, "skills_count": 1,
                       "source_files": [{"path": relative, "bytes": len(raw), "sha256": smb.digest(raw)}],
                       "shared_rules": [], "workflows": [{"id": "build-agent", "source": {"path": relative, "sha256": smb.digest(raw)},
                       "native_mapping": {"domain_action": "prepare_workflow_draft"}, "connectors": {}}]}

    def tearDown(self):
        self.temp.cleanup()

    def test_plan_and_read_are_offline_and_not_execution(self):
        with mock.patch.object(smb.urllib.request, "build_opener", side_effect=AssertionError("unexpected network")):
            report = smb.verify(self.config, self.root)
            content = smb.load(self.config, self.root, "build-agent")
            plan = smb.plan(self.config, self.root, "build-agent", "tenant-a", "project-1")
        self.assertEqual(report["status"], "installed_readable_hash_verified")
        self.assertEqual(smb.digest(content[0]["content"].encode()), content[0]["sha256"])
        self.assertEqual(plan["state"], "draft_plan_not_executed")
        self.assertEqual(plan["external_actions_executed"], 0)
        self.assertFalse(plan["scheduler_created"])

    def test_hash_drift_fails_before_returning_guidance(self):
        path = self.root / self.config["source_files"][0]["path"]
        path.write_text("Different instructions, not approved source")
        with self.assertRaisesRegex(smb.SourceError, "hash mismatch"):
            smb.load(self.config, self.root, "build-agent")

    def test_missing_reference_duplicate_or_wrong_identity_rejected(self):
        variants = []
        duplicate = copy.deepcopy(self.config)
        duplicate["source_files"] *= 2
        variants.append(duplicate)
        wrong = copy.deepcopy(self.config)
        wrong["workflows"][0]["id"] = "payroll-prep"
        variants.append(wrong)
        for config in variants:
            with self.subTest(config=config), self.assertRaises(smb.SourceError):
                smb.verify(config, self.root)
        self.config["workflows"][0]["local_reference_paths"] = ["small-business/private.md"]
        with self.assertRaisesRegex(smb.SourceError, "not in the pinned inventory"):
            smb.load(self.config, self.root, "build-agent", True)

    def test_traversal_absolute_and_symlink_sources_rejected(self):
        outside = self.root / "outside.md"
        outside.write_text("not source")
        (self.root / "linked.md").symlink_to(outside)
        for path in ("../outside.md", str(outside), "linked.md", "a\\b", ".git/config"):
            with self.subTest(path=path), self.assertRaises(smb.SourceError):
                smb.safe_path(self.root, path)

    def test_tenant_and_project_must_be_concrete(self):
        for tenant, project in (("", "project"), ("tenant", "../project"), ("tenant\nother", "project")):
            with self.subTest(tenant=tenant), self.assertRaises(smb.SourceError):
                smb.plan(self.config, self.root, "build-agent", tenant, project)

    def test_unknown_workflow_or_remote_archive_never_runs(self):
        with self.assertRaises(smb.SourceError):
            smb.workflow(self.config, "../../payroll")
        bad = copy.deepcopy(self.config)
        bad["source"].update(archive_url="https://example.invalid/script.sh")
        with mock.patch.object(smb.urllib.request, "build_opener", side_effect=AssertionError("must not reach network")):
            with self.assertRaisesRegex(smb.SourceError, "Unreviewed source"):
                smb.install(bad, self.root / "new-install")

    def test_native_mapping_detects_contract_or_scope_drift(self):
        document = {"paths": {"/v1/projects": {"get": {
            "operationId": "listProjects", "x-implementation-status": "proposed_not_implemented",
            "x-authorization": {"scopes": ["projects.read"]}}}}}
        raw = json.dumps(document).encode()
        (self.root / "api.json").write_bytes(raw)
        config = copy.deepcopy(self.config)
        config["native_contract"] = {"path": "api.json", "sha256": smb.digest(raw)}
        config["workflows"][0]["native_mapping"]["api_mcp_sdk"] = [
            {"operation_id": "listProjects", "method": "GET", "path": "/v1/projects", "scopes": ["projects.read"]}]
        smb.verify_native_mapping(config, self.root)
        config["workflows"][0]["native_mapping"]["api_mcp_sdk"][0]["scopes"] = ["projects.write"]
        with self.assertRaisesRegex(smb.SourceError, "scope differs"):
            smb.verify_native_mapping(config, self.root)
        (self.root / "api.json").write_text("changed")
        with self.assertRaisesRegex(smb.SourceError, "API contract changed"):
            smb.verify_native_mapping(config, self.root)


if __name__ == "__main__":
    unittest.main()
