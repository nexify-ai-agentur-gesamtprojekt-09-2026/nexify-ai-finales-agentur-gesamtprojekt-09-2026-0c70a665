"""Server-side cart; prices always come from the catalog, never from the client."""
import hashlib
import inspect

from bson import BSON
from bson.errors import InvalidDocument
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from pymongo.errors import DocumentTooLarge, DuplicateKeyError, PyMongoError
from pymongo.read_concern import ReadConcern
from pymongo.write_concern import WriteConcern

from . import auth, bigbuy_order, config, pricing
from .db import db, now_iso

router = APIRouter(prefix="/api/shop/cart")
MAX_QTY = 20
MAX_MERGE_HISTORY = 128
MAX_CART_BSON_BYTES = 16 * 1024 * 1024 - 1024


def cart_revision(cart):
    if cart is None or 'revision' not in cart:
        return None  # legacy document, distinct from revision zero
    value = cart['revision']
    if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value < 2**63 - 1:
        raise HTTPException(409, {'error': 'cart_revision_invalid'})
    return int(value)


def revision_filter(owner, revision):
    return {'owner': owner, 'revision': {'$exists': False} if revision is None else revision}


async def replace_cart(owner, cart, items, *, session=None, archive_entry=None):
    """Compare-and-set; a concurrent writer must never be silently overwritten."""
    update = {'$set': {'items': items, 'updated_at': now_iso()}, '$inc': {'revision': 1}}
    if archive_entry is not None:
        update['$push'] = {'merge_history': archive_entry}
    try:
        result = await db.carts.update_one(revision_filter(owner, cart_revision(cart)),
            update, upsert=cart is None, session=session)
    except DuplicateKeyError:
        raise HTTPException(409, {'error': 'cart_changed'}) from None
    if not result.matched_count and result.upserted_id is None:
        raise HTTPException(409, {'error': 'cart_changed'})


class ItemIn(BaseModel):
    model_config = ConfigDict(extra="ignore")  # price/total fields sent by a client are dropped
    product_id: str = Field(min_length=1, max_length=64)
    quantity: int = Field(ge=0, le=MAX_QTY, strict=True)


def stock_or_none(product):
    """Only an explicit nonnegative safe integer is a usable stock report."""
    value = product.get("stock")
    # BSON Int64 is an int subclass; bool is also an int subclass but is not stock.
    # The public JSON contract uses JavaScript safe integers (catalog_api.present).
    if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= 2**53 - 1:
        return None
    return int(value)


def verified_stock(product):
    value = stock_or_none(product)
    if value is None:
        raise HTTPException(409, {"error": "stock_unavailable", "product_id": str(product["_id"])})
    return value


async def owner_for(request: Request, response: Response, create=True):
    ident = await auth.identity(request)
    if not ident.owner and create:
        ident.guest_id = auth.new_guest_id()
        auth.set_guest_cookie(response, ident.guest_id)
    if ident.user_id and ident.guest_id:
        await merge(ident)
    return ident


async def merge(ident):
    guest_owner = 'guest:' + ident.guest_id
    guest = await db.carts.find_one({'owner': guest_owner})
    if guest is None or guest.get('items') == []:
        return
    async def transfer(session):
        guest = await db.carts.find_one({'owner': guest_owner}, session=session)
        if guest is None or guest.get('items') == []:
            return
        if not isinstance(guest.get('items'), list):
            raise HTTPException(409, {'error': 'cart_invalid'})
        cart = await db.carts.find_one({'owner': ident.owner}, session=session)
        source = [] if cart is None else cart.get('items')
        if not isinstance(source, list):
            raise HTTPException(409, {'error': 'cart_invalid'})
        def validate(rows):
            seen = set()
            for row in rows:
                if (not isinstance(row, dict) or not isinstance(row.get('product_id'), str)
                        or not row['product_id'] or row['product_id'] in seen
                        or not isinstance(row.get('quantity'), int) or isinstance(row['quantity'], bool)
                        or not 1 <= row['quantity'] <= MAX_QTY):
                    raise HTTPException(409, {'error': 'cart_invalid'})
                seen.add(row['product_id'])
        validate(source); validate(guest['items'])
        items = {row['product_id']: dict(row) for row in source}
        for item in guest['items']:
            if item['product_id'] in items:
                total = items[item['product_id']]['quantity'] + item['quantity']
                if total > MAX_QTY:
                    raise HTTPException(409, {'error': 'cart_merge_quantity_limit', 'product_id': item['product_id']})
                items[item['product_id']]['quantity'] = total
            else:
                items[item['product_id']] = dict(item)
        revision = cart_revision(guest)
        receipt_id = hashlib.sha256((str(guest['_id']) + ':' + str(revision)).encode()).hexdigest()
        history = guest.get('merge_history', [])
        if not isinstance(history, list) or len(history) >= MAX_MERGE_HISTORY:
            raise HTTPException(409, {'error': 'cart_merge_archive_limit'})
        # Retain the original guest contents in its existing document. No extra
        # collection may be auto-created outside the approved namespace schema.
        snapshot = {key: value for key, value in guest.items() if key != 'merge_history'}
        receipt = {'id': receipt_id, 'user_owner': ident.owner, 'guest_revision': revision,
                   'guest_snapshot': snapshot, 'created_at': now_iso()}
        candidate = {**guest, 'items': [], 'merge_history': [*history, receipt],
                     'revision': (revision or 0) + 1, 'updated_at': now_iso()}
        try:
            if len(BSON.encode(candidate)) > MAX_CART_BSON_BYTES:
                raise HTTPException(409, {'error': 'cart_merge_archive_limit'})
        except InvalidDocument:
            raise HTTPException(409, {'error': 'cart_invalid'}) from None
        await replace_cart(ident.owner, cart, list(items.values()), session=session)
        await replace_cart(guest_owner, guest, [], session=session, archive_entry=receipt)
    try:
        session = db.client.start_session()
        if inspect.isawaitable(session):
            session = await session
        async with session:
            await session.with_transaction(transfer, read_concern=ReadConcern('snapshot'), write_concern=WriteConcern('majority'))
    except HTTPException:
        raise
    except DuplicateKeyError:
        raise HTTPException(409, {'error': 'cart_changed'}) from None
    except DocumentTooLarge:
        raise HTTPException(409, {'error': 'cart_merge_archive_limit'}) from None
    except PyMongoError:
        raise HTTPException(503, {'error': 'cart_merge_unavailable'}) from None


async def priced(owner, shipping_cents=None, address=None, items_override=None, allow_unknown_stock=False):
    # The permissive view is only for reading/removing cart entries, never quote/shipping.
    if allow_unknown_stock and (address is not None or shipping_cents is not None):
        raise ValueError("unknown_stock_view_cannot_quote")
    cart = ({"items": items_override} if items_override is not None
            else await db.carts.find_one({"owner": owner}) or {"items": []})
    revision = cart_revision(cart)
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
        stock = stock_or_none(product)
        if stock is None and not allow_unknown_stock:
            raise HTTPException(409, {"error": "stock_unavailable", "product_id": str(product["_id"])})
        if not isinstance(item.get("quantity"), int) or isinstance(item["quantity"], bool) or not 1 <= item["quantity"] <= MAX_QTY:
            raise HTTPException(409, {"error": "cart_quantity_invalid", "product_id": str(product["_id"])})
        if item.get("price_seen_cents") is not None and item["price_seen_cents"] != unit:
            changes.append({"product_id": product["_id"], "kind": "price", "name": product["name"], "old": item["price_seen_cents"], "new": unit})
        if stock is None:
            changes.append({"product_id": product["_id"], "kind": "stock_unknown", "name": product["name"]})
        elif stock < item["quantity"]:
            changes.append({"product_id": product["_id"], "kind": "stock", "name": product["name"], "old": item["quantity"], "new": stock})
        lines.append({"product_id": product["_id"], "name": product["name"], "sku": product.get("sku"), "ean": product.get("ean"),
                      "image": (product.get("images") or [None])[0], "quantity": item["quantity"], "unit_cents": unit,
                      "line_cents": unit * item["quantity"], "stock": stock,
                      "stock_status": "unknown" if stock is None else "reported"})
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
            "shipping_pending": shipping_pending, "shipping_source": shipping_source, "free_shipping_threshold_cents": config.SHIP_FREE_THRESHOLD_CENTS,
            "cart_revision": revision}


@router.get("")
async def read_cart(request: Request, response: Response):
    ident = await owner_for(request, response, create=False)
    if not ident.owner:
        return {"lines": [], "changes": [], "subtotal_cents": 0, "shipping_cents": 0, "total_cents": 0, "vat_included_cents": 0, "currency": "EUR", "count": 0}
    return await priced(ident.owner, allow_unknown_stock=True)


@router.post("/items")
async def set_item(body: ItemIn, request: Request, response: Response):
    if body.quantity > 0:
        product = await db.products.find_one({"_id": body.product_id, "active": True})
        if not product:
            raise HTTPException(404, {"error": "product_not_found"})
        stock = verified_stock(product)
        if stock < body.quantity:
            raise HTTPException(409, {"error": "insufficient_stock", "stock": stock})
        settings = await pricing.settings(db)
        if not settings["price_released"]:
            raise HTTPException(409, {"error": "price_not_released", "message": "Preis noch nicht freigegeben"})
        unit = pricing.sell_cents(product["purchase_cents"], settings["markup_percent"])
    ident = await owner_for(request, response)
    cart = await db.carts.find_one({"owner": ident.owner})
    items = [i for i in (cart or {"items": []})["items"] if i["product_id"] != body.product_id]
    if body.quantity > 0:
        items.append({"product_id": body.product_id, "name": product["name"], "quantity": body.quantity, "price_seen_cents": unit})
    # Check the entire candidate cart before persisting; unknown stock in a
    # different line must not leave behind a successful-looking cart update.
    quote = await priced(ident.owner, items_override=items, allow_unknown_stock=body.quantity == 0)
    await replace_cart(ident.owner, cart, items)
    quote['cart_revision'] = (cart_revision(cart) or 0) + 1
    return quote


@router.post("/confirm-changes")
async def confirm_changes(request: Request, response: Response):
    ident = await owner_for(request, response, create=False)
    if not ident.owner:
        raise HTTPException(404, {"error": "cart_not_found"})
    cart = await db.carts.find_one({"owner": ident.owner})
    if cart is None:
        raise HTTPException(404, {"error": "cart_not_found"})
    current = await priced(ident.owner, items_override=cart['items'])
    by_id = {l["product_id"]: l for l in current["lines"]}
    items = []
    for line in by_id.values():
        quantity = min(line["quantity"], line["stock"])
        if quantity > 0:
            items.append({"product_id": line["product_id"], "name": line["name"], "quantity": quantity, "price_seen_cents": line["unit_cents"]})
    quote = await priced(ident.owner, items_override=items)
    await replace_cart(ident.owner, cart, items)
    quote['cart_revision'] = (cart_revision(cart) or 0) + 1
    return quote
