"""Server-side cart; prices always come from the catalog, never from the client."""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field

from . import auth, bigbuy_order, config, pricing
from .db import db, now_iso

router = APIRouter(prefix="/api/shop/cart")
MAX_QTY = 20


class ItemIn(BaseModel):
    model_config = ConfigDict(extra="ignore")  # price/total fields sent by a client are dropped
    product_id: str = Field(min_length=1, max_length=64)
    quantity: int = Field(ge=0, le=MAX_QTY)


async def owner_for(request: Request, response: Response, create=True):
    ident = await auth.identity(request)
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
    await db.carts.update_one({"owner": ident.owner}, {"$set": {"items": list(items.values()), "updated_at": now_iso()}}, upsert=True)


async def priced(owner, shipping_cents=None, address=None):
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
                      "line_cents": unit * item["quantity"], "stock": stock})
    subtotal = sum(l["line_cents"] for l in lines)
    shipping_pending = False
    shipping_source = "free" if not lines or subtotal >= config.SHIP_FREE_THRESHOLD_CENTS else "pending"
    if shipping_cents is not None:
        shipping = shipping_cents if lines else 0
    elif not lines:
        shipping = 0
    elif subtotal >= config.SHIP_FREE_THRESHOLD_CENTS:
        shipping = 0
    elif address is not None and address.get("country") and address.get("zip"):
        quote = await bigbuy_order.cart_shipping_quote("production", [{"reference": l["sku"], "quantity": l["quantity"]} for l in lines], address["country"], address["zip"])
        shipping = quote["cost_cents"] if quote and quote.get("cost_cents") is not None else config.SHIPPING_FALLBACK_CENTS
        shipping_source = "supplier_quote" if quote and quote.get("cost_cents") is not None else "configured_flat_rate"
    else:
        shipping = 0
        shipping_pending = True
    total = subtotal + shipping
    return {"lines": lines, "changes": changes, "subtotal_cents": subtotal, "shipping_cents": shipping,
            "total_cents": total, "vat_included_cents": pricing.vat_share_cents(total), "vat_percent": str(pricing.config.VAT_PERCENT),
            "currency": "EUR", "count": sum(l["quantity"] for l in lines),
            "shipping_pending": shipping_pending, "shipping_source": shipping_source, "free_shipping_threshold_cents": config.SHIP_FREE_THRESHOLD_CENTS}


@router.get("")
async def read_cart(request: Request, response: Response):
    ident = await owner_for(request, response, create=False)
    if not ident.owner:
        return {"lines": [], "changes": [], "subtotal_cents": 0, "shipping_cents": 0, "total_cents": 0, "vat_included_cents": 0, "currency": "EUR", "count": 0}
    return await priced(ident.owner)


@router.post("/items")
async def set_item(body: ItemIn, request: Request, response: Response):
    ident = await owner_for(request, response)
    cart = await db.carts.find_one({"owner": ident.owner}) or {"items": []}
    items = [i for i in cart["items"] if i["product_id"] != body.product_id]
    if body.quantity > 0:
        product = await db.products.find_one({"_id": body.product_id, "active": True})
        if not product:
            raise HTTPException(404, {"error": "product_not_found"})
        if product.get("stock", 0) < body.quantity:
            raise HTTPException(409, {"error": "insufficient_stock", "stock": product.get("stock", 0)})
        settings = await pricing.settings(db)
        if not settings["price_released"]:
            raise HTTPException(409, {"error": "price_not_released", "message": "Preis noch nicht freigegeben"})
        unit = pricing.sell_cents(product["purchase_cents"], settings["markup_percent"])
        items.append({"product_id": body.product_id, "name": product["name"], "quantity": body.quantity, "price_seen_cents": unit})
    await db.carts.update_one({"owner": ident.owner}, {"$set": {"items": items, "updated_at": now_iso()}}, upsert=True)
    return await priced(ident.owner)


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
    await db.carts.update_one({"owner": ident.owner}, {"$set": {"items": items, "updated_at": now_iso()}})
    return await priced(ident.owner)
