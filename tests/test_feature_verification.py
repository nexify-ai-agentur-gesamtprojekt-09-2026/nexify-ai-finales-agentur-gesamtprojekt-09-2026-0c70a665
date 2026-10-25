"""Exercise real feature-verification commands against isolated harness fixtures."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FeatureVerificationTests(unittest.TestCase):
    def fixture(self, state="active", command="node -e 'process.exit(0)'", extra=None):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        (root / "scripts").mkdir()
        shutil.copyfile(ROOT / "scripts/verify-feature.sh", root / "scripts/verify-feature.sh")
        feature = {"id": "F-TEST", "behavior": "fixture", "state": state,
                   "layers": [{"label": "real subprocess", "cmd": command, "repair": "fixture"}]}
        data = {"wip": 1, "features": [feature] + (extra or [])}
        path = root / "feature_list.json"
        path.write_text(json.dumps(data) + "\n")
        return root, path

    def verify(self, root):
        return subprocess.run(["bash", "scripts/verify-feature.sh", "F-TEST"],
                              cwd=root, capture_output=True, text=True)

    def test_success_records_only_the_active_feature(self):
        other = {"id": "F-OTHER", "behavior": "untouched", "state": "passing", "layers": []}
        root, path = self.fixture(extra=[other])
        result = self.verify(root)
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(path.read_text())
        self.assertEqual(data["features"][0]["state"], "passing")
        self.assertIn("keine Produktivabnahme", data["features"][0]["evidence"])
        self.assertIn("verified_at", data["features"][0])
        self.assertEqual(data["features"][1], other)
        self.assertFalse(list(root.glob('feature_list.json.*.verify.tmp')))

    def test_failed_layer_preserves_state_and_evidence(self):
        root, path = self.fixture(command="node -e 'process.exit(7)'")
        original = path.read_bytes()
        self.assertNotEqual(self.verify(root).returncode, 0)
        self.assertEqual(path.read_bytes(), original)

    def test_not_started_or_multiple_active_features_are_not_promoted(self):
        for state, extra in [("not_started", []), ("active", [{"id": "F-OTHER", "state": "active"}])]:
            with self.subTest(state=state, other_active=bool(extra)):
                root, path = self.fixture(state=state, extra=extra)
                original = path.read_bytes()
                self.assertNotEqual(self.verify(root).returncode, 0)
                self.assertEqual(path.read_bytes(), original)

    def test_empty_layer_list_never_records_a_passing_feature(self):
        root, path = self.fixture()
        data = json.loads(path.read_text())
        data['features'][0]['layers'] = []
        path.write_text(json.dumps(data) + "\n")
        original = path.read_bytes()
        self.assertNotEqual(self.verify(root).returncode, 0)
        self.assertEqual(path.read_bytes(), original)

    def test_changed_definition_does_not_receive_stale_evidence(self):
        change = "node -e \"const fs=require('fs');const p='feature_list.json';let d=JSON.parse(fs.readFileSync(p));d.features[0].behavior='changed';fs.writeFileSync(p,JSON.stringify(d));\""
        root, path = self.fixture(command=change)
        self.assertNotEqual(self.verify(root).returncode, 0)
        feature = json.loads(path.read_text())['features'][0]
        self.assertEqual(feature['behavior'], 'changed')
        self.assertEqual(feature['state'], 'active')
        self.assertNotIn('verified_at', feature)

    def test_first_failure_and_failed_pipeline_are_not_hidden(self):
        for command in ["node -e 'process.exit(7)'; node -e 'process.exit(0)'", "node -e 'process.exit(7)' | node -e 'process.exit(0)'"]:
            with self.subTest(command=command):
                root, path = self.fixture(command=command)
                original = path.read_bytes()
                self.assertNotEqual(self.verify(root).returncode, 0)
                self.assertEqual(path.read_bytes(), original)

    def test_layer_cwd_does_not_change_the_recorder_cwd(self):
        root, path = self.fixture(command="cd sub && node -e 'process.exit(0)'")
        (root / 'sub').mkdir()
        result = self.verify(root)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(path.read_text())['features'][0]['state'], 'passing')

    def test_concurrent_verifiers_share_an_exclusive_lock(self):
        root, path = self.fixture(command="touch entered && sleep 0.3")
        first = subprocess.Popen(['bash', 'scripts/verify-feature.sh', 'F-TEST'], cwd=root,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            deadline = time.monotonic() + 5
            while not (root / 'entered').exists() and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertTrue((root / 'entered').exists())
            second = self.verify(root)
            self.assertEqual(second.returncode, 75, second.stderr)
            _, error = first.communicate(timeout=5)
            self.assertEqual(first.returncode, 0, error)
            self.assertEqual(json.loads(path.read_text())['features'][0]['state'], 'passing')
        finally:
            if first.poll() is None:
                first.kill()
                first.communicate()
