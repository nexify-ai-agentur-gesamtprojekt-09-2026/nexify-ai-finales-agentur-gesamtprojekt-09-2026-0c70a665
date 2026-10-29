"""Voice draft tool: cost gate, character cap, voice mapping and manifest. Fake provider only."""
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("voice_production", ROOT / "tools/voice_production.py")
voice = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(voice)
SCRIPT = ROOT / "docs/production/begruessungsfilm-sprechtext.json"


class Reply(io.BytesIO):
    status, headers = 200, {"Content-Type": "audio/mpeg"}

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


class VoiceProduction(unittest.TestCase):
    def test_script_matches_master_text_and_every_speaker_has_a_provisional_voice(self):
        script = json.loads(SCRIPT.read_text(encoding="utf-8"))
        config = json.loads((ROOT / "config/integrations/elevenlabs.json").read_text(encoding="utf-8"))
        master = (ROOT / "docs/09-final/mastervorgabe-2026-10-29.md").read_text(encoding="utf-8")
        for segment in script["segments"]:
            self.assertIn(segment["text"], master)
            self.assertEqual(config["video_voices"][segment["speaker"]]["approval"], "provisional_pending_pascal")

    def test_draft_manifest_binds_hashes_and_never_claims_approval(self):
        calls = []

        def opener(req, timeout):
            calls.append(req.full_url)
            return Reply(b"ID3" + bytes(16000))
        with tempfile.TemporaryDirectory() as tmp:
            manifest = voice.synthesize(SCRIPT, tmp, "xi_test", 1500, opener=opener)
            self.assertEqual(len(calls), 4)
            self.assertEqual(manifest["status"], "entwurf_stimme_nicht_freigegeben")
            self.assertTrue(all(Path(tmp, item["file"]).is_file() for item in manifest["files"]))
            self.assertTrue(Path(tmp, "med-02-begruessung-sprechtext-manifest.json").is_file())

    def test_cost_gate_and_character_cap(self):
        with mock.patch.dict("os.environ", {"ELEVENLABS_API_KEY": "xi_test"}):
            with self.assertRaises(SystemExit) as gate:
                voice.main(["synthesize", "--script", str(SCRIPT), "--max-chars", "1500"])
            self.assertIn("confirm-cost", str(gate.exception))
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(SystemExit) as cap:
            voice.synthesize(SCRIPT, tmp, "xi_test", 100, opener=lambda req, timeout: Reply(b"x"))
        self.assertIn("character_cap_exceeded", str(cap.exception))


if __name__ == "__main__":
    unittest.main()
