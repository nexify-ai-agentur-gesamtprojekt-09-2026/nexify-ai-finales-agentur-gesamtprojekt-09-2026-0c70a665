from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from . import config


def sell_cents(purchase_cents, markup_percent, vat_percent=None):
    """Gross selling price: purchase × (1 + markup %) × (1 + VAT %), rounded half-up to the cent."""
    vat = config.VAT_PERCENT if vat_percent is None else Decimal(vat_percent)
    value = Decimal(purchase_cents) * (1 + Decimal(markup_percent) / 100) * (1 + vat / 100)
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


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
