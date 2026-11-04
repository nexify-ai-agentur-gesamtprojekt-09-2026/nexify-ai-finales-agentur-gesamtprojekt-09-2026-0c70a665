"""Stored evidence guards; no browser run is claimed by these tests."""
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from tools.check_text_resize_evidence import source_hashes, check_bound_resize

ROOT = Path(__file__).resolve().parents[1]


class ResizeSourceBindingTest(unittest.TestCase):
    def test_current_report_has_exact_source_binding(self):
        self.assertEqual(check_bound_resize(ROOT), 43)

    def test_css_script_new_source_and_uncompleted_report_fail_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for relative in source_hashes(ROOT):
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / relative, path)
            report = root / 'evidence/one-app-2026-10-27/text-spacing.json'
            report.parent.mkdir(parents=True)
            original = (ROOT / report.relative_to(root)).read_bytes()
            report.write_bytes(original)
            self.assertEqual(check_bound_resize(root), 43)
            for relative in ('apps/web/components/WorkspaceRebuild.css', 'apps/web/app/globals.css', 'apps/web/public/fonts/geist-latin.woff2', 'apps/site/tests/browser-text-spacing.mjs'):
                path = root / relative
                before = path.read_bytes()
                path.write_bytes(before + b'\n/* drift */\n')
                with self.assertRaisesRegex(ValueError, 'stale resize'): check_bound_resize(root)
                path.write_bytes(before)
            added = root / 'apps/web/components/NewLayout.css'
            added.write_text('/* new unmeasured source */')
            with self.assertRaisesRegex(ValueError, 'stale resize'): check_bound_resize(root)
            added.unlink()
            changed = json.loads(original)
            changed['completed'] = False
            report.write_text(json.dumps(changed))
            with self.assertRaisesRegex(ValueError, 'stale resize'): check_bound_resize(root)
            changed = json.loads(original)
            changed['runtime_errors'] = [{'name': 'module failed'}]
            report.write_text(json.dumps(changed))
            with self.assertRaisesRegex(ValueError, 'runtime error'): check_bound_resize(root)
            changed = json.loads(original)
            changed['source_sha256']['../../foreign'] = '0' * 64
            report.write_text(json.dumps(changed))
            with self.assertRaisesRegex(ValueError, 'stale resize'): check_bound_resize(root)
