"""Abnahme der Katalog-Übernahme an der öffentlichen Seite (nur lesend, ohne Anmeldung).

  python apps/shop-api/tools_accept_public_catalog.py --base https://nexifyai.de --snapshot <snapshot.json> --report <bericht.json> \
      --min-published <Zahl> [--expect-prices]

Prüft: /api/shop/status zählt mindestens --min-published; Kategorienliste nicht leer; jede gelistete Karte hat ein Bild
(und mit --expect-prices einen Preis); 20 gleichmäßig verteilte veröffentlichte Artikel stimmen über die Detailseite mit dem
Quelldatensatz überein (Name, Bild, Bestand, Artikelnummer, EAN, Kategorie; Preis nur mit --expect-prices). Exit 0 nur bei
vollständiger Übereinstimmung. Pause zwischen den Abrufen, damit die Seite nicht belastet wird.
"""
import argparse
import json
from pathlib import Path
import sys
import time
from urllib.parse import parse_qs, quote, urlsplit
import urllib.request

UA = {"Accept": "application/json", "User-Agent": "nexify-catalog-acceptance/1"}


def get(base, path, pause):
    time.sleep(pause)
    with urllib.request.urlopen(urllib.request.Request(base + path, headers=UA), timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def source_image(item):
    query = parse_qs(urlsplit(item["image"]).query).get("src") or [None]
    return query[0]


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--snapshot", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--min-published", type=int, required=True)
    parser.add_argument("--expect-prices", action="store_true")
    parser.add_argument("--pause", type=float, default=0.5)
    args = parser.parse_args(argv)
    base = args.base.rstrip("/")
    items = {i["id"]: i for i in json.loads(Path(args.snapshot).read_text(encoding="utf-8"))["items"]}
    out, failures = {}, []
    out["status"] = status = get(base, "/api/shop/status", args.pause)
    if status.get("products", 0) < args.min_published:
        failures.append(f"status.products {status.get('products')} < {args.min_published}")
    out["categories"] = cats = get(base, "/api/shop/categories", args.pause)["categories"]
    if not cats:
        failures.append("Kategorienliste leer")
    listed, no_image, no_price, published, page = 0, [], [], [], 1
    while True:
        body = get(base, f"/api/shop/products?page_size=60&page={page}", args.pause)
        for card in body["items"]:
            listed += 1
            published.append(card["id"])
            if not card.get("image"):
                no_image.append(card["id"])
            if card.get("price_cents") is None:
                no_price.append(card["id"])
        if page >= body["pages"]:
            break
        page += 1
    out["listing"] = {"listed": listed, "without_image": no_image[:20], "without_price": no_price[:20],
                      "without_image_count": len(no_image), "without_price_count": len(no_price)}
    if listed < args.min_published:
        failures.append(f"gelistet {listed} < {args.min_published}")
    if no_image:
        failures.append(f"{len(no_image)} Karten ohne Bild")
    if args.expect_prices and no_price:
        failures.append(f"{len(no_price)} Karten ohne Preis")
    ids = sorted(published)
    chosen = ids[::max(1, len(ids) // 20)][:20]
    rows = []
    for pid in chosen:
        src = items.get(pid)
        detail = get(base, "/api/shop/products/" + quote(pid, safe=""), args.pause)
        if src is None:
            rows.append({"id": pid, "equal": False, "reason": "nicht in der Quelle"})
            continue
        checks = {"name": detail.get("name") == src["name"].strip(), "image": detail.get("image") == source_image(src),
                  "stock": detail.get("stock") == src.get("stock"), "sku": detail.get("sku") == src.get("sku"),
                  "ean": detail.get("ean") == (src.get("ean") or ""), "category": detail.get("category_name") == src.get("category")}
        if args.expect_prices:
            checks["price"] = detail.get("price_cents") == round(src["value"] * 100)
        rows.append({"id": pid, "name": src["name"][:60], "price_source": src["price"], "price_cents_site": detail.get("price_cents"),
                     "image": detail.get("image"), "checks": checks, "equal": all(checks.values())})
    out["detail_sample"] = rows
    if len(rows) < min(20, args.min_published) or not all(r["equal"] for r in rows):
        failures.append(f"Stichprobe: {sum(r['equal'] for r in rows)} von {len(rows)} gleich")
    out["failures"] = failures
    Path(args.report).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({"status": status, "categories": len(cats), "listed": listed, "without_image": len(no_image),
                      "without_price": len(no_price), "sample_equal": sum(r["equal"] for r in rows), "sample": len(rows),
                      "failures": failures}, ensure_ascii=False))
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
