#!/usr/bin/env python3
"""Local browser fixture for the live TEILEKLAR shop API (apps/shop-api).

Serves the REAL production entrypoint factory `vercel_app.create_app` and the
real shop routers (catalog, cart, checkout, accounts ...) on loopback only.
Replaced for this local run, and nothing else:

* MongoDB -> in-process mongomock-motor (no network, no persistence).
* The Atlas schema/validator metadata probe -> accepted, because mongomock cannot
  store collection validators. That probe is covered by tests/test_vercel_adapter.py.
* Payment provider (Revolut) and mail outbox -> refuse and record every call.
  The browser additionally blocks /api/shop/orders, so no order is created.

All catalogue data is SYNTHETIC and labelled as such; it is not supplier data.
No developer .env file is read. Modes:
  configured    real adapter with a complete synthetic binding and seeded data
  unconfigured  real adapter without a database binding (real 503 answer)

Control endpoints (loopback test driver only, never proxied to the browser):
  GET  /__fixture/state           server-side carts, orders and refused effects
  POST /__fixture/price-release   {"released": bool}
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
SERVICE = REPO / "apps" / "shop-api"
PUBLIC_ORIGIN = "https://teileklar.example.invalid"
NAMESPACE = "nexify_teileklar_shop_v1"

# Blank every provider credential name the routers read, so even a present
# developer .env (never read: load_dotenv is disabled below) could not reach them.
INERT = {name: "" for name in (
    "REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION", "REVOLUT_MERCHANT_SECRET_KEY_SANDBOX",
    "BIGBUY_API_KEY_PRODUCTION", "BIGBUY_API_KEY_SANDBOX", "RESEND_API_KEY",
    "MAIL_INTERNAL_TO", "RESEND_FROM_ADDRESS", "RESEND_FROM")}

CATEGORIES = [
    {"_id": 990001, "name": "Synthetische Testkategorie Bremsen", "root": True},
    {"_id": 990002, "name": "Synthetische Testkategorie Pflege", "root": False},
]
# purchase_cents/stock are synthetic fixture values, not prices or supplier facts.
PRODUCTS = [
    {"_id": "synthetic-brake-set", "bigbuy_id": 990101, "sku": "TEST-BRK-001", "ean": "0000000990101",
     "name": "SYNTHETISCHER TESTARTIKEL Bremsbelag-Satz", "purchase_cents": 2000, "stock": 8,
     "category_id": 990001, "category_ids": [990001],
     "images": ["https://cdnbigbuy.com/images/synthetic-test-only-brake.jpg"],
     "description": "Synthetischer Testartikel für den lokalen Browserlauf. Kein Angebot.",
     "details": {"weight": 1.5, "condition": "Testdaten"}, "imported_at": "2026-11-04T00:00:00+00:00", "active": True,
     # Delivery window and specific eligibility only; no manufacturer/GPSR data, so fallbacks render.
     "delivery_days_min": 2, "delivery_days_max": 4, "suitability": ["Synthetische Testachse vorn"]},
    {"_id": "synthetic-rim-cleaner", "bigbuy_id": 990102, "sku": "TEST-CLN-002", "ean": "0000000990102",
     "name": "SYNTHETISCHER TESTARTIKEL Felgenreiniger", "purchase_cents": 500, "stock": 2,
     "category_id": 990002, "category_ids": [990002], "images": [],
     "description": "Synthetischer Testartikel mit knappem Bestand.", "details": {},
     "imported_at": "2026-11-04T00:00:00+00:00", "active": True,
     # Complete synthetic optional facts: base price (500 ml), delivery, GPSR, universal eligibility, disposal.
     "manufacturer": "SYNTHETISCHER TESTHERSTELLER, Teststraße 1, 00000 Testort", "net_content": 500, "unit": "ml",
     "delivery_days_min": 3, "delivery_days_max": 6, "suitability": ["universal"],
     "safety_notes": ["Synthetischer Testhinweis: kein echter Sicherheitshinweis."], "scope_of_delivery": ["1 synthetische Testflasche"],
     "disposal_class": "battery"},
    {"_id": "synthetic-wiper-blade", "bigbuy_id": 990103, "sku": "TEST-WPR-003", "ean": "0000000990103",
     "name": "SYNTHETISCHER TESTARTIKEL Wischerblatt", "purchase_cents": 900, "stock": 0,
     "category_id": 990001, "category_ids": [990001], "images": [], "description": "", "details": {},
     "imported_at": "2026-11-04T00:00:00+00:00", "active": True},
]
SHIPPING_CENTS = 490


def isolate_runtime():
    import dotenv
    import motor.motor_asyncio
    from mongomock_motor import AsyncMongoMockClient
    dotenv.load_dotenv = lambda *args, **kwargs: False
    motor.motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient
    os.environ.update(INERT)
    sys.path.insert(0, str(SERVICE))


def binding_env(configured):
    env = {"VERCEL_PROJECT_ID": "prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh", "DB_NAME": NAMESPACE,
           "PREVIEW_PUBLIC_ORIGIN": PUBLIC_ORIGIN, "SHOP_VAT_PERCENT": "19", "REVOLUT_MODE": "sandbox", **INERT}
    if configured:
        # Never dialled: the motor client class is the in-memory double.
        env["MONGODB_URI"] = "mongodb://in-memory-fixture.invalid/" + NAMESPACE
    return env


class Effects:
    def __init__(self):
        self.provider_calls, self.mail_calls = [], []


def guard_effects(effects):
    from shop import mailer, revolut

    def refuse(kind):
        async def call(*args, **kwargs):
            effects.provider_calls.append(kind)
            raise revolut.RevolutError("fixture_provider_blocked")
        return call
    for name in ("create_order", "retrieve_order", "ensure_webhook"):
        setattr(revolut, name, refuse(name))

    async def no_mail(*args, **kwargs):
        effects.mail_calls.append("enqueue")
        return None
    mailer.enqueue = no_mail


async def seed(database):
    from shop.db import ensure_indexes
    await ensure_indexes(database)
    await database.categories.insert_many([dict(row) for row in CATEGORIES])
    await database.products.insert_many([dict(row) for row in PRODUCTS])
    await database.settings.insert_one({"_id": "shop", "markup_percent": "30", "shipping_cents": SHIPPING_CENTS,
                                        "price_release": {"released_at": "2026-11-04T00:00:00+00:00", "markup_percent": "30",
                                                          "note": "synthetic fixture release, no commercial approval"}})


def build(configured):
    isolate_runtime()
    import vercel_app
    from fastapi import Body, FastAPI
    env = binding_env(configured)
    effects = Effects()
    state = {"database": None}

    def loader(binding):
        os.environ.update(env)
        routers, database = vercel_app.load_existing(binding)
        guard_effects(effects)
        state["database"] = database
        return routers, database

    async def accepted_schema(_database):
        return None  # mongomock has no validators; see module docstring.

    adapter = vercel_app.create_app(env, loader=loader, probe=accepted_schema)
    if configured:
        binding = vercel_app.resolve_binding(env)
        loader(binding)
        asyncio.run(seed(state["database"]))
    control = FastAPI(openapi_url=None, docs_url=None)

    @control.get("/__fixture/state")
    async def fixture_state():
        database = state["database"]
        carts = [] if database is None else [
            {"owner_sha256": hashlib.sha256(cart["owner"].encode()).hexdigest(), "owner_kind": cart["owner"].split(":", 1)[0],
             "items": [{"product_id": item["product_id"], "quantity": item["quantity"]} for item in cart.get("items", [])],
             "rev": cart.get("rev"), "applied_keys": len(cart.get("applied_keys", []))}
            async for cart in database.carts.find({})]
        orders = 0 if database is None else await database.orders.count_documents({})
        return {"mode": "configured" if configured else "unconfigured", "carts": carts, "orders": orders,
                "provider_calls": effects.provider_calls, "mail_calls": effects.mail_calls}

    @control.post("/__fixture/price-release")
    async def price_release(body: dict = Body(...)):
        released = body.get("released") is True
        release = {"released_at": "2026-11-04T00:00:00+00:00", "markup_percent": "30"} if released else {}
        await state["database"].settings.update_one({"_id": "shop"}, {"$set": {"price_release": release}})
        return {"released": released}

    async def app(scope, receive, send):
        if scope["type"] == "http" and scope["path"].startswith("/__fixture/"):
            return await control(scope, receive, send)
        return await adapter(scope, receive, send)
    return app


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--mode", choices=("configured", "unconfigured"), required=True)
    args = parser.parse_args()
    import uvicorn
    app = build(args.mode == "configured")
    print(json.dumps({"ready": True, "port": args.port, "mode": args.mode}), flush=True)
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning", access_log=False, lifespan="off")


if __name__ == "__main__":
    main()
