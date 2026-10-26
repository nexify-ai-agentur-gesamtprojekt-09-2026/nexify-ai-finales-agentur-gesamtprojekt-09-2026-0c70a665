#!/usr/bin/env python3
"""Build and verify a local deterministic static-site ZIP; never deploy or sync."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import secrets
import stat
import subprocess
import sys
import zipfile

REPOSITORY = Path(__file__).resolve().parents[1]
MAX_FILES = 10000
MAX_FILE_BYTES = 64 * 1024 * 1024
MAX_TOTAL_BYTES = 256 * 1024 * 1024
MAX_ARCHIVE_BYTES = 384 * 1024 * 1024
MAX_MANIFEST_BYTES = 8 * 1024 * 1024
FORMAT = "nexify-static-site-release"
EPOCH = (1980, 1, 1, 0, 0, 0)
FILE_MODE = (stat.S_IFREG | 0o644) << 16
SECRET_MARKERS = re.compile(
    rb"-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----"
    rb"|sk-or-v1-[a-fA-F0-9]{64}|gh[pousr]_[A-Za-z0-9]{36,}"
    rb"|github_pat_[A-Za-z0-9_]{40,}|glpat-[A-Za-z0-9_-]{20,}"
    rb"|AKIA[A-Z0-9]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{40,}"
    rb"|(?:sk|rk)_(?:live|test)_[A-Za-z0-9_=-]{16,}|whsec_[A-Za-z0-9]{20,}"
)


class ReleaseError(Exception):
    pass


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()


def safe_name(name):
    if not isinstance(name, str) or not name or len(name.encode("utf-8")) > 4096:
        raise ReleaseError("invalid_relative_path")
    parts = name.split("/")
    if ("\\" in name or ":" in name or any(ord(c) < 32 or ord(c) == 127 for c in name)
            or any(part in {"", ".", ".."} or part != part.strip() for part in parts)):
        raise ReleaseError("unsafe_relative_path")
    private_dirs = {".git", ".ssh", ".aws", ".codex", ".agents", ".config", "node_modules", "secrets"}
    private_names = {".npmrc", ".pypirc", ".netrc", ".git-credentials", "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
                     "service-account.json", "application_default_credentials.json", "auth.json", "token.json"}
    for part in parts:
        lower = part.lower()
        if lower in private_dirs or lower in private_names or lower.startswith((".env", "credentials", "secrets.")):
            raise ReleaseError("private_file_in_build")
    if Path(parts[-1]).suffix.lower() in {".pem", ".key", ".p12", ".pfx", ".jks", ".keystore"}:
        raise ReleaseError("private_file_in_build")
    return name


def no_symlink_components(path):
    path = Path(path).absolute()
    for component in (path, *path.parents):
        if component.is_symlink():
            raise ReleaseError("symlink_path_rejected")
    return path


def scan_names(root):
    names = []
    def unreadable(_):
        raise ReleaseError("input_directory_unreadable")
    for directory, directories, files in os.walk(root, followlinks=False, onerror=unreadable):
        for name in directories:
            if (Path(directory) / name).is_symlink():
                raise ReleaseError("symlink_input_rejected")
        for name in files:
            path = Path(directory) / name
            if path.is_symlink():
                raise ReleaseError("symlink_input_rejected")
            names.append(safe_name(path.relative_to(root).as_posix()))
            if len(names) > MAX_FILES:
                raise ReleaseError("file_count_limit")
    if not names or "index.html" not in names:
        raise ReleaseError("built_site_index_missing")
    if len({name.casefold() for name in names}) != len(names):
        raise ReleaseError("case_colliding_paths")
    return sorted(names)


def input_bytes(root_fd, name):
    """Open relative to directory FDs, refusing symlinks even during traversal."""
    opened = []
    try:
        current = root_fd
        for part in name.split("/")[:-1]:
            current = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=current)
            opened.append(current)
        fd = os.open(name.split("/")[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=current)
        with os.fdopen(fd, "rb") as stream:
            before = os.fstat(stream.fileno())
            if not stat.S_ISREG(before.st_mode) or before.st_size > MAX_FILE_BYTES:
                raise ReleaseError("input_type_or_size_rejected")
            raw = stream.read(MAX_FILE_BYTES + 1)
            after = os.fstat(stream.fileno())
        signature = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_ctime_ns)
        if len(raw) != before.st_size or signature(before) != signature(after):
            raise ReleaseError("input_changed_during_read")
        if SECRET_MARKERS.search(raw):
            raise ReleaseError("credential_marker_in_build")
        return raw, signature(after)
    finally:
        for fd in reversed(opened):
            os.close(fd)


def archive_bytes(payload):
    target = io.BytesIO()
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_STORED, allowZip64=False) as archive:
        for name, raw in sorted(payload.items()):
            info = zipfile.ZipInfo(name, EPOCH)
            info.create_system = 3
            info.compress_type = zipfile.ZIP_STORED
            info.external_attr = FILE_MODE
            archive.writestr(info, raw)
    return target.getvalue()


def git_metadata(repository):
    args = ["git", "--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null", "-C", str(repository)]
    try:
        commit = subprocess.check_output(args + ["rev-parse", "--verify", "HEAD^{commit}"], stderr=subprocess.DEVNULL, timeout=10).decode().strip()
        dirty = bool(subprocess.check_output(args + ["status", "--porcelain=v1", "--untracked-files=normal"], stderr=subprocess.DEVNULL, timeout=10))
    except (OSError, subprocess.SubprocessError):
        raise ReleaseError("git_metadata_unavailable") from None
    if not re.fullmatch(r"(?:[a-f0-9]{40}|[a-f0-9]{64})", commit):
        raise ReleaseError("invalid_source_commit")
    return commit, dirty


def publish_once(directory_fd, name, raw):
    """Atomic no-replace publication; a retry only accepts byte-identical output."""
    temporary = ".site-release-" + secrets.token_hex(16) + ".tmp"
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=directory_fd)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
            os.fchmod(stream.fileno(), 0o444)
        try:
            os.link(temporary, name, src_dir_fd=directory_fd, dst_dir_fd=directory_fd, follow_symlinks=False)
            os.fsync(directory_fd)
        except FileExistsError:
            existing_fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=directory_fd)
            with os.fdopen(existing_fd, "rb") as stream:
                existing = os.fstat(stream.fileno())
                if not stat.S_ISREG(existing.st_mode) or existing.st_size != len(raw) or stream.read(len(raw) + 1) != raw:
                    raise ReleaseError("immutable_release_conflict")
    finally:
        os.unlink(temporary, dir_fd=directory_fd)


def build(input_directory, output_directory, repository=REPOSITORY):
    repository = no_symlink_components(repository).resolve()
    source = no_symlink_components(input_directory)
    output = no_symlink_components(output_directory)
    if not source.is_dir() or not source.resolve().is_relative_to(repository):
        raise ReleaseError("input_must_be_built_site_inside_repository")
    if output.resolve().is_relative_to(source.resolve()):
        raise ReleaseError("output_must_not_be_inside_input")
    names = scan_names(source)
    payload, signatures, total = {}, {}, 0
    root_fd = os.open(source, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for name in names:
            raw, signature = input_bytes(root_fd, name)
            total += len(raw)
            if total > MAX_TOTAL_BYTES:
                raise ReleaseError("total_size_limit")
            payload[name], signatures[name] = raw, signature
    finally:
        os.close(root_fd)
    if names != scan_names(source):
        raise ReleaseError("input_catalog_changed")
    for name, signature in signatures.items():
        value = os.stat(source / name, follow_symlinks=False)
        if signature != (value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns, value.st_ctime_ns):
            raise ReleaseError("input_changed_during_build")
    records = [{"path": name, "bytes": len(raw), "sha256": sha256(raw)} for name, raw in sorted(payload.items())]
    tree = sha256(canonical(records))
    commit, dirty = git_metadata(repository)
    name = f"site-{commit[:12]}-{'dirty' if dirty else 'clean'}-{tree[:16]}"
    raw_archive = archive_bytes(payload)
    manifest = {"schema_version": 1, "artifact_type": FORMAT, "source_commit": commit, "source_dirty": dirty,
                "source_path": source.relative_to(repository).as_posix(), "tree_sha256": tree, "files": records,
                "archive_filename": name + ".zip", "archive_bytes": len(raw_archive), "archive_sha256": sha256(raw_archive),
                "deployment_performed": False}
    raw_manifest = json.dumps(manifest, sort_keys=True, ensure_ascii=False, indent=2).encode() + b"\n"
    output.mkdir(parents=True, exist_ok=True)
    no_symlink_components(output)
    directory_fd = os.open(output, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        publish_once(directory_fd, name + ".zip", raw_archive)
        publish_once(directory_fd, name + ".manifest.json", raw_manifest)
    finally:
        os.close(directory_fd)
    return {"archive": str(output / (name + ".zip")), "manifest": str(output / (name + ".manifest.json")),
            "archive_sha256": manifest["archive_sha256"], "source_commit": commit, "source_dirty": dirty, "files": len(records),
            "deployment_performed": False}


def read_regular(path, maximum):
    no_symlink_components(path)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > maximum:
            raise ReleaseError("artifact_type_or_size_rejected")
        raw = stream.read(maximum + 1)
    if len(raw) > maximum:
        raise ReleaseError("artifact_size_limit")
    return raw


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ReleaseError("duplicate_manifest_key")
        result[key] = value
    return result


def verify(archive_path, manifest_path=None):
    archive_path = Path(archive_path)
    manifest_path = Path(manifest_path) if manifest_path else archive_path.with_suffix(".manifest.json")
    manifest = json.loads(read_regular(manifest_path, MAX_MANIFEST_BYTES), object_pairs_hook=unique_keys)
    if not isinstance(manifest, dict) or type(manifest.get("schema_version")) is not int or manifest.get("schema_version") != 1 or manifest.get("artifact_type") != FORMAT:
        raise ReleaseError("unsupported_manifest")
    safe_name(manifest.get("source_path"))
    if not re.fullmatch(r"(?:[a-f0-9]{40}|[a-f0-9]{64})", str(manifest.get("source_commit", ""))) or type(manifest.get("source_dirty")) is not bool:
        raise ReleaseError("invalid_source_metadata")
    if manifest.get("deployment_performed") is not False:
        raise ReleaseError("invalid_deployment_claim")
    if manifest.get("archive_filename") != archive_path.name:
        raise ReleaseError("archive_name_mismatch")
    records = manifest.get("files")
    if not isinstance(records, list) or not 1 <= len(records) <= MAX_FILES:
        raise ReleaseError("invalid_manifest_catalog")
    expected, total = {}, 0
    for item in records:
        if not isinstance(item, dict):
            raise ReleaseError("invalid_manifest_catalog")
        name = safe_name(item.get("path"))
        size = item.get("bytes")
        if name in expected or type(size) is not int or not 0 <= size <= MAX_FILE_BYTES or not re.fullmatch(r"[a-f0-9]{64}", str(item.get("sha256", ""))):
            raise ReleaseError("invalid_manifest_catalog")
        total += size
        expected[name] = item
    if total > MAX_TOTAL_BYTES or "index.html" not in expected or len({name.casefold() for name in expected}) != len(expected):
        raise ReleaseError("invalid_manifest_catalog")
    if manifest.get("tree_sha256") != sha256(canonical(records)):
        raise ReleaseError("manifest_tree_hash_mismatch")
    raw_archive = read_regular(archive_path, MAX_ARCHIVE_BYTES)
    if len(raw_archive) != manifest.get("archive_bytes") or sha256(raw_archive) != manifest.get("archive_sha256"):
        raise ReleaseError("archive_integrity_mismatch")
    payload = {}
    with zipfile.ZipFile(io.BytesIO(raw_archive)) as archive:
        entries = archive.infolist()
        if len(entries) > MAX_FILES:
            raise ReleaseError("zip_entry_limit")
        names = [safe_name(entry.orig_filename) for entry in entries]
        if len(set(names)) != len(names) or any(name != entry.filename for name, entry in zip(names, entries)):
            raise ReleaseError("duplicate_or_ambiguous_zip_entry")
        for entry in entries:
            name = safe_name(entry.orig_filename)
            if name != entry.filename or name in payload:
                raise ReleaseError("duplicate_or_ambiguous_zip_entry")
            mode = entry.external_attr >> 16
            if entry.is_dir() or stat.S_IFMT(mode) not in {0, stat.S_IFREG} or entry.flag_bits & 1 or entry.compress_type != zipfile.ZIP_STORED:
                raise ReleaseError("zip_entry_type_rejected")
            if name not in expected:
                raise ReleaseError("extra_zip_entry")
            item = expected[name]
            if entry.file_size != item["bytes"] or entry.compress_size != entry.file_size:
                raise ReleaseError("zip_entry_size_mismatch")
            with archive.open(entry) as stream:
                raw = stream.read(item["bytes"] + 1)
            if len(raw) != item["bytes"] or sha256(raw) != item["sha256"]:
                raise ReleaseError("zip_entry_hash_mismatch")
            if SECRET_MARKERS.search(raw):
                raise ReleaseError("credential_marker_in_archive")
            payload[name] = raw
    if set(payload) != set(expected):
        raise ReleaseError("missing_zip_entry")
    if sha256(archive_bytes(payload)) != sha256(raw_archive):
        raise ReleaseError("noncanonical_zip_encoding")
    return {"status": "verified", "archive": str(archive_path), "manifest": str(manifest_path),
            "archive_sha256": sha256(raw_archive), "source_commit": manifest["source_commit"], "source_dirty": manifest["source_dirty"],
            "files": len(payload), "deployment_performed": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    builder = commands.add_parser("build")
    builder.add_argument("--input", type=Path, default=Path("apps/site/dist"))
    builder.add_argument("--output", type=Path, default=Path(".local/releases"))
    builder.add_argument("--repository", type=Path, default=REPOSITORY)
    checker = commands.add_parser("verify")
    checker.add_argument("--archive", type=Path, required=True)
    checker.add_argument("--manifest", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "build":
            repository = args.repository.absolute()
            source = args.input if args.input.is_absolute() else repository / args.input
            output = args.output if args.output.is_absolute() else repository / args.output
            result = build(source, output, repository)
        else:
            result = verify(args.archive, args.manifest)
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    except (ReleaseError, OSError, ValueError, TypeError, KeyError, RecursionError, zipfile.BadZipFile, zipfile.LargeZipFile) as error:
        code = str(error) if isinstance(error, ReleaseError) else type(error).__name__
        print(json.dumps({"status": "blocked", "error": code, "deployment_performed": False}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
