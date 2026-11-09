"""Das Register bekannter Lösungen darf nicht verwittern.

config/known-solutions.json hält belegte Fehlerklassen mit Lösung und Wächter fest.
Der Test stellt sicher, dass jeder Eintrag vollständig ist, jede Wächter-Datei
existiert und ihren Marker enthält und der Skill nexify-quality-learning das Register
benennt, damit es bei der Arbeit tatsächlich gelesen wird.
"""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTER = ROOT / "config" / "known-solutions.json"
SKILL = ROOT / "skills" / "nexify-quality-learning" / "SKILL.md"
FIELDS = {"id", "bereich", "symptom", "ursache", "loesung", "wache", "quelle", "gefunden"}


class KnownSolutionsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(REGISTER.read_text(encoding="utf-8"))
        cls.entries = cls.data["eintraege"]

    def test_entries_are_complete_and_unique(self):
        ids = [e["id"] for e in self.entries]
        self.assertEqual(len(ids), len(set(ids)), "doppelte IDs")
        for e in self.entries:
            with self.subTest(id=e.get("id")):
                self.assertEqual(FIELDS - set(e), set(), "Pflichtfelder fehlen")
                self.assertRegex(e["id"], r"^KS-\d{3}$")
                self.assertRegex(e["gefunden"], r"^\d{4}-\d{2}-\d{2}$")
                for key in ("symptom", "ursache", "loesung"):
                    self.assertGreater(len(e[key].strip()), 20, key)
                self.assertGreater(len(e["quelle"].strip()), 3, "quelle")

    def test_guards_exist_and_contain_their_marker(self):
        arten = set(self.data["wache_arten"])
        for e in self.entries:
            wache = e["wache"]
            with self.subTest(id=e["id"]):
                self.assertIn(wache["art"], arten)
                if wache["art"] == "dokumentiert":
                    self.assertNotIn("pfad", wache, "dokumentiert hat keinen Wächter-Pfad")
                    continue
                path = ROOT / wache["pfad"]
                self.assertTrue(path.is_file(), f"Wächter fehlt: {wache['pfad']}")
                self.assertTrue(wache.get("marker"), "Marker fehlt")
                self.assertIn(wache["marker"], path.read_text(encoding="utf-8"),
                              "Marker nicht mehr in der Wächter-Datei")

    def test_skill_points_to_the_register(self):
        text = SKILL.read_text(encoding="utf-8")
        self.assertIn("config/known-solutions.json", text)
        self.assertIn("tests/test_known_solutions.py", text)

    def test_register_contains_no_credentials(self):
        raw = REGISTER.read_text(encoding="utf-8")
        self.assertIsNone(re.search(r"(?i)(sk-[a-z0-9]{16,}|bearer\s+[a-z0-9._-]{20,}|password\s*[:=])", raw))


if __name__ == "__main__":
    unittest.main()
