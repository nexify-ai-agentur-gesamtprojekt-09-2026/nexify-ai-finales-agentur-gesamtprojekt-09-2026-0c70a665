"""Vercel Services entrypoint. No seeds, migrations, local gateways or retry worker.

A module-level app always exists, including with missing runtime bindings, so the
frontend can build/deploy independently. Business routes fail closed before any
router is called. Schema/index inspection reads metadata only, never documents.

Deployment binding: the project that may serve this namespace is an explicit
allowlist (SHOP_API_ALLOWED_PROJECT_IDS); without it only the original project
passes. Partial operation: a missing payment mode closes payment-dependent paths
only; a missing optional collection closes only the feature that needs it.
Diagnostics name unmet prerequisites by variable NAME, never by value.
"""
from __future__ import annotations

import asyncio
import hmac
import importlib
import logging
import os
import re
import sys
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Mapping
from urllib.parse import unquote, urlsplit

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

# Identity of the namespace claim written into every collection validator. It is a
# constant of the DATA, not of the deployment: moving production to another Vercel
# project must not change it, otherwise an initialised namespace would stop matching.
NAMESPACE_PROJECT_ID = "prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh"
PROJECT_ID = NAMESPACE_PROJECT_ID  # historical name; still the default deployment binding
# Which Vercel projects may serve this namespace: explicit, comma separated, no
# wildcard. Unset means exactly the original project (the behaviour before this
# variable existed). A malformed list closes the service instead of being guessed.
ALLOWLIST_VARIABLE = "SHOP_API_ALLOWED_PROJECT_IDS"
PROJECT_ID_PATTERN = re.compile(r"prj_[A-Za-z0-9]{8,64}\Z")
MAX_ALLOWED_PROJECTS = 5
# This is a NEW planned namespace, not a statement that it exists in Atlas.
PLANNED_NAMESPACE = "nexify_teileklar_shop_v1"
SCHEMA_MARKER = f"nexify/teileklar/shop-v1/{NAMESPACE_PROJECT_ID}/{PLANNED_NAMESPACE}"
CLAIM_COLLECTION = "source_manifests"
CLAIM_DESCRIPTION = re.compile(re.escape(SCHEMA_MARKER) + r"/claim/[0-9a-f]{32}\Z")
COLLECTIONS = (
    "products", "categories", "imports", "source_manifests", "carts", "orders",
    "webhook_events", "workshops", "workshop_requests", "users", "sessions",
    "login_failures", "password_resets", "settings", "revolut_webhooks", "outbox", "requests", "price_releases",
)
# Existing db.ensure_indexes + accounts_api.ensure_auth_indexes, not executed here.
INDEXES = {
    "products": [(("bigbuy_id",), True, None), (("active", "category_ids"), False, None), (("ean",), False, None), (("sku",), False, None)],
    "carts": [(("owner",), True, None)],
    "orders": [(("owner", "idempotency_key"), True, None), (("revolut_order_id",), False, None), (("user_id",), False, None)],
    "webhook_events": [(("event_key",), True, None)],
    "workshops": [(("zip",), False, None), (("city_key",), False, None)],
    "users": [(("email",), True, None), (("user_id",), True, None)],
    "sessions": [(("token_hash",), True, None), (("expires_at",), False, 0)],
    "login_failures": [(("at",), False, 900)],
    "password_resets": [(("expires_at",), False, 0)],
}
# Collections a switched feature needs. They may be absent (then only that feature
# answers 503); if present they must carry the same marker and exactly these indexes.
# The runtime never creates them: `namespace_operator.py extend` does, on request.
OPTIONAL_COLLECTIONS = ("partner_applications",)
OPTIONAL_INDEXES = {
    "partner_applications": [(("number",), True, None), (("open_key",), True, None)],
}
PREFIXES = ("/api/shop", "/api/auth", "/api/admin", "/api/workshops", "/api/requests", "/api/partner-applications")
MODULES = ("accounts_api", "catalog_api", "cart_api", "checkout_api", "workshops_api", "admin_api", "requests_api",
           "teileklar_admin_api", "partners_api")
HEALTH_PATHS = ("/api/health", "/api/openapi.json", "/api/docs", "/api/docs/oauth2-redirect")
# Internal diagnostics: answers 404 unless SHOP_DIAGNOSTICS_TOKEN is configured and
# presented. Reports reason codes and variable NAMES only.
DIAGNOSTICS_PATH = "/api/health/runtime"
DIAGNOSTICS_TOKEN_VARIABLE = "SHOP_DIAGNOSTICS_TOKEN"
DIAGNOSTICS_HEADER = "x-shop-diagnostics-token"
DIAGNOSTICS_TOKEN_MIN_LENGTH = 32
# Paths that never reach payment code (no revolut/fulfillment import, no payment
# mode read). Everything else under an owned prefix needs a bound payment mode: a
# route nobody classified is closed, not open.
PAYMENT_FREE_PREFIXES = ("/api/auth", "/api/workshops", "/api/requests", "/api/partner-applications", "/api/shop/cart",
                         "/api/shop/products", "/api/admin/partner-applications", "/api/admin/teileklar")
PAYMENT_FREE_EXACT = HEALTH_PATHS + ("/api/shop/status", "/api/shop/categories")
# Feature switch -> (paths it owns, optional collections it needs).
FEATURES = {
    "TEILEKLAR_PARTNER_APPLICATIONS": (("/api/partner-applications", "/api/admin/partner-applications"), ("partner_applications",)),
}
# Fixed diagnostic code -> names of the variables that decide it. Names only.
REASON_VARIABLES = {
    "project_binding_unverified": ("VERCEL_PROJECT_ID", ALLOWLIST_VARIABLE),
    "project_allowlist_invalid": (ALLOWLIST_VARIABLE,),
    "database_configuration_conflict": ("MONGO_URL", "MONGODB_URI"),
    "database_binding_missing_or_unsuitable": ("MONGODB_URI",),
    "database_namespace_conflict": ("DB_NAME", "MONGODB_URI"),
    "database_namespace_unapproved": ("DB_NAME",),
    "public_origin_unbound": ("PREVIEW_PUBLIC_ORIGIN",),
    "tax_configuration_unbound": ("SHOP_VAT_PERCENT",),
    "payment_mode_unbound": ("REVOLUT_MODE",),
}
# Presence (set/missing) is reported for these names; their values are never read out.
REPORTED_VARIABLES = ("VERCEL_PROJECT_ID", ALLOWLIST_VARIABLE, "MONGODB_URI", "MONGO_URL", "DB_NAME", "PREVIEW_PUBLIC_ORIGIN",
                      "SHOP_VAT_PERCENT", "REVOLUT_MODE", "REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION",
                      "REVOLUT_MERCHANT_SECRET_KEY_SANDBOX", "RESEND_API_KEY", "RESEND_FROM", "RESEND_FROM_ADDRESS",
                      "MAIL_INTERNAL_TO", "NEXIFY_MAIL_FROM", "BIGBUY_API_KEY_PRODUCTION", "BIGBUY_API_KEY",
                      "TEILEKLAR_PARTNER_APPLICATIONS", "TEILEKLAR_OPERATOR_INBOX")
log = logging.getLogger("shop.runtime")


class BindingError(ValueError):
    """Only a fixed diagnostic code, never an env value, is returned or logged."""


@dataclass(frozen=True)
class Binding:
    uri: str = field(repr=False)
    namespace: str
    origin: str
    vat: str


def allowed_project_ids(env: Mapping[str, str]) -> frozenset:
    raw = env.get(ALLOWLIST_VARIABLE, "")
    if not isinstance(raw, str):
        raise BindingError("project_allowlist_invalid")
    if not raw.strip():
        return frozenset({NAMESPACE_PROJECT_ID})
    entries = [entry.strip() for entry in raw.split(",")]
    if len(entries) > MAX_ALLOWED_PROJECTS or any(not PROJECT_ID_PATTERN.fullmatch(entry) for entry in entries):
        raise BindingError("project_allowlist_invalid")
    return frozenset(entries)


def check_project(env: Mapping[str, str]) -> None:
    """The running project must be named explicitly; a missing id never passes."""
    allowed = allowed_project_ids(env)
    current = env.get("VERCEL_PROJECT_ID")
    if not isinstance(current, str) or current not in allowed:
        raise BindingError("project_binding_unverified")


def check_database(env: Mapping[str, str]):
    old, new = env.get("MONGO_URL", ""), env.get("MONGODB_URI", "")
    if old and new and old != new:
        raise BindingError("database_configuration_conflict")
    uri = old or new
    if not isinstance(uri, str) or not uri:
        raise BindingError("database_binding_missing_or_unsuitable")
    try:
        parsed = urlsplit(uri)
        if parsed.scheme not in ("mongodb", "mongodb+srv") or not parsed.hostname or parsed.fragment:
            raise ValueError()
        if parsed.hostname.lower() in ("localhost", "127.0.0.1", "::1"):
            raise ValueError()
        uri_name = unquote(parsed.path.lstrip("/"))
    except (ValueError, TypeError):
        raise BindingError("database_binding_missing_or_unsuitable") from None
    explicit = env.get("DB_NAME", "")
    if explicit and uri_name and explicit != uri_name:
        raise BindingError("database_namespace_conflict")
    # An arbitrary URI path is never adopted; only this purpose-bound plan can pass.
    namespace = explicit or uri_name
    if namespace != PLANNED_NAMESPACE:
        raise BindingError("database_namespace_unapproved")
    return uri, namespace


def check_origin(env: Mapping[str, str]) -> str:
    raw_origin = env.get("PREVIEW_PUBLIC_ORIGIN", "")
    if not isinstance(raw_origin, str):
        raise BindingError("public_origin_unbound")
    origin = raw_origin.rstrip("/")
    try:
        public = urlsplit(origin)
        if public.scheme != "https" or not public.hostname or public.username or public.password or public.port or public.path or public.query or public.fragment:
            raise ValueError()
    except (ValueError, TypeError):
        raise BindingError("public_origin_unbound") from None
    return origin


def check_tax(env: Mapping[str, str]) -> str:
    vat = env.get("SHOP_VAT_PERCENT", "")
    try:
        amount = Decimal(vat)
        if not amount.is_finite() or not Decimal(0) <= amount <= Decimal(100):
            raise ValueError()
    except (InvalidOperation, ValueError, TypeError):
        raise BindingError("tax_configuration_unbound") from None
    return vat


def resolve_binding(env: Mapping[str, str]) -> Binding:
    """First unmet prerequisite wins; the order is part of the contract."""
    check_project(env)
    uri, namespace = check_database(env)
    return Binding(uri, namespace, check_origin(env), check_tax(env))


def payment_mode_bound(env: Mapping[str, str]) -> bool:
    return env.get("REVOLUT_MODE") in ("live", "sandbox")


def feature_enabled(env: Mapping[str, str], switch: str) -> bool:
    """Default off: only the exact value "on" enables a feature."""
    return env.get(switch) == "on"


def diagnose(env: Mapping[str, str]) -> dict:
    """Every unmet prerequisite at once, as fixed codes and variable NAMES.

    Reads the configuration only: no network, no database. Never returns a value.
    """
    blocking = []
    for check in (check_project, check_database, check_origin, check_tax):
        try:
            check(env)
        except BindingError as error:
            blocking.append({"reason": str(error), "variables": list(REASON_VARIABLES.get(str(error), ()))})
    payment_key = {"live": "REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION", "sandbox": "REVOLUT_MERCHANT_SECRET_KEY_SANDBOX"}.get(env.get("REVOLUT_MODE"))
    mail_missing = [] if env.get("RESEND_API_KEY") else ["RESEND_API_KEY"]
    if not (env.get("RESEND_FROM") or env.get("RESEND_FROM_ADDRESS")):
        mail_missing.append("RESEND_FROM")
    degraded = []
    if payment_key is None:
        degraded.append({"capability": "payment", "reason": "payment_mode_unbound", "variables": ["REVOLUT_MODE"],
                         "effect": "checkout, orders, payment webhook and shop administration answer 503"})
    elif not env.get(payment_key):
        degraded.append({"capability": "payment", "reason": "payment_key_missing", "variables": [payment_key],
                         "effect": "creating a payment fails at the provider call"})
    if mail_missing:
        degraded.append({"capability": "mail", "reason": "mail_not_configured", "variables": mail_missing,
                         "effect": "mails stay in the outbox; requests and orders are stored regardless"})
    if not env.get("MAIL_INTERNAL_TO"):
        degraded.append({"capability": "internal_notification", "reason": "internal_recipient_missing", "variables": ["MAIL_INTERNAL_TO"],
                         "effect": "no operator notification for requests and paid orders"})
    return {"core_configured": not blocking, "blocking": blocking, "degraded": degraded,
            "features": {switch: "on" if feature_enabled(env, switch) else "off" for switch in FEATURES},
            "variables": {name: "set" if env.get(name) else "missing" for name in REPORTED_VARIABLES}}


def named_variables(report: dict, section: str = "blocking") -> str:
    return ",".join(sorted({name for item in report[section] for name in item["variables"]})) or "-"


async def inspect_metadata(database):
    """(core error or None, optional collections that are present and valid).

    No find/count/doc reads, create_index, seed/import, or schema writes. A present
    optional collection is held to the same marker and index contract as the core;
    only its ABSENCE is tolerated. Anything else in the namespace stays an error.
    """
    cursor = await database.list_collections()
    metadata = await cursor.to_list(length=len(COLLECTIONS) + len(OPTIONAL_COLLECTIONS) + 1)
    by_name = {item.get("name"): item for item in metadata}
    present = tuple(name for name in OPTIONAL_COLLECTIONS if name in by_name)
    if set(by_name) - set(OPTIONAL_COLLECTIONS) != set(COLLECTIONS) or len(metadata) != len(COLLECTIONS) + len(present):
        return "namespace_schema_unbound", ()
    expected_validator = {"$jsonSchema": {"bsonType": "object", "description": SCHEMA_MARKER}}
    for name in COLLECTIONS + present:
        item = by_name[name]
        options = item.get("options", {})
        if not isinstance(options, dict) or item.get("type") != "collection":
            return "namespace_schema_unbound", ()
        if set(options) - {"validator", "validationLevel", "validationAction", "capped"}:
            return "namespace_schema_unbound", ()
        allowed_validator = expected_validator
        description = options.get("validator", {}).get("$jsonSchema", {}).get("description", "")
        if name == CLAIM_COLLECTION and isinstance(description, str) and CLAIM_DESCRIPTION.fullmatch(description):
            allowed_validator = {"$jsonSchema": {"bsonType": "object", "description": description}}
        if options.get("validator") != allowed_validator or options.get("validationLevel", "strict") != "strict" or options.get("validationAction", "error") != "error" or options.get("capped", False) is not False:
            return "namespace_schema_unbound", ()
        indexes = await database[name].index_information()
        specifications = INDEXES.get(name, []) if name in COLLECTIONS else OPTIONAL_INDEXES.get(name, [])
        expected = {tuple((key, 1) for key in keys): (unique, ttl) for keys, unique, ttl in specifications}
        found = set()
        found_id = False
        for value in indexes.values():
            # Unknown options can impose constraints (e.g. prepareUnique) even
            # while unique=False; never infer compatibility from keys alone.
            if set(value) - {"v", "key", "name", "ns", "background", "unique", "expireAfterSeconds", "collation"}:
                return "required_index_unverified", ()
            key = tuple(tuple(part) for part in value.get("key", []))
            if key == (("_id", 1),):
                if value.get("sparse") or "partialFilterExpression" in value or "expireAfterSeconds" in value or value.get("hidden", False) is not False:
                    return "required_index_unverified", ()
                found_id = True
                continue
            if key not in expected:
                return "required_index_unverified", ()
            unique, ttl = expected[key]
            if value.get("sparse") or "partialFilterExpression" in value or value.get("hidden", False) is not False:
                return "required_index_unverified", ()
            if value.get("collation", {}).get("locale", "simple") != "simple":
                return "required_index_unverified", ()
            if value.get("unique", False) is not unique:
                return "required_index_unverified", ()
            actual_ttl = value.get("expireAfterSeconds")
            if ttl is None and "expireAfterSeconds" in value:
                return "required_index_unverified", ()
            if ttl is not None and (isinstance(actual_ttl, bool) or actual_ttl != ttl):
                return "required_index_unverified", ()
            found.add(key)
        if not found_id or found != set(expected):
            return "required_index_unverified", ()
    return None, present


async def check_metadata(database) -> str | None:
    """Core readiness only (see inspect_metadata)."""
    return (await inspect_metadata(database))[0]


def load_existing(binding: Binding):
    """Lazy import of existing routers, never shop.main or its lifespan.

    Aliases exist only in this server process. GATEWAY_PORT=0 satisfies an inert
    legacy config import; no gateway module/server/port is started or used.
    """
    if not os.environ.get("MONGO_URL"):
        os.environ["MONGO_URL"] = binding.uri
    if not os.environ.get("DB_NAME"):
        os.environ["DB_NAME"] = binding.namespace
    os.environ.setdefault("GATEWAY_PORT", "0")
    service_root = Path(__file__).resolve().parent
    bundled_helper = service_root / "vercel_support"
    helper_root = bundled_helper if (bundled_helper / "bigbuy_get.py").is_file() else service_root.parent / "agent-gateway"
    if str(service_root) not in sys.path:
        sys.path.insert(0, str(service_root))
    if str(helper_root) not in sys.path:
        sys.path.insert(0, str(helper_root))
    modules = [importlib.import_module("shop." + name) for name in MODULES]
    database = importlib.import_module("shop.db").db
    return [module.router for module in modules], database


def under(path: str, prefixes) -> bool:
    return any(path == prefix or path.startswith(prefix + "/") for prefix in prefixes)


def owns(path: str) -> bool:
    return path in HEALTH_PATHS or path == DIAGNOSTICS_PATH or under(path, PREFIXES)


def payment_independent(path: str) -> bool:
    """Accounts, catalogue reads, cart, workshop search, requests and partner
    applications never touch payment code; apps/shop-api/tests/test_runtime_entry.py
    checks that against the router sources. Unclassified paths need a payment mode."""
    return path in PAYMENT_FREE_EXACT or under(path, PAYMENT_FREE_PREFIXES)


def feature_of(path: str):
    for switch, (paths, _) in FEATURES.items():
        if under(path, paths):
            return switch
    return None


def diagnostics_authorized(env: Mapping[str, str], presented) -> bool:
    expected = env.get(DIAGNOSTICS_TOKEN_VARIABLE, "")
    if not isinstance(expected, str) or len(expected) < DIAGNOSTICS_TOKEN_MIN_LENGTH or not isinstance(presented, str):
        return False
    return hmac.compare_digest(expected.encode(), presented.encode())


def unavailable(code: str):
    return JSONResponse({"detail": {"error": "runtime_binding_unavailable", "reason": code}, "available": False}, status_code=503, headers={"Cache-Control": "no-store"})


def not_owned():
    return JSONResponse({"error": "route_not_owned"}, status_code=404, headers={"Cache-Control": "no-store"})


def create_app(env: Mapping[str, str] | None = None, *, loader=load_existing, probe=check_metadata, inspector=inspect_metadata) -> FastAPI:
    values = dict(os.environ if env is None else env)
    try:
        binding, binding_error = resolve_binding(values), None
    except BindingError as error:
        binding, binding_error = None, str(error)
    payment_mode_configured = payment_mode_bound(values)
    report = diagnose(values)
    logged = set()

    def note(code: str, names: str = "-"):
        """One log line per distinct reason and process: fixed code plus variable NAMES."""
        if code not in logged:
            logged.add(code)
            log.warning("shop_runtime_unavailable reason=%s variables=%s", code, names)

    if binding_error:
        note(binding_error, named_variables(report))
    for item in report["degraded"]:
        log.warning("shop_runtime_degraded capability=%s reason=%s variables=%s", item["capability"], item["reason"], ",".join(item["variables"]))
    app = FastAPI(title="TEILEKLAR Shop API", version="1.0", openapi_url="/api/openapi.json", docs_url="/api/docs", redoc_url=None)
    lock = asyncio.Lock()
    loaded = False
    database = None

    async def ready():
        nonlocal loaded, database
        if binding_error:
            return binding_error
        try:
            async with lock:
                if not loaded:
                    routers, database = loader(binding)
                    if getattr(database, "name", None) != binding.namespace:
                        note("database_namespace_conflict", "DB_NAME,MONGODB_URI")
                        return "database_namespace_conflict"
                    for router in routers:
                        app.include_router(router)
                    app.openapi_schema = None
                    loaded = True
            # All dispatched operations are gated, including GETs with write effects.
            error = await asyncio.wait_for(probe(database), timeout=3)
        except Exception:
            # No driver exception, URI, password, or document payload reaches HTTP/logs.
            error = "database_metadata_unavailable"
        if error:
            note(error)
        return error

    async def feature_ready(switch: str):
        """A switched feature additionally needs its optional collections to exist and match."""
        try:
            error, present = await asyncio.wait_for(inspector(database), timeout=3)
        except Exception:
            error, present = "database_metadata_unavailable", ()
        if error or set(FEATURES[switch][1]) - set(present):
            note("feature_schema_unbound:" + switch)
            return "feature_schema_unbound"
        return None

    @app.middleware("http")
    async def runtime_gate(request: Request, call_next):
        path = request.url.path
        if not owns(path):
            return not_owned()
        if path == DIAGNOSTICS_PATH:
            # Indistinguishable from an unknown path without the configured token.
            if request.method != "GET" or not diagnostics_authorized(values, request.headers.get(DIAGNOSTICS_HEADER)):
                return not_owned()
            response = await call_next(request)
            response.headers["Cache-Control"] = "no-store"
            return response
        if not payment_mode_configured and not payment_independent(path):
            note("payment_mode_unbound", "REVOLUT_MODE")
            return unavailable("payment_mode_unbound")
        error = await ready()
        if error:
            return unavailable(error)
        switch = feature_of(path)
        if switch and feature_enabled(values, switch):
            # Off: the router itself answers 404, exactly as if the feature did not exist.
            error = await feature_ready(switch)
            if error:
                return unavailable(error)
        # Preserve the existing same_origin_writes contract, including webhook exception.
        writes = request.method in ("POST", "PUT", "PATCH", "DELETE") and under(path, PREFIXES)
        origin = request.headers.get("origin")
        if writes and origin and origin.rstrip("/") != binding.origin and not path.startswith("/api/shop/webhooks/"):
            return JSONResponse({"detail": {"error": "origin_rejected"}}, status_code=403, headers={"Cache-Control": "no-store"})
        response = await call_next(request)
        if path.startswith(PREFIXES) or path == "/api/health":
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    @app.get("/api/health")
    async def health():
        # Metadata readiness only; not provider health, stock approval or portal acceptance.
        return {"ok": True, "runtime": "vercel-services", "schema": "shop-runtime-v1", "payment_mode_configured": payment_mode_configured}

    @app.get(DIAGNOSTICS_PATH, include_in_schema=False)
    async def runtime_diagnostics():
        # Token-gated in the middleware. Codes and variable names only; never a value.
        state = await ready()
        features = {}
        for switch in FEATURES:
            if not feature_enabled(values, switch):
                features[switch] = "off"
            elif state:
                features[switch] = "core_unavailable"
            else:
                features[switch] = await feature_ready(switch) or "ready"
        return {**report, "features": features, "database": state or "ready",
                "payment_dependent_paths": "open" if payment_mode_configured else "closed"}

    return app


# Missing configuration produces a usable503 app, not an import/build failure.
app = create_app()
