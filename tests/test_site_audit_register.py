"""Tests für das Site-Audit-Register (Bildklassifikation und Rendern), ohne Browser."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def img(src, alt="x", w=440, nw=1280, srcset=True, loaded=True, caption=""):
    return {"src": src, "alt": alt, "w": w, "h": 200, "nw": nw, "srcset": srcset, "loading": "lazy", "fetchpriority": "",
            "visible": True, "caption": caption, "loaded": loaded}


class ClassifyImagesTests(unittest.TestCase):
    def setUp(self):
        self.tool = load("site_audit_register")

    def test_retina_blur_uses_file_width_not_slot_width(self):
        ok = self.tool.classify_images([img("https://x/media/higgsfield/hf-14-1280.webp", nw=1280)], 2)
        self.assertEqual(ok["unscharf_bei_retina"], [])
        blur = self.tool.classify_images([img("https://x/media/a-800.webp", w=700, nw=800)], 2)
        self.assertEqual(blur["unscharf_bei_retina"][0]["noetig"], 1400)

    def test_empty_alt_missing_alt_and_higgsfield_label(self):
        r = self.tool.classify_images([img("https://x/signet.svg", alt=""), img("https://x/media/higgsfield/hf-17-cutout-1920.webp", srcset=False, nw=1920, w=860),
                                       img("https://x/media/higgsfield/hf-01.webp", alt="Markeninszenierung: Lobby")], 2)
        self.assertEqual(r["alt_leer"], ["signet.svg"])
        self.assertEqual(r["higgsfield_ohne_kennzeichnung"], ["hf-17-cutout-1920.webp"])
        self.assertEqual(r["ohne_srcset"], ["hf-17-cutout-1920.webp"])

    def test_unloaded_lazy_images_are_reported_not_judged(self):
        r = self.tool.classify_images([img("https://x/media/a-800.webp", loaded=False)], 2)
        self.assertEqual(r["nicht_geladen"], ["a-800.webp"])
        self.assertEqual(r["unscharf_bei_retina"], [])


class RenderTests(unittest.TestCase):
    def test_register_reports_findings_and_unmeasured_areas(self):
        tool, render = load("site_audit_register"), load("render_site_audit_register")
        view = {"status": 200, "title": "T", "description": "d", "canonical": "https://www.nexifyai.de/x", "robots": "noindex, nofollow", "hreflang": [],
                "lang": "de", "h1": 1, "h1text": "H", "ueberlauf_px": 0, "lcp_ms": 3000, "cls": 0.0, "uebertragen_kb": 10,
                "konsolenfehler": [], "fehlgeschlagene_anfragen": [], "bilder": tool.classify_images([img("https://x/a-800.webp", alt="")], 2)}
        report = {"base": "https://www.nexifyai.de", "gemessen_am": "2026-11-09", "nicht_gemessen": [],
                  "seiten": [{"pfad": "/x", "viewports": {"desktop": view, "mobil": view}, "sprachen": {"nl": {"titel_wie_de": True, "h1_wie_de": False}}}]}
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "r.json"
            p.write_text(json.dumps(report), encoding="utf-8")
            out = Path(tmp) / "r.md"
            import sys
            old = sys.argv
            sys.argv = ["x", "--produktion", str(p), "--main", str(p), "--out", str(out)]
            try:
                render.main()
            finally:
                sys.argv = old
            text = out.read_text(encoding="utf-8")
        self.assertIn("hreflang fehlt", text)
        self.assertIn("D LCP 3000 ms", text)
        self.assertIn("Titel/H1 wie DE: nl", text)
        self.assertIn("Nicht gemessen (kein Beleg", text)
        self.assertNotIn("noindex (gewollt bis Freigabe)</", text)


if __name__ == "__main__":
    unittest.main()
