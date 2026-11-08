"""Automatic BigBuy dropshipping fulfillment: submit paid orders, pull tracking, notify the customer.

All external calls are wrapped so a failure never raises out of the payment/webhook path; a failed
BigBuy submission is recorded (bigbuy_submit_pending) and an internal alert is enqueued for retry.
"""
from . import bigbuy_order, config, mail_templates, mailer
from .db import db, now_iso

# One persisted field for the delivery state: orders.fulfilment (the admin view and the customer timeline read it).
PAID = "bezahlt"
SHIPPED = "versendet"
DELIVERED = "zugestellt"


async def submit_order(order):
    """Idempotently hand a paid order to BigBuy. Never raises."""
    if not config.FULFILLMENT_AUTO_SUBMIT or not order:
        return
    if order.get("bigbuy_order_id") or order.get("status") != PAID:
        return
    lines = order.get("lines") or []
    if not lines:
        return
    # Claim before any create: a duplicate webhook/run must never place two paid BigBuy orders.
    claimed = await db.orders.find_one_and_update(
        {"_id": order["_id"], "bigbuy_order_id": {"$in": [None, ""]}, "bigbuy_submitting": {"$ne": True}},
        {"$set": {"bigbuy_submitting": True, "fulfillment_checked_at": now_iso()}})
    if not claimed:
        return
    environment = order.get("source_environment") or "production"
    address = order.get("address") or {}
    carrier = "SEUR"
    try:
        quote = await bigbuy_order.shipping_quote(environment, lines[0].get("sku"), address.get("country", "DE"),
                                                  address.get("zip", ""), lines[0]["quantity"])
        if quote and quote.get("carrier"):
            carrier = quote["carrier"]
    except Exception:
        pass
    payload = bigbuy_order.build_order_payload(order, carrier)
    try:
        created = await bigbuy_order.create_order(environment, payload)
    except bigbuy_order.BigBuyOrderError as error:
        await db.orders.update_one({"_id": order["_id"]}, {"$set": {
            "fulfillment_error": error.code, "bigbuy_submit_pending": True, "bigbuy_submitting": False,
            "fulfillment_checked_at": now_iso()}})
        await _alert_admin(order, error.code)
        return
    except Exception:
        await db.orders.update_one({"_id": order["_id"]}, {"$set": {
            "fulfillment_error": "bigbuy_submit_failed", "bigbuy_submit_pending": True, "bigbuy_submitting": False,
            "fulfillment_checked_at": now_iso()}})
        return
    bigbuy_id = str((created or {}).get("id") or (created or {}).get("order_id") or "")
    update = {"bigbuy_order_id": bigbuy_id, "bigbuy_submitted_at": now_iso(), "bigbuy_submit_pending": False,
              "fulfillment_error": None, "bigbuy_carrier": carrier, "bigbuy_submitting": False}
    if not order.get("fulfilment") or order.get("fulfilment") == PAID:
        update["fulfilment"] = "in_bearbeitung"
        update["processing_at"] = now_iso()
    await db.orders.update_one({"_id": order["_id"], "bigbuy_order_id": {"$in": [None, "", order.get("bigbuy_order_id")]}},
                               {"$set": update})


async def poll_and_update_tracking(order):
    """Pull BigBuy tracking; on the first tracking number mark the order shipped and mail the customer. Never raises."""
    if not order or not order.get("bigbuy_order_id") or order.get("fulfilment") in (SHIPPED, DELIVERED):
        return
    environment = order.get("source_environment") or "production"
    try:
        data = await bigbuy_order.tracking(environment, order["bigbuy_order_id"])
    except Exception:
        return
    number, carrier = _extract_tracking(data)
    if not number:
        return
    changed = await db.orders.find_one_and_update(
        {"_id": order["_id"], "fulfilment": {"$nin": [SHIPPED, DELIVERED]}},
        {"$set": {"fulfilment": SHIPPED, "tracking_number": number,
                  "carrier": carrier or order.get("bigbuy_carrier", ""), "shipped_at": now_iso()}})
    if not changed:
        return
    shipped = await db.orders.find_one({"_id": order["_id"]})
    try:
        subject, html, text = mail_templates.order_status(shipped, SHIPPED)
        await mailer.enqueue("order_status:versendet:" + order["_id"], (shipped.get("address") or {}).get("email", ""),
                             subject, html, text)
    except Exception:
        pass


def _extract_tracking(data):
    """Best-effort extraction of (tracking_number, carrier) from BigBuy's tracking shapes."""
    if not data:
        return None, None
    rows = data if isinstance(data, list) else [data]
    for row in rows:
        if not isinstance(row, dict):
            continue
        number = row.get("trackingNumber") or row.get("tracking_number") or row.get("tracking")
        service = row.get("shippingService")
        carrier = row.get("carrier") or (service.get("name") if isinstance(service, dict) else None) or ""
        if number:
            return str(number), carrier
    return None, None


async def _alert_admin(order, code):
    to = config.MAIL_INTERNAL_TO or (order.get("address") or {}).get("email", "")
    if not to:
        return
    number = order.get("number", order.get("_id"))
    reason = "Guthaben der BigBuy Money-Box reicht nicht aus." if code == "insufficient_balance" else ("Fehlercode: %s" % code)
    subject = "TEILEKLAR: BigBuy-Bestellung fehlgeschlagen (%s)" % number
    html = ("<p>Die automatische BigBuy-Bestellung fuer <strong>%s</strong> konnte nicht ausgeloest werden.</p>"
            "<p>%s</p><p>Die bezahlte Kundenbestellung bleibt erhalten und kann nach Behebung erneut uebermittelt werden.</p>"
            % (number, reason))
    text = ("Automatische BigBuy-Bestellung fuer %s fehlgeschlagen. %s "
            "Die bezahlte Kundenbestellung bleibt erhalten und kann erneut uebermittelt werden." % (number, reason))
    try:
        await mailer.enqueue("fulfillment_error:" + order["_id"], to, subject, html, text)
    except Exception:
        pass
