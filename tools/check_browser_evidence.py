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
    "apps/web/components/IdentityHero.tsx",
    "apps/web/components/IdentityHero.css",
    "config/identity-hero.json",
    "apps/site/tests/browser-identity-hero.mjs",
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



# Live shop contract (DECISIONS.md D-010): the mounted shop/PublicShopContent client against
# the real apps/shop-api adapter. Replaces the retired ShopPanel/agent-gateway evidence.
SHOP_API_EVIDENCE_DIR = "evidence/shop-api-2026-11-04"
CATALOG_EVIDENCE_PATH = SHOP_API_EVIDENCE_DIR + "/browser-catalog.json"
SHOP_EVIDENCE_PATH = SHOP_API_EVIDENCE_DIR + "/browser-shop.json"
CATALOG_SOURCE_PATHS = (
    "apps/shop-api/vercel_app.py", "apps/shop-api/shop/catalog_api.py", "apps/shop-api/shop/pricing.py",
    "apps/web/components/shop/PublicShopContent.tsx", "apps/web/components/shop/CatalogView.tsx",
    "apps/web/components/shop/CategoryList.tsx", "apps/web/components/shop/ProductCard.tsx",
    "apps/web/components/shop/ProductDetail.tsx", "apps/web/components/shop/api.ts",
    "apps/web/components/shop/shop.css", "config/shop-interface-copy.json", "apps/site/src/main.tsx",
    "apps/site/tests/browser-shop-api.mjs", "apps/site/tests/fixtures/shop_api_fixture.py",
)
SHOP_SOURCE_PATHS = (
    "apps/shop-api/vercel_app.py", "apps/shop-api/shop/cart_api.py", "apps/shop-api/shop/checkout_api.py",
    "apps/shop-api/shop/auth.py", "apps/shop-api/shop/pricing.py", "apps/shop-api/shop/catalog_api.py",
    "apps/web/components/shop/PublicShopContent.tsx", "apps/web/components/shop/ProductDetail.tsx",
    "apps/web/components/shop/CartView.tsx", "apps/web/components/shop/Checkout.tsx",
    "apps/web/components/shop/AddressStep.tsx", "apps/web/components/shop/api.ts",
    "apps/web/components/shop/shop.css", "config/shop-interface-copy.json", "apps/site/src/main.tsx",
    "apps/site/tests/browser-shop-api.mjs", "apps/site/tests/fixtures/shop_api_fixture.py",
)
CATALOG_CHECKS = frozenset((
    "catalog_search_and_category_browse_de_nl_fr_from_live_shop_api",
    "product_detail_shows_server_price_stock_and_blocks_out_of_stock",
    "supplier_images_blocked_before_network_with_local_placeholder",
    "price_not_released_hides_price_and_server_refuses_add",
    "mobile_390_catalog_and_detail_without_horizontal_overflow",
    "catalog_not_configured_503_and_connection_failure_distinct_de_nl_fr",
))
SHOP_CHECKS = frozenset((
    "cart_add_update_remove_with_server_amounts_surviving_reload",
    "lost_add_response_retry_replays_same_key_without_double_add",
    "insufficient_stock_refused_with_localized_message_de_nl_fr",
    "guest_cart_cookie_httponly_secure_lax_host_only_not_script_readable",
    "forged_malformed_and_foreign_cart_cookies_grant_no_cart_access",
    "cross_origin_cart_write_rejected_by_server",
    "checkout_reachable_with_server_quote_while_order_and_payment_blocked",
    "mobile_390_cart_and_checkout_without_horizontal_overflow",
))
# Observed browser<->server boundaries; "failed" is a request the browser lost/blocked.
CATALOG_BOUNDARIES = frozenset((
    ("GET", "/api/shop/products", 200), ("GET", "/api/shop/categories", 200),
    ("GET", "/api/shop/products/{id}", 200), ("POST", "/api/shop/cart/items", 409),
    ("GET", "/api/shop/products", 503), ("GET", "/api/shop/products", 502),
))
SHOP_BOUNDARIES = frozenset((
    ("GET", "/api/shop/cart", 200), ("POST", "/api/shop/cart/items", 200),
    ("POST", "/api/shop/cart/items", 409), ("POST", "/api/shop/cart/items", 403),
    ("POST", "/api/shop/cart/items", "failed"), ("POST", "/api/shop/checkout/validate-address", 200),
    ("GET", "/api/shop/checkout/shipping-options", 200), ("POST", "/api/shop/checkout/quote", 200),
))
EFFECT_PATHS = ("/api/shop/orders", "/api/shop/webhooks")
RUNTIME_KEYS = ("backend", "database", "schema_probe", "frontend", "browser", "payment_provider")


def _shop_api_report(root, relative, sources, required_checks, boundaries, prefix):
    """Shared strict binding for both live-shop reports; raises EvidenceError(prefix_...)."""
    root = Path(root).resolve()
    report = _json(_read(root, relative))
    if report.get("passed") is not True or report.get("synthetic_data") is not True:
        raise EvidenceError(prefix + "_recorded_synthetic_pass_required")
    hashes = report.get("source_sha256")
    if not isinstance(hashes, dict) or set(hashes) != set(sources):
        raise EvidenceError(prefix + "_exact_source_path_set_required")
    for path in sources:
        if not isinstance(hashes[path], str) or not re.fullmatch(r"[0-9a-f]{64}", hashes[path]):
            raise EvidenceError(prefix + "_invalid_source_sha256: " + path)
        if hashlib.sha256(_read(root, path)).hexdigest() != hashes[path]:
            raise EvidenceError("stale_" + prefix + "_source_sha256: " + path)
    checks = report.get("checks")
    if (not isinstance(checks, list) or any(not isinstance(item, str) for item in checks)
            or len(set(checks)) != len(checks) or not required_checks.issubset(checks)):
        raise EvidenceError(prefix + "_critical_check_missing")
    runtime = report.get("runtime")
    if (not isinstance(runtime, dict) or any(not isinstance(runtime.get(key), str) or not runtime[key] for key in RUNTIME_KEYS)
            or "vercel_app.create_app" not in runtime["backend"]):
        raise EvidenceError(prefix + "_real_adapter_runtime_required")
    if report.get("external_requests") != [] or report.get("uncaught_errors") != []:
        raise EvidenceError(prefix + "_no_external_or_uncaught_required")
    rows = report.get("requests")
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise EvidenceError(prefix + "_actual_http_boundary_missing")
    observed = set()
    for row in rows:
        method, path, status = row.get("method"), row.get("path"), row.get("status")
        if (not isinstance(method, str) or not isinstance(path, str) or not path.startswith("/api/shop/")
                or not (status == "failed" or (type(status) is int and 100 <= status <= 599))):
            raise EvidenceError(prefix + "_invalid_request_row")
        if path.startswith(EFFECT_PATHS) and status != "failed":
            raise EvidenceError(prefix + "_order_or_payment_reached_server")
        observed.add((method, path, status))
    if not boundaries.issubset(observed):
        raise EvidenceError(prefix + "_actual_http_boundary_missing")
    return report


def check_catalog_evidence(root):
    report = _shop_api_report(root, CATALOG_EVIDENCE_PATH, CATALOG_SOURCE_PATHS, CATALOG_CHECKS, CATALOG_BOUNDARIES, "catalog")
    blocked = report.get("supplier_image_requests_blocked")
    if type(blocked) is not int or blocked < 1:
        raise EvidenceError("catalog_supplier_image_block_not_exercised")
    return {"scope": "stored_local_real_browser_shop_api_catalog_synthetic_evidence_only", "checks": len(CATALOG_CHECKS)}


def check_shop_evidence(root):
    report = _shop_api_report(root, SHOP_EVIDENCE_PATH, SHOP_SOURCE_PATHS, SHOP_CHECKS, SHOP_BOUNDARIES, "shop")
    if (report.get("order_submitted") is not False or report.get("payment_started") is not False
            or report.get("server_effects") != {"orders": 0, "provider_calls": [], "mail_calls": []}):
        raise EvidenceError("shop_effect_boundaries_required")
    blocked = report.get("blocked_effect_requests")
    if (not isinstance(blocked, list) or not blocked
            or any(not isinstance(row, dict) or row.get("method") != "POST" or row.get("path") != "/api/shop/orders" for row in blocked)):
        raise EvidenceError("shop_order_block_not_exercised")
    return {"scope": "stored_local_real_browser_shop_api_cart_checkout_synthetic_evidence_only", "checks": len(SHOP_CHECKS)}


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
# Clerk locale bridge retired with D-007 (Clerk removed; own accounts). No locale-bridge proof is required.

NEXT_CONSENT_SOURCES = (
    'apps/web/proxy.ts','apps/web/auth/policy.ts','apps/web/app/api/internal/workspace/status/route.ts','apps/web/app/api/internal/workspace/mail/route.ts','apps/web/app/intern/workspace/page.tsx',
    'apps/web/components/AuthAvailabilityNotice.tsx','apps/web/components/LocaleAwareClerk.tsx',
    'apps/web/auth/public-provider.ts','apps/web/app/layout.tsx',
    'apps/web/app/anmelden/[[...sign-in]]/page.tsx','apps/web/app/registrieren/[[...sign-up]]/page.tsx',
    'apps/web/components/DiagnosticConsent.tsx','apps/web/components/DiagnosticConsent.css',
    'apps/web/components/SiteFooter.tsx','apps/web/auth/tests/browser-public-experience.mjs',
)
NEXT_CONSENT_PATH = 'evidence/consent-ui-2026-10-28/next-public.json'

def check_consent_ui(root):
    report=json.loads(_read(root,CONSENT_UI_PATH))
    for record,paths in ((report,CONSENT_UI_SOURCES),):
        if set(record.get('source_sha256',{}))!=set(paths):raise EvidenceError('consent_exact_sources_required')
        for path in paths:
            if hashlib.sha256(_read(root,path)).hexdigest()!=record['source_sha256'][path]:raise EvidenceError('stale_consent_source: '+path)
    expected={(w,l,m) for w in (320,390,1280) for l in ('de','nl') for m in ('configured','missing','load_failure')}
    checks=report.get('checks',[])
    if len(checks)!=18 or {(c.get('width'),c.get('locale'),c.get('mode')) for c in checks}!=expected or any(c.get('passed') is not True for c in checks):raise EvidenceError('consent_complete_matrix_required')
    if report.get('passed') is not True or report.get('external_events_sent')!=0 or report.get('unexpected_origins')!=[] or report.get('uncaught')!=[]:raise EvidenceError('consent_local_no_errors_required')
    next_report=json.loads(_read(root,NEXT_CONSENT_PATH))
    if next_report.get('internal_workspace_api_denied_anonymous') is not True:raise EvidenceError('internal_workspace_fail_closed_proof_required')
    if next_report.get('internal_mail_api_denied_anonymous') is not True:raise EvidenceError('internal_mail_fail_closed_proof_required')
    if set(next_report.get('source_sha256',{}))!=set(NEXT_CONSENT_SOURCES):raise EvidenceError('next_consent_exact_sources_required')
    for path in NEXT_CONSENT_SOURCES:
        if hashlib.sha256(_read(root,path)).hexdigest()!=next_report['source_sha256'][path]:raise EvidenceError('stale_next_consent_source: '+path)
    mapping=json.loads(_read(root,'config/site-map.json'))
    expected_public={p['path'] for p in mapping['pages'] if p['access']['visibility']=='public' and not p['access']['auth_required']}
    expected_private={p['path'] for p in mapping['pages'] if p['access']['visibility']!='public' or p['access']['auth_required']}
    rows=next_report.get('routes',[]);mobile=next_report.get('auth_mobile',[])
    if (len(rows)!=78 or {(r.get('path'),r.get('locale')) for r in rows if r.get('passed') is True}!={(p,l) for p in expected_public for l in ('de','nl')}
            or set(next_report.get('private',[]))!=expected_private or len(mobile)!=4
            or {(r.get('path'),r.get('locale'),r.get('width')) for r in mobile if r.get('passed') is True}!={(p,l,320) for p in ('/anmelden','/registrieren') for l in ('de','nl')}
            or next_report.get('passed') is not True or next_report.get('external')!=0 or next_report.get('mutations')!=0 or next_report.get('pageErrors')!=[]):raise EvidenceError('next_consent_complete_local_routes_required')
    return {'scope':'local_consent_UI_and_provider_double_only','ui_cases':18,'next_route_locales':78,'next_auth_mobile':4}



WORKSPACE_SOURCES = (
    'config/one-web-app.json','config/local-control.json','config/remediation-policy.json','apps/web/auth/policy.ts',
    'tests/test_workspace_read.py','tests/test_local_control.py','tools/app_backend.py','tools/local_control.py','tools/remediation_queue.py',
    'apps/web/components/WorkspaceStatusPanel.tsx','apps/web/components/WorkspaceStatusPanel.css','apps/web/proxy.ts',
    'apps/web/app/api/internal/workspace/status/route.ts','apps/web/app/intern/workspace/page.tsx',
    'apps/site/tests/browser-workspace-read.mjs','apps/site/tests/fixtures/workspace-server.py',
    'apps/site/tests/fixtures/workspace-status.tsx','apps/site/tests/fixtures/workspace-status.html',
)
WORKSPACE_PATH = 'evidence/workspace-read-2026-10-28/browser-workspace-read.json'

def check_workspace_read(root):
    report=json.loads(_read(root,WORKSPACE_PATH))
    if set(report.get('source_sha256',{}))!=set(WORKSPACE_SOURCES):raise EvidenceError('workspace_exact_sources_required')
    for path in WORKSPACE_SOURCES:
        if report['source_sha256'][path]!=hashlib.sha256(_read(root,path)).hexdigest():raise EvidenceError('workspace_stale_source: '+path)
    checks=report.get('checks',[])
    if len(checks)!=4 or {(c.get('width'),c.get('locale')) for c in checks}!={(w,l) for w in (320,1280) for l in ('de','nl')}:raise EvidenceError('workspace_complete_matrix_required')
    for c in checks:
        if any(c.get(key) is not True for key in ('positive','reload','invalid','client_tenant_rejected','no_overflow')) or c.get('negative_sessions')!=5:raise EvidenceError('workspace_negative_proof_required')
    if report.get('passed') is not True or report.get('persistent_state_unchanged') is not True or report.get('external')!=[] or report.get('errors')!=[]:raise EvidenceError('workspace_readonly_proof_required')
    return {'scope':'isolated_synthetic_workspace_fixture_only','cases':4,'production_membership_verified':False}


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
        result["workspace"] = check_workspace_read(args.root)
    except EvidenceError as error:
        print("Browser evidence binding failed: " + str(error), file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
