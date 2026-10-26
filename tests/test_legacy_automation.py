"""Retired legacy CLIs must stop before reading secrets or causing side effects.

Run actual Node subprocesses with synthetic credentials and dangerous old flags.
Preload tripwires prevent any real private-file, network or child-process call.
"""
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
ENTRIES = ["factory-adapter.mjs", "factory-intake.mjs", "factory-worker.mjs", "factory-korrektur.mjs"]

PRELOAD = r"""
const fs = require('node:fs');
const { syncBuiltinESMExports } = require('node:module');
const append = fs.appendFileSync.bind(fs);
function stop(kind) {
  append(process.env.LEGACY_TEST_EVENTS, kind + '\n');
  throw new Error('LOCAL_TEST_SIDE_EFFECT_TRIPWIRE');
}
function privatePath(value) {
  const p = String(value);
  return p === process.env.LEGACY_TEST_PRIVATE || p.startsWith('/opt/') ||
    /(^|\/)\.env(?:[./]|$)/.test(p) || /\.(?:pem|key)$/.test(p);
}
for (const method of ['readFileSync', 'readFile', 'createReadStream', 'open', 'openSync']) {
  const original = fs[method];
  fs[method] = function (p, ...args) {
    if (privatePath(p)) stop('private-file');
    return original.call(this, p, ...args);
  };
}
const fsp = require('node:fs/promises');
for (const method of ['readFile', 'open']) {
  const original = fsp[method];
  fsp[method] = function (p, ...args) {
    if (privatePath(p)) stop('private-file');
    return original.call(this, p, ...args);
  };
}
globalThis.fetch = () => stop('network');
for (const scheme of ['node:http', 'node:https']) {
  const client = require(scheme);
  client.request = client.get = () => stop('network');
}
const net = require('node:net');
net.connect = net.createConnection = net.Socket.prototype.connect = () => stop('network');
const cp = require('node:child_process');
for (const method of ['exec', 'execFile', 'execSync', 'execFileSync', 'spawn', 'spawnSync', 'fork']) {
  cp[method] = () => stop('child-process');
}
syncBuiltinESMExports();
"""


class RetiredAutomationContracts(unittest.TestCase):
    def setUp(self):
        self.node = shutil.which("node")
        self.assertIsNotNone(self.node, "The repository requires Node for real CLI tests")
        self.directory = tempfile.TemporaryDirectory(prefix="nexify-retired-cli-")
        self.addCleanup(self.directory.cleanup)
        self.fixture = Path(self.directory.name)
        self.preload = self.fixture / "tripwires.cjs"
        self.preload.write_text(PRELOAD)
        self.events = self.fixture / "events.log"
        self.fake_calls = self.fixture / "fake-child.log"
        self.private = self.fixture / ".env"
        self.private.write_text("LOCAL_ONLY_FIXTURE=must-not-be-read\n")
        self.bin = self.fixture / "bin"
        self.bin.mkdir()
        for name in ["curl", "git", "ssh", "nx-jeff", "python3", "bash", "node"]:
            executable = self.bin / name
            executable.write_text('#!/bin/sh\nprintf "fake child called\\n" >> "$LEGACY_TEST_FAKE_CALLS"\nexit 99\n')
            executable.chmod(0o700)
        # Deliberately do not inherit real credentials or NODE_OPTIONS.
        self.env = {
            "PATH": str(self.bin), "LANG": "C.UTF-8",
            "LEGACY_TEST_EVENTS": str(self.events),
            "LEGACY_TEST_FAKE_CALLS": str(self.fake_calls),
            "LEGACY_TEST_PRIVATE": str(self.private),
            "GITLAB_TOKEN": "local-test-fixture-not-a-credential",
            "GH_TOKEN": "local-test-fixture-not-a-credential",
            "NEXIFY_API_KEY": "local-test-fixture-not-a-credential",
            "NX_ORAKEL_KEY": "local-test-fixture-not-a-credential",
            "GITLAB_URL": "https://example.invalid",
            "NX_ROUTER_URL": "https://example.invalid/v1",
            "ALLOW_UNSAFE_LEGACY_AUTOMATION": "true",
            "ENABLE_LEGACY_FACTORY": "true",
        }

    def invoke(self, *args):
        return subprocess.run(
            [self.node, "--require", str(self.preload), *args],
            cwd=ROOT, env=self.env, capture_output=True, text=True, timeout=10,
        )

    def assert_retired(self, entry, *arguments):
        result = self.invoke(str(ROOT / "tools" / entry), *arguments)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertEqual(result.stdout, "")
        self.assertIn("LEGACY_AUTOMATION_RETIRED", result.stderr)
        self.assertIn(entry, result.stderr)
        self.assertNotIn(self.env["GITLAB_TOKEN"], result.stderr)
        self.assertFalse(self.events.exists(), self.events.read_text() if self.events.exists() else "")
        self.assertFalse(self.fake_calls.exists())

    def test_all_retired_entrypoints_stop_with_no_arguments(self):
        for entry in ENTRIES:
            with self.subTest(entry=entry):
                self.assert_retired(entry)

    def test_credentials_old_flags_and_bypass_flags_do_not_reactivate(self):
        for entry in ENTRIES:
            with self.subTest(entry=entry):
                self.assert_retired(
                    entry, "--issue", "1", "--mr", "1", "--label", "factory-task",
                    "--merge", "--base", "main", "--task", "Local untrusted test fixture",
                    "--file", ".gitlab-ci.yml", "--content-file", str(self.private),
                    "--unsafe", "--enable", "--force",
                )

    def test_tripwires_detect_private_read_network_and_child_attempts(self):
        probes = [
            ("private-file", "require('node:fs').readFileSync(process.env.LEGACY_TEST_PRIVATE)"),
            ("network", "fetch('https://example.invalid')"),
            ("child-process", "require('node:child_process').execFileSync('curl', ['https://example.invalid'])"),
        ]
        for expected, code in probes:
            with self.subTest(probe=expected):
                self.events.unlink(missing_ok=True)
                result = self.invoke("-e", code)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.events.read_text(), expected + "\n")
                self.assertFalse(self.fake_calls.exists())


if __name__ == "__main__":
    unittest.main()
