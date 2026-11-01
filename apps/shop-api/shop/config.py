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
GATEWAY_PORT = int(os.environ["GATEWAY_PORT"])
NEXT_PORT = 3000


def revolut_mode():
    mode = os.environ.get("REVOLUT_MODE", "live")
    if mode not in ("live", "sandbox"):
        raise RuntimeError("REVOLUT_MODE must be live or sandbox")
    return mode


def revolut_key():
    name = "REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION" if revolut_mode() == "live" else "REVOLUT_MERCHANT_SECRET_KEY_SANDBOX"
    return os.environ.get(name, "")


def bigbuy_key(environment):
    return os.environ.get("BIGBUY_API_KEY_PRODUCTION" if environment == "production" else "BIGBUY_API_KEY_SANDBOX", "")
