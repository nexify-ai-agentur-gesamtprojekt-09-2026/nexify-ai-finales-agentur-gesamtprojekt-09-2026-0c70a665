import os
from decimal import Decimal
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / "backend" / ".env")
load_dotenv(ROOT / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
PUBLIC_ORIGIN = os.environ["PREVIEW_PUBLIC_ORIGIN"].rstrip("/")
VAT_PERCENT = Decimal(os.environ["SHOP_VAT_PERCENT"])
DEFAULT_MARKUP_PERCENT = Decimal("30")
WORKSHOPS_FILE = ROOT / "prototypen" / "assets" / "workshops.json"
# Werkstätten Deutschland aus OpenStreetMap (ODbL-1.0), erzeugt mit tools/import_werkstaetten_sheet.py
WORKSHOPS_OSM_DE_FILE = ROOT / "prototypen" / "assets" / "workshops-osm-de.json"
WORKSHOP_FILES = (WORKSHOPS_FILE, WORKSHOPS_OSM_DE_FILE)
GATEWAY_PORT = int(os.environ.get("LEGACY_GATEWAY_PORT", "3003"))  # GATEWAY_PORT belongs to the platform proxy; do not bind it.
NEXT_PORT = 3000
SHIP_SAMPLE_COUNTRY = os.environ.get("SHIP_SAMPLE_COUNTRY", "DE")
SHIP_SAMPLE_POSTCODE = os.environ.get("SHIP_SAMPLE_POSTCODE", "10115")
FULFILLMENT_AUTO_SUBMIT = os.environ.get("FULFILLMENT_AUTO_SUBMIT", "1") == "1"
SHIPPING_FALLBACK_CENTS = int(os.environ.get("SHIPPING_FALLBACK_CENTS", "995"))
MAIL_INTERNAL_TO = os.environ.get("MAIL_INTERNAL_TO", "").strip()
SHIP_FREE_THRESHOLD_CENTS = int(os.environ.get("SHIP_FREE_THRESHOLD_CENTS", "7500"))
SHIP_MAX_CENTS = int(os.environ.get("SHIP_MAX_CENTS", "1500"))


def revolut_mode():
    mode = os.environ.get("REVOLUT_MODE", "sandbox")
    if mode not in ("live", "sandbox"):
        raise RuntimeError("REVOLUT_MODE must be live or sandbox")
    return mode


def revolut_key():
    name = "REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION" if revolut_mode() == "live" else "REVOLUT_MERCHANT_SECRET_KEY_SANDBOX"
    return os.environ.get(name, "")


def bigbuy_key(environment):
    if environment == "production":
        return os.environ.get("BIGBUY_API_KEY_PRODUCTION") or os.environ.get("BIGBUY_API_KEY", "")
    return os.environ.get("BIGBUY_API_KEY_SANDBOX", "")
