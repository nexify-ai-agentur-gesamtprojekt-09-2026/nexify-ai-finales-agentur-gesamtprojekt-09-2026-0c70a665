import asyncio
import os
import socket
import subprocess
import sys
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

from . import auth, config
from .db import db, ensure_indexes
from . import mailer
from . import nexify_api
from . import accounts_api, admin_api, cart_api, catalog_api, checkout_api, requests_api, workshops_api
from . import partners_api, teileklar_admin_api, verification_api

NEXT_API = ("/api/agent-chat", "/api/agent-runtime-status", "/api/internal")
HOP = {"host", "content-length", "connection", "transfer-encoding", "keep-alive"}
_gateway = {}


def port_open(port):
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0


def start_gateway():
    if port_open(config.GATEWAY_PORT):
        return
    (config.ROOT / ".local").mkdir(exist_ok=True)
    _gateway["proc"] = subprocess.Popen([sys.executable, str(config.ROOT / "apps/agent-gateway/server.py"), "--database", str(config.ROOT / ".local/visitor.sqlite"),
                                         "--port", str(config.GATEWAY_PORT), "--web-origin", "http://127.0.0.1:%d" % config.NEXT_PORT, "--public-origin", config.PUBLIC_ORIGIN],
                                        cwd=str(config.ROOT), stdout=subprocess.DEVNULL, stderr=open("/tmp/agent-gateway.log", "ab"))


@asynccontextmanager
async def lifespan(app):
    await ensure_indexes()
    await accounts_api.ensure_auth_indexes()
    await accounts_api.seed_accounts()
    await workshops_api.import_workshops()
    await nexify_api.ensure_nexify_indexes()
    if verification_api.enabled():
        await verification_api.ensure_verification_indexes()
    start_gateway()
    retry = asyncio.create_task(mailer.retry_loop())
    yield
    retry.cancel()
    if _gateway.get("proc"):
        _gateway["proc"].terminate()


app = FastAPI(title="TEILEKLAR Shop API", version="1.0", lifespan=lifespan, openapi_url="/api/openapi.json", docs_url="/api/docs", redoc_url=None)


@app.middleware("http")
async def same_origin_writes(request: Request, call_next):
    origin = request.headers.get("origin")
    writes = request.method in ("POST", "PUT", "PATCH", "DELETE") and request.url.path.startswith(("/api/shop", "/api/admin", "/api/workshops", "/api/auth", "/api/requests", "/api/partner-applications", "/api/portal", "/api/operator", "/api/oracle"))
    if writes and origin and origin.rstrip("/") != config.PUBLIC_ORIGIN and not request.url.path.startswith("/api/shop/webhooks/"):
        return JSONResponse({"detail": {"error": "origin_rejected"}}, status_code=403)
    response = await call_next(request)
    if request.url.path.startswith(("/api/shop", "/api/admin", "/api/auth", "/api/workshops", "/api/requests")):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


# verification_api, teileklar_admin_api and partners_api answer 404 unless their switches are on (default off).
for module in (accounts_api, catalog_api, cart_api, checkout_api, workshops_api, admin_api, requests_api, nexify_api, verification_api, teileklar_admin_api, partners_api):
    app.include_router(module.router)


@app.get("/api/health")
async def health():
    return {"ok": True, "revolut_mode": config.revolut_mode(), "products": await db.products.count_documents({"active": True}),
            "workshops": await db.workshops.estimated_document_count()}


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], include_in_schema=False)
async def legacy_proxy(path: str, request: Request):
    """Existing gateway (/api/session, chat, partner …) and Next route handlers keep working behind the shared /api ingress."""
    full = "/api/" + path
    port = config.NEXT_PORT if full.startswith(NEXT_API) else config.GATEWAY_PORT
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP}
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            upstream = await client.request(request.method, "http://127.0.0.1:%d%s" % (port, full), params=request.query_params,
                                            content=await request.body(), headers=headers)
    except httpx.HTTPError:
        return JSONResponse({"error": "upstream_unavailable"}, status_code=503)
    response = Response(upstream.content, status_code=upstream.status_code)
    for key, value in upstream.headers.multi_items():
        if key.lower() not in HOP and key.lower() != "content-encoding":
            response.headers.append(key, value)
    return response
