"""Werkstattverzeichnis in die Datenbank übernehmen – ausdrücklicher Betriebsschritt.

Der Vercel-Adapter (vercel_app.py) lädt bewusst nur die Router, nie shop.main und dessen
lifespan; dort läuft import_workshops() also nicht. Dieser Befehl ist der dokumentierte Weg,
das Verzeichnis (prototypen/assets/workshops*.json) in die Ziel-Datenbank zu bringen:

    MONGO_URL=... DB_NAME=... PREVIEW_PUBLIC_ORIGIN=... SHOP_VAT_PERCENT=... \
        python3 -m shop.seed_workshops                                  (aus apps/shop-api)

Die vier Variablen verlangt shop/config.py beim Import (gleiche Werte wie im Shop-Betrieb).

Idempotent: vorhandene Einträge bleiben unverändert, nur fehlende kommen hinzu.
Schreibt in die angegebene Datenbank – für Produktion nur nach Freigabe ausführen.
"""
import asyncio
import json
import sys


async def run(database=None):
    from .workshops_api import import_workshops
    added = await import_workshops(database)
    return {"added": added}


def main():
    result = asyncio.run(run())
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
