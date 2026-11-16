"""Katalog-Übernahme über die öffentliche Schnittstelle des bisherigen Shops (teileklar.shop) in den Namensraum der neuen Fassung.

  python apps/shop-api/transfer_public_catalog.py --log lauf.jsonl                     # Trockenlauf (Standard): nichts schreiben
  python apps/shop-api/transfer_public_catalog.py --log lauf.jsonl --limit 20 --allow-other-target --apply --publication-contract <Datei>   # Probelauf (nur Probedatenbank)
  python apps/shop-api/transfer_public_catalog.py --log lauf.jsonl --apply --publication-contract <Datei>               # voller Lauf

Ziel nur aus der Umgebung, nie ausgegeben:
  CATALOG_TARGET_MONGO_URL, CATALOG_TARGET_DB_NAME (muss ``nexify_teileklar_shop_v1`` sein, außer mit --allow-other-target für lokale Proben)

Regeln:
* Die Quelle wird nur über ``GET /api/shop/products?limit=500&offset=N`` gelesen (``page`` wirkt dort nicht, siehe ``fetch_source``),
  ohne Anmeldung, mit Pause zwischen den Abrufen (``--pause``, Standard 1,5 s) und höchstens drei Versuchen je Abruf. Die Quelle muss
  genau ``total`` verschiedene Artikel liefern.
* Nichts wird erfunden oder umgerechnet außer der Einheit: ``value`` (Euro) wird zu ``list_price_cents`` (ganze Cent), nur wenn das
  exakt geht und die Preisangabe ``price`` denselben Betrag zeigt. Das Bild ``/api/shop/image?src=<kodiert>`` wird zur darin
  kodierten Lieferantenadresse, nur wenn sie die Bildregel der neuen Fassung (``supplier_image``) erfüllt. Der vollständige
  Quelldatensatz bleibt unverändert unter ``legacy`` erhalten.
* Artikel ohne Preis, ohne zulässiges Bild, ohne Namen oder mit unklarer Kategorie brechen den Lauf vor dem ersten Schreiben ab
  (Zahl je Grund, keine Inhalte). Ausgenommen und mit Kennung protokolliert: Schauartikel mit Platzhalterbild (``is_placeholder``).
* Jede Bildadresse wird beim Lauf beim Lieferanten geprüft (``head_image``). Sichtbar wird nur ein Artikel, dessen Bild lädt; alle
  anderen werden unverändert, aber unsichtbar (``active: false``) übernommen – keine leeren Bildkacheln, nichts geht verloren.
* Geschrieben wird über dieselbe Transaktions- und Prüfsummenlogik wie ``transfer_catalog.py`` (Zahl und Prüfsumme je Sammlung,
  Abweichung = nichts geschrieben, gelöscht wird nie, zweiter Lauf schreibt nichts).
* Festschreiben verlangt ``--publication-contract`` nach ``check_contract`` mit Geltungsbereich ``catalog_public_api_transfer``.
  ``require_publication_contract`` im BigBuy-Importcode bleibt unverändert gesperrt; dieser Weg nutzt den BigBuy-Import nicht.
* Die Preise sind die veröffentlichten Bruttopreise des bisherigen Shops. Die neue Fassung zeigt sie nur bei Produkten, die diese
  Übernahme mit ``list_price_status = approved_by_transfer_contract`` geschrieben hat; bestellbar werden sie dadurch nicht
  (kein Einkaufspreis, der Warenkorb weist sie ab).
"""
import argparse
import asyncio
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.parse import parse_qs, urlsplit
import urllib.error
import urllib.request

HERE = Path(__file__).resolve().parent
_SPEC = importlib.util.spec_from_file_location("_shop_transfer_catalog", HERE / "transfer_catalog.py")
tc = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(tc)
Abort = tc.Abort

SOURCE_BASE = "https://teileklar.shop"
SOURCE_PATH = "/api/shop/products"
TARGET_NAMESPACE = "nexify_teileklar_shop_v1"
WINDOW = 500  # Obergrenze der Quelle je Abruf
STEP = 400  # Überlappung 100, gegen unstabile Reihenfolge bei gleichen Namen
SOURCE_TAG = "teileklar_public_catalog"
LIST_PRICE_APPROVED = "approved_by_transfer_contract"
ID_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}")
USER_AGENT = "nexify-catalog-transfer/1"

CONTRACT_FIXED = {"scope": "catalog_public_api_transfer", "tenant": "teileklar", "source_url": SOURCE_BASE + SOURCE_PATH,
                  "target_namespace": TARGET_NAMESPACE, "list_prices_approved": True}
CONTRACT_TEXT = ("data_licence_reference", "list_price_reference", "approved_by", "approved_at")


def _supplier_image():
    """Dieselbe Bildregel wie die Anzeige der neuen Fassung, ohne den Dienst zu laden."""
    import ast
    tree = ast.parse((HERE / "shop" / "catalog_api.py").read_text(encoding="utf-8"))
    nodes = [n for n in tree.body if isinstance(n, ast.Import) and any(a.name == "re" for a in n.names)
             or isinstance(n, ast.ImportFrom) and n.module == "urllib.parse"
             or isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "SUPPLIER_IMAGE_HOSTS" for t in n.targets)
             or isinstance(n, ast.FunctionDef) and n.name == "supplier_image"]
    scope = {}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), "supplier_image", "exec"), scope)
    return scope["supplier_image"]


supplier_image = _supplier_image()


# ---------------------------------------------------------------- Quelle lesen

def http_get_json(url, timeout=30):
    request = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        if response.status != 200:
            raise Abort(f"Quelle antwortet {response.status}")
        return json.loads(response.read().decode("utf-8"))


def fetch_source(base=SOURCE_BASE, *, pause=1.5, limit=None, get=http_get_json, sleep=time.sleep, log=lambda line: None, max_passes=4):
    """Liest die Quelle vollständig. Gibt (Artikel nach Kennung sortiert, Kopfdaten) zurück; Abort bei Lücke, Widerspruch oder Fehler.

    Gemessen am 16.11.2026: ``page`` wird von der Quelle ignoriert (jede Seite = Seite 1), ``offset`` wirkt, ``limit`` höchstens 500,
    die Reihenfolge ist bei gleichen Namen nicht stabil. Deshalb: überlappende Fenster (``WINDOW`` Artikel ab ``offset``, Schritt
    ``STEP``) und so viele Durchgänge (höchstens ``max_passes``), bis genau ``total`` verschiedene Kennungen vorliegen. Liefert die Quelle
    dieselbe Kennung mit abweichendem Inhalt, bricht der Lauf ab (Katalog ändert sich während des Lesens)."""
    found, windows, total = {}, [], None
    for attempt_pass in range(1, max_passes + 1):
        offset = 0
        while True:
            url = f"{base}{SOURCE_PATH}?limit={WINDOW}&offset={offset}"
            for attempt in range(3):
                try:
                    body = get(url)
                    break
                except Abort:
                    raise
                except Exception as exc:  # Netzfehler: begrenzt wiederholen
                    if attempt == 2:
                        raise Abort(f"Fenster ab {offset} nicht lesbar ({type(exc).__name__})") from None
                    sleep(pause * (attempt + 2))
            if not isinstance(body, dict) or not isinstance(body.get("items"), list) or type(body.get("total")) is not int:
                raise Abort(f"Fenster ab {offset}: unerwartete Form")
            if total is None:
                total = body["total"]
            elif body["total"] != total:
                raise Abort(f"Gesamtzahl hat sich während des Lesens geändert ({total} → {body['total']})")
            rows, new = body["items"], 0
            for row in rows:
                key = row.get("id") if isinstance(row, dict) else None
                if not isinstance(key, str):
                    raise Abort(f"Fenster ab {offset}: Datensatz ohne Kennung")
                if key in found:
                    if found[key] != row:
                        raise Abort("Quelle liefert dieselbe Kennung mit abweichendem Inhalt; Katalog ändert sich während des Lesens")
                else:
                    found[key] = row; new += 1
            windows.append({"pass": attempt_pass, "offset": offset, "count": len(rows), "new": new,
                            "sha256": hashlib.sha256(json.dumps(rows, sort_keys=True, ensure_ascii=False).encode()).hexdigest()})
            log(json.dumps({"step": "source_window", **windows[-1]}))
            if limit is not None and len(found) >= limit:
                break
            if not rows or offset + WINDOW >= total:
                break
            offset += STEP
            sleep(pause)
        if limit is not None and len(found) >= limit or len(found) >= total:
            break
        sleep(pause)
    items = [found[k] for k in sorted(found)]
    if limit is not None:
        items = items[:limit]
    elif len(items) != total:
        raise Abort(f"Quelle lieferte nach {max_passes} Durchgängen {len(items)} verschiedene Artikel, angekündigt sind {total}")
    return items, {"total": total, "windows": windows, "fetched": len(items), "passes": windows[-1]["pass"] if windows else 0}


# ---------------------------------------------------------------- Abbildung

def category_id(name):
    """Stabile ganze Zahl je Kategoriename (die Quelle führt nur Namen)."""
    return int(hashlib.sha256(name.encode("utf-8")).hexdigest()[:7], 16) + 1


def price_cents(item):
    value = item.get("value")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        cents = Decimal(str(value)) * 100
    except InvalidOperation:
        return None
    if cents <= 0 or cents != cents.to_integral_value():
        return None
    cents = int(cents)
    return cents if shown_cents(item.get("price")) == cents else None


def shown_cents(text):
    """Betrag der Preisangabe der Quelle in Cent. Belegte Schreibweisen (16.11.2026): ``7.06 €``, ``.71 €``, ``1,048.70 €``, ``19,90 €``."""
    if not isinstance(text, str):
        return None
    text = text.replace("\u00a0", " ").strip()
    if not text.endswith(" €"):
        return None
    amount = text[:-2]
    if re.fullmatch(r"(?:\d{1,3}(?:,\d{3})+|\d*)\.\d{2}", amount):
        euros, cents = amount.replace(",", "").split(".")
    elif re.fullmatch(r"\d+,\d{2}", amount):
        euros, cents = amount.split(",")
    else:
        return None
    return int(euros or "0") * 100 + int(cents)


def image_url(item):
    raw = item.get("image")
    if not isinstance(raw, str):
        return None
    parts = urlsplit(raw)
    if parts.scheme or parts.netloc or parts.path != "/api/shop/image":
        return supplier_image(raw)
    values = parse_qs(parts.query, strict_parsing=False).get("src") or []
    return supplier_image(values[0]) if len(values) == 1 else None


def head_image(url, timeout=20):
    """True nur, wenn der Lieferant unter genau dieser Adresse ein nicht leeres Bild ausliefert (HEAD: 200, image/*, Länge > 0).

    Gemessen am 16.11.2026: ein großer Teil der Adressen der Quelle antwortet 404 oder mit einer 0-Byte-Datei.
    Nur eindeutige Antworten werden entschieden: 200 mit Bild und Länge > 0 = True; 404/410 oder 200 mit Länge 0 = False.
    Alles andere (429, 5xx, Netzfehler, unklare Antwort) wirft ProbeUnclear; der Lauf bricht dann ab statt Artikel zu verstecken."""
    request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT, "Referer": "https://nexifyai.de/"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            length = response.headers.get("Content-Length")
            image = (response.headers.get("Content-Type") or "").startswith("image/")
            if response.status == 200 and image and length is not None and length.isdigit():
                return int(length) > 0
            raise ProbeUnclear(f"Antwort {response.status}")
    except urllib.error.HTTPError as error:
        if error.code in (404, 410):
            return False
        raise ProbeUnclear(f"HTTP {error.code}") from None


class ProbeUnclear(Exception):
    """Bildprobe ohne eindeutiges Ergebnis (Ratenbegrenzung, Serverfehler, Netz)."""


def verify_images(urls, check=head_image, workers=4, sleep=time.sleep):
    """Prüft jede Adresse höchstens dreimal (nur bei unklarem Ergebnis erneut). Gibt {Adresse: True/False/None} zurück;
    None = auch nach drei Versuchen unklar (der Lauf bricht dann ab, siehe ``run``)."""
    import concurrent.futures

    def one(url):
        for attempt in range(3):
            try:
                return url, bool(check(url))
            except Exception:
                if attempt == 2:
                    return url, None
                sleep(2 * (attempt + 1))
    with concurrent.futures.ThreadPoolExecutor(workers) as pool:
        return dict(pool.map(one, sorted(set(urls))))


def map_item(item, verified=None):
    """Gibt (Produkt, Gründe) zurück. Gründe nicht leer = nicht übernehmbar.

    ``verified``: Ergebnis von ``verify_images``. Sichtbar (``active``) wird nur ein Artikel, dessen Bild beim Lauf nachweislich lädt;
    die übrigen werden unverändert, aber unsichtbar übernommen (keine leeren Bildkacheln, nichts geht verloren)."""
    reasons = []
    if not isinstance(item, dict):
        return None, ["Datensatz ist kein Objekt"]
    pid = item.get("id")
    if not isinstance(pid, str) or not ID_PATTERN.fullmatch(pid):
        reasons.append("Kennung ungültig")
    name = item.get("name")
    if not isinstance(name, str) or not name.strip():
        reasons.append("Name fehlt")
    cents = price_cents(item)
    if cents is None:
        reasons.append("Preis fehlt oder ist nicht eindeutig")
    image = image_url(item)
    if image is None:
        reasons.append("Bild fehlt oder ist nicht zulässig")
    category = item.get("category")
    if not isinstance(category, str) or not category.strip():
        reasons.append("Kategorie fehlt")
    stock = item.get("stock")
    if isinstance(stock, bool) or not (stock is None or isinstance(stock, int) and stock >= 0):
        reasons.append("Bestand ist keine ganze Zahl")
    if reasons:
        return None, reasons
    specs = item.get("specs") if isinstance(item.get("specs"), list) else []
    details = {s["label"]: s["value"] for s in specs if isinstance(s, dict) and isinstance(s.get("label"), str) and isinstance(s.get("value"), str)}
    cid = category_id(category.strip())
    # bigbuy_id: der Namensraum verlangt einen eindeutigen, nicht lückenhaften Index auf diesem Feld (vercel_app.INDEXES). Die Quelle
    # führt die numerische BigBuy-Kennung nicht; eingetragen wird ihre BigBuy-Artikelnummer (Kennung = sku, gemessen 3713/3713) als Text.
    product = {"_id": pid, "bigbuy_id": pid, "name": name.strip(), "sku": str(item.get("sku") or ""), "ean": str(item.get("ean") or ""),
               "brand": item.get("brand"), "maker": item.get("maker"), "images": [image], "category_id": cid, "category_ids": [cid],
               "stock": stock, "list_price_cents": cents, "list_price_status": LIST_PRICE_APPROVED, "details": details,
               "description": "", "active": bool(verified and verified.get(image)), "image_verified": bool(verified and verified.get(image)),
               "buyable": False, "publishable": False, "source": SOURCE_TAG,
               "imported_at": item.get("created_at") if isinstance(item.get("created_at"), str) else None, "legacy": item}
    return product, []


def is_placeholder(item):
    """Schauartikel des bisherigen Shops mit Bild aus dessen eigenem Ordner ``assets/`` statt eines Lieferantenbildes.

    Gemessen am 16.11.2026: genau 7 Artikel (Marke „TEILEKLAR Select“, Bilder wie ``assets/part-placeholder.png``, Bestand 0).
    Sie werden nicht übernommen (keine Platzhalter im neuen Shop) und im Protokoll mit Kennung genannt."""
    return isinstance(item, dict) and isinstance(item.get("image"), str) and item["image"].startswith("assets/")


def build_documents(items, log=lambda line: None, verified=None):
    """Alle Produkte und Kategorien oder Abort mit Zahl je Grund. Platzhalter-Schauartikel werden benannt und ausgelassen."""
    problems, products, names = {}, [], {}
    skipped = sorted(str(i.get("id"))[:40] for i in items if is_placeholder(i))
    if skipped:
        log(json.dumps({"step": "skipped_placeholders", "count": len(skipped), "ids": skipped}))
    for item in items:
        if is_placeholder(item):
            continue
        product, reasons = map_item(item, verified)
        for reason in reasons:
            problems[reason] = problems.get(reason, 0) + 1
        if product:
            products.append(product)
            names.setdefault(product["category_id"], set()).add(product["legacy"]["category"].strip())
    clash = sum(1 for n in names.values() if len(n) > 1)
    if clash:
        problems["Kategoriekennung nicht eindeutig"] = clash
    if problems:
        raise Abort("Quelle nicht übernehmbar: " + "; ".join(f"{r} ({n})" for r, n in sorted(problems.items())))
    categories = [{"_id": cid, "name": next(iter(n)), "root": True, "source": SOURCE_TAG} for cid, n in sorted(names.items())]
    return {"products": products, "categories": categories}


def check_product(doc):
    reasons = []
    if not isinstance(doc.get("_id"), str) or not ID_PATTERN.fullmatch(doc["_id"]):
        reasons.append("Kennung ist kein Text")
    elif doc.get("bigbuy_id") != doc["_id"]:
        reasons.append("Lieferantenkennung (bigbuy_id) fehlt")
    if not isinstance(doc.get("name"), str) or not doc["name"].strip():
        reasons.append("Name fehlt")
    if type(doc.get("list_price_cents")) is not int or doc["list_price_cents"] <= 0:
        reasons.append("Preis fehlt")
    if not (isinstance(doc.get("images"), list) and doc["images"] and all(supplier_image(u) == u for u in doc["images"])):
        reasons.append("Bild fehlt")
    if (type(doc.get("active")) is not bool or doc["active"] is not doc.get("image_verified")
            or doc.get("source") != SOURCE_TAG or doc.get("buyable") is not False):
        reasons.append("Veröffentlichungsstand unpassend")
    if not (isinstance(doc.get("category_ids"), list) and doc["category_ids"] and all(type(c) is int for c in doc["category_ids"])):
        reasons.append("Kategorien sind keine Liste ganzer Zahlen")
    return reasons


class MemorySource:
    """Bietet die gelesenen Dokumente in der Form, die ``transfer_catalog.read_source`` erwartet (nur ``find``)."""

    def __init__(self, docs):
        self.docs = docs

    def __getitem__(self, collection):
        rows = self.docs[collection]

        class Collection:
            def find(self, query):
                async def iterate():
                    for row in rows:
                        yield dict(row)
                return iterate()
        return Collection()


PROFILE = {"check_product": check_product, "contract_fixed": CONTRACT_FIXED, "contract_text": CONTRACT_TEXT,
           "source": "Übernahme über die öffentliche Schnittstelle von teileklar.shop", "run_prefix": "catalog-public-transfer-"}


# ---------------------------------------------------------------- Vergleich mit der Quelle

def compare_sample(items, stored_by_id, size=20, published_only=False):
    """Feld-für-Feld-Vergleich: jeder Quelldatensatz gegen ``legacy`` im Ziel und gegen die abgeleiteten Felder."""
    ids = sorted(i["id"] for i in items if not is_placeholder(i) and (not published_only or (stored_by_id.get(i["id"]) or {}).get("active") is True))
    step = max(1, len(ids) // size)
    chosen = ids[::step][:size]
    by_id = {i["id"]: i for i in items}
    rows = []
    for pid in chosen:
        src, doc = by_id[pid], stored_by_id.get(pid) or {}
        fields = sorted(src)
        differing = [f for f in fields if (doc.get("legacy") or {}).get(f) != src[f]]
        derived = {"name": doc.get("name") == src["name"].strip(), "price": doc.get("list_price_cents") == price_cents(src),
                   "image": (doc.get("images") or [None])[0] == image_url(src), "stock": doc.get("stock") == src.get("stock"),
                   "category": doc.get("category_id") == category_id(src["category"].strip())}
        rows.append({"id": pid, "fields_compared": len(fields), "fields_differing": differing, "derived_equal": derived,
                     "equal": not differing and all(derived.values()), "price_eur": src.get("value"), "image": (doc.get("images") or [None])[0]})
    return rows


# ---------------------------------------------------------------- Ablauf

async def run(target_db, *, apply, contract, limit, pause, log, items=None, expect_min=None, image_check=head_image):
    if apply:  # vor jedem Lesen der Quelle: ohne passenden Vertrag kein Lauf
        tc.check_contract(contract, None if limit is not None else expect_min, CONTRACT_FIXED, CONTRACT_TEXT)
    if items is None:
        items, meta = fetch_source(pause=pause, limit=limit, log=log)
        if limit is None:
            # Zweiter, unabhängiger Durchgang: nur ein in beiden Durchgängen identischer Katalog (Kennungen und Inhalte) wird übernommen.
            second, _ = fetch_source(pause=pause, log=log)
            if second != items:
                changed = len({i["id"] for i in items} ^ {i["id"] for i in second}) + sum(1 for a, b in zip(items, second) if a != b)
                raise Abort(f"Quelle zwischen zwei Durchgängen verändert ({changed} Abweichungen); kein stabiler Stand, nichts geschrieben")
            log(json.dumps({"step": "source_stable", "passes": 2, "items": len(items)}))
    else:
        meta = {"total": len(items), "windows": [], "fetched": len(items), "passes": 0}
    log(json.dumps({"step": "source", "total_announced": meta["total"], "fetched": meta["fetched"], "windows": len(meta["windows"]), "passes": meta["passes"]}))
    urls = [u for i in items if not is_placeholder(i) and (u := image_url(i))]
    verified = await asyncio.to_thread(verify_images, urls, image_check)
    unclear = sum(1 for v in verified.values() if v is None)
    log(json.dumps({"step": "images", "unique": len(verified), "loading": sum(1 for v in verified.values() if v is True),
                    "not_loading": sum(1 for v in verified.values() if v is False), "unclear": unclear}))
    if unclear:
        raise Abort(f"{unclear} Bildadressen ohne eindeutiges Ergebnis (Ratenbegrenzung, Serverfehler oder Netz); nichts geschrieben, später erneut versuchen")
    docs = build_documents(items, log, verified)
    report = await tc.transfer(MemorySource(docs), tc.MongoTarget(target_db), apply=apply, contract=contract,
                               expect_min=expect_min, sample=20, log=log, profile=PROFILE, probe=limit is not None)
    stored = {d["_id"]: d async for d in target_db.products.find({"_id": {"$in": [i["id"] for i in items]}})} if apply else \
        {d["_id"]: d for d in docs["products"]}
    sample = compare_sample(items, stored) + compare_sample(items, stored, published_only=True)
    log(json.dumps({"step": "field_sample", "checked": len(sample), "equal": sum(r["equal"] for r in sample)}))
    return report, sample, meta, docs


def main(argv=None):
    parser = argparse.ArgumentParser(description="Katalog von teileklar.shop über die öffentliche Schnittstelle übernehmen. Ohne --apply wird nichts geschrieben.")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--publication-contract")
    parser.add_argument("--limit", type=int, help="nur die ersten N Artikel (Probelauf)")
    parser.add_argument("--pause", type=float, default=1.5, help="Sekunden zwischen zwei Seiten")
    parser.add_argument("--log", required=True)
    parser.add_argument("--report", help="Bericht (JSON) mit Stichprobe Feld für Feld")
    parser.add_argument("--snapshot-out", help="gelesene Quelldatensätze unverändert als JSON ablegen (für Prüfungen ohne erneutes Lesen)")
    parser.add_argument("--from-snapshot", help="statt der Quelle eine mit --snapshot-out abgelegte Datei verwenden (nur mit --allow-other-target)")
    parser.add_argument("--allow-other-target", action="store_true", help="nur für lokale Proben: anderer Datenbankname als der Namensraum")
    args = parser.parse_args(argv)
    missing = [n for n in ("CATALOG_TARGET_MONGO_URL", "CATALOG_TARGET_DB_NAME") if not os.environ.get(n)]
    if missing:
        print("Konfiguration fehlt: " + ", ".join(missing), file=sys.stderr)
        return 3
    if os.environ["CATALOG_TARGET_DB_NAME"] != TARGET_NAMESPACE and not args.allow_other_target:
        print(f"Ziel muss {TARGET_NAMESPACE} sein.", file=sys.stderr)
        return 3
    if args.limit is not None and (args.limit < 1 or not args.allow_other_target):
        print("--limit (Teillauf) nur positiv und nur gegen eine Probedatenbank (--allow-other-target); der Namensraum wird nie teilweise beschrieben.", file=sys.stderr)
        return 3
    if args.from_snapshot and not args.allow_other_target:
        print("--from-snapshot nur gegen eine Probedatenbank; der Namensraum wird nur aus der lebenden Quelle befüllt.", file=sys.stderr)
        return 3
    contract = None
    if args.apply:
        try:
            contract = json.loads(Path(args.publication_contract).read_text(encoding="utf-8"))
        except (TypeError, OSError, ValueError):
            print("Festschreiben verlangt --publication-contract mit einer lesbaren JSON-Datei.", file=sys.stderr)
            return 3
    handle = open(args.log, "a", encoding="utf-8")

    def log(line):
        print(line)
        handle.write(line + "\n"); handle.flush()

    async def go():
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(os.environ["CATALOG_TARGET_MONGO_URL"], serverSelectionTimeoutMS=15000)
        try:
            items = json.loads(Path(args.from_snapshot).read_text(encoding="utf-8"))["items"] if args.from_snapshot else None
            return await run(client[os.environ["CATALOG_TARGET_DB_NAME"]], apply=args.apply, contract=contract, limit=args.limit, pause=args.pause, log=log, items=items)
        finally:
            client.close()

    try:
        log(json.dumps({"step": "start", "mode": "apply" if args.apply else "dry_run", "limit": args.limit, "at": datetime.now(timezone.utc).isoformat()}))
        try:
            report, sample, meta, docs = asyncio.run(go())
        except Abort as exc:
            log(json.dumps({"step": "abort", "reason": str(exc)}, ensure_ascii=False))
            return 2
        except Exception as exc:  # Treibertexte können Adressen enthalten; nur die Art nennen.
            log(json.dumps({"step": "abort", "reason": "Fehler der Art " + type(exc).__name__}))
            return 2
        if args.snapshot_out:
            Path(args.snapshot_out).write_text(json.dumps({"meta": meta, "items": [d["legacy"] for d in docs["products"]]}, ensure_ascii=False), encoding="utf-8")
        if args.report:
            Path(args.report).write_text(json.dumps({"report": report, "field_sample": sample, "source": meta,
                                                     "categories": [{"id": c["_id"], "name": c["name"]} for c in docs["categories"]]},
                                                    ensure_ascii=False, indent=1), encoding="utf-8")
        log(json.dumps({"step": "done", "outcome": report["outcome"], "published": report["published"], "run": report["run"],
                        "field_sample_equal": sum(r["equal"] for r in sample), "field_sample_checked": len(sample)}))
        return 0 if all(r["equal"] for r in sample) else 2
    finally:
        handle.close()


if __name__ == "__main__":
    sys.exit(main())
