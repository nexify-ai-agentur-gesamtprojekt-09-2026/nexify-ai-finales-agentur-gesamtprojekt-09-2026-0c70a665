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
    "apps/web/components/PageConcept.css",
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



# ALT-SHOP, STILLGELEGT (OF-11, 2026-11-09, freigegeben von Pascal Courbois):
# SHOP_* / check_shop_evidence pruefen den Alt-Shop (SQLite-Warenkorb in
# apps/agent-gateway, ShopPanel, persistent_objects {cart: 7}). Diese Quellen und
# Semantik existieren im neuen Shop nicht mehr. Der Code bleibt unveraendert
# erhalten (archiviert, nicht geloescht), wird aber von main() nicht mehr
# aufgerufen. Ersatz: check_shop_ui_mock_evidence (Abschnitt "Neuer Shop" unten).
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
    """ALT-SHOP, STILLGELEGT: nicht Teil des laufenden Gates; siehe check_shop_ui_mock_evidence."""
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



# ALT-SHOP, STILLGELEGT (OF-11, 2026-11-09): Read-only-Snapshot-Katalog des Alt-Shops
# (apps/agent-gateway/catalog.py, ShopPanel, POST /api/shop/cart -> 403). Code
# unveraendert erhalten, von main() nicht mehr aufgerufen. Ersatz:
# check_catalog_ui_mock_evidence (Abschnitt "Neuer Shop" unten).
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
    """ALT-SHOP, STILLGELEGT: nicht Teil des laufenden Gates; siehe check_catalog_ui_mock_evidence."""
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


# ---------------------------------------------------------------------------
# Neuer Shop (OF-11, 2026-11-09): Browsernachweise gegen die aktuellen Komponenten
# in apps/web/components/shop mit einem gemockten API-Vertrag
# (apps/site/tests/fixtures/shop-api-mock.mjs). Der Nachweis belegt nur das
# Frontend gegen den Mock: kein apps/shop-api-Servercode, keine MongoDB, kein
# BigBuy/Revolut, keine Produktivdaten. Mock und Produktivdaten werden nie vermischt.
# ---------------------------------------------------------------------------
SHOP_UI_MOCK_EVIDENCE_PATH = "evidence/shop-ui-mock-2026-11-09/browser-shop.json"
CATALOG_UI_MOCK_EVIDENCE_PATH = "evidence/shop-ui-mock-2026-11-09/browser-catalog.json"
SHOP_UI_MOCK_LABEL_MARKER = "mit gemockter Antwort"
SHOP_UI_MOCK_SOURCE_PATHS = (
    "apps/web/components/shop/api.ts", "apps/web/components/shop/CatalogView.tsx",
    "apps/web/components/shop/CategoryList.tsx", "apps/web/components/shop/ProductCard.tsx",
    "apps/web/components/shop/ProductDetail.tsx", "apps/web/components/shop/CartView.tsx",
    "apps/web/components/shop/Checkout.tsx", "apps/web/components/shop/AddressStep.tsx",
    "apps/web/components/shop/SellerInfo.tsx", "apps/web/components/shop/CommerceHeader.tsx",
    "apps/web/components/shop/PublicShopContent.tsx", "apps/web/components/shop/shipping-hint.ts",
    "apps/web/components/shop/shop.css", "apps/web/components/shop/Storefront.css",
    "apps/web/components/PublicExperience.tsx", "apps/site/src/main.tsx",
    "config/shop-interface-copy.json", "apps/site/tests/browser-shop.mjs",
    "apps/site/tests/fixtures/shop-api-mock.mjs",
)
CATALOG_UI_MOCK_SOURCE_PATHS = (
    "apps/web/components/shop/api.ts", "apps/web/components/shop/CatalogView.tsx",
    "apps/web/components/shop/CategoryList.tsx", "apps/web/components/shop/ProductCard.tsx",
    "apps/web/components/shop/ProductDetail.tsx", "apps/web/components/shop/PublicShopContent.tsx",
    "apps/web/components/shop/CommerceHeader.tsx", "apps/web/components/shop/shop.css",
    "apps/web/components/shop/Storefront.css", "apps/web/components/PublicExperience.tsx",
    "apps/site/src/main.tsx", "config/shop-interface-copy.json",
    "apps/site/tests/browser-catalog.mjs", "apps/site/tests/fixtures/shop-api-mock.mjs",
)
SHOP_UI_MOCK_CHECKS = (
    "catalog_search_sort_stock_filter_category_and_pagination_use_server_parameters",
    "product_detail_shows_price_stock_fitment_states_and_missing_product",
    "add_to_cart_creates_httponly_visitor_cart_and_cart_survives_reload",
    "cart_quantity_change_follows_server_total_rejects_over_stock_and_remove_empties_cart",
    "stock_limit_blocks_second_add_without_a_write_request",
    "lost_response_after_committed_cart_write_is_reread_before_the_retry",
    "catalog_and_category_failures_show_errors_never_an_empty_or_sample_catalogue",
    "checkout_without_cart_is_explicit_and_address_is_validated_client_and_server_side",
    "checkout_review_shows_server_totals_seller_info_and_gates_the_order_on_terms",
    "price_change_blocks_the_order_until_the_customer_confirms_the_changes",
    "order_hands_over_to_hosted_payment_and_retry_reuses_the_same_idempotency_key",
    "payment_url_on_a_foreign_host_is_rejected_without_navigation",
    "commerce_pages_are_german_only_keyboard_operable_and_fit_390px_without_overflow",
)
CATALOG_UI_MOCK_CHECKS = (
    "empty_catalogue_shows_honest_empty_states_and_no_sample_products",
    "rendered_products_equal_the_api_page_with_supplier_facts_and_price_stock_states",
    "images_load_only_from_the_supplier_allowlist_and_unsafe_hosts_are_never_requested",
    "browsing_is_read_only_no_write_request_no_visitor_cookie_no_cart",
    "search_query_and_seite_parameter_are_honoured_on_load_and_reload",
    "category_routes_resolve_numeric_ids_and_malformed_ids_fall_back_to_the_category_list",
    "catalogue_filters_and_pagination_fit_390px_and_are_keyboard_reachable",
)
# Pflicht: je Nachweis die 390-px-Pruefung als benannter Check, und das hash-gebundene
# Skript muss die Messung (Viewport 390, scrollWidth gegen innerWidth) tatsaechlich enthalten.
SHOP_UI_MOCK_OVERFLOW_CHECK = "commerce_pages_are_german_only_keyboard_operable_and_fit_390px_without_overflow"
CATALOG_UI_MOCK_OVERFLOW_CHECK = "catalogue_filters_and_pagination_fit_390px_and_are_keyboard_reachable"
SHOP_UI_MOCK_OVERFLOW_PROBES = (b"width:390", b"document.documentElement.scrollWidth<=innerWidth")
# Erlaubte Anfragen: ausschliesslich der gemockte Vertrag unter /api/shop/. Schreibende
# Pfade sind eine geschlossene Liste; der Katalognachweis darf gar nicht schreiben.
SHOP_UI_MOCK_ALLOWED_WRITES = frozenset((
    ("POST", "/api/shop/cart/items"), ("POST", "/api/shop/cart/confirm-changes"),
    ("POST", "/api/shop/checkout/quote"), ("POST", "/api/shop/checkout/validate-address"),
    ("POST", "/api/shop/orders"),
))
SHOP_UI_MOCK_REQUIRED_REQUESTS = frozenset((
    ("GET", "/api/shop/products", 200), ("GET", "/api/shop/products", 503),
    ("GET", "/api/shop/categories", 200), ("GET", "/api/shop/categories", 503),
    ("GET", "/api/shop/cart", 200), ("GET", "/api/shop/products/mock-0001", 200),
    ("GET", "/api/shop/products/gibt-es-nicht", 404),
    ("POST", "/api/shop/cart/items", 200), ("POST", "/api/shop/cart/items", 409),
    ("POST", "/api/shop/cart/items", "connection_dropped"),
    ("POST", "/api/shop/cart/confirm-changes", 200),
    ("POST", "/api/shop/checkout/quote", 200),
    ("POST", "/api/shop/checkout/validate-address", 200), ("POST", "/api/shop/checkout/validate-address", 422),
    ("POST", "/api/shop/orders", 200), ("POST", "/api/shop/orders", 409), ("POST", "/api/shop/orders", 502),
))
CATALOG_UI_MOCK_REQUIRED_REQUESTS = frozenset((
    ("GET", "/api/shop/products", 200), ("GET", "/api/shop/categories", 200),
    ("GET", "/api/shop/cart", 200), ("GET", "/api/shop/products/mock-0001", 200),
    ("GET", "/api/shop/products/mock-0001", 404),
))


def _check_shop_ui_mock(root, path, sources, checks, overflow_check, script, label, code, writes_allowed):
    """Gemeinsamer strenger Kern fuer beide Mock-Nachweise des neuen Shops.

    Alle lesbaren Pfade sind Konstanten dieses Moduls, nie Felder des Nachweises.
    """
    report = _json(_read(root, path))
    if report.get("passed") is not True:
        raise EvidenceError(code + "_recorded_pass_required")
    # Mock-Kennzeichnung ist Pflicht; der Nachweis darf nie als Produktivprobe gelten.
    if report.get("mock") is not True:
        raise EvidenceError(code + "_mock_true_required")
    if report.get("production_data") is not False or report.get("server_code_executed") is not False:
        raise EvidenceError(code + "_production_data_false_required")
    if not isinstance(report.get("mock_label"), str) or SHOP_UI_MOCK_LABEL_MARKER not in report["mock_label"]:
        raise EvidenceError(code + "_mock_label_required")
    hashes = report.get("source_sha256")
    if not isinstance(hashes, dict) or set(hashes) != set(sources):
        raise EvidenceError(code + "_exact_source_path_set_required")
    contents = {}
    for relative in sources:
        expected = hashes[relative]
        if not isinstance(expected, str) or not re.fullmatch(r"[0-9a-f]{64}", expected):
            raise EvidenceError("invalid_" + code + "_source_sha256: " + relative)
        contents[relative] = _read(root, relative)
        if hashlib.sha256(contents[relative]).hexdigest() != expected:
            raise EvidenceError("stale_" + code + "_source_sha256: " + relative)
    recorded = report.get("checks")
    if (not isinstance(recorded, list) or any(not isinstance(item, str) for item in recorded)
            or len(set(recorded)) != len(recorded)):
        raise EvidenceError(code + "_critical_check_missing")
    if overflow_check not in recorded:
        raise EvidenceError(code + "_390px_overflow_check_missing")
    if not set(checks).issubset(recorded):
        raise EvidenceError(code + "_critical_check_missing")
    if any(probe not in contents[script] for probe in SHOP_UI_MOCK_OVERFLOW_PROBES):
        raise EvidenceError(code + "_390px_overflow_probe_missing_in_bound_script")
    # Keine externe Anfrage, keine Seitenfehler, keine echte Zahlung/Bestellung.
    if report.get("external_requests") != [] or report.get("page_errors") != []:
        raise EvidenceError(code + "_external_request_or_page_error")
    counters = ["supplier_image_requests_answered_locally"]
    if writes_allowed:
        counters.append("payment_page_navigations_answered_locally")
        flags = ("real_payment_started", "real_order_submitted")
    else:
        flags = ("order_started", "payment_started")
    for name in counters:
        if type(report.get(name)) is not int or report[name] < 0:
            raise EvidenceError(code + "_invalid_local_counter: " + name)
    if any(report.get(flag) is not False for flag in flags):
        raise EvidenceError(code + "_effect_boundaries_required")
    rows = report.get("requests")
    if not isinstance(rows, list) or not rows:
        raise EvidenceError(code + "_actual_http_boundary_missing")
    observed = set()
    for row in rows:
        if (not isinstance(row, dict) or row.get("method") not in ("GET", "POST")
                or not isinstance(row.get("path"), str) or not row["path"].startswith("/api/shop/")
                or type(row.get("count")) is not int or row["count"] < 1
                or (type(row.get("status")) is not int and row.get("status") != "connection_dropped")):
            raise EvidenceError(code + "_invalid_request_row")
        if row["method"] != "GET":
            if not writes_allowed:
                raise EvidenceError(code + "_write_request_in_read_only_browse")
            if (row["method"], row["path"]) not in SHOP_UI_MOCK_ALLOWED_WRITES:
                raise EvidenceError(code + "_mutation_outside_mock_contract")
        observed.add((row["method"], row["path"], row["status"]))
    required = SHOP_UI_MOCK_REQUIRED_REQUESTS if writes_allowed else CATALOG_UI_MOCK_REQUIRED_REQUESTS
    if not required.issubset(observed):
        raise EvidenceError(code + "_actual_http_boundary_missing")
    return {"scope": label, "checks": len(checks), "mock": True, "production_data": False}


def check_shop_ui_mock_evidence(root):
    """Neuer Shop: Warenkorb/Checkout-Browsernachweis gegen den gemockten API-Vertrag."""
    return _check_shop_ui_mock(
        Path(root).resolve(), SHOP_UI_MOCK_EVIDENCE_PATH, SHOP_UI_MOCK_SOURCE_PATHS, SHOP_UI_MOCK_CHECKS,
        SHOP_UI_MOCK_OVERFLOW_CHECK, "apps/site/tests/browser-shop.mjs",
        "stored_mock_shop_ui_browser_evidence_only", "shop_ui_mock", True)


def check_catalog_ui_mock_evidence(root):
    """Neuer Shop: Katalog-Browse-Nachweis (nur lesend) gegen den gemockten API-Vertrag."""
    return _check_shop_ui_mock(
        Path(root).resolve(), CATALOG_UI_MOCK_EVIDENCE_PATH, CATALOG_UI_MOCK_SOURCE_PATHS, CATALOG_UI_MOCK_CHECKS,
        CATALOG_UI_MOCK_OVERFLOW_CHECK, "apps/site/tests/browser-catalog.mjs",
        "stored_mock_catalog_ui_browser_evidence_only", "catalog_ui_mock", False)


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
    'apps/web/proxy.ts','apps/web/auth/policy.ts','apps/web/app/api/internal/workspace/status/route.ts','apps/web/app/api/internal/workspace/mail/route.ts','apps/web/app/intern/workspace/page.tsx',
    'apps/web/components/AuthAvailabilityNotice.tsx',
    'apps/web/auth/public-provider.ts','apps/web/app/layout.tsx',
    'apps/web/app/anmelden/[[...sign-in]]/page.tsx','apps/web/app/registrieren/[[...sign-up]]/page.tsx',
    'apps/web/components/DiagnosticConsent.tsx','apps/web/components/DiagnosticConsent.css',
    'apps/web/components/SiteFooter.tsx','apps/web/auth/tests/browser-public-experience.mjs',
    'apps/web/app/page.tsx','apps/web/app/[...slug]/page.tsx','apps/web/next.config.ts',
)
NEXT_CONSENT_PATH = 'evidence/consent-ui-2026-10-28/next-public.json'

def check_consent_ui(root):
    report=json.loads(_read(root,CONSENT_UI_PATH))
    # Clerk-Locale-Bruecke stillgelegt (ED-04, 2026-11-09): LocaleAwareClerk.tsx ist nur noch ein Stummel ohne Nutzer.
    # LOCALE_BRIDGE_* und next-clerk-locale.json bleiben als Historie erhalten, werden aber nicht mehr geprueft.
    for record,paths in ((report,CONSENT_UI_SOURCES),):
        if set(record.get('source_sha256',{}))!=set(paths):raise EvidenceError('consent_exact_sources_required')
        for path in paths:
            if hashlib.sha256(_read(root,path)).hexdigest()!=record['source_sha256'][path]:raise EvidenceError('stale_consent_source: '+path)
    expected={(w,l,m) for w in (320,390,1280) for l in ('de','nl') for m in ('configured','missing','load_failure')}
    checks=report.get('checks',[])
    if len(checks)!=18 or {(c.get('width'),c.get('locale'),c.get('mode')) for c in checks}!=expected or any(c.get('passed') is not True for c in checks):raise EvidenceError('consent_complete_matrix_required')
    if report.get('passed') is not True or report.get('external_events_sent')!=0 or report.get('unexpected_origins')!=[] or report.get('uncaught')!=[]:raise EvidenceError('consent_local_no_errors_required')
    next_report=json.loads(_read(root,NEXT_CONSENT_PATH))
    if next_report.get('internal_workspace_api_auth_required_401') is not True:raise EvidenceError('internal_workspace_fail_closed_proof_required')
    if next_report.get('internal_mail_api_auth_required_401') is not True:raise EvidenceError('internal_mail_fail_closed_proof_required')
    if set(next_report.get('source_sha256',{}))!=set(NEXT_CONSENT_SOURCES):raise EvidenceError('next_consent_exact_sources_required')
    for path in NEXT_CONSENT_SOURCES:
        if hashlib.sha256(_read(root,path)).hexdigest()!=next_report['source_sha256'][path]:raise EvidenceError('stale_next_consent_source: '+path)
    mapping=json.loads(_read(root,'config/site-map.json'))
    expected_public={p['path'] for p in mapping['pages'] if p['access']['visibility']=='public' and not p['access']['auth_required']}
    expected_private={p['path'] for p in mapping['pages'] if p['access']['visibility']!='public' or p['access']['auth_required']}
    rows=next_report.get('routes',[]);mobile=next_report.get('auth_mobile',[])
    # TEILEKLAR (/teileklar) ist deutschsprachig und hat keinen Sprachumschalter: nur de; alle anderen Seiten de und nl.
    expected_rows={(p,'de') for p in expected_public}|{(p,'nl') for p in expected_public if not p.startswith('/teileklar')}
    if (len(rows)!=len(expected_rows) or {(r.get('path'),r.get('locale')) for r in rows if r.get('passed') is True}!=expected_rows
            or set(next_report.get('private',[]))!=expected_private or len(mobile)!=4
            or {(r.get('path'),r.get('locale'),r.get('width')) for r in mobile if r.get('passed') is True}!={(p,l,320) for p in ('/anmelden','/registrieren') for l in ('de','nl')}
            or next_report.get('passed') is not True or next_report.get('external')!=0 or next_report.get('mutations')!=0 or next_report.get('pageErrors')!=[]):raise EvidenceError('next_consent_complete_local_routes_required')
    return {'scope':'local_consent_UI_and_provider_double_only','ui_cases':18,'locale_cases':0,'next_route_locales':len(expected_rows),'next_auth_mobile':4}



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
        # Alt-Shop-Pruefer (check_shop_evidence, check_catalog_evidence) sind stillgelegt.
        result["shop"] = check_shop_ui_mock_evidence(args.root)
        result["catalog"] = check_catalog_ui_mock_evidence(args.root)
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
