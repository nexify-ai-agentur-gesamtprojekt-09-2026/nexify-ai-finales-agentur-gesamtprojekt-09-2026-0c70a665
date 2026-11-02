"""NeXify Portal API: agency requests, workspace, AI and the independent TEILEKLAR shop."""
import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from shop import config  # noqa: F401  (loads .env)
from shop.db import db, ensure_indexes
from shop import mailer, accounts_api, admin_api, cart_api, catalog_api, checkout_api, workshops_api
from nexify import requests_api, workspace_api, ai_api, public_api


@asynccontextmanager
async def lifespan(app):
    await ensure_indexes()
    await accounts_api.ensure_auth_indexes()
    await accounts_api.seed_accounts()
    await workshops_api.import_workshops()
    await requests_api.ensure_indexes()
    await workspace_api.ensure_indexes()
    retry = asyncio.create_task(mailer.retry_loop())
    yield
    retry.cancel()


app = FastAPI(title="NeXify Portal API", version="2.0", lifespan=lifespan, openapi_url="/api/openapi.json", docs_url="/api/docs", redoc_url=None)

for module in (accounts_api, catalog_api, cart_api, checkout_api, workshops_api, admin_api, requests_api, workspace_api, ai_api, public_api):
    app.include_router(module.router)


@app.get("/api/health")
async def health():
    return {"ok": True, "revolut_mode": config.revolut_mode(), "revolut_configured": bool(config.revolut_key()),
            "bigbuy_configured": bool(config.bigbuy_key("production") or os.environ.get("BIGBUY_FTP_USER")),
            "products": await db.products.count_documents({"active": True}), "workshops": await db.workshops.estimated_document_count()}


app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=[o for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o] if os.environ.get("CORS_ORIGINS", "*") != "*" else [config.PUBLIC_ORIGIN or "*"],
                   allow_methods=["*"], allow_headers=["*"])
