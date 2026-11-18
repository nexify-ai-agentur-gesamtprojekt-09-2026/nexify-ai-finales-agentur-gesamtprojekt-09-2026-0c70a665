"""Prueft das Register der Selbstkonfiguration: gebunden, ableitbar, begrenzt."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "selbstkonfiguration", ROOT / "tools/check_selbstkonfiguration.py")
register_check = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(register_check)


class SelbstkonfigurationTests(unittest.TestCase):
    def setUp(self):
        self.register = json.loads((ROOT / register_check.REGISTER).read_text(encoding="utf-8"))

    def mutated(self, **changes):
        register = copy.deepcopy(self.register)
        register.update(changes)
        return register

    def test_register_is_bound_to_existing_sources_and_decisions(self):
        self.assertEqual(register_check.validate(self.register, ROOT), [])

    def test_decision_d_023_is_recorded_with_interaction(self):
        decisions = (ROOT / "DECISIONS.md").read_text(encoding="utf-8")
        self.assertIn("## D-023", decisions)
        self.assertIn(self.register["authority"]["interaction"], decisions)

    def test_missing_source_file_fails(self):
        register = copy.deepcopy(self.register)
        register["sources"][0]["path"] = "docs/automation/gibt-es-nicht.md"
        self.assertTrue(any("Quelle fehlt" in e for e in register_check.validate(register, ROOT)))

    def test_agents_and_decisions_must_be_required_sources(self):
        register = copy.deepcopy(self.register)
        for source in register["sources"]:
            source["required"] = False
        self.assertTrue(any("Pflichtquellen" in e for e in register_check.validate(register, ROOT)))

    def test_derivation_rule_with_unknown_source_fails(self):
        register = copy.deepcopy(self.register)
        register["derivation_rules"][0]["from"] = ["S99"]
        self.assertTrue(any("unbekannte Quelle" in e for e in register_check.validate(register, ROOT)))

    def test_derivation_rule_without_source_fails(self):
        register = copy.deepcopy(self.register)
        register["derivation_rules"][0]["from"] = []
        self.assertTrue(any("nennt keine Quelle" in e for e in register_check.validate(register, ROOT)))

    def test_limit_must_point_to_recorded_decision(self):
        register = copy.deepcopy(self.register)
        register["limits"][0]["from"] = "DECISIONS.md#D-999"
        self.assertTrue(any("D-999" in e for e in register_check.validate(register, ROOT)))

    def test_gate_must_point_to_existing_tool(self):
        register = copy.deepcopy(self.register)
        register["gates"][0]["command"] = "python3 tools/gibt-es-nicht.py"
        self.assertTrue(any("fehlendes Werkzeug" in e for e in register_check.validate(register, ROOT)))

    def test_goal_automation_may_not_merge_or_deploy_automatically(self):
        for field in ("automatic_main_merge", "automatic_production_deployment"):
            register = copy.deepcopy(self.register)
            register["goal_automation"][field] = True
            with self.subTest(field=field):
                self.assertTrue(any("automatisch" in e for e in register_check.validate(register, ROOT)))

    def test_goal_automation_needs_steps_and_stop_conditions(self):
        register = copy.deepcopy(self.register)
        register["goal_automation"]["steps"] = ["nur ein Schritt"]
        self.assertTrue(any("fuenf Schritte" in e for e in register_check.validate(register, ROOT)))
        register = copy.deepcopy(self.register)
        register["goal_automation"]["stop_conditions"] = ["eine Bedingung"]
        self.assertTrue(any("Haltebedingung" in e for e in register_check.validate(register, ROOT)))

    def test_secret_pattern_is_rejected(self):
        register = self.mutated()
        register["scope"]["applies_to"] = register["scope"]["applies_to"] + ["sk-" + "a" * 24]
        self.assertTrue(any("Secret" in e for e in register_check.validate(register, ROOT)))

    def test_missing_top_level_field_fails(self):
        register = self.mutated()
        del register["gates"]
        self.assertTrue(any("Pflichtfeld fehlt: gates" in e for e in register_check.validate(register, ROOT)))


if __name__ == "__main__":
    unittest.main()
