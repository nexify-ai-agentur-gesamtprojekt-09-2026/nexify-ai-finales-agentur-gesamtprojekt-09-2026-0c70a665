from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from . import config


def sell_cents(purchase_cents, markup_percent, vat_percent=None):
    """Gross selling price: purchase × (1 + markup %) × (1 + VAT %), rounded half-up to the cent.
    Markup applies to the article only; shipping is a separate per-order cost (free over threshold)."""
    vat = config.VAT_PERCENT if vat_percent is None else Decimal(vat_percent)
    value = Decimal(purchase_cents) * (1 + Decimal(markup_percent) / 100) * (1 + vat / 100)
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def purchase_range_for_sell(low, high, markup_percent, vat_percent=None):
    """Inclusive purchase-price range whose selling price lies in [low, high]; None leaves that end open.

    `sell_cents` rises with the purchase price, so the edges are found by starting at the exact quotient and
    stepping until `sell_cents` itself agrees. The range therefore matches `sell_cents` at every rounding edge.
    """
    vat = config.VAT_PERCENT if vat_percent is None else Decimal(vat_percent)
    factor = (1 + Decimal(markup_percent) / 100) * (1 + vat / 100)
    sell = lambda p: sell_cents(p, markup_percent, vat)
    lo = hi = None
    if low is not None:
        lo = max(0, int(Decimal(low) / factor) - 1)
        while lo > 0 and sell(lo - 1) >= low:
            lo -= 1
        while sell(lo) < low:
            lo += 1
    if high is not None:
        hi = int(Decimal(high) / factor) + 1
        while hi >= 0 and sell(hi) > high:
            hi -= 1
        while sell(hi + 1) <= high:
            hi += 1
    return lo, hi


def vat_share_cents(gross_cents, vat_percent=None):
    vat = config.VAT_PERCENT if vat_percent is None else Decimal(vat_percent)
    return int((Decimal(gross_cents) * vat / (100 + vat)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def parse_markup(value):
    try:
        markup = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValueError("markup_invalid") from None
    if not markup.is_finite() or markup < 0 or markup > 500 or markup != markup.quantize(Decimal("0.01")):
        raise ValueError("markup_invalid")
    return markup


async def settings(db):
    doc = await db.settings.find_one({"_id": "shop"}) or {}
    markup = Decimal(doc.get("markup_percent", str(config.DEFAULT_MARKUP_PERCENT)))
    release = doc.get("price_release") or {}
    released = bool(release.get("released_at")) and Decimal(release.get("markup_percent", "-1")) == markup
    return {"markup_percent": markup, "price_released": released, "price_release": release if released else None,
            "shipping_cents": int(doc.get("shipping_cents", 0)),
            "updated_at": doc.get("updated_at"), "updated_by": doc.get("updated_by")}
