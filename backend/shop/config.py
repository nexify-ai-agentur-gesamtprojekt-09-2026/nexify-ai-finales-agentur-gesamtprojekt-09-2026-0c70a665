import os
from decimal import Decimal
from pathlib import Path

from dotenv import load_dotenv

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
load_dotenv(BACKEND / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
PUBLIC_ORIGIN = os.environ.get("PREVIEW_PUBLIC_ORIGIN", os.environ.get("APP_URL", "")).rstrip("/")
VAT_PERCENT = Decimal(os.environ.get("SHOP_VAT_PERCENT", "19"))
DEFAULT_MARKUP_PERCENT = Decimal("30")
WORKSHOPS_FILE = BACKEND / "data" / "workshops.json"


def revolut_mode():
    mode = os.environ.get("REVOLUT_MODE", "live")
    if mode not in ("live", "sandbox"):
        raise RuntimeError("REVOLUT_MODE must be live or sandbox")
    return mode


def revolut_key():
    if revolut_mode() == "live":
        return os.environ.get("REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION") or os.environ.get("REVOLUT_API_SECRET_KEY") or os.environ.get("REVOLUT_SECRET_KEY", "")
    return os.environ.get("REVOLUT_MERCHANT_SECRET_KEY_SANDBOX", "")


def bigbuy_key(environment):
    if environment == "production":
        return os.environ.get("BIGBUY_API_KEY_PRODUCTION") or os.environ.get("BIGBUY_API_KEY", "")
    return os.environ.get("BIGBUY_API_KEY_SANDBOX", "")
