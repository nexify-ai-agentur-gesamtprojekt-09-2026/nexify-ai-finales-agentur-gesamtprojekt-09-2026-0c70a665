"""Prüft die Katalog-Schnittstellen der neuen Fassung gegen eine LOKALE Datenbank nach der Übernahme (nur Probe, nie Produktion).

  MONGO_URL=mongodb://127.0.0.1:27099/?replicaSet=rs0 DB_NAME=nexify_teileklar_shop_v1 PREVIEW_PUBLIC_ORIGIN=https://nexifyai.de \
  SHOP_VAT_PERCENT=19 python apps/shop-api/tools_check_catalog_api.py <snapshot.json> <bericht.json>

Bindet nur die Router für Katalog und Warenkorb ein (kein Lebenszyklus, keine Konten, kein Import) und vergleicht die Antworten
mit den Quelldatensätzen aus dem Snapshot der Übernahme.
"""
import asyncio
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
host = urlsplit(__import__("os").environ["MONGO_URL"]).hostname
if host not in ("127.0.0.1", "localhost"):
    sys.exit("nur gegen eine lokale Datenbank")

import httpx  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from shop import cart_api, catalog_api  # noqa: E402


async def main(snapshot_path, report_path):
    items = {i["id"]: i for i in json.loads(Path(snapshot_path).read_text(encoding="utf-8"))["items"]}
    app = FastAPI()
    app.include_router(catalog_api.router)
    app.include_router(cart_api.router)
    out = {}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://nexifyai.de") as client:
        out["status"] = (await client.get("/api/shop/status")).json()
        cats = (await client.get("/api/shop/categories")).json()["categories"]
        out["categories"] = cats
        first = (await client.get("/api/shop/products", params={"page_size": 60})).json()
        out["products_first_page"] = {"total": first["total"], "pages": first["pages"], "count": len(first["items"]),
                                      "without_price": sum(1 for p in first["items"] if p["price_cents"] is None),
                                      "without_image": sum(1 for p in first["items"] if not p["image"]),
                                      "price_status": sorted({p["price_status"] for p in first["items"]}),
                                      "in_stock_first": [p["id"] for p in first["items"][:5]]}
        # Alle Seiten: jeder gelistete Artikel hat Preis und Bild
        seen, missing_price, missing_image, page, listed_ids = 0, [], [], 1, []
        while True:
            body = (await client.get("/api/shop/products", params={"page_size": 60, "page": page})).json()
            for p in body["items"]:
                seen += 1
                listed_ids.append(p["id"])
                if p["price_cents"] is None:
                    missing_price.append(p["id"])
                if not p["image"]:
                    missing_image.append(p["id"])
            if page >= body["pages"]:
                break
            page += 1
        out["all_pages"] = {"listed": seen, "without_price": missing_price[:20], "without_image": missing_image[:20]}
        # Stichprobe 20 über die Detailseite gegen die Quelle
        ids = sorted(listed_ids)
        chosen = ids[::max(1, len(ids) // 20)][:20]
        rows = []
        for pid in chosen:
            src = items[pid]
            detail = (await client.get(f"/api/shop/products/{pid}")).json()
            image = (src["image"].split("src=", 1)[1]) if "src=" in src["image"] else None
            from urllib.parse import unquote
            checks = {"name": detail.get("name") == src["name"].strip(),
                      "price": detail.get("price_cents") == round(src["value"] * 100),
                      "image": detail.get("image") == (unquote(image) if image else None),
                      "stock": detail.get("stock") == src["stock"],
                      "sku": detail.get("sku") == src["sku"], "ean": detail.get("ean") == (src["ean"] or ""),
                      "category": detail.get("category_name") == src["category"]}
            rows.append({"id": pid, "name": src["name"][:60], "price_source": src["price"], "price_cents_shop": detail.get("price_cents"),
                         "stock": detail.get("stock"), "image": detail.get("image"), "checks": checks, "equal": all(checks.values())})
        out["detail_sample"] = rows
        # Warenkorb: übernommener Artikel ist nicht bestellbar
        some = next((p for p in ids if items[p]["stock"] and items[p]["stock"] > 0), ids[0])
        resp = await client.post("/api/shop/cart/items", json={"product_id": some, "quantity": 1}, headers={"origin": "https://nexifyai.de"})
        out["cart_add_imported"] = {"product": some, "status": resp.status_code, "body": resp.json()}
    Path(report_path).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({"status": out["status"], "categories": len(cats), "listed": seen, "without_price": len(missing_price),
                      "without_image": len(missing_image), "detail_equal": sum(r["equal"] for r in rows), "detail_checked": len(rows),
                      "cart_add_imported": out["cart_add_imported"]["status"]}, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], sys.argv[2]))
