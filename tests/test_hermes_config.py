"""Hermes-Konfiguration: Bindung an config/llm-policy.json und das Einspielskript.

Offline und ohne Hermes: geprüft werden die Dateien unter ops/hermes, nicht ein Server.
"""
import copy
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import check_hermes_config as chc  # noqa: E402

SCRIPT = ROOT / "ops/hermes/einspielen.sh"
PIN = "bf0203a794a07aac3ff764972ab9087baa4e4f4e"


def load():
    config = chc.parse_yaml((ROOT / chc.CONFIG).read_text(encoding="utf-8"))
    policy = json.loads((ROOT / chc.POLICY).read_text(encoding="utf-8"))
    candidate = json.loads((ROOT / chc.CANDIDATE).read_text(encoding="utf-8"))
    env = (ROOT / chc.ENV_EXAMPLE).read_text(encoding="utf-8")
    return config, policy, candidate, env


class PolicyBinding(unittest.TestCase):
    def test_repository_config_matches_policy(self):
        result = chc.check()
        self.assertEqual(result["errors"], [])
        self.assertEqual(result["status"], "hermes_config_matches_policy_not_runtime_proof")
        self.assertEqual(result["provider_calls"], 0)

    def test_values_come_from_policy_not_from_literals(self):
        config, policy, _, _ = load()
        self.assertEqual(config["model"]["default"], policy["model"]["id"])
        self.assertEqual(config["agent"]["reasoning_effort"], policy["model"]["reasoning_effort"])
        self.assertEqual(config["model"]["provider"], "openrouter")
        self.assertEqual(config["fallback_providers"], [])
        self.assertEqual(config["delegation"]["fallback_providers"], [])

    def test_policy_change_is_detected(self):
        config, policy, candidate, env = load()
        changed = copy.deepcopy(policy)
        changed["model"]["id"] = "deepseek/deepseek-v4.1-flash-1018"
        self.assertIn("model_id", chc.validate(config, changed, candidate, env))
        changed = copy.deepcopy(policy)
        changed["model"]["reasoning_effort"] = "max"
        self.assertIn("reasoning_effort", chc.validate(config, changed, candidate, env))

    def test_deviations_are_rejected(self):
        config, policy, candidate, env = load()
        cases = {
            "model_id": lambda c: c["model"].update(default="deepseek/deepseek-v4.1-flash"),
            "model_provider": lambda c: c["model"].update(provider="deepseek"),
            "model_base_url": lambda c: c["model"].update(base_url="https://example.invalid/v1"),
            "reasoning_effort": lambda c: c["agent"].update(reasoning_effort="medium"),
            "reasoning_overrides": lambda c: c["agent"].update(reasoning_overrides={"x": "low"}),
            "fallback_providers": lambda c: c.update(fallback_providers=[{"provider": "openrouter", "model": "x/y"}]),
            "zusatzroute": lambda c: c.update(providers={"p": {"api": "https://example.invalid"}}),
            "delegation_fallback": lambda c: c["delegation"].pop("fallback_providers"),
            "delegation_route": lambda c: c["delegation"].update(model="x/y"),
            "auxiliary_route:compression": lambda c: c["auxiliary"]["compression"].update(provider="nous"),
            "auxiliary_route:vision": lambda c: c["auxiliary"]["vision"].update(fallback_chain=[{"provider": "nous"}]),
            "auxiliary_reasoning:mcp": lambda c: c["auxiliary"]["mcp"].update(reasoning_effort="low"),
            "require_parameters": lambda c: c["provider_routing"].update(require_parameters=False),
            "cron_route": lambda c: c.update(cron={"model": "x/y"}),
            "geheimnis_feld:model.api_key": lambda c: c["model"].update(api_key="${OPENROUTER_API_KEY}"),
            "geheimnis_wert:terminal.cwd": lambda c: c["terminal"].update(cwd="sk-or-v1-0123456789abcdef"),
        }
        for expected, mutate in cases.items():
            with self.subTest(expected):
                broken = copy.deepcopy(config)
                mutate(broken)
                self.assertIn(expected, chc.validate(broken, policy, candidate, env))

    def test_legacy_single_fallback_key_is_rejected(self):
        config, policy, candidate, env = load()
        config["fallback_model"] = {"provider": "openrouter", "model": "x/y"}
        self.assertIn("fallback_providers", chc.validate(config, policy, candidate, env))

    def test_env_example_has_names_only(self):
        config, policy, candidate, env = load()
        self.assertEqual(chc.validate(config, policy, candidate, env), [])
        self.assertIn("env_example_wert:OPENROUTER_API_KEY",
                      chc.validate(config, policy, candidate, env.replace("OPENROUTER_API_KEY=", "OPENROUTER_API_KEY=x")))
        self.assertIn("env_example_unvollstaendig",
                      chc.validate(config, policy, candidate, env.replace("NEXIFY_REPO=", "ANDERES=")))

    def test_candidate_stays_candidate(self):
        config, policy, candidate, env = load()
        self.assertEqual(candidate["status"], "candidate_not_runtime_activation")
        active = copy.deepcopy(candidate)
        active["status"] = "active"
        self.assertIn("kandidat_status", chc.validate(config, policy, active, env))
        hermes = next(r for r in candidate["runtime_candidates"] if r["id"] == "hermes-candidate")
        self.assertEqual(hermes["commit"], PIN)

    def test_parser_matches_pyyaml_when_available(self):
        try:
            import yaml
        except ImportError:
            self.skipTest("PyYAML nicht installiert")
        text = (ROOT / chc.CONFIG).read_text(encoding="utf-8")
        self.assertEqual(chc.parse_yaml(text), yaml.safe_load(text))

    def test_parser_rejects_what_it_cannot_read(self):
        for text in ("a: &anker 1\n", "a:\n\tb: 1\n", "a: 1\na: 2\n", "a: [1, 2]\n"):
            with self.subTest(text):
                with self.assertRaises(chc.ConfigError):
                    chc.parse_yaml(text)


class SkillsAndPersona(unittest.TestCase):
    def test_skills_are_read_from_the_repository(self):
        config, _, _, _ = load()
        self.assertEqual(config["skills"]["external_dirs"], ["${NEXIFY_REPO}/.claude/skills"])
        self.assertIs(config["skills"]["write_approval"], True)
        self.assertIs(config["curator"]["enabled"], False)

    def test_every_skill_has_the_frontmatter_hermes_reads(self):
        skills = sorted((ROOT / ".claude/skills").glob("*/SKILL.md"))
        self.assertEqual(len(skills), 12)
        for path in skills:
            with self.subTest(path.parent.name):
                text = path.read_text(encoding="utf-8")
                match = re.match(r"---\n(.*?)\n---\n", text, re.S)
                self.assertIsNotNone(match)
                self.assertRegex(match.group(1), r"(?m)^name: %s$" % re.escape(path.parent.name))
                self.assertRegex(match.group(1), r"(?m)^description: \S")

    def test_persona_points_to_sources_that_exist(self):
        soul = (ROOT / "ops/hermes/home/SOUL.md").read_text(encoding="utf-8")
        for needle in ("D-014", "D-016", "D-017", "config/llm-policy.json", "nexify-zweig-und-pr"):
            self.assertIn(needle, soul)
        for ref in re.findall(r"`((?:config|docs|\.claude)/[^`*]+?\.(?:json|md))`", soul):
            self.assertTrue((ROOT / ref).is_file(), ref)
        self.assertLess(len(soul), 6000)


class Einspielen(unittest.TestCase):
    def run_script(self, *args):
        return subprocess.run(["bash", str(SCRIPT), *args], capture_output=True, text=True, env={**os.environ, "LC_ALL": "C"})

    def make_home(self, tmp, env_text="OPENROUTER_API_KEY=wert-nur-im-test\nNEXIFY_REPO=/opt/nexify/monorepo\n"):
        home = Path(tmp) / "home"
        home.mkdir()
        (home / "config.yaml").write_text("model:\n  default: alt/modell\nmcp_servers:\n  rea:\n    command: rea\n", encoding="utf-8")
        (home / "SOUL.md").write_text("alt\n", encoding="utf-8")
        (home / ".env").write_text(env_text, encoding="utf-8")
        (home / ".env").chmod(0o600)
        source = Path(tmp) / "quelle"
        source.mkdir()
        return home, source

    def test_dry_run_changes_nothing_and_never_prints_secrets(self):
        with tempfile.TemporaryDirectory() as tmp:
            home, source = self.make_home(tmp)
            before = {p.name: p.read_bytes() for p in home.iterdir()}
            result = self.run_script("--ziel", str(home), "--quelle", str(source))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(before, {p.name: p.read_bytes() for p in home.iterdir()})
            self.assertIn("Trockenlauf", result.stdout)
            self.assertIn("mcp_servers", result.stdout)
            self.assertNotIn("wert-nur-im-test", result.stdout + result.stderr)

    def test_apply_refuses_unknown_version(self):
        with tempfile.TemporaryDirectory() as tmp:
            home, source = self.make_home(tmp)
            result = self.run_script("--ziel", str(home), "--quelle", str(source), "--anwenden")
            self.assertEqual(result.returncode, 1)
            self.assertEqual((home / "SOUL.md").read_text(encoding="utf-8"), "alt\n")
            self.assertFalse((home / "backups").exists())

    def test_apply_backs_up_is_idempotent_and_rolls_back(self):
        with tempfile.TemporaryDirectory() as tmp:
            home, source = self.make_home(tmp)
            extra = Path(tmp) / "zusatz.yaml"
            extra.write_text("mcp_servers:\n  rea:\n    command: rea\n", encoding="utf-8")
            args = ["--ziel", str(home), "--quelle", str(source), "--zusatz", str(extra),
                    "--anwenden", "--version-ungeprueft-zulassen"]
            first = self.run_script(*args)
            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertIn("Kein Neustart", first.stdout)
            written = (home / "config.yaml").read_text(encoding="utf-8")
            self.assertIn("deepseek/deepseek-v4.1-flash-1017", written)
            self.assertIn("mcp_servers:", written)
            self.assertEqual((home / "config.yaml").stat().st_mode & 0o777, 0o600)
            backups = sorted((home / "backups").iterdir())
            self.assertEqual(len(backups), 1)
            self.assertEqual((backups[0] / "SOUL.md").read_text(encoding="utf-8"), "alt\n")
            self.assertFalse((backups[0] / ".env").exists())

            second = self.run_script(*args)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertIn("Nichts zu tun", second.stdout)
            self.assertEqual(len(list((home / "backups").iterdir())), 1)

            back = self.run_script("--zurueck", str(backups[0]), "--ziel", str(home), "--anwenden")
            self.assertEqual(back.returncode, 0, back.stderr)
            self.assertIn("alt/modell", (home / "config.yaml").read_text(encoding="utf-8"))
            self.assertEqual((home / "SOUL.md").read_text(encoding="utf-8"), "alt\n")

    def test_extra_file_cannot_reroute_the_model_or_carry_secrets(self):
        with tempfile.TemporaryDirectory() as tmp:
            home, source = self.make_home(tmp)
            for text in ("fallback_providers:\n  - provider: nous\n", "providers:\n  x:\n    api: https://example.invalid\n",
                         "kanban:\n  max_in_progress: 9\n", "mcp_servers:\n  x:\n    api_key: abc123\n"):
                with self.subTest(text):
                    extra = Path(tmp) / "zusatz.yaml"
                    extra.write_text(text, encoding="utf-8")
                    result = self.run_script("--ziel", str(home), "--quelle", str(source), "--zusatz", str(extra))
                    self.assertEqual(result.returncode, 1)
                    self.assertIn("ABBRUCH", result.stderr)

    def test_missing_home_is_not_created(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = self.run_script("--ziel", str(Path(tmp) / "fehlt"), "--anwenden")
            self.assertEqual(result.returncode, 1)
            self.assertFalse((Path(tmp) / "fehlt").exists())

    def test_env_findings_name_variables_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            home, source = self.make_home(tmp, "HERMES_INFERENCE_MODEL=anderes/modell\n")
            result = self.run_script("--ziel", str(home), "--quelle", str(source))
            self.assertIn("OPENROUTER_API_KEY fehlt", result.stdout)
            self.assertIn("HERMES_INFERENCE_MODEL ist gesetzt und muss entfernt werden", result.stdout)
            self.assertNotIn("anderes/modell", result.stdout)

    def test_restart_needs_the_explicit_switch(self):
        text = SCRIPT.read_text(encoding="utf-8")
        self.assertEqual(text.count("docker restart \"$CONTAINER\""), 1)
        self.assertIn('if [ "$NEUSTART" = true ]; then', text)
        self.assertNotRegex(text, r"docker (compose )?(up|start|run)\b")


if __name__ == "__main__":
    unittest.main()
