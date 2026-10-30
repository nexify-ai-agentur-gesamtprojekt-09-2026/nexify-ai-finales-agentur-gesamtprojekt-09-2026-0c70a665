"""Source/asset contract checks, no network or private Library requirement in CI."""
import hashlib
import json
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[1]


class IdentityHeroTests(unittest.TestCase):
    def test_reference_is_version_bound_and_never_a_release_grant(self):
        spec=json.loads((ROOT/'config/identity-hero.json').read_text())
        self.assertEqual(spec['source']['version'],1)
        self.assertEqual(spec['source']['html_sha256'],'87cce3dcfee53bc6573efe1ae81e76bdf80f81542f5e746448a96ed087057e0c')
        self.assertFalse(spec['decision']['production_release_granted_by_this_file'])
        self.assertFalse(spec['video_produced']);self.assertFalse(spec['original_asset_bytes_changed'])
        self.assertEqual(spec['locales'],['de','nl','fr'])

    def test_all_original_assets_are_unchanged_and_distinct(self):
        assets=json.loads((ROOT/'config/interim-scene-images.json').read_text())['images']
        self.assertEqual(set(assets),{'pascal','nex','aifly'})
        self.assertEqual(len({a['sha256'] for a in assets.values()}),3)
        for key,a in assets.items():
            with self.subTest(key=key):
                path=ROOT/'apps/web/public'/a['src'].lstrip('/')
                self.assertTrue(path.is_file())
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),a['sha256'])

    def test_scene_palette_is_centrally_generated_and_component_inert(self):
        tokens=json.loads((ROOT/'config/design-tokens.json').read_text())
        generated=(ROOT/'packages/tokens/tokens.css').read_text()
        for name,item in tokens['color']['identityScene'].items():
            cssname=re.sub(r'[A-Z]',lambda m:'-'+m.group().lower(),name)
            self.assertIn('--color-identity-scene-'+cssname+': '+item['$value']+';',generated)
        component=(ROOT/'apps/web/components/IdentityHero.tsx').read_text()
        css=(ROOT/'apps/web/components/IdentityHero.css').read_text()
        self.assertNotRegex(css,r'#[0-9a-fA-F]{3,8}\b|rgba?\(')
        # IdentityHero now composes TrioScene with real video (not literal <video in IdentityHero)
        # Original interim-scene-images remain unchanged and are preserved for reference
        self.assertIn('import TrioScene',component,'IdentityHero must import TrioScene')
        self.assertIn('<TrioScene',component,'IdentityHero must render TrioScene')
        self.assertIn('sceneMedia.welcome',component,'IdentityHero must pass sceneMedia.welcome to TrioScene')
        self.assertIn('testId="hero"',component,'IdentityHero must pass testId="hero" to TrioScene')
        for unsafe in ('<iframe','srcDoc=','dangerouslySetInnerHTML','fetch('):
            self.assertNotIn(unsafe,component)
        # TrioScene contains real video and dynamic testId-based controls
        trio_scene=(ROOT/'apps/web/components/TrioScene.tsx').read_text()
        self.assertIn('<video',trio_scene,'TrioScene must contain video elements')
        self.assertIn('trio-clip-intro',trio_scene,'TrioScene must have intro video')
        self.assertIn('trio-clip-loop',trio_scene,'TrioScene must have loop video')
        # Verify dynamic testId pattern for controls (testId prop creates hero-play-toggle, etc.)
        self.assertIn('data-testid={`${testId}-play-toggle`}',trio_scene)
        self.assertIn('data-testid={`${testId}-sound-toggle`}',trio_scene)
        self.assertIn('data-testid={`${testId}-captions-toggle`}',trio_scene)
        for unsafe in ('<iframe','srcDoc=','dangerouslySetInnerHTML'):
            self.assertNotIn(unsafe,trio_scene)
        self.assertIn('prefers-reduced-motion:reduce',css)

    def test_scene_ink_is_readable_across_the_entire_floor_gradient(self):
        colors=json.loads((ROOT/'config/design-tokens.json').read_text())['color']['identityScene']
        def luminance(name):
            value=colors[name]['$value']
            channels=[int(value[i:i+2],16)/255 for i in (1,3,5)]
            linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in channels]
            return sum(x*w for x,w in zip(linear,[.2126,.7152,.0722]))
        def contrast(a,b):
            a,b=sorted((luminance(a),luminance(b)))
            return (b+.05)/(a+.05)
        for background in ('wallTop','wallBase','wallEdge','floor'):
            self.assertGreaterEqual(contrast('ink',background),4.5)
        self.assertGreaterEqual(contrast('muted','wallBase'),4.5)


if __name__=='__main__':unittest.main()
