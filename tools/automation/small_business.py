#!/usr/bin/env python3
"""Read pinned Anthropic Small Business guidance and prepare native draft plans.

This installs source documents, not a Cowork runtime or authenticated connectors.
It never sends messages, spends money, executes source code, or starts a scheduler.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import tarfile
import tempfile
import urllib.parse
import urllib.request

REPO = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = REPO / "config/integrations/small-business.json"


class SourceError(Exception):
    """A source or mapping is unavailable or inconsistent; do not proceed."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise SourceError("Archive redirect refused")


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def safe_path(root, relative):
    if not isinstance(relative, str) or not relative or "\\" in relative:
        raise SourceError("Invalid source path")
    parts = PurePosixPath(relative)
    if parts.is_absolute() or any(part in {"..", ".git"} for part in parts.parts):
        raise SourceError("Source path escapes the installed library")
    root = Path(root)
    candidate = root / relative
    current = root
    if root.is_symlink():
        raise SourceError("Source root must not be a symlink")
    for part in parts.parts:
        current = current / part
        if current.is_symlink():
            raise SourceError("Source symlinks are not accepted")
    if not candidate.resolve().is_relative_to(root.resolve()):
        raise SourceError("Source path escapes the installed library")
    return candidate


def source_root(config, override=None):
    if override is not None:
        return Path(override)
    return REPO.parent / config["source"]["default_cache_relative_to_workspace"]


def checked_read(root, item):
    expected_bytes = item.get("bytes")
    if type(expected_bytes) is not int or not 0 <= expected_bytes <= 8388608:
        raise SourceError("Invalid source size bound")
    path = safe_path(root, item.get("path"))
    if not path.is_file():
        raise SourceError(f"Source unavailable: {item.get('path')}")
    with path.open("rb") as stream:
        raw = stream.read(expected_bytes + 1)
    if len(raw) != expected_bytes or digest(raw) != item.get("sha256"):
        raise SourceError(f"Source hash mismatch: {item.get('path')}")
    return raw


def verify(config, root):
    records = config.get("source_files", [])
    if not records:
        raise SourceError("Empty source inventory")
    seen = set()
    for item in records:
        relative = item.get("path")
        if relative in seen:
            raise SourceError("Duplicate source inventory path")
        seen.add(relative)
        checked_read(root, item)
    workflows = config.get("workflows", [])
    ids = [w.get("id") for w in workflows]
    if len(ids) != len(set(ids)) or len(ids) != config.get("skills_count"):
        raise SourceError("Workflow identity/count mismatch")
    expected = {item["path"]: item for item in records}
    for workflow in workflows:
        source = workflow.get("source", {})
        path = source.get("path")
        if path not in expected or source.get("sha256") != expected[path]["sha256"]:
            raise SourceError("Workflow is not bound to the source inventory")
        if path != f"small-business/skills/{workflow['id']}/SKILL.md":
            raise SourceError("Workflow identity/source path mismatch")
    return {"status": "installed_readable_hash_verified", "source_files": len(records),
            "skills": len(workflows), "commit": config["source"]["commit"],
            "connectors_authenticated": False, "workflow_execution_performed": False}


def workflow(config, name):
    if not isinstance(name, str) or not re.fullmatch(r"[a-z]+(?:-[a-z]+)*", name):
        raise SourceError("Invalid workflow name")
    matches = [item for item in config.get("workflows", []) if item.get("id") == name]
    if len(matches) != 1:
        raise SourceError("Unknown workflow")
    return matches[0]


def verify_native_mapping(config, repository):
    binding = config.get("native_contract")
    if binding is None:
        return
    path = safe_path(repository, binding["path"])
    raw = path.read_bytes()
    if digest(raw) != binding["sha256"]:
        raise SourceError("Native API contract changed; review workflow mappings")
    contract = json.loads(raw)
    operations = {operation["operationId"]: (method.upper(), path, operation)
                  for path, item in contract.get("paths", {}).items()
                  for method, operation in item.items()
                  if method in {"get", "post", "put", "patch", "delete", "head", "options"}}
    for item in config["workflows"]:
        for proposed in item["native_mapping"]["api_mcp_sdk"]:
            current = operations.get(proposed["operation_id"])
            if current is None or current[:2] != (proposed["method"], proposed["path"]):
                raise SourceError("Workflow points to a missing or changed API operation")
            auth = current[2].get("x-authorization", {})
            if proposed.get("scopes") != auth.get("scopes"):
                raise SourceError("Workflow scope differs from its API contract")
            if current[2].get("x-implementation-status") != "proposed_not_implemented":
                raise SourceError("Review mapping status after runtime contract promotion")


def load(config, root, name, include_references=False):
    verify(config, root)
    selected = workflow(config, name)
    paths = list(config.get("shared_rules", [])) + [selected["source"]["path"]]
    if include_references:
        paths += selected.get("local_reference_paths", [])
    inventory = {item["path"]: item for item in config["source_files"]}
    output = []
    for relative in dict.fromkeys(paths):
        if relative not in inventory:
            raise SourceError("Requested reference is not in the pinned inventory")
        raw = checked_read(root, inventory[relative])
        output.append({"path": relative, "sha256": digest(raw), "content": raw.decode("utf-8")})
    return output


def plan(config, root, name, tenant_id, project_id):
    verify(config, root)
    for identifier in (tenant_id, project_id):
        if not isinstance(identifier, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", identifier):
            raise SourceError("A concrete tenant and project identity are required")
    selected = workflow(config, name)
    return {"schema_version": 1, "state": "draft_plan_not_executed", "workflow": name,
            "source_commit": config["source"]["commit"], "source_sha256": selected["source"]["sha256"],
            "tenant_id": tenant_id, "project_id": project_id,
            "mapping": selected["native_mapping"], "connectors": selected.get("connectors", {}),
            "mode": "approval", "external_actions_executed": 0,
            "authorization": "Reuse exact existing scope; installation is not authority for sends, spending or publishing.",
            "scheduler_created": False}


def install(config, destination):
    """Reproduce the exact source library without running upstream installers."""
    source = config["source"]
    commit = source["commit"]
    if not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise SourceError("Invalid pinned source commit")
    expected_url = f"https://codeload.github.com/anthropics/knowledge-work-plugins/tar.gz/{commit}"
    if source["archive_url"] != expected_url:
        raise SourceError("Unreviewed source repository or archive URL")
    destination = Path(destination)
    if destination.is_symlink():
        raise SourceError("Install destination must not be a symlink")
    if destination.exists():
        return verify(config, destination)
    maximum = source.get("max_archive_bytes")
    if type(maximum) is not int or not 1 <= maximum <= 33554432:
        raise SourceError("Invalid archive size limit")
    with urllib.request.build_opener(NoRedirect()).open(expected_url, timeout=45) as response:
        if urllib.parse.urlsplit(response.url).hostname != "codeload.github.com":
            raise SourceError("Unexpected archive redirect origin")
        raw = response.read(maximum + 1)
    if len(raw) > maximum or digest(raw) != source["archive_sha256"]:
        raise SourceError("Archive integrity or size check failed")
    destination.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix="small-business-source-", dir=destination.parent))
    try:
        expected = {item["path"]: item for item in config["source_files"]}
        extracted = set()
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as archive:
            for member in archive.getmembers():
                path = PurePosixPath(member.name)
                if path.is_absolute() or ".." in path.parts:
                    raise SourceError("Unsafe archive member")
                if not path.parts or path.parts[0] != source["archive_top"]:
                    raise SourceError("Unexpected archive root")
                relative = str(PurePosixPath(*path.parts[1:]))
                if relative not in expected:
                    continue
                if relative in extracted or not member.isfile() or member.size != expected[relative]["bytes"]:
                    raise SourceError("Unsafe or duplicated selected archive member")
                data = archive.extractfile(member).read()
                if digest(data) != expected[relative]["sha256"]:
                    raise SourceError("Selected source integrity mismatch")
                target = safe_path(stage, relative)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                extracted.add(relative)
        if extracted != set(expected):
            raise SourceError("Incomplete selected source archive")
        report = verify(config, stage)
        # Never overwrite a newly appeared installation or unrelated directory.
        if destination.exists():
            return verify(config, destination)
        os.rename(stage, destination)
        return report
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--source-root", type=Path)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("install")
    sub.add_parser("verify")
    sub.add_parser("list")
    loader = sub.add_parser("load")
    loader.add_argument("name")
    loader.add_argument("--references", action="store_true")
    planner = sub.add_parser("plan")
    planner.add_argument("name")
    planner.add_argument("--tenant", required=True)
    planner.add_argument("--project", required=True)
    args = parser.parse_args()
    try:
        config = json.loads(args.config.read_text())
        verify_native_mapping(config, REPO)
        root = source_root(config, args.source_root)
        if args.command == "install":
            result = install(config, root)
        elif args.command == "verify":
            result = verify(config, root)
        elif args.command == "list":
            verify(config, root)
            result = [{"id": item["id"], "group": item["group"], "trigger": item["trigger"],
                       "mode": item["default_mode"]} for item in config["workflows"]]
        elif args.command == "load":
            result = load(config, root, args.name, args.references)
        else:
            result = plan(config, root, args.name, args.tenant, args.project)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (SourceError, OSError, ValueError, KeyError, tarfile.TarError) as error:
        # Do not dump network error bodies, auth headers, source documents or
        # unexpected exception messages into CI logs.
        message = str(error) if isinstance(error, SourceError) else type(error).__name__
        print(json.dumps({"status": "blocked", "error": message, "actions_executed": 0}))
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
