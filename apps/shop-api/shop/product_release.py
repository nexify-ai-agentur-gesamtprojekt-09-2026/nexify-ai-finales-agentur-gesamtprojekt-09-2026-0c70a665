"""Publication gate for products (TK-11): only a product with its mandatory fields is public.

A product is public (listed, shown in detail, put in the cart, bought) only if all of these hold:
  * `active` is true,
  * its stored `release.status` is "released" (set by `state()`, never by the importer), and
  * the rules below still hold when it is read (`is_public`): a stored release never outlives a field that
    has since been emptied.
An incomplete product stays stored. It gets one blocker code per missing field; nothing is filled in.

What counts as mandatory is limited to what this project's data model can carry and what the compliance
notes already ask for (docs/09-final/08-recht-und-compliance.md: PAngV, Pflichtangaben je Warengruppe).
Whether this list is legally complete is NOT decided here and is to be confirmed by professional advice
(open item E12). Not modelled, therefore not checked: manufacturer address, EU responsible person
(GPSR), energy or battery labelling, material composition.

Pure functions only: no database, no configuration, no network. Callers inject the shop's VAT rate and the
supplier-image rule, so the importer, the shop process and the tests share one definition.
"""
import re
from decimal import Decimal, InvalidOperation

RULES_VERSION = "2026-11-14.1"
LEGAL_NOTE = ("Rechtliche Vollstaendigkeit der Pflichtangaben von Fachberatung zu bestaetigen "
              "(docs/09-final/08-recht-und-compliance.md, offener Punkt E12). Diese Liste prueft nur, "
              "was das Datenmodell des Shops kennt.")
# Working value, not a legal threshold: shorter text is a placeholder, not a description.
MIN_DESCRIPTION_CHARS = 20
MAX_DELIVERY_DAYS = 90

# Order is the order of reasons in every answer.
REASONS = {
    "title_missing": {"field": "name", "label": "Titel fehlt oder besteht nur aus einer Kennung (SKU, Lieferanten-ID)"},
    "description_missing": {"field": "description", "label": "Beschreibung fehlt oder ist nur ein Platzhalter"},
    "price_missing": {"field": "purchase_cents", "label": "Preisgrundlage fehlt oder ist nicht groesser als 0"},
    "tax_rate_missing": {"field": "SHOP_VAT_PERCENT", "label": "Steuersatz des Shops fehlt oder ist ungueltig"},
    "image_missing": {"field": "images", "label": "Kein zulaessiges Produktbild (Lieferanten-Original)"},
    "manufacturer_missing": {"field": "details.manufacturer", "label": "Hersteller oder Marke fehlt (als Name, nicht als Nummer)"},
    "delivery_time_missing": {"field": "delivery_time", "label": "Lieferzeitangabe fehlt oder ist ungueltig"},
    "stock_status_unknown": {"field": "stock", "label": "Bestandsstatus unbekannt"},
}
NOT_EVALUATED = "not_evaluated"
STATUS_BLOCKED, STATUS_RELEASED = "blocked", "released"


def _is_int(value):
    return type(value) is int


def _text(value):
    return value.strip() if isinstance(value, str) else ""


def title_ok(product):
    title = _text(product.get("name"))
    placeholders = {str(product.get(key)).strip() for key in ("sku", "bigbuy_id") if product.get(key) not in (None, "")}
    placeholders.add(str(product.get("_id", "")).strip())
    return len(title) >= 2 and title not in placeholders and not title.isdigit()


def description_ok(product):
    return len(re.sub(r"\s+", " ", re.sub(r"<[^>]*>", " ", _text(product.get("description")))).strip()) >= MIN_DESCRIPTION_CHARS


def price_ok(product):
    value = product.get("purchase_cents")
    return _is_int(value) and value > 0


def tax_ok(vat_percent):
    if not isinstance(vat_percent, (Decimal, int)) or isinstance(vat_percent, bool):
        return False
    try:
        value = Decimal(vat_percent)
    except InvalidOperation:
        return False
    return value.is_finite() and 0 <= value <= 100


def images_ok(product, image_ok):
    images = product.get("images")
    return isinstance(images, list) and any(image_ok(value) for value in images)


def brand_of(product):
    """The manufacturer or brand name the data model carries (`details.manufacturer`, FTP import: `details.brand`)."""
    details = product.get("details")
    for key in ("manufacturer", "brand"):
        value = _text(details.get(key)) if isinstance(details, dict) else ""
        if value and not value.isdigit():  # the supplier API may send a manufacturer id instead of a name
            return value
    return None


def delivery_ok(product):
    value = product.get("delivery_time")
    if not isinstance(value, dict):
        return False
    low, high = value.get("min_days"), value.get("max_days")
    return _is_int(low) and _is_int(high) and 0 <= low <= high <= MAX_DELIVERY_DAYS


def stock_ok(product):
    value = product.get("stock")
    return _is_int(value) and 0 <= value <= 2**53 - 1


def product_blockers(product, *, image_ok):
    """Blocker codes that come from the product itself (everything but the shop-wide tax rate)."""
    checks = (("title_missing", title_ok(product)), ("description_missing", description_ok(product)),
              ("price_missing", price_ok(product)), ("image_missing", images_ok(product, image_ok)),
              ("manufacturer_missing", brand_of(product) is not None), ("delivery_time_missing", delivery_ok(product)),
              ("stock_status_unknown", stock_ok(product)))
    return [code for code, passed in checks if not passed]


def blockers(product, *, vat_percent, image_ok):
    """All blocker codes, in the fixed order of REASONS. Empty means the mandatory fields are present."""
    found = set(product_blockers(product, image_ok=image_ok))
    if not tax_ok(vat_percent):
        found.add("tax_rate_missing")
    return [code for code in REASONS if code in found]


def state(product, *, vat_percent, image_ok, checked_by, stamp):
    reasons = blockers(product, vat_percent=vat_percent, image_ok=image_ok)
    return {"status": STATUS_RELEASED if not reasons else STATUS_BLOCKED, "blocked_reasons": reasons, "brand": brand_of(product),
            "checked_at": stamp, "checked_by": checked_by, "rules_version": RULES_VERSION}


def import_state(product, stamp):
    """What the importer stores: the gaps it can see, never a release.

    The importer cannot judge the shop's tax rate or the strict image rule, so it never marks a product as
    released. A product without visible gaps carries `not_evaluated` until the shop process evaluates it.
    """
    reasons = product_blockers(product, image_ok=lambda value: isinstance(value, str) and value.startswith("https://")) or [NOT_EVALUATED]
    return {"status": STATUS_BLOCKED, "blocked_reasons": reasons, "brand": brand_of(product), "checked_at": stamp,
            "checked_by": "import", "rules_version": RULES_VERSION}


def is_public(product, *, vat_percent, image_ok, ignore=()):
    """`ignore` names blocker codes a caller handles with a more specific answer of its own (the cart: stock)."""
    release = product.get("release")
    return (product.get("active") is True and isinstance(release, dict) and release.get("status") == STATUS_RELEASED
            and not [code for code in blockers(product, vat_percent=vat_percent, image_ok=image_ok) if code not in ignore])


def describe(codes):
    """Operator view of blocker codes."""
    return [{"code": code, **REASONS.get(code, {"field": None, "label": "Noch nicht bewertet" if code == NOT_EVALUATED else code})} for code in codes]
