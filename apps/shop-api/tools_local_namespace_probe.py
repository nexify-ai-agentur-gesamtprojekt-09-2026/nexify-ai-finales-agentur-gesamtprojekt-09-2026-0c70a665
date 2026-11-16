"""Legt auf einer LOKALEN MongoDB einen Namensraum an, der die Prüfung der Vercel-Einstiegs (vercel_app.check_metadata) besteht,
und prüft ihn danach erneut – Probe, ob die Katalog-Übernahme Validatoren und Indizes des Produktivnamensraums einhält.

  python apps/shop-api/tools_local_namespace_probe.py setup  mongodb://127.0.0.1:27099/?replicaSet=rs0 nexify_teileklar_shop_v1
  python apps/shop-api/tools_local_namespace_probe.py check  mongodb://127.0.0.1:27099/?replicaSet=rs0 nexify_teileklar_shop_v1

Nur gegen 127.0.0.1/localhost. Liest die Sollwerte (Sammlungen, Validator-Marke, Indizes) aus vercel_app.py, ohne sie zu ändern.
"""
import asyncio
import importlib.util
import os
from pathlib import Path
import sys
from urllib.parse import urlsplit


def load_vercel_app():
    os.environ.setdefault("SHOP_STORE_BACKEND", "mongodb")
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    spec = importlib.util.spec_from_file_location("vercel_app_probe", Path(__file__).resolve().parent / "vercel_app.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


async def main(action, url, name):
    if urlsplit(url).hostname not in ("127.0.0.1", "localhost"):
        sys.exit("nur gegen eine lokale Datenbank")
    from motor.motor_asyncio import AsyncIOMotorClient
    app = load_vercel_app()
    client = AsyncIOMotorClient(url)
    db = client[name]
    try:
        if action == "setup":
            existing = await db.list_collection_names()
            for collection in app.COLLECTIONS:
                if collection not in existing:
                    await db.create_collection(collection, validator={"$jsonSchema": {"bsonType": "object", "description": app.SCHEMA_MARKER}},
                                               validationLevel="strict", validationAction="error")
                for keys, unique, ttl in app.INDEXES.get(collection, []):
                    options = {"unique": unique}
                    if ttl is not None:
                        options["expireAfterSeconds"] = ttl
                    await db[collection].create_index([(k, 1) for k in keys], **options)
        result = await app.check_metadata(db)
        print({"namespace_check": result or "ok", "products": await db.products.count_documents({}),
               "published": await db.products.count_documents({"active": True})})
        return 0 if result is None else 1
    finally:
        client.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main(*sys.argv[1:4])))
