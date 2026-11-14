"""Test der statischen Inhaltsprüfung (Messlogik, kein Qualitätsurteil)."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("content_audit", Path(__file__).resolve().parents[1] / "tools" / "content_audit.py")
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class ContentAuditTests(unittest.TestCase):
    def test_words_and_sentences(self):
        self.assertEqual(audit.words("Das ist ein Test."), 4)
        long = "Dies ist ein ausreichend langer Satz mit genau neun Wörtern. Kurz."
        self.assertEqual(audit.sentences(long), ["Dies ist ein ausreichend langer Satz mit genau neun Wörtern."])

    def test_page_text_joins_summary_and_sections(self):
        page = {"localizedSummary": {"de": "Zusammenfassung"}, "sections": [{"body": {"de": "Abschnitt eins"}}, {"body": {"de": "Abschnitt zwei"}}]}
        self.assertEqual(audit.page_text(page, "de"), "Zusammenfassung Abschnitt eins Abschnitt zwei")


if __name__ == "__main__":
    unittest.main()
