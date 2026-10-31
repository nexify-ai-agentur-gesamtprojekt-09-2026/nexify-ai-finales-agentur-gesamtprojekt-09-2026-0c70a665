"""Vercel Services entrypoint. No seeds, migrations, local gateways or retry worker.

A module-level app always exists, including with missing runtime bindings, so the
frontend can build/deploy independently. Business routes fail closed before any
router is called. Schema/index inspection reads metadata only, never documents.
"""
from __future__ import annotations

import asyncio
import importlib
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

PROJECT_ID = "prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh"
# This is a NEW planned namespace, not a statement that it exists in Atlas.
PLANNED_NAMESPACE = "nexify_teileklar_shop_v1"
SCHEMA_MARKER = f"nexify/teileklar/shop-v1/{PROJECT_ID}/{PLANNED_NAMESPACE}"
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
PREFIXES = ("/api/shop", "/api/auth", "/api/admin", "/api/workshops", "/api/requests")
MODULES = ("accounts_api", "catalog_api", "cart_api", "checkout_api", "workshops_api", "admin_api", "requests_api")


class BindingError(ValueError):
    """Only a fixed diagnostic code, never an env value, is returned or logged."""


@dataclass(frozen=True)
class Binding:
    uri: str = field(repr=False)
    namespace: str
    origin: str
    vat: str


def resolve_binding(env: Mapping[str, str]) -> Binding:
    if env.get("VERCEL_PROJECT_ID") != PROJECT_ID:
        raise BindingError("project_binding_unverified")
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
    vat = env.get("SHOP_VAT_PERCENT", "")
    try:
        amount = Decimal(vat)
        if not amount.is_finite() or not Decimal(0) <= amount <= Decimal(100):
            raise ValueError()
    except (InvalidOperation, ValueError, TypeError):
        raise BindingError("tax_configuration_unbound") from None
    return Binding(uri, namespace, origin, vat)


async def check_metadata(database) -> str | None:
    """No find/count/doc reads, create_index, seed/import, or schema writes."""
    cursor = await database.list_collections()
    metadata = await cursor.to_list(length=None)
    by_name = {item.get("name"): item for item in metadata}
    if set(by_name) != set(COLLECTIONS):
        return "namespace_schema_unbound"
    expected_validator = {"$jsonSchema": {"bsonType": "object", "description": SCHEMA_MARKER}}
    for name in COLLECTIONS:
        item = by_name[name]
        options = item.get("options", {})
        if not isinstance(options, dict) or item.get("type") != "collection":
            return "namespace_schema_unbound"
        if set(options) - {"validator", "validationLevel", "validationAction", "capped"}:
            return "namespace_schema_unbound"
        if options.get("validator") != expected_validator or options.get("validationLevel", "strict") != "strict" or options.get("validationAction", "error") != "error" or options.get("capped", False) is not False:
            return "namespace_schema_unbound"
        indexes = await database[name].index_information()
        specifications = INDEXES.get(name, [])
        expected = {tuple((key, 1) for key in keys): (unique, ttl) for keys, unique, ttl in specifications}
        found = set()
        found_id = False
        for value in indexes.values():
            # Unknown options can impose constraints (e.g. prepareUnique) even
            # while unique=False; never infer compatibility from keys alone.
            if set(value) - {"v", "key", "name", "ns", "background", "unique", "expireAfterSeconds", "collation"}:
                return "required_index_unverified"
            key = tuple(tuple(part) for part in value.get("key", []))
            if key == (("_id", 1),):
                if value.get("sparse") or "partialFilterExpression" in value or "expireAfterSeconds" in value or value.get("hidden", False) is not False:
                    return "required_index_unverified"
                found_id = True
                continue
            if key not in expected:
                return "required_index_unverified"
            unique, ttl = expected[key]
            if value.get("sparse") or "partialFilterExpression" in value or value.get("hidden", False) is not False:
                return "required_index_unverified"
            if value.get("collation", {}).get("locale", "simple") != "simple":
                return "required_index_unverified"
            if value.get("unique", False) is not unique:
                return "required_index_unverified"
            actual_ttl = value.get("expireAfterSeconds")
            if ttl is None and "expireAfterSeconds" in value:
                return "required_index_unverified"
            if ttl is not None and (isinstance(actual_ttl, bool) or actual_ttl != ttl):
                return "required_index_unverified"
            found.add(key)
        if not found_id or found != set(expected):
            return "required_index_unverified"
    return None


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
    helper_root = service_root.parent / "agent-gateway"
    if str(service_root) not in sys.path:
        sys.path.insert(0, str(service_root))
    if str(helper_root) not in sys.path:
        sys.path.insert(0, str(helper_root))
    modules = [importlib.import_module("shop." + name) for name in MODULES]
    database = importlib.import_module("shop.db").db
    return [module.router for module in modules], database


def owns(path: str) -> bool:
    return path in ("/api/health", "/api/openapi.json", "/api/docs", "/api/docs/oauth2-redirect") or any(path == prefix or path.startswith(prefix + "/") for prefix in PREFIXES)


def catalog_read_only(path: str, method: str) -> bool:
    """These existing public read routes never call payment mode or mutate state."""
    if method not in ("GET", "HEAD"):
        return False
    return path in ("/api/health", "/api/openapi.json", "/api/docs", "/api/docs/oauth2-redirect", "/api/shop/status", "/api/shop/categories", "/api/shop/products") or path.startswith(("/api/shop/products/", "/api/workshops/"))


def unavailable(code: str):
    return JSONResponse({"detail": {"error": "runtime_binding_unavailable", "reason": code}, "available": False}, status_code=503, headers={"Cache-Control": "no-store"})


def create_app(env: Mapping[str, str] | None = None, *, loader=load_existing, probe=check_metadata) -> FastAPI:
    values = dict(os.environ if env is None else env)
    try:
        binding, binding_error = resolve_binding(values), None
    except BindingError as error:
        binding, binding_error = None, str(error)
    payment_mode_configured = values.get("REVOLUT_MODE") in ("live", "sandbox")
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
                        return "database_namespace_conflict"
                    for router in routers:
                        app.include_router(router)
                    app.openapi_schema = None
                    loaded = True
            # All dispatched operations are gated, including GETs with write effects.
            return await asyncio.wait_for(probe(database), timeout=3)
        except Exception:
            # No driver exception, URI, password, or document payload reaches HTTP/logs.
            return "database_metadata_unavailable"

    @app.middleware("http")
    async def runtime_gate(request: Request, call_next):
        path = request.url.path
        if not owns(path):
            return JSONResponse({"error": "route_not_owned"}, status_code=404, headers={"Cache-Control": "no-store"})
        if not payment_mode_configured and not catalog_read_only(path, request.method):
            return unavailable("payment_mode_unbound")
        error = await ready()
        if error:
            return unavailable(error)
        # Preserve the existing same_origin_writes contract, including webhook exception.
        writes = request.method in ("POST", "PUT", "PATCH", "DELETE") and path.startswith(("/api/shop", "/api/admin", "/api/workshops", "/api/auth"))
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

    return app


# Missing configuration produces a usable503 app, not an import/build failure.
app = create_app()
