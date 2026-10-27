#!/usr/bin/env python3
"""Bind saved browser evidence to current sources; never launch/replace a browser test.

This read-only check verifies recorded assertions, not their truth at runtime or
production acceptance. All readable paths are constants, never artifact fields.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import sys


SOURCE_PATHS = (
    "apps/site/src/Auth.tsx",
    "apps/site/src/main.tsx",
    "apps/web/app/globals.css",
    "apps/web/components/HomeContent.tsx",
    "apps/web/components/Workspace.tsx",
    "apps/web/components/PublicContentLayout.css",
    "config/site-map.json",
)
EVIDENCE_PATH = "docs/design/detail-browser-evidence.json"
SDK_SOURCE_PATHS = (
    "apps/web/components/PublicOrientationChat.tsx",
    "apps/web/components/PublicOrientationChat.css",
    "api/agent-chat.ts",
    "packages/agent-runtime/public-orientation.ts",
    "tools/agent-preview.mjs",
)
AUXILIARY_SOURCE_PATHS = (
    "apps/site/src/main.tsx",
    "apps/web/components/WorkspaceRebuild.css",
    "apps/web/components/HomeRebuild.css",
    "packages/tokens/tokens.css",
    "apps/site/tests/browser-critical.mjs",
)
SDK_CRITICAL_CHECKS = frozenset((
    "sdk_guided_preview_works_when_visitor_session_is_404",
    "sdk_unknown_and_private_page_context_fail_closed_with_draft_retained",
    "sdk_mobile_real_chat_no_overflow_escape_and_focus_return",
))
CRITICAL_CHECKS = frozenset((
    "account_control_fallback_and_auth_routes_present",
    "keyboard_skip_link_preserves_standalone_product_hash_route",
    "nex2fly_product_copy_all_locales_and_section_focus_preserves_route",
    "uncropped_presenter_contain_and_no_overflow_across_five_desktop_sizes",
    "native_product_menu_and_direct_legal_footer_links",
))
GUTTER_PATHS = ("/produkte/nex2fly", "/teileklar/werkstatt", "/impressum")


class EvidenceError(Exception):
    pass


def _read(root, relative):
    # Callers pass only constants above. Reject even fixed-path symlinks escaping
    # the selected repository, before opening anything.
    file = root / relative
    try:
        if not file.resolve().is_relative_to(root):
            raise EvidenceError("source_path_escapes_repository")
        return file.read_bytes()
    except (OSError, RuntimeError):
        raise EvidenceError("required_file_missing_or_unreadable: " + relative) from None


def _json(raw):
    def unique(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("duplicate key")
            result[key] = value
        return result
    def constant(_):
        raise ValueError("nonfinite number")
    try:
        value = json.loads(raw, object_pairs_hook=unique, parse_constant=constant)
    except (ValueError, UnicodeError, RecursionError):
        raise EvidenceError("invalid_evidence_or_site_map_json") from None
    if not isinstance(value, dict):
        raise EvidenceError("json_object_required")
    return value


def check_evidence(root):
    """Return a narrow binding result, or raise EvidenceError. No file is written."""
    root = Path(root).resolve()
    evidence = _json(_read(root, EVIDENCE_PATH))
    if evidence.get("passed") is not True:
        raise EvidenceError("recorded_browser_pass_required")
    hashes = evidence.get("source_sha256")
    if not isinstance(hashes, dict) or set(hashes) != set(SOURCE_PATHS):
        raise EvidenceError("exact_source_path_set_required")
    sources = {}
    for relative in SOURCE_PATHS:
        expected = hashes[relative]
        if not isinstance(expected, str) or not re.fullmatch(r"[0-9a-f]{64}", expected):
            raise EvidenceError("invalid_source_sha256: " + relative)
        sources[relative] = _read(root, relative)
        if hashlib.sha256(sources[relative]).hexdigest() != expected:
            raise EvidenceError("stale_source_sha256: " + relative)
    checks = evidence.get("checks")
    if not isinstance(checks, list) or any(not isinstance(item, str) for item in checks) or not CRITICAL_CHECKS.issubset(checks):
        raise EvidenceError("critical_browser_check_missing")
    auxiliary = evidence.get("auxiliary_source_sha256")
    if not isinstance(auxiliary, dict) or set(auxiliary) != set(AUXILIARY_SOURCE_PATHS):
        raise EvidenceError("exact_auxiliary_source_path_set_required")
    for relative in AUXILIARY_SOURCE_PATHS:
        if hashlib.sha256(_read(root, relative)).hexdigest() != auxiliary[relative]:
            raise EvidenceError("stale_auxiliary_source_sha256: " + relative)
    sdk_hashes = evidence.get("sdk_source_sha256")
    if not isinstance(sdk_hashes, dict) or set(sdk_hashes) != set(SDK_SOURCE_PATHS):
        raise EvidenceError("exact_sdk_source_path_set_required")
    for relative in SDK_SOURCE_PATHS:
        if hashlib.sha256(_read(root, relative)).hexdigest() != sdk_hashes[relative]:
            raise EvidenceError("stale_sdk_source_sha256: " + relative)
    sdk = evidence.get("sdk_browser_observations")
    if (not isinstance(sdk, dict) or sdk.get("passed") is not True
            or not isinstance(sdk.get("checks"), list)
            or any(not isinstance(item, str) for item in sdk["checks"])
            or not SDK_CRITICAL_CHECKS.issubset(sdk["checks"])):
        raise EvidenceError("critical_sdk_browser_check_missing")
    mapping = _json(sources["config/site-map.json"])
    try:
        allowlist = mapping["public_allowlist"]
        pages = mapping["pages"]
        if not isinstance(allowlist, list) or any(not isinstance(item, str) for item in allowlist) or not isinstance(pages, list):
            raise ValueError()
        allowed = set(allowlist)
        routes = {page["path"] for page in pages if page["id"] in allowed and
                  page["access"]["visibility"] == "public" and page["access"]["auth_required"] is False}
        if not routes or any(not isinstance(path, str) or not path.startswith("/") for path in routes):
            raise ValueError()
    except (KeyError, TypeError, ValueError):
        raise EvidenceError("invalid_public_route_configuration") from None
    recorded = evidence.get("public_routes")
    if not isinstance(recorded, list) or any(not isinstance(path, str) for path in recorded) or len(set(recorded)) != len(recorded) or set(recorded) != routes:
        raise EvidenceError("recorded_public_route_set_mismatch")
    expected_rows = {(width, path) for width in (1920, 390) for path in GUTTER_PATHS}
    rows = evidence.get("targeted_supplement_gutter_followup")
    if not isinstance(rows, list) or len(rows) != len(expected_rows):
        raise EvidenceError("six_gutter_measurements_required")
    seen = set()
    for row in rows:
        if not isinstance(row, dict) or type(row.get("width")) is not int or not isinstance(row.get("path"), str):
            raise EvidenceError("invalid_gutter_measurement")
        key = (row["width"], row["path"])
        if key not in expected_rows or key in seen or row.get("passed") is not True:
            raise EvidenceError("invalid_or_duplicate_gutter_measurement")
        gutter = row.get("gutter")
        if not isinstance(gutter, dict):
            raise EvidenceError("gutter_dimensions_required")
        for edge in ("left", "right"):
            amount = gutter.get(edge)
            if type(amount) not in (int, float) or amount < 24 or amount > row["width"] or not math.isfinite(amount):
                raise EvidenceError("gutter_below_24px_or_invalid")
        seen.add(key)
    return {"status": "passed", "scope": "stored_browser_evidence_binding_only",
            "source_count": len(SOURCE_PATHS), "sdk_source_count": len(SDK_SOURCE_PATHS),
            "public_route_count": len(routes), "gutter_rows": len(seen)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        result = check_evidence(args.root)
    except EvidenceError as error:
        print("Browser evidence binding failed: " + str(error), file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
