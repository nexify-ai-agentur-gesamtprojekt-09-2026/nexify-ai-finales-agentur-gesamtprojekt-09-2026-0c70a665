import re, unittest, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
COPY = (ROOT / "apps/web/components/shop/product-story-copy.ts").read_text()
STORY = (ROOT / "apps/web/components/shop/ProductStory.tsx").read_text()
DETAIL = (ROOT / "apps/web/components/shop/ProductDetail.tsx").read_text()

class ProductStory(unittest.TestCase):
    def test_four_locales_and_all_guides(self):
        self.assertIn("export const STORY: Record<StoryLocale, Copy> = { de, nl, fr, en }", COPY)
        for kind in ["brakes", "battery", "lighting", "filters", "suspension", "tires", "generic"]:
            self.assertEqual(len(re.findall(r"\b%s: \{ name:" % kind, COPY)), 4, kind)
    def test_concept_sections_present(self):
        for tid in ["story-fit", "story-fit-status", "story-plain", "story-install", "story-also", "story-ship", "story-faq", "story-tools", "story-trust"]:
            self.assertIn('data-testid="%s"' % tid, STORY)
    def test_wired_into_detail(self):
        self.assertIn("<ProductStory product={product} />", DETAIL)
        self.assertIn('data-testid="product-detail"', DETAIL)
    def test_no_invented_fitment_claims(self):
        for phrase in ("passt garantiert", "geprüft: passt", "fit guaranteed", "guaranteed fit", "compatibilité garantie", "past gegarandeerd"):
            self.assertNotIn(phrase, COPY.lower())
        for status in ('fitStatus: "Noch nicht geprüft"', 'fitStatus: "Nog niet gecontroleerd"', 'fitStatus: "Pas encore vérifié"', 'fitStatus: "Not yet checked"'):
            self.assertIn(status, COPY)  # Befund cubic (PR #219): alle vier Sprachen, nicht nur Deutsch


class GuideKind(unittest.TestCase):
    """Befund Vercel Agent Review (PR #219): „Klebeband“ führte zum Reifenratgeber."""
    def test_category_matching_uses_word_boundaries(self):
        import subprocess
        result = subprocess.run(["node", str(ROOT / "tests/guide-kind.check.mjs")], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


class LightTheme(unittest.TestCase):
    """Befund Vercel Agent Review (PR #219): Passungskasten blieb im hellen Thema dunkel."""
    def test_fit_box_follows_light_theme(self):
        css = (ROOT / "apps/web/components/shop/Storefront.css").read_text()
        self.assertRegex(css, r":root\[data-theme='light'\] \.tk-story-fit\{background:[^}]*--color-hell-flaeche")
        self.assertRegex(css, r":root\[data-theme='light'\] \.tk-story-eyebrow[^{]*\{color:var\(--color-hell-lime-handlung")


class HonestWorkshopWording(unittest.TestCase):
    """Befund Codex Review (PR #219): Verzeichnisbetriebe sind keine Partner, Einbau wird direkt vereinbart."""
    def test_no_partner_claims_without_negation(self):
        import re
        for line in COPY.splitlines():
            for m in re.finditer(r"(?i)\bpartner(n|s)?\b|partenaires", line):
                window = line[max(0, m.start() - 60):m.end() + 10].lower()
                self.assertTrue(any(n in window for n in ("keine bestätigten", "geen bevestigde", "pas des partenaires", "not confirmed")), line[:120])


class TariffStatus(unittest.TestCase):
    """Befund Codex Review (PR #219) / AGENTS.md: ungeklärte Tarife bleiben „zur Freigabe“."""
    def test_api_page_keeps_tariff_approval_note_in_all_locales(self):
        import json
        pages = json.loads((ROOT / "config/site-map.json").read_text())["pages"]
        api = next(page for page in pages if page["id"] == "api")  # über IDs, nicht Positionen (Befund cubic)
        body = next(section for section in api["sections"] if section["id"] == "api-customer-2")["body"]
        self.assertIn("zur Freigabe", body["de"])
        self.assertIn("vrijgave", body["nl"])
        self.assertIn("validation", body["fr"])
        self.assertIn("pending approval", body["en"])
        self.assertNotIn("noch zur Freigabe", body["de"])


class LegalAndPriceStatus(unittest.TestCase):
    """Befunde cubic (PR #219): keine Rechts- oder Preisaussage über den Freigabestand hinaus (AGENTS.md: Recht Entwurf 0.9)."""
    def test_withdrawal_badge_names_consumers(self):
        for badge in ("Widerrufsrecht für Verbraucher", "herroepingsrecht voor consumenten", "rétractation légal des consommateurs", "withdrawal for consumers"):
            self.assertIn(badge, COPY)

    def test_price_card_waits_for_release(self):
        cards = re.findall(r'\["(?:Preis|Prijs|Prix|Price)", "([^"]+)"\]', COPY)
        self.assertEqual(len(cards), 4)
        for card, word in zip(cards, ("Freigabe", "vrijgave", "validation", "released")):
            self.assertIn(word, card)

    def test_purchase_terms_marked_unreleased(self):
        for marker in ("noch nicht freigegeben", "nog niet vrijgegeven", "pas encore validées", "not yet released"):
            self.assertIn(marker, COPY)

    def test_legal_page_summaries_keep_draft_status(self):
        import json
        pages = {p["id"]: p for p in json.loads((ROOT / "config/site-map.json").read_text())["pages"]}
        markers = {"de": ("Entwurf", "Entwürfe", "Freigabe", "freigegeben", "geprüft"), "nl": ("concept", "goedkeuring", "gecontroleerd"),
                   "fr": ("projet", "validation", "vérification"), "en": ("draft", "approval", "review")}
        for page_id in ("privacy", "terms", "cookies", "tk-legal"):
            for locale, words in markers.items():
                summary = pages[page_id]["summary"][locale]
                self.assertTrue(any(w in summary for w in words), (page_id, locale, summary))


class ChecklistLocalized(unittest.TestCase):
    """Befund cubic (PR #219): die Passungs-Checkliste darf in NL/FR/EN nicht halb deutsch bleiben."""
    def test_checklist_has_no_hard_coded_german_and_four_locales(self):
        tsx = (ROOT / "apps/web/components/shop/FitmentChecklist.tsx").read_text()
        for german in ("Passung prüfen", "Zusammenfassung erstellen", "Ihr Fahrzeug", "Häufigster Irrtum", "Teilesuche öffnen",
                       "Werkstatt in der Nähe suchen", "Kategorie wählen", "Bremsen", "oder Modell, Motor, Baujahr"):
            self.assertNotIn(german, tsx)
        self.assertEqual(len(re.findall(r"\n  check: \{", COPY)), 4)


class ChatHostThreshold(unittest.TestCase):
    """Befund cubic (PR #219): bei 100 % Text muss Figur+Name in der Zeile bleiben, bei 200 % in die Spalte.
    Gemessen 2026-11-22 (Chromium): innere Chat-Scheibe 266 px (1280er Fenster) bis 312 px (breit)."""
    def test_threshold_between_measured_front_widths(self):
        css = (ROOT / "apps/web/components/AtelierSystem.css").read_text()
        em = float(re.search(r"@container front \(max-width:([\d.]+)em\)\{\n #atelier #aifly-panel \.orientation-host", css).group(1))
        self.assertLess(em * 16, 266)   # Standardschrift: keine Spalte
        self.assertGreater(em * 32, 312)  # 200 %: immer Spalte


class WorkshopAsOf(unittest.TestCase):
    """Befunde cubic (PR #219): Datenstand ohne UTC-Vortag und ohne Absturz bei ungültigem Wert."""
    def test_as_of_date_in_western_time_zone(self):
        import os, subprocess
        result = subprocess.run(["node", str(ROOT / "tests/workshop-as-of.check.mjs")], capture_output=True, text=True,
                                env={**os.environ, "TZ": "America/Los_Angeles"})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
