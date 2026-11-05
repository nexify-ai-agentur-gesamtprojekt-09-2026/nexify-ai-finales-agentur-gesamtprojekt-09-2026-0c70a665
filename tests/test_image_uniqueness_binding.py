"""Stored image-uniqueness evidence guard; no browser run is claimed by these tests."""
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from tools.check_image_uniqueness_evidence import source_hashes, check_bound_uniqueness

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = 'evidence/image-uniqueness-2026-11-05/report.json'


class ImageUniquenessBindingTest(unittest.TestCase):
    def test_current_report_is_source_bound_and_free_of_new_duplicates(self):
        self.assertEqual(check_bound_uniqueness(ROOT), 43)

    def test_fail_closed_on_source_drift_and_new_duplicate(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for relative in list(source_hashes(ROOT)) + [EVIDENCE]:
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / relative, path)
            self.assertEqual(check_bound_uniqueness(root), 43)
            # a drift in any bound source must fail closed
            for relative in ('apps/site/tests/browser-image-uniqueness.mjs', 'config/image-uniqueness-baseline.json'):
                path = root / relative
                before = path.read_bytes()
                path.write_bytes(before + b'\n')
                with self.assertRaisesRegex(ValueError, 'stale|baseline count'):
                    check_bound_uniqueness(root)
                path.write_bytes(before)
            # a new duplicate outside the baseline must fail closed
            report = root / EVIDENCE
            original = report.read_text()
            changed = json.loads(original)
            changed['neu'] = 1
            changed['neue_mehrfachbilder'] = ['/media/atelier/new-duplicate.webp']
            changed['passed'] = False
            report.write_text(json.dumps(changed))
            with self.assertRaisesRegex(ValueError, 'new duplicate'):
                check_bound_uniqueness(root)
            report.write_text(original)
            self.assertEqual(check_bound_uniqueness(root), 43)
