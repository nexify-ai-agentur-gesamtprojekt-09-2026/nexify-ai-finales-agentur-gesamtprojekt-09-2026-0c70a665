"""BigBuy order API: shipping quote, order check/create, tracking (reuses the catalog API key)."""
import httpx

from . import config

BASE = "https://api.bigbuy.eu"
transport = None  # tests inject httpx.MockTransport; never set in the app


class BigBuyOrderError(Exception):
    def __init__(self, code, status=None, insufficient_balance=False):
        super().__init__(code)
        self.code, self.status, self.insufficient_balance = code, status, insufficient_balance


async def _call(environment, method, path, json=None):
    key = config.bigbuy_key(environment)
    if not key:
        raise BigBuyOrderError("api_key_missing")
    headers = {"Authorization": "Bearer " + key, "Accept": "application/json", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(base_url=BASE, timeout=60, transport=transport) as client:
            response = await client.request(method, path, json=json, headers=headers)
    except httpx.HTTPError:
        raise BigBuyOrderError("bigbuy_unreachable") from None
    if response.status_code >= 400:
        body = (response.text or "")
        insufficient = "money box" in body.lower() or "ER005" in body
        raise BigBuyOrderError("insufficient_balance" if insufficient else "bigbuy_http_error", response.status_code, insufficient)
    return response.json() if response.content else {}


async def shipping_quote(environment, sku, country, postcode, qty=1):
    """Cheapest shipping option for one SKU to a destination. Returns {cost_cents, carrier} or None."""
    if not sku:
        return None
    payload = {"order": {"delivery": {"isoCountry": country, "postcode": postcode},
                         "products": [{"reference": sku, "quantity": qty}]}}
    try:
        data = await _call(environment, "POST", "/rest/shipping/orders.json", payload)
    except BigBuyOrderError:
        return None
    cheapest = None
    for opt in (data or {}).get("shippingOptions") or []:
        cost = opt.get("cost")
        if cost is None:
            continue
        cents = int(round(float(cost) * 100))
        if cheapest is None or cents < cheapest["cost_cents"]:
            cheapest = {"cost_cents": cents, "carrier": (opt.get("shippingService") or {}).get("name") or ""}
    return cheapest


async def check_order(environment, payload):
    return await _call(environment, "POST", "/rest/order/check.json", payload)


async def create_order(environment, payload):
    return await _call(environment, "POST", "/rest/order/create.json", payload)


async def tracking(environment, bigbuy_order_id):
    """Tracking payload for one BigBuy order id (shape varies; callers parse defensively). None on error."""
    try:
        return await _call(environment, "GET", "/rest/tracking/order/%s.json" % bigbuy_order_id)
    except BigBuyOrderError:
        return None


def build_order_payload(order, carrier_name):
    a = order.get("address") or {}
    return {"order": {
        "internalReference": order["number"], "language": "de", "paymentMethod": "moneybox",
        "shippingAddress": {"firstName": a.get("first_name", ""), "lastName": a.get("last_name", ""),
                            "country": a.get("country", "DE"), "postcode": a.get("zip", ""),
                            "town": a.get("city", ""), "address": a.get("street", ""),
                            "phone": a.get("phone", ""), "email": a.get("email", ""), "comment": ""},
        "products": [{"reference": line.get("sku"), "quantity": line["quantity"]} for line in order["lines"]],
        "carriers": [{"name": carrier_name}]}}
