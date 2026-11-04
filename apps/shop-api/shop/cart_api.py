"""Server-side cart; prices always come from the catalog, never from the client."""
import re
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from pymongo.errors import DuplicateKeyError

from . import auth, pricing
from .db import db, now_iso

router = APIRouter(prefix="/api/shop/cart")
MAX_QTY = 20
# Bounded replay window for additive writes; stored on the cart document itself so
# the deployed namespace keeps its exact collection/index contract.
APPLIED_KEYS_KEPT = 50
IDEMPOTENCY_KEY = re.compile(r"[A-Za-z0-9_:-]{16,80}")


class ItemIn(BaseModel):
    model_config = ConfigDict(extra="ignore")  # price/total fields sent by a client are dropped
    product_id: str = Field(min_length=1, max_length=64)
    quantity: int = Field(ge=0, le=MAX_QTY)
    # "set" (default, unchanged contract): absolute line quantity.
    # "add": server adds `quantity` to the current line; requires Idempotency-Key.
    mode: Literal["set", "add"] = "set"


async def issued_guest(guest_id):
    """Only a guest id this service issued and persisted (its cart exists) is honoured.

    A well-formed but unknown cookie (forged, planted or from another deployment)
    is never adopted as an owner; a write then rotates to a fresh server id.
    """
    return bool(guest_id) and await db.carts.find_one({"owner": "guest:" + guest_id}, {"_id": 1}) is not None


async def owner_for(request: Request, response: Response, create=True):
    ident = await auth.identity(request)
    if ident.guest_id and not await issued_guest(ident.guest_id):
        ident.guest_id = None
    if not ident.owner and create:
        ident.guest_id = auth.new_guest_id()
        auth.set_guest_cookie(response, ident.guest_id)
    if ident.user_id and ident.guest_id:
        await merge(ident)
    return ident


async def merge(ident):
    guest = await db.carts.find_one_and_delete({"owner": "guest:" + ident.guest_id})
    if not guest or not guest.get("items"):
        return
    cart = await db.carts.find_one({"owner": ident.owner}) or {"items": []}
    items = {i["product_id"]: i for i in cart["items"]}
    for item in guest["items"]:
        if item["product_id"] in items:
            items[item["product_id"]]["quantity"] = min(MAX_QTY, items[item["product_id"]]["quantity"] + item["quantity"])
        else:
            items[item["product_id"]] = item
    await db.carts.update_one({"owner": ident.owner}, {"$set": {"items": list(items.values()), "updated_at": now_iso()}, "$inc": {"rev": 1}}, upsert=True)


def delivery_days(product):
    """Configured per-product delivery window, only when well-formed; otherwise no claim at all."""
    days = (product.get("delivery_days_min"), product.get("delivery_days_max"))
    if all(type(day) is int for day in days) and 1 <= days[0] <= days[1] <= 60:
        return {"delivery_days_min": days[0], "delivery_days_max": days[1]}
    return {}


async def priced(owner, shipping_cents=None):
    cart = await db.carts.find_one({"owner": owner}) or {"items": []}
    settings = await pricing.settings(db)
    ids = [i["product_id"] for i in cart["items"]]
    products = {p["_id"]: p async for p in db.products.find({"_id": {"$in": ids}})}
    lines, changes = [], []
    for item in cart["items"]:
        product = products.get(item["product_id"])
        if not product or not product.get("active"):
            changes.append({"product_id": item["product_id"], "kind": "unavailable", "name": item.get("name")})
            continue
        unit = pricing.sell_cents(product["purchase_cents"], settings["markup_percent"])
        stock = product.get("stock", 0)
        if item.get("price_seen_cents") is not None and item["price_seen_cents"] != unit:
            changes.append({"product_id": product["_id"], "kind": "price", "name": product["name"], "old": item["price_seen_cents"], "new": unit})
        if stock < item["quantity"]:
            changes.append({"product_id": product["_id"], "kind": "stock", "name": product["name"], "old": item["quantity"], "new": stock})
        lines.append({"product_id": product["_id"], "name": product["name"], "sku": product.get("sku"), "ean": product.get("ean"),
                      "image": (product.get("images") or [None])[0], "quantity": item["quantity"], "unit_cents": unit,
                      "line_cents": unit * item["quantity"], "stock": stock, **delivery_days(product)})
    subtotal = sum(l["line_cents"] for l in lines)
    shipping = settings["shipping_cents"] if shipping_cents is None else shipping_cents
    total = subtotal + (shipping if lines else 0)
    return {"lines": lines, "changes": changes, "subtotal_cents": subtotal, "shipping_cents": shipping if lines else 0,
            "total_cents": total, "vat_included_cents": pricing.vat_share_cents(total), "vat_percent": str(pricing.config.VAT_PERCENT),
            "currency": "EUR", "count": sum(l["quantity"] for l in lines)}


@router.get("")
async def read_cart(request: Request, response: Response):
    ident = await owner_for(request, response, create=False)
    if not ident.owner:
        return {"lines": [], "changes": [], "subtotal_cents": 0, "shipping_cents": 0, "total_cents": 0, "vat_included_cents": 0, "currency": "EUR", "count": 0}
    return await priced(ident.owner)


async def sellable(product_id, quantity):
    product = await db.products.find_one({"_id": product_id, "active": True})
    if not product:
        raise HTTPException(404, {"error": "product_not_found"})
    if product.get("stock", 0) < quantity:
        raise HTTPException(409, {"error": "insufficient_stock", "stock": product.get("stock", 0)})
    settings = await pricing.settings(db)
    if not settings["price_released"]:
        raise HTTPException(409, {"error": "price_not_released", "message": "Preis noch nicht freigegeben"})
    unit = pricing.sell_cents(product["purchase_cents"], settings["markup_percent"])
    return {"product_id": product_id, "name": product["name"], "quantity": quantity, "price_seen_cents": unit}


@router.post("/items")
async def set_item(body: ItemIn, request: Request, response: Response,
                   idempotency_key: str | None = Header(None, alias="Idempotency-Key")):
    if body.mode == "add":
        return await add_item(body, request, response, idempotency_key)
    ident = await owner_for(request, response)
    cart = await db.carts.find_one({"owner": ident.owner}) or {"items": []}
    items = [i for i in cart["items"] if i["product_id"] != body.product_id]
    if body.quantity > 0:
        items.append(await sellable(body.product_id, body.quantity))
    await db.carts.update_one({"owner": ident.owner}, {"$set": {"items": items, "updated_at": now_iso()}, "$inc": {"rev": 1}}, upsert=True)
    return await priced(ident.owner)


async def add_item(body, request, response, idempotency_key):
    """Additive, idempotent line change computed from the server's current cart.

    A retried request with the same key (e.g. after a lost response) replays the
    current cart instead of adding twice. Concurrent writers are serialised by an
    optimistic revision; the unique owner index turns a lost race into a re-read.
    """
    if body.quantity < 1:
        raise HTTPException(422, {"error": "quantity_invalid"})
    if not idempotency_key or not IDEMPOTENCY_KEY.fullmatch(idempotency_key):
        raise HTTPException(428, {"error": "idempotency_key_required"})
    ident = await owner_for(request, response)
    for _ in range(5):
        cart = await db.carts.find_one({"owner": ident.owner}) or {"items": []}
        if idempotency_key in cart.get("applied_keys", []):
            return await priced(ident.owner)
        existing = next((i["quantity"] for i in cart["items"] if i["product_id"] == body.product_id), 0)
        total = existing + body.quantity
        if total > MAX_QTY:
            raise HTTPException(409, {"error": "quantity_limit", "max": MAX_QTY, "in_cart": existing})
        line = await sellable(body.product_id, total)
        items = [i for i in cart["items"] if i["product_id"] != body.product_id] + [line]
        if "_id" not in cart:
            try:
                await db.carts.insert_one({"owner": ident.owner, "items": items, "updated_at": now_iso(), "rev": 1,
                                           "applied_keys": [idempotency_key]})
            except DuplicateKeyError:
                continue  # a concurrent first write created the cart; re-read and re-check the key
            return await priced(ident.owner)
        revision = {"$exists": False} if "rev" not in cart else cart["rev"]
        result = await db.carts.update_one(
            {"_id": cart["_id"], "owner": ident.owner, "rev": revision},
            {"$set": {"items": items, "updated_at": now_iso()}, "$inc": {"rev": 1},
             "$push": {"applied_keys": {"$each": [idempotency_key], "$slice": -APPLIED_KEYS_KEPT}}})
        if result.matched_count:
            return await priced(ident.owner)
        # Another write changed the revision first; re-read and re-check the key.
    raise HTTPException(409, {"error": "cart_busy"})


@router.post("/confirm-changes")
async def confirm_changes(request: Request, response: Response):
    ident = await owner_for(request, response, create=False)
    if not ident.owner:
        raise HTTPException(404, {"error": "cart_not_found"})
    current = await priced(ident.owner)
    by_id = {l["product_id"]: l for l in current["lines"]}
    items = []
    for line in by_id.values():
        quantity = min(line["quantity"], line["stock"])
        if quantity > 0:
            items.append({"product_id": line["product_id"], "name": line["name"], "quantity": quantity, "price_seen_cents": line["unit_cents"]})
    await db.carts.update_one({"owner": ident.owner}, {"$set": {"items": items, "updated_at": now_iso()}, "$inc": {"rev": 1}})
    return await priced(ident.owner)
