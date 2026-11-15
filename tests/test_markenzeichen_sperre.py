"""Design-Sperre: die additive Nur-Lese-Pruefung bindet das sichtbare Design an
den eingefrorenen Normstand. Dieser Test aendert KEINE echte Designdatei; er
arbeitet mit Kopien in einem temporaeren Verzeichnis und prueft die Mechanik des
Skripts tools/markenzeichen-sperre.sh.
"""
import hashlib
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SCRIPT = REPO / "tools/markenzeichen-sperre.sh"
MANIFEST = REPO / "docs/01-konzept/markenzeichen-normstand-2026-11-14.sha256"
# Eine echte, gebundene Designdatei als Vorlage fuer die Kopie (wird nie veraendert).
DESIGN_SOURCE = REPO / "config/design-tokens.json"


def run(manifest_path, cwd):
    return subprocess.run(
        ["bash", str(SCRIPT), str(manifest_path)],
        cwd=str(cwd), capture_output=True, text=True,
    )


class MarkenzeichenSperreTests(unittest.TestCase):
    def test_script_and_manifest_exist(self):
        self.assertTrue(SCRIPT.is_file(), "Pruefskript fehlt")
        self.assertTrue(MANIFEST.is_file(), "Normstand-Manifest fehlt")

    def test_real_design_matches_the_frozen_normstand(self):
        # Positivfall gegen den echten Stand: alle gelisteten Designdateien stimmen.
        # Geht dieser Test rot, ist das sichtbare Design gedriftet ODER das Manifest
        # wurde ohne Freigabe nachgezogen -> Befund, kein Anlass zum Anpassen.
        result = run(MANIFEST, REPO)
        self.assertEqual(result.returncode, 0,
                         "Design weicht vom Normstand ab:\n" + result.stdout + result.stderr)

    def test_unchanged_copy_passes_and_modified_copy_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            copy = tmp / "design-kopie.json"
            data = DESIGN_SOURCE.read_bytes()
            copy.write_bytes(data)
            digest = hashlib.sha256(data).hexdigest()
            manifest = tmp / "normstand.sha256"
            manifest.write_text(f"{digest}  design-kopie.json\n", encoding="utf-8")

            # Unveraenderte Kopie -> Pruefung gruen (Exit 0).
            ok = run(manifest, tmp)
            self.assertEqual(ok.returncode, 0, ok.stdout + ok.stderr)

            # Absichtlich veraenderte Kopie -> Pruefung rot (Exit 1), mit Hinweis
            # auf Sperrregel und Rueckweg. Keine echte Designdatei wird beruehrt.
            copy.write_bytes(data + b"\n/* drift */\n")
            bad = run(manifest, tmp)
            self.assertEqual(bad.returncode, 1, "Drift wurde nicht erkannt")
            self.assertIn("DESIGN-DRIFT", bad.stderr)
            self.assertIn("markenzeichen-sicherung", bad.stderr)

    def test_missing_manifest_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            res = run(Path(tmp) / "fehlt.sha256", Path(tmp))
            self.assertEqual(res.returncode, 2)


if __name__ == "__main__":
    unittest.main()
