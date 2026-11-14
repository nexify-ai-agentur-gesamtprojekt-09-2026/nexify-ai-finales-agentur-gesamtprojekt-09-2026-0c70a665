"""Tests für tools/check_brand_names.py: meldet, ändert nichts, sperrt nichts."""
from __future__ import annotations

import contextlib
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import check_brand_names as checker  # noqa: E402

FULL_NAME = "AIFly ORACLE with NeXify AI Intelligence by NeXify"


def run(argv: list[str]) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = checker.main(argv)
    return code, out.getvalue(), err.getvalue()


class BrandNameRulesTest(unittest.TestCase):
    def setUp(self) -> None:
        self.rules = checker.load_rules(ROOT / checker.RULES)
        self.by_id = {rule.rule_id: rule for rule in self.rules}

    def ids(self, text: str) -> set[str]:
        return {rule.rule_id for rule in self.rules if rule.pattern.search(text)}

    def test_rule_file_is_valid_and_ids_unique(self) -> None:
        data = json.loads((ROOT / checker.RULES).read_text(encoding="utf-8"))
        names = {entry["id"]: entry for entry in data["names"]}
        self.assertEqual(names["aifly-oracle"]["kanonisch"], FULL_NAME)
        self.assertIsNone(names["aifly-oracle"]["kurzform"])
        self.assertFalse(names["aifly-oracle"]["kurzform_erlaubt"])
        self.assertEqual(names["nexify-ai-factory"]["kanonisch"], "NeXify AI FACTORY")
        self.assertEqual(names["claim"]["kanonisch"], "Chat it. Automate it.")
        self.assertEqual(names["nex-agentic"]["kanonisch"], "NeX Agentic")
        self.assertEqual(names["suite"]["kanonisch"], "NeX & AIFly ORACLE Suite")
        self.assertEqual(names["teileklar"]["kanonisch"], "TEILEKLAR")
        self.assertEqual(len(self.by_id), len(self.rules))
        allowed = {"Firma", "Produkt", "Figur", "Technik", "Claim"}
        self.assertTrue(all(entry["art"] in allowed for entry in data["names"]))

    def test_canonical_names_are_not_reported(self) -> None:
        for text in (
            FULL_NAME,
            "NeXify AI FACTORY",
            "Chat it. Automate it.",
            "NeX Agentic übernimmt die Aufgabe.",
            "Die NeX & AIFly ORACLE Suite ist ein eigener Arbeitsbereich.",
            "NeXify AI Intelligence",
            "NeXify API",
            "TEILEKLAR",
            "mail@nexifyai.cloud",
            'speaker:"oracle", id:"aifly-panel", href:"/produkte/nex2fly", path:"/teileklar"',
            "import OracleCompanion from './OracleCompanion'; saveOracleBrief(); NEXIFY_STATIC=1",
        ):
            self.assertEqual(self.ids(text), set(), text)

    def test_old_and_forbidden_spellings_are_reported_once_each(self) -> None:
        cases = {
            "Oracle AIFly by NeXify": {"oracle-aifly-by-nexify"},
            "AIFly ORACEL": {"oracel", "aifly-allein"},
            "Das Orakel antwortet.": {"orakel"},
            "AIFly ORACLE. Einordnen, bevor gehandelt wird.": {"aifly-oracle-ohne-zusatz"},
            "AIFly Oracle": {"aifly-oracle-gemischt"},
            "AIfly ORACLE koordiniert": {"aifly-kleines-f"},
            "Und ich bin AI Fly Oracle.": {"ai-fly"},
            "AIFly by NeXify": {"aifly-by-nexify"},
            "Sprecherrolle AIFly": {"aifly-allein"},
            "Oracle antwortet …": {"oracle-allein"},
            "NeX & Oracle. Agentische KI als Baustein.": {"oracle-allein"},
            "NeX Agentic AIFly. Aufgaben gezielt vorbereiten.": {"nex-agentic-aifly"},
            "NeX Agentic AI": {"nex-agentic-ai"},
            "NeXify AI FACTORY B.V.": {"factory-mit-rechtsform"},
            "NeXify AI Factory": {"factory-gemischt"},
            "NeXifyAI Cloud": {"nexifyai-zusammen"},
            "NeXify AI Intelligenz": {"intelligenz"},
            "NeX2fly Suite. Ihr eigener Einstieg.": {"nex2fly-suite"},
            "NeX2fly ist vorgesehen": {"nex2fly-ohne-suite"},
            "Teileklar": {"teileklar-gemischt"},
            "hello@nexifyai.cloud": {"hello-adresse"},
            "Ihr Unternehmen. Auf Autopilot.": {"claim-autopilot"},
            "Website-Beratung ohne Live-KI.": {"jargon-ohne-live-ki"},
        }
        for text, expected in cases.items():
            self.assertEqual(self.ids(text), expected, text)


class BrandNameCheckerRunTest(unittest.TestCase):
    def test_reports_file_and_line_changes_nothing_and_exits_zero(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "config").mkdir()
            (root / "apps/web/components").mkdir(parents=True)
            (root / "apps/web/node_modules/pkg").mkdir(parents=True)
            rules = (ROOT / checker.RULES).read_text(encoding="utf-8")
            (root / "config/brand-names.json").write_text(rules, encoding="utf-8")
            (root / "config/copy.json").write_text(
                '{\n  "ok": "' + FULL_NAME + '",\n  "alt": "Oracle antwortet …"\n}\n', encoding="utf-8")
            (root / "apps/web/components/Chat.tsx").write_text(
                "const a = 'NeXify AI FACTORY';\nconst b = 'NeX Agentic AIFly';\n", encoding="utf-8")
            (root / "apps/web/node_modules/pkg/index.js").write_text("'Orakel'\n", encoding="utf-8")
            (root / "apps/web/logo.png").write_bytes(b"\x89PNG Orakel")
            before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob("*") if p.is_file()}

            code, out, _ = run(["--root", str(root)])
            self.assertEqual(code, 0)
            self.assertIn("config/copy.json:3: [alt] oracle-allein", out)
            self.assertIn("apps/web/components/Chat.tsx:2: [alt] nex-agentic-aifly", out)
            self.assertNotIn("node_modules", out)
            self.assertNotIn("logo.png", out)
            self.assertNotIn("brand-names.json:", out)
            self.assertIn("2 Treffer gesamt", out)

            code, out, _ = run(["--root", str(root), "--json"])
            self.assertEqual(code, 0)
            payload = json.loads(out)
            self.assertFalse(payload["gate"])
            self.assertEqual(payload["treffer_gesamt"], 2)
            counts = {row["id"]: row["treffer"] for row in payload["zaehlung"]}
            self.assertEqual(counts["oracle-allein"], 1)
            self.assertEqual(counts["orakel"], 0)

            after = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob("*") if p.is_file()}
            self.assertEqual(before, after)

    def test_missing_rule_file_is_a_tool_error_not_a_pass(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            code, out, err = run(["--root", tmp])
            self.assertEqual(code, 2)
            self.assertEqual(out, "")
            self.assertIn("nichts geprüft", err)


if __name__ == "__main__":
    unittest.main()
