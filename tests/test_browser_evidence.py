"""Saved source-bound fixtures only; these tests do not run a browser."""
import copy
import hashlib
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



ALT_SHOP_RETIRED = (
    "Alt-Shop, stillgelegt (OF-11, 2026-11-09, Freigabe Pascal Courbois): prueft den SQLite-Warenkorb, "
    "persistent_objects {cart: 7} und /api/shop/cart-POST des Alt-Shops. Ersetzt durch "
    "check_shop_ui_mock_evidence / check_catalog_ui_mock_evidence (ShopUiMockEvidenceTests, "
    "CatalogUiMockEvidenceTests unten). Code und Alt-Nachweis bleiben unveraendert erhalten."
)


@unittest.skip(ALT_SHOP_RETIRED)
class ShopEvidenceTests(unittest.TestCase):
    """ALT-SHOP, STILLGELEGT: nicht im laufenden Gate."""
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


@unittest.skip(ALT_SHOP_RETIRED)
class CatalogBrowserEvidenceTests(unittest.TestCase):
    """ALT-SHOP, STILLGELEGT: nicht im laufenden Gate."""
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


class MockUiEvidenceMixin:
    """Neuer Shop (OF-11): strenge Pruefung der gemockten Browsernachweise.

    Gespeicherte Belege und Quellen werden in ein Temporaerverzeichnis gespiegelt;
    es startet kein Browser und der Repository-Stand wird nie veraendert.
    """
    check_name = evidence_path = source_paths = checks = overflow_check = script = prefix = None
    effect_flags = ()
    read_only = False

    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        for relative in (*self.source_paths, self.evidence_path):
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / relative).read_bytes())
        self.report = json.loads((self.root / self.evidence_path).read_text())

    def run_check(self):
        return getattr(checker, self.check_name)(self.root)

    def write(self, report=None):
        (self.root / self.evidence_path).write_text(json.dumps(self.report if report is None else report))

    def fails(self, pattern):
        self.write()
        with self.assertRaisesRegex(checker.EvidenceError, pattern):
            self.run_check()

    def test_current_evidence_passes_read_only_and_is_labelled_mock(self):
        before = {str(f.relative_to(self.root)): f.read_bytes() for f in self.root.rglob("*") if f.is_file()}
        result = self.run_check()
        self.assertEqual(result["checks"], len(self.checks))
        self.assertIs(result["mock"], True)
        self.assertIs(result["production_data"], False)
        self.assertIn("mock", result["scope"])
        after = {str(f.relative_to(self.root)): f.read_bytes() for f in self.root.rglob("*") if f.is_file()}
        self.assertEqual(before, after)
        self.assertTrue(set(self.checks).issubset(self.report["checks"]))

    def test_missing_or_duplicated_check_and_unpassed_recording_are_rejected(self):
        for identifier in self.checks:
            with self.subTest(check=identifier):
                self.report = json.loads((ROOT / self.evidence_path).read_text())
                self.report["checks"].remove(identifier)
                self.fails(self.prefix + "_(390px_overflow_check|critical_check)_missing")
        self.report = json.loads((ROOT / self.evidence_path).read_text())
        self.report["checks"].append(self.report["checks"][0])
        self.fails(self.prefix + "_critical_check_missing")
        self.report = json.loads((ROOT / self.evidence_path).read_text())
        self.report["passed"] = False
        self.fails(self.prefix + "_recorded_pass_required")

    def test_390px_overflow_check_must_be_present_and_measured_by_the_bound_script(self):
        self.report["checks"].remove(self.overflow_check)
        self.fails(self.prefix + "_390px_overflow_check_missing")
        self.report = json.loads((ROOT / self.evidence_path).read_text())
        script = self.root / self.script
        raw = script.read_bytes()
        for probe in checker.SHOP_UI_MOCK_OVERFLOW_PROBES:
            self.assertIn(probe, raw)
            script.write_bytes(raw.replace(probe, b"/* removed */"))
            self.report["source_sha256"][self.script] = hashlib.sha256(script.read_bytes()).hexdigest()
            self.fails(self.prefix + "_390px_overflow_probe_missing_in_bound_script")
        script.write_bytes(raw)

    def test_mock_and_production_data_flags_are_mandatory(self):
        for key, value in (("mock", False), ("mock", None), ("production_data", True),
                           ("production_data", None), ("server_code_executed", True)):
            with self.subTest(key=key, value=value):
                self.report = json.loads((ROOT / self.evidence_path).read_text())
                if value is None:
                    self.report.pop(key)
                else:
                    self.report[key] = value
                self.fails(self.prefix + "_(mock_true|production_data_false)_required")
        self.report = json.loads((ROOT / self.evidence_path).read_text())
        self.report["mock_label"] = "echte Produktivdaten"
        self.fails(self.prefix + "_mock_label_required")

    def test_source_drift_in_every_bound_file_is_rejected(self):
        self.assertEqual(self.report["source_sha256"].keys(), set(self.source_paths))
        for relative in self.source_paths:
            with self.subTest(source=relative):
                path = self.root / relative
                original = path.read_bytes()
                path.write_bytes(original + b"\n/* changed source */\n")
                with self.assertRaisesRegex(checker.EvidenceError, "stale_" + self.prefix + "_source_sha256: " + relative):
                    self.run_check()
                path.write_bytes(original)

    def test_source_set_and_hash_format_are_exact_and_not_artifact_controlled(self):
        self.report["source_sha256"]["../../outside-repository"] = "0" * 64
        self.fails(self.prefix + "_exact_source_path_set_required")
        self.report = json.loads((ROOT / self.evidence_path).read_text())
        self.report["source_sha256"].pop(self.source_paths[0])
        self.fails(self.prefix + "_exact_source_path_set_required")
        self.report = json.loads((ROOT / self.evidence_path).read_text())
        self.report["source_sha256"][self.source_paths[0]] = "XYZ"
        self.fails("invalid_" + self.prefix + "_source_sha256")

    def test_external_requests_and_page_errors_are_rejected(self):
        for key, value in (("external_requests", ["https://evil.example"]), ("page_errors", ["boom"]),
                           ("external_requests", None)):
            with self.subTest(key=key):
                self.report = json.loads((ROOT / self.evidence_path).read_text())
                if value is None:
                    self.report.pop(key)
                else:
                    self.report[key] = value
                self.fails(self.prefix + "_external_request_or_page_error")

    def test_payment_and_order_claims_must_stay_false(self):
        for flag in self.effect_flags:
            for value in (True, None):
                with self.subTest(flag=flag, value=value):
                    self.report = json.loads((ROOT / self.evidence_path).read_text())
                    if value is None:
                        self.report.pop(flag)
                    else:
                        self.report[flag] = value
                    self.fails(self.prefix + "_effect_boundaries_required")

    def test_requests_must_show_the_real_mock_boundary_and_nothing_outside_it(self):
        self.report["requests"] = []
        self.fails(self.prefix + "_actual_http_boundary_missing")
        self.report = json.loads((ROOT / self.evidence_path).read_text())
        required = (checker.CATALOG_UI_MOCK_REQUIRED_REQUESTS if self.read_only
                    else checker.SHOP_UI_MOCK_REQUIRED_REQUESTS)
        for method, path, status in required:
            with self.subTest(missing=(method, path, status)):
                self.report = json.loads((ROOT / self.evidence_path).read_text())
                self.report["requests"] = [r for r in self.report["requests"]
                                           if (r["method"], r["path"], r["status"]) != (method, path, status)]
                self.fails(self.prefix + "_actual_http_boundary_missing")
        for row in ({"method": "GET", "path": "https://api.example/x", "status": 200, "count": 1},
                    {"method": "DELETE", "path": "/api/shop/cart", "status": 200, "count": 1},
                    {"method": "GET", "path": "/api/shop/cart", "status": "200", "count": 1},
                    {"method": "GET", "path": "/api/shop/cart", "status": 200, "count": 0}):
            with self.subTest(row=row):
                self.report = json.loads((ROOT / self.evidence_path).read_text())
                self.report["requests"].append(row)
                self.fails(self.prefix + "_invalid_request_row")

    def test_a_mutation_outside_the_mock_contract_is_rejected(self):
        self.report["requests"].append({"method": "POST", "path": "/api/shop/cart/checkout-draft", "status": 200, "count": 1})
        self.fails(self.prefix + "_(mutation_outside_mock_contract|write_request_in_read_only_browse)")

    def test_local_answer_counters_must_be_non_negative_integers(self):
        self.report["supplier_image_requests_answered_locally"] = -1
        self.fails(self.prefix + "_invalid_local_counter")
        self.report = json.loads((ROOT / self.evidence_path).read_text())
        self.report["supplier_image_requests_answered_locally"] = True
        self.fails(self.prefix + "_invalid_local_counter")

    def test_duplicate_json_keys_are_rejected(self):
        raw = (self.root / self.evidence_path).read_text()
        (self.root / self.evidence_path).write_text(raw.replace('"passed": true,', '"passed": true, "passed": true,', 1))
        with self.assertRaisesRegex(checker.EvidenceError, "invalid_evidence_or_site_map_json"):
            self.run_check()


class ShopUiMockEvidenceTests(MockUiEvidenceMixin, unittest.TestCase):
    check_name = "check_shop_ui_mock_evidence"
    evidence_path = checker.SHOP_UI_MOCK_EVIDENCE_PATH
    source_paths = checker.SHOP_UI_MOCK_SOURCE_PATHS
    checks = checker.SHOP_UI_MOCK_CHECKS
    overflow_check = checker.SHOP_UI_MOCK_OVERFLOW_CHECK
    script = "apps/site/tests/browser-shop.mjs"
    prefix = "shop_ui_mock"
    effect_flags = ("real_payment_started", "real_order_submitted")

    def test_exact_check_names_are_the_thirteen_recorded_by_the_script(self):
        self.assertEqual(len(self.checks), 13)
        script = (ROOT / self.script).read_text()
        for identifier in self.checks:
            self.assertIn("'" + identifier + "'", script)

    def test_payment_hand_over_counter_is_required(self):
        self.report.pop("payment_page_navigations_answered_locally")
        self.fails("shop_ui_mock_invalid_local_counter")


class CatalogUiMockEvidenceTests(MockUiEvidenceMixin, unittest.TestCase):
    check_name = "check_catalog_ui_mock_evidence"
    evidence_path = checker.CATALOG_UI_MOCK_EVIDENCE_PATH
    source_paths = checker.CATALOG_UI_MOCK_SOURCE_PATHS
    checks = checker.CATALOG_UI_MOCK_CHECKS
    overflow_check = checker.CATALOG_UI_MOCK_OVERFLOW_CHECK
    script = "apps/site/tests/browser-catalog.mjs"
    prefix = "catalog_ui_mock"
    effect_flags = ("order_started", "payment_started")
    read_only = True

    def test_exact_check_names_are_the_seven_recorded_by_the_script(self):
        self.assertEqual(len(self.checks), 7)
        script = (ROOT / self.script).read_text()
        for identifier in self.checks:
            self.assertIn("'" + identifier + "'", script)

    def test_browsing_may_not_write_at_all(self):
        self.report["requests"].append({"method": "POST", "path": "/api/shop/cart/items", "status": 200, "count": 1})
        self.fails("catalog_ui_mock_write_request_in_read_only_browse")


class RetiredAltShopGateTests(unittest.TestCase):
    def test_running_gate_uses_the_new_shop_checkers_and_not_the_retired_ones(self):
        import contextlib
        import io
        from unittest import mock
        for name in ("check_evidence", "check_public_fallbacks", "check_exception_evidence",
                     "check_consent_ui", "check_workspace_read"):
            patcher = mock.patch.object(checker, name, return_value={"status": "passed"})
            patcher.start()
            self.addCleanup(patcher.stop)
        for name in ("check_shop_evidence", "check_catalog_evidence"):
            patcher = mock.patch.object(checker, name, side_effect=AssertionError("retired Alt-Shop checker called"))
            patcher.start()
            self.addCleanup(patcher.stop)
        new = {name: mock.patch.object(checker, name, wraps=getattr(checker, name)).start()
               for name in ("check_shop_ui_mock_evidence", "check_catalog_ui_mock_evidence")}
        self.addCleanup(mock.patch.stopall)
        out = io.StringIO()
        with mock.patch("sys.argv", ["check_browser_evidence.py", "--root", str(ROOT)]), contextlib.redirect_stdout(out):
            self.assertEqual(checker.main(), 0)
        for patched in new.values():
            patched.assert_called_once()
        printed = json.loads(out.getvalue())
        self.assertEqual(printed["shop"]["checks"], 13)
        self.assertEqual(printed["catalog"]["checks"], 7)

    def test_retired_checkers_and_alt_evidence_stay_in_the_repository(self):
        self.assertTrue(callable(checker.check_shop_evidence) and callable(checker.check_catalog_evidence))
        self.assertIn("STILLGELEGT", checker.check_shop_evidence.__doc__)
        self.assertIn("STILLGELEGT", checker.check_catalog_evidence.__doc__)
        for relative in (checker.SHOP_EVIDENCE_PATH, checker.CATALOG_EVIDENCE_PATH):
            self.assertTrue((ROOT / relative).is_file(), relative)


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
        for relative in (*checker.CONSENT_UI_SOURCES,*checker.LOCALE_BRIDGE_SOURCES,*checker.NEXT_CONSENT_SOURCES,checker.CONSENT_UI_PATH,checker.LOCALE_BRIDGE_PATH,checker.NEXT_CONSENT_PATH,'config/site-map.json'):
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
        report.pop('internal_mail_api_auth_required_401',None);path.write_text(json.dumps(report))
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
