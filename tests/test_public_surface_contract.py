"""Local token/PWA source boundaries; no provider palette or WCAG certification."""
from pathlib import Path
import json
import re
import shutil
import subprocess
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]

def active_files():
    return sorted([*ROOT.joinpath('apps/site/src').glob('*'),*ROOT.joinpath('apps/web/components').glob('*.tsx'),*ROOT.joinpath('apps/web/components').glob('*.css'),ROOT/'apps/web/app/globals.css'])

class PublicSurfaceContractTests(unittest.TestCase):
    def test_generated_token_values_match_central_source_semantically(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'config').mkdir();(root/'packages/tokens').mkdir(parents=True)
            for path in ['config/design-tokens.json','packages/tokens/build-tokens.mjs']:shutil.copyfile(ROOT/path,root/path)
            subprocess.run(['node',str(root/'packages/tokens/build-tokens.mjs')],check=True,capture_output=True)
            self.assertEqual(json.loads((root/'packages/tokens/tokens.json').read_text()),json.loads((ROOT/'packages/tokens/tokens.json').read_text()))
            values=lambda p:dict(re.findall(r'(--[\w-]+):\s*([^;]+);',p.read_text()))
            self.assertEqual(values(root/'packages/tokens/tokens.css'),values(ROOT/'packages/tokens/tokens.css'))
    def test_own_active_styles_do_not_bypass_central_color_tokens(self):
        for path in active_files():
            if not path.is_file():continue
            raw=path.read_text()
            with self.subTest(path=str(path.relative_to(ROOT))):
                self.assertIsNone(re.search(r'#[0-9a-fA-F]{3,8}(?![\w-])|\b(?:rgb|hsl)a?\(\s*[\d.]',raw))
                self.assertIsNone(re.search(r'(?:color|background(?:-color)?|border-color|fill|stroke)\s*[:=]\s*[\'\"]?(?:black|white|red|blue|green|yellow|gray|grey)\b',raw,re.I))
    def test_public_installation_is_explicit_and_network_only(self):
        plugin=(ROOT/'apps/site/pwa/plugin.mjs').read_text()
        self.assertIn("mode==='public-pwa'",plugin)
        worker=(ROOT/'apps/site/pwa/worker.js').read_text()
        self.assertEqual(re.findall(r"addEventListener\('([^']+)'",worker),['install'])
        self.assertNotRegex(worker,r'caches\.|fetch\(|skipWaiting\(|clients\.claim\(')
        self.assertTrue((ROOT/'prototypen/sw.js').exists())
