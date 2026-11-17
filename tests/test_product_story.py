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
        self.assertNotIn("passt garantiert", COPY.lower())
        self.assertNotIn("geprüft: passt", COPY.lower())
        self.assertIn("Noch nicht geprüft", COPY)
