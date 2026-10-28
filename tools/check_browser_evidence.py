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
    "apps/web/components/DeferredChatBoundary.tsx",
    "apps/web/components/PublicRequestFallback.tsx",
    "apps/web/components/OracleCompanion.tsx",
    "apps/web/components/OracleCompanion.css",
    "apps/web/lib/i18n.ts",
    "apps/web/public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png",
    "apps/web/components/PublicExperience.tsx",
    "apps/web/components/ShopPanel.tsx",
    "apps/web/components/ShopPanel.css",
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



SHOP_EVIDENCE_PATH = "evidence/shop-http-2026-10-27/browser-shop.json"
SHOP_SOURCE_PATHS = (
    "apps/agent-gateway/cart.py", "apps/agent-gateway/server.py",
    "apps/web/components/DeferredChatBoundary.tsx",
    "apps/web/components/PublicRequestFallback.tsx",
    "apps/web/components/OracleCompanion.tsx",
    "apps/web/components/OracleCompanion.css",
    "apps/web/lib/i18n.ts",
    "apps/web/public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png",
    "apps/web/components/PublicExperience.tsx",
    "apps/web/components/ShopPanel.tsx", "apps/web/components/ShopPanel.css",
    "apps/web/components/Workspace.tsx", "apps/site/src/main.tsx",
    "apps/site/tests/browser-shop.mjs", "apps/site/tests/fixtures/shop-server.py",
)
SHOP_CHECKS = frozenset((
    "real DE NL FR catalog search and categories using isolated fixtures",
    "aborted create before commit blocks writes until deliberate successful empty readback",
    "browser creates scoped HttpOnly cart and persists server-authoritative amount across reload",
    "committed change with lost response requires readback and does not blindly repeat effect",
    "quantity submit remove and repeated blocked checkout survive direct cart link and reload",
    "HTTP backend process restart keeps browser session cart and persisted source binding",
    "foreign visitor cart cookie and client role/tenant claims grant no cart access",
    "unconfigured catalog and failed catalog connection remain distinct with no sample products",
    "mobile keyboard layout retains shared tokens and no horizontal overflow",
    "expired successful creation key cannot trap a cookie-less cart in permanent 410",
    "lost creation response preserves key until readback and restores one committed cart",
    "expired unknown creation requires explicit 410 readback before a fresh creation key",
    "authoritative expired cart read clears stale UI but requires deliberate new creation",
))


def check_shop_evidence(root):
    evidence = json.loads(_read(root, SHOP_EVIDENCE_PATH))
    hashes = evidence.get("source_sha256", {})
    if set(hashes) != set(SHOP_SOURCE_PATHS):
        raise EvidenceError("shop_exact_source_path_set_required")
    for relative in SHOP_SOURCE_PATHS:
        if hashlib.sha256(_read(root, relative)).hexdigest() != hashes[relative]:
            raise EvidenceError("stale_shop_source_sha256: " + relative)
    if not SHOP_CHECKS.issubset(evidence.get("checks", [])):
        raise EvidenceError("shop_critical_check_missing")
    if (evidence.get("external_requests") != [] or evidence.get("payment_started") is not False
            or evidence.get("order_submitted") is not False):
        raise EvidenceError("shop_effect_boundaries_required")
    observed = {(row.get("method"), row.get("path"), row.get("status")) for row in evidence.get("requests", [])}
    for method, path, status in (("POST", "/api/shop/cart", 200), ("POST", "/api/shop/cart/items", 200),
                                ("GET", "/api/shop/cart", 200), ("GET", "/api/shop/cart", 404), ("GET", "/api/shop/cart", 410),
                                ("POST", "/api/shop/cart/checkout-draft", 200),
                                ("GET", "/api/shop/cart/checkout-draft", 200)):
        if (method, path, status) not in observed:
            raise EvidenceError("shop_actual_http_boundary_missing")
    if evidence.get("persistent_objects") != {"cart": 7, "checkout_draft": 1}:
        raise EvidenceError("shop_persistent_duplicate_or_missing")
    return {"scope": "stored_local_fixture_browser_api_sqlite_evidence_only", "checks": len(SHOP_CHECKS)}



CATALOG_EVIDENCE_PATH = "evidence/catalog-image-batch-2026-10-27/browser-catalog.json"
CATALOG_SOURCE_PATHS = (
    "apps/agent-gateway/catalog.py", "apps/agent-gateway/server.py",
    "apps/web/components/DeferredChatBoundary.tsx",
    "apps/web/components/PublicRequestFallback.tsx",
    "apps/web/components/OracleCompanion.tsx",
    "apps/web/components/OracleCompanion.css",
    "apps/web/lib/i18n.ts",
    "apps/web/public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png",
    "apps/web/components/PublicExperience.tsx",
    "apps/web/components/ShopPanel.tsx", "apps/web/components/ShopPanel.css",
    "apps/site/tests/browser-catalog.mjs", "apps/site/tests/fixtures/catalog-server.py",
)
CATALOG_CHECKS = frozenset((
    "source-bound partial catalog displayed without commerce or image requests",
    "DE NL FR labels retain explicit German supplier facts",
    "local filtering and reload remain scoped to partial snapshot",
    "valid visitor and csrf cannot create cart or checkout from read-only source",
))


def check_catalog_evidence(root):
    report = json.loads(_read(root, CATALOG_EVIDENCE_PATH))
    hashes = report.get('source_sha256', {})
    if set(hashes) != set(CATALOG_SOURCE_PATHS):
        raise EvidenceError('catalog_exact_source_path_set_required')
    for relative in CATALOG_SOURCE_PATHS:
        if hashlib.sha256(_read(root, relative)).hexdigest() != hashes[relative]:
            raise EvidenceError('stale_catalog_source_sha256: ' + relative)
    if not CATALOG_CHECKS.issubset(report.get('checks', [])):
        raise EvidenceError('catalog_critical_browser_check_missing')
    if (report.get('mode') != 'read_only' or report.get('partial') is not True
            or report.get('external_requests') != [] or report.get('order_started') is not False
            or report.get('payment_started') is not False or report.get('image_requests') != 0):
        raise EvidenceError('catalog_read_only_partial_boundaries_required')
    if (not isinstance(report.get('catalog_input_sha256'), str)
            or not re.fullmatch('[a-f0-9]{64}', report['catalog_input_sha256'])):
        raise EvidenceError('catalog_input_fingerprint_required')
    observed = {(r.get('method'), r.get('path'), r.get('status')) for r in report.get('requests', [])}
    if not {('GET','/api/shop/catalog',200),('POST','/api/shop/cart',403),
            ('POST','/api/shop/cart/checkout-draft',403)}.issubset(observed):
        raise EvidenceError('catalog_actual_read_and_write_denial_required')
    return {'scope': 'stored_local_read_only_catalog_browser_evidence_only', 'checks': len(CATALOG_CHECKS)}


PUBLIC_FALLBACK_PATH = 'evidence/frontend-reliability-2026-10-27/public-fallbacks.json'
PUBLIC_FALLBACK_SOURCES = (
    'apps/web/components/Workspace.tsx', 'apps/web/components/DeferredChatBoundary.tsx',
    'apps/web/components/PublicRequestFallback.tsx', 'apps/web/components/ShopPanel.tsx',
    'apps/site/tests/browser-public-fallbacks.mjs',
)


def check_public_fallbacks(root):
    report = json.loads(_read(root, PUBLIC_FALLBACK_PATH))
    sources = report.get('source_sha256', {})
    if set(sources) != set(PUBLIC_FALLBACK_SOURCES):
        raise EvidenceError('fallback_exact_sources_required')
    for relative in PUBLIC_FALLBACK_SOURCES:
        if hashlib.sha256(_read(root, relative)).hexdigest() != sources[relative]:
            raise EvidenceError('stale_fallback_source: ' + relative)
    expected = {(w, l, f) for w in (320, 390, 1280) for l in ('de', 'nl')
                for f in ('unavailable', 'capabilities', 'chunk')}
    rows = report.get('checks', [])
    if (len(rows) != len(expected) or {(r.get('width'), r.get('locale'), r.get('failure')) for r in rows} != expected
            or any(r.get('passed') is not True for r in rows) or report.get('passed') is not True):
        raise EvidenceError('fallback_complete_matrix_required')
    if any(r.get('session_status') != {'unavailable': 204, 'capabilities': 200, 'chunk': 404}[r['failure']] for r in rows):
        raise EvidenceError('fallback_session_contract_required')
    if report.get('external') != [] or report.get('uncaught') != [] or report.get('mutations') != 0:
        raise EvidenceError('fallback_no_external_uncaught_or_mutations_required')
    return {'scope': 'stored_local_synthetic_public_failure_evidence_only', 'checks': len(expected)}


EXCEPTION_SOURCES = (
    'apps/web/observability/exceptions.mjs', 'apps/site/src/observability.ts',
    'apps/web/instrumentation-client.ts', 'apps/web/components/DeferredChatBoundary.tsx',
    'apps/site/src/main.tsx', 'apps/site/tests/browser-exception-capture.mjs',
    'apps/site/package.json', 'apps/web/package.json', 'pnpm-lock.yaml',
)
EXCEPTION_CHECKS = {
    'no_initialization_or_requests_without_consent', 'real_sdk_unhandled_error_intercepted',
    'real_sdk_unhandled_rejection_intercepted', 'actual_chat_boundary_reported_once_shell_preserved',
    'only_redacted_exception_events_no_cookies_identity_or_other_requests',
    '503_retry_and_immediate_reconsent_stay_blocked_until_reload',
    'unload_cannot_bypass_aborted_consent', 'revocation_and_debug_query_create_no_persistent_sdk_state',
}

def check_exception_evidence(root):
    for surface in ('vite', 'next'):
        path = f'evidence/observability-integration-2026-10-28/browser-exceptions-{surface}.json'
        report = json.loads(_read(root, path))
        sources = report.get('source_sha256', {})
        if set(sources) != set(EXCEPTION_SOURCES):
            raise EvidenceError('exception_exact_sources_required')
        for relative in EXCEPTION_SOURCES:
            if hashlib.sha256(_read(root, relative)).hexdigest() != sources[relative]:
                raise EvidenceError('stale_exception_source: ' + relative)
        if (report.get('surface') != surface or report.get('passed') is not True
                or report.get('synthetic') is not True or report.get('events') != 4
                or len(report.get('checks', [])) != len(EXCEPTION_CHECKS)
                or set(report.get('checks', [])) != EXCEPTION_CHECKS):
            raise EvidenceError('exception_complete_surface_checks_required')
        if report.get('external_events_sent') != 0 or report.get('unexpected_origins') != []:
            raise EvidenceError('exception_local_intercept_only_required')
    return {'scope': 'stored_local_actual_sdk_intercept_only', 'surfaces': 2, 'checks_per_surface': 8}


CONSENT_UI_SOURCES = (
    'apps/web/components/DiagnosticConsent.tsx','apps/web/components/DiagnosticConsent.css',
    'apps/web/components/SiteFooter.tsx','apps/web/observability/exceptions.mjs',
    'apps/web/observability/exceptions.d.mts','apps/site/tests/browser-consent-ui.mjs',
)
CONSENT_UI_PATH = 'evidence/consent-ui-2026-10-28/browser-consent-ui.json'
LOCALE_BRIDGE_SOURCES = (
    'apps/web/components/LocaleAwareClerk.tsx','apps/web/app/layout.tsx','apps/web/auth/public-provider.ts',
    'apps/site/tests/fixtures/clerk-integration.tsx','apps/site/tests/fixtures/next-clerk-locale.tsx',
    'apps/site/tests/fixtures/next-clerk-locale.html','apps/site/tests/browser-next-clerk-locale.mjs',
)
LOCALE_BRIDGE_PATH = 'evidence/consent-ui-2026-10-28/next-clerk-locale.json'

NEXT_CONSENT_SOURCES = (
    'apps/web/components/AuthAvailabilityNotice.tsx','apps/web/components/LocaleAwareClerk.tsx',
    'apps/web/auth/public-provider.ts','apps/web/app/layout.tsx',
    'apps/web/app/anmelden/[[...sign-in]]/page.tsx','apps/web/app/registrieren/[[...sign-up]]/page.tsx',
    'apps/web/components/DiagnosticConsent.tsx','apps/web/components/DiagnosticConsent.css',
    'apps/web/components/SiteFooter.tsx','apps/web/auth/tests/browser-public-experience.mjs',
)
NEXT_CONSENT_PATH = 'evidence/consent-ui-2026-10-28/next-public.json'

def check_consent_ui(root):
    report=json.loads(_read(root,CONSENT_UI_PATH))
    locale=json.loads(_read(root,LOCALE_BRIDGE_PATH))
    for record,paths in ((report,CONSENT_UI_SOURCES),(locale,LOCALE_BRIDGE_SOURCES)):
        if set(record.get('source_sha256',{}))!=set(paths):raise EvidenceError('consent_exact_sources_required')
        for path in paths:
            if hashlib.sha256(_read(root,path)).hexdigest()!=record['source_sha256'][path]:raise EvidenceError('stale_consent_source: '+path)
    expected={(w,l,m) for w in (320,390,1280) for l in ('de','nl') for m in ('configured','missing','load_failure')}
    checks=report.get('checks',[])
    if len(checks)!=18 or {(c.get('width'),c.get('locale'),c.get('mode')) for c in checks}!=expected or any(c.get('passed') is not True for c in checks):raise EvidenceError('consent_complete_matrix_required')
    if report.get('passed') is not True or report.get('external_events_sent')!=0 or report.get('unexpected_origins')!=[] or report.get('uncaught')!=[]:raise EvidenceError('consent_local_no_errors_required')
    pairs={(c.get('lang'),c.get('expected')) for c in locale.get('checks',[]) if c.get('passed') is True}
    if locale.get('passed') is not True or len(locale.get('checks',[]))!=4 or pairs!={('de','de-DE'),('nl','nl-NL'),('fr','fr-FR'),('unknown','de-DE')} or locale.get('external')!=0 or locale.get('errors')!=[]:raise EvidenceError('locale_bridge_complete_fixture_required')
    next_report=json.loads(_read(root,NEXT_CONSENT_PATH))
    if set(next_report.get('source_sha256',{}))!=set(NEXT_CONSENT_SOURCES):raise EvidenceError('next_consent_exact_sources_required')
    for path in NEXT_CONSENT_SOURCES:
        if hashlib.sha256(_read(root,path)).hexdigest()!=next_report['source_sha256'][path]:raise EvidenceError('stale_next_consent_source: '+path)
    mapping=json.loads(_read(root,'config/site-map.json'))
    expected_public={p['path'] for p in mapping['pages'] if p['access']['visibility']=='public' and not p['access']['auth_required']}
    expected_private={p['path'] for p in mapping['pages'] if p['access']['visibility']!='public' or p['access']['auth_required']}
    rows=next_report.get('routes',[]);mobile=next_report.get('auth_mobile',[])
    if (len(rows)!=72 or {(r.get('path'),r.get('locale')) for r in rows if r.get('passed') is True}!={(p,l) for p in expected_public for l in ('de','nl')}
            or set(next_report.get('private',[]))!=expected_private or len(mobile)!=4
            or {(r.get('path'),r.get('locale'),r.get('width')) for r in mobile if r.get('passed') is True}!={(p,l,320) for p in ('/anmelden','/registrieren') for l in ('de','nl')}
            or next_report.get('passed') is not True or next_report.get('external')!=0 or next_report.get('mutations')!=0 or next_report.get('pageErrors')!=[]):raise EvidenceError('next_consent_complete_local_routes_required')
    return {'scope':'local_consent_UI_and_provider_double_only','ui_cases':18,'locale_cases':4,'next_route_locales':72,'next_auth_mobile':4}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        result = check_evidence(args.root)
        result["shop"] = check_shop_evidence(args.root)
        result["catalog"] = check_catalog_evidence(args.root)
        result["public_fallbacks"] = check_public_fallbacks(args.root)
        result["exceptions"] = check_exception_evidence(args.root)
        result["consent"] = check_consent_ui(args.root)
    except EvidenceError as error:
        print("Browser evidence binding failed: " + str(error), file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
