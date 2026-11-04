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
    def test_identity_composition_drift_invalidates_the_saved_browser_pass(self):
        for relative in ('apps/web/components/IdentityHero.tsx','apps/web/components/IdentityHero.css',
                         'config/identity-hero.json','apps/site/tests/browser-identity-hero.mjs'):
            path=self.root/relative;old=path.read_bytes();path.write_bytes(old+b'\n')
            with self.assertRaisesRegex(checker.EvidenceError,'stale_auxiliary_source_sha256'):
                checker.check_evidence(self.root)
            path.write_bytes(old)
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



class LiveShopEvidenceBase:
    """Shared negative cases for the live shop-api browser contract (D-010)."""
    sources = path = check = prefix = None

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        for relative in (*self.sources, self.path):
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / relative).read_bytes())
        self.report = json.loads((self.root / self.path).read_text())

    def write(self, report=None):
        (self.root / self.path).write_text(json.dumps(self.report if report is None else report))

    def rejected(self, pattern, mutate):
        report = copy.deepcopy(self.report)
        mutate(report)
        self.write(report)
        with self.assertRaisesRegex(checker.EvidenceError, pattern):
            self.check(self.root)
        self.write()

    def test_every_bound_source_change_invalidates_the_saved_pass(self):
        for relative in self.sources:
            path = self.root / relative
            original = path.read_bytes()
            path.write_bytes(original + b"\n/* changed */")
            with self.assertRaisesRegex(checker.EvidenceError, "stale_" + self.prefix + "_source_sha256: " + relative):
                self.check(self.root)
            path.write_bytes(original)

    def test_source_set_must_be_exact_and_hashes_well_formed(self):
        first = self.sources[0]
        self.rejected("exact_source_path_set_required", lambda r: r["source_sha256"].pop(first))
        self.rejected("exact_source_path_set_required", lambda r: r["source_sha256"].update({"apps/web/components/ShopPanel.tsx": "0" * 64}))
        self.rejected("invalid_source_sha256", lambda r: r["source_sha256"].update({first: "not-a-hash"}))
        self.rejected("stale_" + self.prefix, lambda r: r["source_sha256"].update({first: "0" * 64}))

    def test_unpassed_unsynthetic_or_duplicate_key_report_is_rejected(self):
        self.rejected("recorded_synthetic_pass_required", lambda r: r.update(passed=False))
        self.rejected("recorded_synthetic_pass_required", lambda r: r.pop("synthetic_data"))
        (self.root / self.path).write_text('{"passed": true, "passed": true}')
        with self.assertRaisesRegex(checker.EvidenceError, "invalid_evidence"):
            self.check(self.root)

    def test_each_required_check_is_mandatory(self):
        for name in sorted(self.required):
            self.rejected("critical_check_missing", lambda r, name=name: r["checks"].remove(name))
        self.rejected("critical_check_missing", lambda r: r["checks"].append(r["checks"][0]))

    def test_each_required_http_boundary_is_mandatory(self):
        for method, path, status in sorted(self.boundaries, key=str):
            def drop(report, key=(method, path, status)):
                report["requests"] = [row for row in report["requests"] if (row["method"], row["path"], row["status"]) != key]
            self.rejected("actual_http_boundary_missing", drop)
        self.rejected("actual_http_boundary_missing", lambda r: r.update(requests=[]))
        self.rejected("invalid_request_row", lambda r: r["requests"].append({"method": "GET", "path": "/api/session", "status": 200}))

    def test_order_payment_external_or_uncaught_effects_are_rejected(self):
        for path in ("/api/shop/orders", "/api/shop/webhooks/revolut"):
            self.rejected("order_or_payment_reached_server", lambda r, path=path: r["requests"].append({"method": "POST", "path": path, "status": 200}))
        self.rejected("no_external_or_uncaught", lambda r: r.update(external_requests=["https://cdnbigbuy.com"]))
        self.rejected("no_external_or_uncaught", lambda r: r.update(uncaught_errors=["TypeError"]))

    def test_report_must_name_the_real_adapter_runtime(self):
        self.rejected("real_adapter_runtime_required", lambda r: r["runtime"].update(backend="apps/agent-gateway/server.py"))
        self.rejected("real_adapter_runtime_required", lambda r: r["runtime"].pop("schema_probe"))


class ShopEvidenceTests(LiveShopEvidenceBase, unittest.TestCase):
    sources, path, prefix = checker.SHOP_SOURCE_PATHS, checker.SHOP_EVIDENCE_PATH, "shop"
    required, boundaries = checker.SHOP_CHECKS, checker.SHOP_BOUNDARIES
    check = staticmethod(checker.check_shop_evidence)

    def test_saved_shop_proof_is_bounded_and_current(self):
        self.assertEqual(checker.check_shop_evidence(self.root)["checks"], 8)
        self.assertIn("apps/shop-api/shop/cart_api.py", checker.SHOP_SOURCE_PATHS)
        self.assertNotIn("apps/web/components/ShopPanel.tsx", checker.SHOP_SOURCE_PATHS)

    def test_claimed_order_payment_or_provider_call_is_rejected(self):
        self.rejected("shop_effect_boundaries_required", lambda r: r.update(order_submitted=True))
        self.rejected("shop_effect_boundaries_required", lambda r: r.update(payment_started=None))
        self.rejected("shop_effect_boundaries_required", lambda r: r["server_effects"].update(orders=1))
        self.rejected("shop_effect_boundaries_required", lambda r: r["server_effects"].update(provider_calls=["create_order"]))
        self.rejected("shop_effect_boundaries_required", lambda r: r["server_effects"].update(mail_calls=["enqueue"]))

    def test_order_block_must_have_been_exercised(self):
        self.rejected("shop_order_block_not_exercised", lambda r: r.update(blocked_effect_requests=[]))
        self.rejected("shop_order_block_not_exercised", lambda r: r.update(blocked_effect_requests=[{"method": "GET", "path": "/api/shop/cart"}]))


class CatalogBrowserEvidenceTests(LiveShopEvidenceBase, unittest.TestCase):
    sources, path, prefix = checker.CATALOG_SOURCE_PATHS, checker.CATALOG_EVIDENCE_PATH, "catalog"
    required, boundaries = checker.CATALOG_CHECKS, checker.CATALOG_BOUNDARIES
    check = staticmethod(checker.check_catalog_evidence)

    def test_saved_catalog_proof_is_bounded_and_current(self):
        self.assertEqual(checker.check_catalog_evidence(self.root)["checks"], 6)
        self.assertNotIn("apps/agent-gateway/catalog.py", checker.CATALOG_SOURCE_PATHS)

    def test_supplier_image_block_must_have_been_exercised(self):
        self.rejected("supplier_image_block_not_exercised", lambda r: r.update(supplier_image_requests_blocked=0))
        self.rejected("supplier_image_block_not_exercised", lambda r: r.update(supplier_image_requests_blocked=True))

    def test_unconfigured_and_failed_connection_both_required(self):
        for status in (503, 502):
            def drop(report, status=status):
                report["requests"] = [row for row in report["requests"] if row["status"] != status]
            self.rejected("actual_http_boundary_missing", drop)


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


class ExceptionEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(); self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        for relative in (*checker.EXCEPTION_SOURCES, *(f'evidence/observability-integration-2026-10-28/browser-exceptions-{s}.json' for s in ('vite', 'next'))):
            target = self.root / relative; target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / relative).read_bytes())

    def test_source_drift_cannot_survive_consent_proof(self):
        self.assertEqual(checker.check_exception_evidence(self.root)['surfaces'], 2)
        path = self.root / 'apps/web/observability/exceptions.mjs'
        path.write_bytes(path.read_bytes() + b'\n/* changed transport */')
        with self.assertRaisesRegex(checker.EvidenceError, 'stale_exception_source'):
            checker.check_exception_evidence(self.root)

    def test_missing_retry_proof_or_claimed_external_event_rejected(self):
        path = self.root / 'evidence/observability-integration-2026-10-28/browser-exceptions-next.json'
        report = json.loads(path.read_text()); original = copy.deepcopy(report)
        report['checks'].pop(); path.write_text(json.dumps(report))
        with self.assertRaisesRegex(checker.EvidenceError, 'complete_surface'):
            checker.check_exception_evidence(self.root)
        original['external_events_sent'] = 1; path.write_text(json.dumps(original))
        with self.assertRaisesRegex(checker.EvidenceError, 'local_intercept_only'):
            checker.check_exception_evidence(self.root)


class ConsentUIEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory();self.addCleanup(self.folder.cleanup);self.root=Path(self.folder.name)
        for relative in (*checker.CONSENT_UI_SOURCES,*checker.NEXT_CONSENT_SOURCES,checker.CONSENT_UI_PATH,checker.NEXT_CONSENT_PATH,'config/site-map.json'):
            path=self.root/relative;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes((ROOT/relative).read_bytes())

    def test_current_consent_pass_is_bound_to_UI_source(self):
        self.assertEqual(checker.check_consent_ui(self.root)['ui_cases'],18)
        path=self.root/'apps/web/components/DiagnosticConsent.tsx';path.write_bytes(path.read_bytes()+b'\n/* changed choice */')
        with self.assertRaisesRegex(checker.EvidenceError,'stale_consent_source'):checker.check_consent_ui(self.root)

    def test_missing_mobile_case_or_claimed_external_send_rejected(self):
        path=self.root/checker.CONSENT_UI_PATH;report=json.loads(path.read_text());original=copy.deepcopy(report)
        report['checks'].pop();path.write_text(json.dumps(report))
        with self.assertRaisesRegex(checker.EvidenceError,'complete_matrix'):checker.check_consent_ui(self.root)
        original['external_events_sent']=1;path.write_text(json.dumps(original))
        with self.assertRaisesRegex(checker.EvidenceError,'local_no_errors'):checker.check_consent_ui(self.root)

    def test_mail_fail_closed_proof_cannot_be_omitted(self):
        path=self.root/checker.NEXT_CONSENT_PATH;report=json.loads(path.read_text())
        report.pop('internal_mail_api_denied_anonymous',None);path.write_text(json.dumps(report))
        with self.assertRaisesRegex(checker.EvidenceError,'internal_mail_fail_closed'):
            checker.check_consent_ui(self.root)

    def test_workspace_proof_rejects_drift_missing_negatives_and_mutating_reads(self):
        paths=(*checker.WORKSPACE_SOURCES,checker.WORKSPACE_PATH)
        for rel in paths:
            target=self.root/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/rel).read_bytes())
        self.assertEqual(checker.check_workspace_read(self.root)['cases'],4)
        source=self.root/'tools/app_backend.py';old=source.read_bytes();source.write_bytes(old+b'\n# drift\n')
        with self.assertRaisesRegex(checker.EvidenceError,'workspace_stale'):checker.check_workspace_read(self.root)
        source.write_bytes(old);path=self.root/checker.WORKSPACE_PATH;original=json.loads(path.read_text())
        for mutate in ('negative','state','external'):
            changed=copy.deepcopy(original)
            if mutate=='negative':changed['checks'][0]['negative_sessions']=0
            elif mutate=='state':changed['persistent_state_unchanged']=False
            else:changed['external']=['synthetic.invalid']
            path.write_text(json.dumps(changed))
            with self.assertRaises(checker.EvidenceError):checker.check_workspace_read(self.root)


if __name__ == "__main__":
    unittest.main()
