"""Exercise actual release archives, tampering, replay and unsafe inputs."""
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
import warnings
import zipfile

REPO = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("site_release", REPO / "tools/site_release.py")
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.source = self.root / "apps/site/dist"
        self.source.mkdir(parents=True)
        (self.source / "assets").mkdir()
        (self.source / "index.html").write_text('<!doctype html><script src="/assets/site.js"></script>')
        (self.source / "assets/site.js").write_text('document.body.dataset.status="ready";')
        (self.root / ".gitignore").write_text(".local/\n")
        self.output = self.root / ".local/releases"
        self.git("init", "-q")
        self.git("add", ".")
        self.git("-c", "user.name=Release test", "-c", "user.email=release-test@example.invalid", "commit", "-qm", "fixture")

    def tearDown(self):
        self.temporary.cleanup()

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), *args], stderr=subprocess.DEVNULL).decode().strip()

    def build(self):
        return release.build(self.source, self.output, self.root)

    def repack(self, result, transform):
        archive = Path(result["archive"])
        with zipfile.ZipFile(archive) as current:
            entries = [(entry, current.read(entry)) for entry in current.infolist()]
        buffer = io.BytesIO()
        with warnings.catch_warnings(), zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_STORED) as changed:
            warnings.simplefilter("ignore", UserWarning)
            for info, raw in transform(entries):
                changed.writestr(info, raw)
        raw = buffer.getvalue()
        archive.chmod(0o600)
        archive.write_bytes(raw)
        manifest = Path(result["manifest"])
        contents = json.loads(manifest.read_text())
        contents["archive_bytes"] = len(raw)
        contents["archive_sha256"] = hashlib.sha256(raw).hexdigest()
        manifest.chmod(0o600)
        manifest.write_text(json.dumps(contents))

    def test_round_trip_and_repeated_build_are_byte_identical(self):
        first = self.build()
        self.assertFalse(first["source_dirty"])
        before_zip = Path(first["archive"]).read_bytes()
        before_manifest = Path(first["manifest"]).read_bytes()
        os.utime(self.source / "index.html", (2000000000, 2000000000))
        second = self.build()
        self.assertEqual(first, second)
        self.assertEqual(before_zip, Path(second["archive"]).read_bytes())
        self.assertEqual(before_manifest, Path(second["manifest"]).read_bytes())
        report = release.verify(second["archive"])
        self.assertEqual(report["status"], "verified")
        self.assertEqual(report["source_commit"], self.git("rev-parse", "HEAD"))
        self.assertEqual(report["files"], 2)
        self.assertFalse(report["deployment_performed"])

    def test_cli_contract_build_and_verify(self):
        tool = REPO / "tools/site_release.py"
        built = json.loads(subprocess.check_output(
            [sys.executable, str(tool), "build", "--repository", str(self.root)], cwd=self.root, text=True))
        checked = json.loads(subprocess.check_output(
            [sys.executable, str(tool), "verify", "--archive", built["archive"]], cwd=self.root, text=True))
        self.assertEqual(checked["status"], "verified")
        self.assertEqual(built["archive_sha256"], checked["archive_sha256"])
        self.assertEqual(Path(built["archive"]).parent, self.output)

    def test_payload_tamper_detected_even_if_outer_archive_hash_is_updated(self):
        result = self.build()
        self.repack(result, lambda entries: [(info, b"changed" if info.filename == "index.html" else raw) for info, raw in entries])
        with self.assertRaisesRegex(release.ReleaseError, "zip_entry_(size|hash)_mismatch"):
            release.verify(result["archive"])

    def test_extra_missing_and_duplicate_zip_entries_rejected(self):
        mutations = [
            ("extra_zip_entry", lambda rows: rows + [(zipfile.ZipInfo("extra.js"), b"extra")]),
            ("missing_zip_entry", lambda rows: [row for row in rows if row[0].filename != "assets/site.js"]),
            ("duplicate_or_ambiguous_zip_entry", lambda rows: rows + [rows[0]]),
        ]
        for expected, transform in mutations:
            with self.subTest(mutation=expected):
                result = self.build()
                original_zip = Path(result["archive"]).read_bytes()
                original_manifest = Path(result["manifest"]).read_bytes()
                self.repack(result, transform)
                with self.assertRaisesRegex(release.ReleaseError, expected):
                    release.verify(result["archive"])
                Path(result["archive"]).write_bytes(original_zip)
                Path(result["manifest"]).write_bytes(original_manifest)

    def test_unsafe_archive_paths_and_symlink_entries_rejected(self):
        for name in ("../outside", "/absolute", "assets\\outside", "C:/outside", "assets//site.js", ".env.local"):
            with self.subTest(path=name):
                result = self.build()
                originals = (Path(result["archive"]).read_bytes(), Path(result["manifest"]).read_bytes())
                self.repack(result, lambda rows: rows + [(zipfile.ZipInfo(name), b"not allowed")])
                with self.assertRaises(release.ReleaseError):
                    release.verify(result["archive"])
                Path(result["archive"]).write_bytes(originals[0])
                Path(result["manifest"]).write_bytes(originals[1])
        result = self.build()
        info = zipfile.ZipInfo("index.html")
        info.create_system = 3
        info.external_attr = (stat.S_IFLNK | 0o777) << 16
        self.repack(result, lambda rows: [(info, b"../../private") if entry.filename == "index.html" else (entry, raw) for entry, raw in rows])
        with self.assertRaisesRegex(release.ReleaseError, "zip_entry_type_rejected"):
            release.verify(result["archive"])

    def test_input_symlinks_private_files_and_known_credentials_rejected(self):
        outside = self.root / "not-a-public-asset"
        outside.write_text("private material")
        link = self.source / "assets/link.js"
        link.symlink_to(outside)
        with self.assertRaisesRegex(release.ReleaseError, "symlink"):
            self.build()
        link.unlink()
        for name in (".env.production", "private.key", "private.pem", "credentials.json", "id_rsa", ".npmrc", "secrets.txt"):
            path = self.source / name
            path.write_text("private")
            with self.subTest(path=name), self.assertRaisesRegex(release.ReleaseError, "private_file"):
                self.build()
            path.unlink()
        marker = self.source / "assets/token.js"
        fixtures = [b"-----BEGIN PRIVATE KEY-----\nfixture, not a real key"]
        fixtures += [(family + "_" + mode + "_" + "A" * 32).encode()
                     for family in ("sk", "rk") for mode in ("live", "test")]
        fixtures.append(("whsec_" + "A" * 32).encode())
        for raw in fixtures:
            marker.write_bytes(raw)
            with self.subTest(marker_family=raw[:8]), self.assertRaisesRegex(release.ReleaseError, "credential_marker"):
                self.build()
        marker.write_text("pk_" + "live_" + "A" * 32)
        self.assertEqual(release.verify(self.build()["archive"])["status"], "verified")

    def test_dirty_metadata_changes_without_overwriting_a_previous_release(self):
        first = self.build()
        old = Path(first["archive"]).read_bytes()
        (self.source / "index.html").write_text("<h1>new build</h1>")
        second = self.build()
        self.assertTrue(second["source_dirty"])
        self.assertNotEqual(first["archive"], second["archive"])
        self.assertEqual(old, Path(first["archive"]).read_bytes())
        self.assertEqual(release.verify(first["archive"])["status"], "verified")
        self.assertEqual(release.verify(second["archive"])["status"], "verified")

    def test_immutable_conflict_output_inside_input_and_nonregular_input_rejected(self):
        result = self.build()
        archive = Path(result["archive"])
        archive.chmod(0o600)
        archive.write_bytes(b"unexpected existing output")
        with self.assertRaisesRegex(release.ReleaseError, "immutable_release_conflict"):
            self.build()
        self.assertEqual(archive.read_bytes(), b"unexpected existing output")
        with self.assertRaisesRegex(release.ReleaseError, "output_must_not_be_inside_input"):
            release.build(self.source, self.source / "releases", self.root)
        os.mkfifo(self.source / "assets/pipe")
        with self.assertRaisesRegex(release.ReleaseError, "input_type_or_size_rejected"):
            self.build()

    def test_ambiguous_manifest_and_unlisted_trailing_archive_bytes_rejected(self):
        result = self.build()
        manifest_path = Path(result["manifest"])
        original = manifest_path.read_bytes()
        manifest_path.chmod(0o600)
        manifest_path.write_bytes(b'{"schema_version":1,"schema_version":1}')
        with self.assertRaisesRegex(release.ReleaseError, "duplicate_manifest_key"):
            release.verify(result["archive"])
        manifest_path.write_bytes(original)
        archive = Path(result["archive"])
        archive.chmod(0o600)
        appended = archive.read_bytes() + b"unlisted trailing data"
        archive.write_bytes(appended)
        manifest = json.loads(original)
        manifest["archive_bytes"] = len(appended)
        manifest["archive_sha256"] = hashlib.sha256(appended).hexdigest()
        manifest_path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(release.ReleaseError, "noncanonical_zip_encoding"):
            release.verify(result["archive"])


if __name__ == "__main__":
    unittest.main()
