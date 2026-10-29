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
