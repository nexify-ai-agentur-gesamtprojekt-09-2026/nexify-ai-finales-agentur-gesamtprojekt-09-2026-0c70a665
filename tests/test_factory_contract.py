"""Adversarial contract changes must fail before becoming integration inputs."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("factory_contract", ROOT / "tools/verify_factory_contract.py")
contract = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(contract)


def minimal_contract():
    return {
        "openapi": "3.1.0", "x-contract-state": "proposed_target_not_runtime",
        "components": {"securitySchemes": {
            "BrowserSession": {"type": "apiKey", "in": "cookie", "name": "nx_session"},
            "CsrfToken": {"type": "apiKey", "in": "header", "name": "X-CSRF-Token"},
            "ApiKey": {"type": "http", "scheme": "bearer"}}},
        "paths": {"/v1/projects": {"post": {
            "operationId": "createProject", "tags": ["projects"],
            "x-implementation-status": "proposed_not_implemented",
            "x-source-refs": [{"repository": "N1", "path": "AGENTS.md", "kind": "rule"}],
            "x-page-ids": ["N1:prototypen/portal.html"],
            "x-authorization": {"roles": ["team"], "scopes": ["projects:write"],
                                "tenant_binding": "membership", "ownership": "tenant", "mfa": "required", "approval_class": "draft"},
            "security": [{"BrowserSession": [], "CsrfToken": []}],
            "x-idempotency": {"required": True}}}}
    }


class PolicyTests(unittest.TestCase):
    def test_valid_scoped_mutation_then_missing_csrf(self):
        document = minimal_contract()
        self.assertEqual(contract.validate_document(document, {"N1:prototypen/portal.html"}), [])
        del document["paths"]["/v1/projects"]["post"]["security"][0]["CsrfToken"]
        self.assertTrue(any("CSRF" in error for error in contract.validate_document(document)))

    def test_inference_key_cannot_be_used_for_business_writes(self):
        document = minimal_contract()
        document["paths"]["/v1/projects"]["post"]["security"] = [{"ApiKey": []}]
        self.assertTrue(any("escapes" in error for error in contract.validate_document(document)))

    def test_runtime_claim_or_empty_operation_catalog_rejected(self):
        document = minimal_contract()
        document["paths"]["/v1/projects"]["post"]["x-implementation-status"] = "live"
        self.assertTrue(any("runtime" in error for error in contract.validate_document(document)))
        document["paths"] = {}
        self.assertTrue(any("Empty" in error for error in contract.validate_document(document)))

    def test_missing_policy_and_replay_guard_rejected(self):
        document = minimal_contract()
        op = document["paths"]["/v1/projects"]["post"]
        del op["x-authorization"]["tenant_binding"]
        del op["x-idempotency"]
        errors = contract.validate_document(document)
        self.assertTrue(any("authorization" in error for error in errors))
        self.assertTrue(any("replay" in error for error in errors))

    def test_missing_page_and_duplicate_operation_rejected(self):
        document = minimal_contract()
        document["paths"]["/v1/other"] = copy.deepcopy(document["paths"]["/v1/projects"])
        errors = contract.validate_document(document, set())
        self.assertTrue(any("duplicated" in error for error in errors))
        self.assertTrue(any("unknown page" in error for error in errors))

    def test_bundled_reference_resolution_and_external_reference_rejection(self):
        document = {"components": {"schemas": {"a/b~c": {"type": "string"}}},
                    "good": {"$ref": "#/components/schemas/a~1b~0c"}}
        self.assertEqual(contract.local_references(document), [])
        document["bad"] = {"$ref": "https://example.invalid/schema.json"}
        document["missing"] = {"$ref": "#/components/schemas/nope"}
        self.assertEqual(len(contract.local_references(document)), 2)

    def test_explicit_security_and_known_scheme_required(self):
        document = minimal_contract()
        op = document["paths"]["/v1/projects"]["post"]
        op["security"] = [{}]
        self.assertTrue(any("empty security" in error for error in contract.validate_document(document)))
        op["security"] = [{"UnknownCredential": []}]
        self.assertTrue(any("undefined" in error for error in contract.validate_document(document)))

    def test_privileged_route_cannot_self_declare_public(self):
        document = minimal_contract()
        document["paths"]["/v1/projects"]["post"]["security"] = []
        document["x-public-operation-ids"] = ["createProject"]
        self.assertTrue(any("unexpectedly public" in error for error in contract.validate_document(document)))

    def test_http_bearer_api_key_is_also_restricted(self):
        document = minimal_contract()
        document["components"]["securitySchemes"]["ApiKey"] = {"type": "http", "scheme": "bearer"}
        document["paths"]["/v1/projects"]["post"]["security"] = [{"ApiKey": []}]
        self.assertTrue(any("escapes" in error for error in contract.validate_document(document)))

    def test_csrf_token_and_guest_token_cannot_replace_project_auth(self):
        for alternative in ({"CsrfToken": []}, {"GuestCapability": []}):
            document = minimal_contract()
            document["components"]["securitySchemes"]["GuestCapability"] = contract.SCHEME_CONTRACTS["GuestCapability"]
            document["paths"]["/v1/projects"]["post"]["security"] = [alternative]
            with self.subTest(alternative=alternative):
                self.assertTrue(contract.validate_document(document))

    def test_renamed_or_transport_changed_scheme_is_unreviewed(self):
        document = minimal_contract()
        document["components"]["securitySchemes"]["Credential"] = document["components"]["securitySchemes"].pop("ApiKey")
        document["paths"]["/v1/projects"]["post"]["security"] = [{"Credential": []}]
        self.assertTrue(any("Unreviewed" in error for error in contract.validate_document(document)))
        document = minimal_contract()
        document["components"]["securitySchemes"]["BrowserSession"]["in"] = "header"
        self.assertTrue(any("Unreviewed" in error for error in contract.validate_document(document)))

    def test_coverage_recomputed_from_page_capabilities(self):
        document = minimal_contract()
        op = document["paths"]["/v1/projects"]["post"]
        op["x-capabilities"] = ["projects.create"]
        document["x-capability-coverage"] = {"catalog_capabilities": ["projects.create"]}
        catalog = {"domain_vocabulary": ["projects"], "pages": [{"derived": {"proposed_required_operations": ["projects.create"]}}]}
        self.assertEqual(contract.validate_coverage(document, catalog), [])
        op["x-capabilities"] = []
        self.assertTrue(any("lack an operation" in error for error in contract.validate_coverage(document, catalog)))


class SourceTests(unittest.TestCase):
    def test_published_media_paths_cannot_normalize_to_foreign_origins(self):
        document = json.loads((ROOT / "docs/contracts/factory.openapi.json").read_text())
        schemas = document["components"]["schemas"]
        tested = 0
        for name, schema in schemas.items():
            path = schema.get("properties", {}).get("content_path")
            if path is None:
                continue
            tested += 1
            pattern = re.compile(path["pattern"])
            self.assertIsNotNone(pattern.fullmatch("/media/hero/nex/v1/clip.mp4"))
            for attack in ("/\\evil.example/video.mp4", "/\n/evil.example/video.mp4", "//evil.example/video.mp4",
                           "/\r\n/evil.example/video.mp4", "/\x00/evil.example", "/ /evil.example", "/video?secret=x",
                           "/media/../private/clip.mp4", "/media/%2e%2e/private", "/media/clip.mp4\n"):
                with self.subTest(schema=name, attack=repr(attack)):
                    self.assertIsNone(pattern.fullmatch(attack))
        self.assertGreaterEqual(tested, 4, "All published player artifact types need a bounded content path")

    def test_bundled_contract_and_catalog_policies(self):
        document = json.loads((ROOT / "docs/contracts/factory.openapi.json").read_text())
        catalog = json.loads((ROOT / "docs/contracts/prototype-pages.json").read_text())
        media = json.loads((ROOT / "docs/contracts/hero-media.json").read_text())
        media_plan = json.loads((ROOT / "docs/contracts/hero-production-plan.json").read_text())
        self.assertEqual(contract.validate_document(document, {p["page_id"] for p in catalog["pages"]}), [])
        self.assertEqual(contract.validate_coverage(document, catalog), [])
        self.assertEqual(contract.validate_media(media), [])
        self.assertEqual(contract.validate_media_plan(media_plan), [])

    def test_presenter_cannot_bypass_media_rejection(self):
        presenter = json.loads((ROOT / "config/presenter-system.json").read_text())
        media = json.loads((ROOT / "docs/contracts/hero-media.json").read_text())
        plan = json.loads((ROOT / "docs/contracts/hero-production-plan.json").read_text())
        self.assertEqual(contract.validate_presenter_contract(presenter, media, plan), [])
        for kind in ("approved", "generation", "voice", "source", "autoplay"):
            changed = copy.deepcopy(presenter)
            if kind == "approved":
                changed["source_reconciliation"]["historical_ids_are_approved"] = True
            elif kind == "generation":
                changed["source_reconciliation"]["generation_allowed"] = True
            elif kind == "voice":
                changed["speakers"]["aifly"]["voice_status"] = "approved"
            elif kind == "source":
                changed["source_reconciliation"]["confirmed_rejection_source"] = "different"
            else:
                changed["behavior"]["automatic_audio"] = True
            with self.subTest(kind=kind):
                self.assertTrue(contract.validate_presenter_contract(changed, media, plan))

    def test_media_plan_rejects_missing_locale_and_shared_aifly_decision(self):
        plan = json.loads((ROOT / "docs/contracts/hero-production-plan.json").read_text())
        del plan["jobs"][0]["script_drafts"]["fr"]
        next(job for job in plan["jobs"] if job["participant_slot"] == "aifly")["voice_assignment_status"] = "shared"
        errors = contract.validate_media_plan(plan)
        self.assertTrue(any("scripts incomplete" in error for error in errors))
        self.assertTrue(any("distinct-voice" in error for error in errors))

    def test_media_scripts_require_nonblank_strings_for_each_locale_and_presenter(self):
        original = json.loads((ROOT / "docs/contracts/hero-production-plan.json").read_text())
        for slot in range(4):
            for locale in ("de", "nl", "fr"):
                for value in (None, True, 42, 1.5, {}, [], " ", "\t\n"):
                    with self.subTest(slot=slot, locale=locale, value=value):
                        plan = copy.deepcopy(original)
                        scripts = (plan["voice_casting"]["comparison_script"] if slot == 0
                                   else plan["jobs"][slot - 1]["script_drafts"])
                        scripts[locale] = value
                        self.assertTrue(any("scripts incomplete" in e for e in contract.validate_media_plan(plan)))
        self.assertEqual(contract.validate_media_plan(original), [])

    def test_media_script_containers_are_objects_not_coerced_values(self):
        original = json.loads((ROOT / "docs/contracts/hero-production-plan.json").read_text())
        for slot in range(4):
            for value in (None, True, 42, [], "de,nl,fr"):
                with self.subTest(slot=slot, value=value):
                    plan = copy.deepcopy(original)
                    if slot == 0: plan["voice_casting"]["comparison_script"] = value
                    else: plan["jobs"][slot - 1]["script_drafts"] = value
                    self.assertTrue(any("scripts incomplete" in e for e in contract.validate_media_plan(plan)))

    def test_historical_voices_cannot_be_silently_approved_or_generated(self):
        plan = json.loads((ROOT / "docs/contracts/hero-production-plan.json").read_text())
        for field in ("historical_ids_are_approved", "generation_allowed"):
            changed = copy.deepcopy(plan)
            changed["source_reconciliation"][field] = True
            self.assertTrue(any("original-source conflict" in e for e in contract.validate_media_plan(changed)))
        del plan["source_reconciliation"]
        self.assertTrue(any("original-source conflict" in e for e in contract.validate_media_plan(plan)))

    def test_real_private_operation_loses_tenant_binding_or_deny_policy(self):
        document = json.loads((ROOT / "docs/contracts/factory.openapi.json").read_text())
        op = document["paths"]["/v1/projects"]["get"]
        op["parameters"] = []
        op["x-authorization"]["deny_by_default"] = False
        errors = contract.validate_document(document)
        self.assertTrue(any("selector" in error for error in errors))
        self.assertTrue(any("deny-by-default" in error for error in errors))

    def test_real_git_enumeration_detects_omission_and_hash_drift(self):
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
            root = Path(tmp)
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            (root / "one.html").write_text("<title>One</title>")
            subprocess.run(["git", "-C", str(root), "add", "one.html"], check=True)
            page = {"repository": "N1", "path": "one.html", "page_id": "N1:one.html",
                    "sha256": hashlib.sha256((root / "one.html").read_bytes()).hexdigest(),
                    "purpose": {"text": "One"}, "derived": {"domains": ["content"]}}
            catalog = {"pages": [page], "coverage": {"html_catalogued": 1}}
            self.assertEqual(contract.validate_catalog(catalog, {"N1": root}), [])
            (root / "one.html").write_text("<title>Changed</title>")
            self.assertTrue(any("hash mismatch" in error for error in contract.validate_catalog(catalog, {"N1": root})))
            (root / "two.html").write_text("<title>Two</title>")
            subprocess.run(["git", "-C", str(root), "add", "two.html"], check=True)
            self.assertTrue(any("omits" in error for error in contract.validate_catalog(catalog, {"N1": root})))

    def test_path_traversal_and_symlink_escape_rejected(self):
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
            root = Path(tmp) / "repo"
            root.mkdir()
            outside = Path(tmp) / "private"
            outside.write_text("not contract data")
            (root / "linked.html").symlink_to(outside)
            for relative in ("../private", str(outside), "linked.html"):
                with self.subTest(path=relative), self.assertRaises(ValueError):
                    contract.source_path(root, relative)


if __name__ == "__main__":
    unittest.main()
