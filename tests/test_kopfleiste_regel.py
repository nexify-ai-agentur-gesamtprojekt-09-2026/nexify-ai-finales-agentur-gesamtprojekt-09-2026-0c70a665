"""Regel der Kopfleiste (tools/kopfleiste-regel.mjs): bindet den Node-Test in die Python-Suite ein."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class KopfleisteRegelTest(unittest.TestCase):
    def test_node_regeltest(self):
        lauf = subprocess.run(['node', '--test', str(ROOT / 'tests/kopfleiste-regel.test.mjs')],
                              cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(lauf.returncode, 0, lauf.stdout + lauf.stderr)


if __name__ == '__main__':
    unittest.main()
