"""The published sitemap lists exactly the public, login-free pages of the site map."""
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import generate_sitemap  # noqa: E402


class PublicSitemapTests(unittest.TestCase):
    def test_sitemap_matches_public_site_map(self):
        site_map = json.loads((ROOT / "config/site-map.json").read_text(encoding="utf-8"))
        expected = [generate_sitemap.ORIGIN + path for path in generate_sitemap.public_paths(site_map)]
        actual = re.findall(r"<loc>([^<]+)</loc>", generate_sitemap.OUTPUT.read_text(encoding="utf-8"))
        self.assertEqual(actual, expected, "run: python3 tools/generate_sitemap.py")

    def test_sitemap_never_lists_private_pages(self):
        site_map = json.loads((ROOT / "config/site-map.json").read_text(encoding="utf-8"))
        private = {page["path"] for page in site_map["pages"]
                   if page["access"]["visibility"] != "public" or page["access"]["auth_required"]}
        listed = {loc.removeprefix(generate_sitemap.ORIGIN) for loc in
                  re.findall(r"<loc>([^<]+)</loc>", generate_sitemap.OUTPUT.read_text(encoding="utf-8"))}
        self.assertFalse(private & listed)


if __name__ == "__main__":
    unittest.main()
