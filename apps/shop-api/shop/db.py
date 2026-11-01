from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from . import config

client = AsyncIOMotorClient(config.MONGO_URL)
db = client[config.DB_NAME]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def ensure_indexes(database=None):
    d = database if database is not None else db
    await d.products.create_index("bigbuy_id", unique=True)
    await d.products.create_index([("active", 1), ("category_ids", 1)])
    await d.products.create_index("ean")
    await d.products.create_index("sku")
    await d.carts.create_index("owner", unique=True)
    await d.orders.create_index([("owner", 1), ("idempotency_key", 1)], unique=True)
    await d.orders.create_index("revolut_order_id")
    await d.orders.create_index("user_id")
    await d.webhook_events.create_index("event_key", unique=True)
    await d.workshops.create_index("zip")
    await d.workshops.create_index("city_key")
