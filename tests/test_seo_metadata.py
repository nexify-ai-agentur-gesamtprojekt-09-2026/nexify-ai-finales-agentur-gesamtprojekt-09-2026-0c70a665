"""Wächter für SEO-Metadaten der öffentlichen Seiten (apps/web/lib/page-seo.ts).

Befund 09.11.2026 (Live-Messung www.nexifyai.de): hreflang stand nur in der Sitemap, nicht im <head>, weil die
berechnete Sprachliste nicht in `alternates` übergeben wurde. Außerdem ist Indexierung bewusst AUS, bis der Inhaber
die Veröffentlichung freigibt; die Freigabe erfolgt über eine Umgebungsvariable (plus Redeploy), nicht über eine Codeänderung.
"""
import re
import unittest
from pathlib import Path

SRC = (Path(__file__).resolve().parents[1] / "apps" / "web" / "lib" / "page-seo.ts").read_text(encoding="utf-8")


class SeoMetadataTests(unittest.TestCase):
    def test_hreflang_languages_reach_the_head(self):
        self.assertRegex(SRC, r"alternates:\{canonical:localizedUrl\(page\.path,locale\),languages\}")

    def test_x_default_and_only_complete_locales(self):
        self.assertIn("'x-default':localizedUrl(page.path,'de')", SRC)
        self.assertIn("page.sections.every(s=>s.body[code])", SRC, "nur vollständig übersetzte Sprachen dürfen als Alternate erscheinen")

    def test_indexing_is_off_by_default_and_switchable_by_env(self):
        self.assertIn("process.env.NEXIFY_INDEXING==='enabled'", SRC)
        self.assertRegex(SRC, r"robots:indexingEnabled\(\)\?\{index:true,follow:true\}:\{index:false,follow:false\}")
        self.assertIsNone(re.search(r"robots:\{index:true", SRC.split("export function routeMetadata")[0]),
                          "pageMetadata darf nicht fest auf index:true stehen")


if __name__ == "__main__":
    unittest.main()


class BrandImageLabelTests(unittest.TestCase):
    def test_every_higgsfield_staging_is_labelled_as_brand_staging(self):
        text = (Path(__file__).resolve().parents[1] / "apps" / "web" / "lib" / "brand-media.ts").read_text(encoding="utf-8")
        entries = re.findall(r"\{src:'(/media/higgsfield/[^']+)',alt:'([^']+)'\}", text)
        self.assertGreaterEqual(len(entries), 17)
        for src, alt in entries:
            with self.subTest(src=src):
                self.assertTrue(alt.startswith("Markeninszenierung:"), f"{src}: Higgsfield-Bild ohne Kennzeichnung im alt-Text")


class CutoutSrcsetTests(unittest.TestCase):
    def test_cutout_has_responsive_variants_that_exist(self):
        root = Path(__file__).resolve().parents[1]
        text = (root / "apps" / "web" / "lib" / "brand-media.ts").read_text(encoding="utf-8")
        self.assertNotIn("src.includes('cutout')", text, "Freisteller darf nicht vom srcset ausgenommen sein")
        for width in (800, 1280, 1920):
            self.assertTrue((root / "apps" / "web" / "public" / "media" / "higgsfield" / f"hf-17-cutout-{width}.webp").is_file())
        # HomeContent.tsx bleibt bewusst unverändert: Die Datei ist per Hash an fünf Browser-Nachweisketten gebunden;
        # eine Änderung braucht eine vollständige Neuerhebung (siehe docs/quality/site-audit-register.md, offene Punkte).
        for component in ("PublicContent.tsx",):
            source = (root / "apps" / "web" / "components" / component).read_text(encoding="utf-8")
            self.assertRegex(source, r"brandImages\.finish\.src\}\s+srcSet=\{srcSetFor\(brandImages\.finish\.src\)\}\s+sizes=")
