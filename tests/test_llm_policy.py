"""Config-only regression guard; never calls a model, provider or secret store."""
import copy
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("managed_llm_policy_checker", ROOT / "tools/check_llm_policy.py")
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)


class ManagedLLMPolicyTests(unittest.TestCase):
    def setUp(self):
        self.configs = checker.load_configs(ROOT)

    def test_current_bindings_match_literal_instruction_and_keep_customer_byok_separate(self):
        result = checker.validate(self.configs)
        self.assertEqual(result["model"], "deepseek/deepseek-v4.1-flash-1017")
        self.assertEqual(result["reasoning_effort"], "high")
        self.assertEqual(result["scope"], "managed_config_binding_only_not_live_verification")
        self.assertEqual(result["customer_byok"], "separate_explicit_selection_preserved")

    def test_llm_diff_excluded_globs_is_the_only_extra_ci_review_key_and_is_shape_checked(self):
        review = self.configs[checker.SOURCES[1]]["ai_review"]
        self.assertEqual(review["llm_diff_excluded_globs"], ["evidence/**"])
        for mutate in (lambda r: r.update(unknown_key=True), lambda r: r.update(llm_diff_excluded_globs="evidence/**"),
                       lambda r: r.update(llm_diff_excluded_globs=[1]), lambda r: r.update(llm_diff_excluded_globs=["a/**"] * 6)):
            configs = copy.deepcopy(self.configs); mutate(configs[checker.SOURCES[1]]["ai_review"])
            with self.assertRaises(checker.PolicyError): checker.validate(configs)
        configs = copy.deepcopy(self.configs); del configs[checker.SOURCES[1]]["ai_review"]["llm_diff_excluded_globs"]
        checker.validate(configs)

    def test_model_suffix_reasoning_drift_and_missing_website_scope_are_rejected(self):
        mutations = (
            lambda c: c[checker.SOURCES[1]]["ai_review"].update(exact_model_id="deepseek/deepseek-v4.1-flash-1018"),
            lambda c: c[checker.SOURCES[2]]["llm"]["managed_route"].update(deepseek_reasoning_effort="low"),
            lambda c: c[checker.SOURCES[3]]["modelle"]["managed"].update(reasoning_effort="low"),
            lambda c: c[checker.SOURCES[4]]["stufen"][0].update(modell="local/free-tier-zero"),
            lambda c: c[checker.SOURCES[4]]["kontext"].update(reasoning_effort="low"),
            lambda c: c[checker.SOURCES[0]]["applies_to"].remove("website_live_chat"),
        )
        for index, mutate in enumerate(mutations):
            with self.subTest(mutation=index):
                configs = copy.deepcopy(self.configs); mutate(configs)
                with self.assertRaises(checker.PolicyError): checker.validate(configs)

    def test_provider_route_target_is_ordered_gated_and_not_a_runtime_binding(self):
        target = self.configs[checker.SOURCES[0]]["provider_route_target_2026_11_10"]
        self.assertEqual(target["provider_order"], ["OpenRouter", "DeepSeek_API"])
        self.assertEqual(target["gateway"], "9router_only")
        self.assertIsNone(target["router_combo_runtime_id"])
        self.assertIsNone(target["router_provider_ids"])
        self.assertFalse(target["automatic_activation"])
        mutations = (
            lambda x: x.update(provider_order=["DeepSeek_API", "OpenRouter"]),
            lambda x: x.update(gateway="direct_provider"),
            lambda x: x.update(direct_provider_bypass_allowed=True),
            lambda x: x.update(router_combo_runtime_id="unverified-combo"),
            lambda x: x.update(router_provider_ids=["unverified"]),
            lambda x: x.update(fallback_model_version_required="DeepSeek-V4-Pro"),
            lambda x: x.update(automatic_activation=True),
            lambda x: x.update(automatic_activation=0),
            lambda x: x.update(blind_retry_after_unknown_outcome_allowed=True),
            lambda x: x["pre_activation_checks"].remove("budget_rate_and_funding_controls"),
            lambda x: x["pre_activation_checks"].remove("tenant_and_owner_binding"),
            lambda x: x["pre_activation_checks"].remove("fallback_alias_current_version_and_capabilities"),
            lambda x: x.update(claude_ai_target=True),
        )
        for index, mutate in enumerate(mutations):
            with self.subTest(mutation=index):
                configs = copy.deepcopy(self.configs)
                mutate(configs[checker.SOURCES[0]]["provider_route_target_2026_11_10"])
                with self.assertRaisesRegex(checker.PolicyError, "managed_router_target_or_migration_guard_mismatch"):
                    checker.validate(configs)

    def test_reenabled_fallback_replacement_free_tier_and_blind_retry_are_rejected(self):
        mutations = (
            lambda c: c[checker.SOURCES[0]]["routing"].update(silent_model_fallback=True),
            lambda c: c[checker.SOURCES[0]]["routing"].update(silent_reasoning_downgrade=True),
            lambda c: c[checker.SOURCES[3]]["modelle"]["ersatz"].update(managed="another/model"),
            lambda c: c[checker.SOURCES[3]]["modelle"].update(tier0="local/free"),
            lambda c: c[checker.SOURCES[4]]["hochstufen"].update(aktiv=True),
            lambda c: c[checker.SOURCES[4]]["stufen"][0].update(preisquelle="gratis"),
            lambda c: c[checker.SOURCES[4]]["wiederholung"].update(versucheJeSchritt=2),
            lambda c: c[checker.SOURCES[2]]["llm"]["byok"].update(platform_fallback_on_missing_invalid_or_exhausted_key=True),
        )
        for index, mutate in enumerate(mutations):
            with self.subTest(mutation=index):
                configs = copy.deepcopy(self.configs); mutate(configs)
                with self.assertRaises(checker.PolicyError): checker.validate(configs)

    def test_product_enrichment_use_case_is_pinned_without_fallback(self):
        enrichment = self.configs[checker.SOURCES[0]]["use_cases"]["product_enrichment"]
        self.assertEqual((enrichment["model"]["id"], enrichment["model"]["reasoning_effort"]), ("ds/deepseek-v4-pro", "high"))
        mutations = (
            lambda c: c[checker.SOURCES[0]]["use_cases"]["product_enrichment"]["model"].update(id="ds/deepseek-v4.1-flash"),
            lambda c: c[checker.SOURCES[0]]["use_cases"]["product_enrichment"]["model"].update(reasoning_effort="low"),
            lambda c: c[checker.SOURCES[0]]["use_cases"]["product_enrichment"].update(silent_model_fallback=True),
            lambda c: c[checker.SOURCES[4]]["anwendungsfaelle"]["product_enrichment"].update(modell="cx/gpt-6-luna"),
            lambda c: c[checker.SOURCES[0]].pop("use_cases"),
        )
        for index, mutate in enumerate(mutations):
            with self.subTest(mutation=index):
                configs = copy.deepcopy(self.configs); mutate(configs)
                with self.assertRaises(checker.PolicyError): checker.validate(configs)


    def test_coordinated_policy_and_all_binding_tampering_cannot_rewrite_user_instruction(self):
        configs = copy.deepcopy(self.configs)
        wrong = "deepseek/deepseek-v4.1-flash-1018"
        policy = configs[checker.SOURCES[0]]
        policy["model"].update(id=wrong, reasoning_effort="low")
        configs[checker.SOURCES[1]]["ai_review"].update(exact_model_id=wrong, reasoning_effort="low")
        configs[checker.SOURCES[2]]["llm"]["managed_route"].update(deepseek_model_id=wrong, deepseek_reasoning_effort="low")
        configs[checker.SOURCES[3]]["modelle"]["managed"].update(id=wrong, reasoning_effort="low")
        for tier in configs[checker.SOURCES[4]]["stufen"]: tier.update(modell=wrong, reasoning_effort="low")
        configs[checker.SOURCES[4]]["kontext"].update(verdichtenMit=wrong, reasoning_effort="low")
        with self.assertRaisesRegex(checker.PolicyError, "literal_user_model_or_effort_mismatch"):
            checker.validate(configs)

    def test_unknown_source_and_embedded_paths_cannot_select_files_for_validation(self):
        configs = copy.deepcopy(self.configs)
        configs["../../outside-repository"] = configs.pop(checker.SOURCES[0])
        with patch.object(Path, "read_bytes", side_effect=AssertionError("validate must not read files")):
            with self.assertRaisesRegex(checker.PolicyError, "exact_five_config_sources_required"):
                checker.validate(configs)
            clean = copy.deepcopy(self.configs)
            clean[checker.SOURCES[3]]["modelle"]["policy"] = "../../outside-repository"
            with self.assertRaisesRegex(checker.PolicyError, "fixed_brain_policy_reference_required"):
                checker.validate(clean)


if __name__ == "__main__":
    unittest.main()
