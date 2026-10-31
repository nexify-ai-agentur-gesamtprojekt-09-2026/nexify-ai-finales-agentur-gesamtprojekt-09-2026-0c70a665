import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "apps" / "shop-api"), str(ROOT / "apps" / "agent-gateway")]

from shop.main import app  # noqa: E402,F401
