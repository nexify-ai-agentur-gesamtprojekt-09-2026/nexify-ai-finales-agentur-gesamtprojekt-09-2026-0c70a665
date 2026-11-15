"""Katalog-Erstbefüllung: vorhandenen Katalog (Produkte, Kategorien) aus der Datenbank des alten Dienstes übernehmen.

  python apps/shop-api/transfer_catalog.py --log lauf.jsonl --expect-min 3720          # Trockenlauf (Standard): nichts schreiben
  python apps/shop-api/transfer_catalog.py --log lauf.jsonl --expect-min 3720 --apply --publication-contract vertrag.json

Zugänge nur aus der Umgebung, nie ausgegeben (eigene Namen, nicht die des laufenden Dienstes):
  CATALOG_SOURCE_MONGO_URL, CATALOG_SOURCE_DB_NAME
  CATALOG_TARGET_KIND = mongodb | postgres
  CATALOG_TARGET_MONGO_URL, CATALOG_TARGET_DB_NAME   (für mongodb)
  CATALOG_TARGET_POSTGRES_DSN                        (für postgres, Schema ``shop``)

Regeln:
* Die Quelle wird nur über ``find`` gelesen. Quelle und Ziel dürfen nicht dieselbe Datenbank sein.
* Übernommen werden nur ``products`` und ``categories``, unverändert (keine Felder werden erfunden oder umgerechnet).
  Nicht übernommen: Einstellungen und Preisfreigabe, Bestellungen, Konten, Warenkörbe, Importläufe.
  Preise bleiben im Ziel deshalb „nicht freigegeben“, bis der Inhaber dort freigibt.
* Jedes Produkt muss tragen, was die neue Fassung zum Anzeigen und Rechnen braucht (siehe ``check_product``); sonst
  Abbruch mit Zahl je Grund, vor dem ersten Schreiben.
* Das Ziel wird in einer Transaktion beschrieben, danach nach Zahl und Prüfsumme mit der Quelle verglichen. Jede
  Abweichung, auch ein Produkt, das es nur im Ziel gibt, bricht ab; nichts bleibt geschrieben. Gelöscht wird nie.
* Wiederholbar: Ein zweiter Lauf über unveränderte Daten schreibt nichts.
* Festschreiben verlangt ``--publication-contract``: eine Datei, in der der Inhaber den Veröffentlichungsvertrag für
  genau diese Übernahme belegt (Felder siehe ``check_contract``). Grund: Der reguläre Import ist gesperrt, bis ein
  solcher Vertrag belegt ist (``require_publication_contract`` in shop/bigbuy_import.py, DECISIONS.md D-008, OA-071).
  Die Sperre dort bleibt unverändert; diese Übernahme prüft denselben Sachverhalt an eigener Stelle. Die Datei enthält
  nur Verweise (kein Geheimnis); ihre Prüfsumme und die Verweise stehen danach im Lauf-Eintrag (``imports``) des Ziels.
  Ob die genannten Nachweise tatsächlich vorliegen, kann das Skript nicht prüfen; das verantwortet, wer die Datei ausstellt.
* ``--expect-min`` bricht ab, wenn die Quelle weniger Produkte trägt als erwartet. Der Bericht nennt eine Stichprobe
  (``--sample``, Standard 20): Für diese Kennungen stimmt das ganze Dokument überein (Titel, Einkaufspreis, Bestand, Bilder).
* Jeder Lauf schreibt ein Protokoll (``--log``, Pflicht): Sammlungen, Zahlen, Prüfsummen, Ergebnis; nie Inhalte.
"""
import argparse
import asyncio
from datetime import datetime, timezone
import hashlib
import importlib.util
import inspect
import json
import os
from pathlib import Path
import sys

_SPEC = importlib.util.spec_from_file_location("_shop_transfer_common", Path(__file__).with_name("transfer_mongo_to_postgres.py"))
common = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(common)
Abort, Digest = common.Abort, common.Digest

COLLECTIONS = ("categories", "products")
HTTPS = "https://"


def whole(value):
    return type(value) is int


def check_product(doc):
    """Gründe, aus denen die neue Fassung dieses Produkt nicht richtig anzeigen oder berechnen könnte (leer = in Ordnung)."""
    reasons = []
    if not isinstance(doc.get("_id"), str) or not doc.get("_id"):
        reasons.append("Kennung ist kein Text")
    if not isinstance(doc.get("name"), str) or not doc["name"].strip():
        reasons.append("Name fehlt")
    if not whole(doc.get("purchase_cents")) or doc["purchase_cents"] < 0:
        reasons.append("Einkaufspreis ist keine ganze Zahl in Cent")
    if not whole(doc.get("bigbuy_id")):
        reasons.append("Lieferantenkennung (bigbuy_id) fehlt")
    if type(doc.get("active")) is not bool:
        reasons.append("Veröffentlichungsstand (active) fehlt")
    if doc.get("source") != "bigbuy":
        reasons.append("Herkunft ist nicht bigbuy")
    if "stock" in doc and doc["stock"] is not None and (not whole(doc["stock"]) or doc["stock"] < 0):
        reasons.append("Bestand ist keine ganze Zahl")
    if "images" in doc and not (isinstance(doc["images"], list) and all(isinstance(u, str) for u in doc["images"])):
        reasons.append("Bilder sind keine Liste von Adressen")
    if "category_ids" in doc and not (isinstance(doc["category_ids"], list) and all(whole(c) for c in doc["category_ids"])):
        reasons.append("Kategorien sind keine Liste ganzer Zahlen")
    return reasons


CONTRACT_TEXT = ("supplier_agreement_reference", "data_licence_reference", "approved_by", "approved_at")
CONTRACT_FIXED = {"scope": "catalog_first_fill", "tenant": "teileklar", "supplier": "bigbuy"}


def check_contract(contract, minimum):
    """Abort, wenn der Vertragsnachweis fehlt, unvollständig ist oder nicht zu dieser Übernahme passt. Gibt den Eintrag fürs Protokoll zurück."""
    if not isinstance(contract, dict):
        raise Abort("Festschreiben verlangt den belegten Veröffentlichungsvertrag (--publication-contract); siehe D-008/OA-071")
    wrong = [k for k, v in CONTRACT_FIXED.items() if contract.get(k) != v]
    wrong += [k for k in CONTRACT_TEXT if not (isinstance(contract.get(k), str) and contract[k].strip())]
    if not whole(contract.get("product_count_minimum")) or contract["product_count_minimum"] < 1 or (minimum is not None and contract["product_count_minimum"] != minimum):
        wrong.append("product_count_minimum")
    try:
        datetime.fromisoformat(contract.get("approved_at") or "")
    except (TypeError, ValueError):
        wrong.append("approved_at")
    if set(contract) - {*CONTRACT_FIXED, *CONTRACT_TEXT, "product_count_minimum", "note"}:
        wrong.append("unbekanntes Feld")
    if wrong:
        raise Abort("Veröffentlichungsvertrag unvollständig oder unpassend (D-008/OA-071): " + ", ".join(sorted(set(wrong))))
    digest = hashlib.sha256(json.dumps(contract, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
    return {"sha256": digest, **{k: contract[k] for k in CONTRACT_TEXT}, "product_count_minimum": contract["product_count_minimum"]}


def check_category(doc):
    reasons = []
    if not whole(doc.get("_id")):
        reasons.append("Kennung ist keine ganze Zahl")
    if not isinstance(doc.get("name"), str) or not doc["name"].strip():
        reasons.append("Name fehlt")
    return reasons


async def read_source(base, source):
    """Liest und prüft die Quelle. Gibt je Sammlung die Dokumente in Ablagefolge und die Prüfsumme zurück."""
    docs, digests, problems = {}, {}, {}
    for collection in COLLECTIONS:
        rows, digest = [], Digest()
        async for doc in source[collection].find({}):
            for reason in (check_product if collection == "products" else check_category)(doc):
                problems[(collection, reason)] = problems.get((collection, reason), 0) + 1
            try:
                view = base.join(doc.get("_id"), base.encode({k: v for k, v in doc.items() if k != "_id"}))
            except Exception:
                problems[(collection, "nicht als JSON ablegbar")] = problems.get((collection, "nicht als JSON ablegbar"), 0) + 1
                continue
            if doc.get("_id") in digest.rows:
                problems[(collection, "Kennung doppelt")] = problems.get((collection, "Kennung doppelt"), 0) + 1
            rows.append(view); digest.add(doc.get("_id"), view)
        docs[collection], digests[collection] = rows, digest
    seen = {}
    for product in docs["products"]:
        if whole(product.get("bigbuy_id")):
            seen[product["bigbuy_id"]] = seen.get(product["bigbuy_id"], 0) + 1
    doubled = sum(1 for n in seen.values() if n > 1)
    if doubled:
        problems[("products", "Lieferantenkennung mehrfach vergeben")] = doubled
    known = {c["_id"] for c in docs["categories"]}
    orphans = sum(1 for p in docs["products"] if isinstance(p.get("category_ids"), list) and any(c not in known for c in p["category_ids"] if whole(c)))
    if orphans:
        problems[("products", "Kategorie fehlt in der Quelle")] = orphans
    if problems:
        raise Abort("Quelle nicht übernehmbar: " + "; ".join(f"{c}: {r} ({n})" for (c, r), n in sorted(problems.items())))
    return docs, digests


class MongoTarget:
    """Ziel MongoDB (der Namensraum der neuen Fassung). Schreibt in einer Transaktion; ohne Festschreiben wird sie verworfen."""
    kind = "mongodb"

    def __init__(self, database):
        self.db = database

    async def run(self, base, docs, run_record, apply):
        class Discard(Exception):
            pass
        result = {}

        async def work(session):
            for collection in COLLECTIONS:
                existing = {d["_id"]: d async for d in self.db[collection].find({}, session=session)}
                inserted = updated = 0
                for doc in docs[collection]:
                    current = existing.get(doc["_id"])
                    if current is None:
                        inserted += 1
                    elif common.canonical(base.join(current["_id"], base.encode({k: v for k, v in current.items() if k != "_id"}))) != common.canonical(doc):
                        updated += 1
                    else:
                        continue
                    await self.db[collection].replace_one({"_id": doc["_id"]}, dict(doc), upsert=True, session=session)
                digest = Digest()
                async for stored in self.db[collection].find({}, session=session):
                    digest.add(stored["_id"], base.join(stored["_id"], base.encode({k: v for k, v in stored.items() if k != "_id"})))
                result[collection] = (inserted, updated, len(docs[collection]) - inserted - updated, digest)
            if apply and run_record is not None and all(r[3].value == run_record["digests"][c] for c, r in result.items()):
                if await self.db.imports.find_one({"_id": run_record["_id"]}, session=session) is None:
                    await self.db.imports.update_one({"_id": run_record["_id"]}, {"$set": {k: v for k, v in run_record.items() if k != "_id"}}, upsert=True, session=session)
            if not apply or any(r[3].value != run_record["digests"][c] or r[3].count != len(docs[c]) for c, r in result.items()):
                raise Discard()

        session = self.db.client.start_session()
        if inspect.isawaitable(session):
            session = await session
        try:
            async with session:
                await session.with_transaction(work)
        except Discard:
            pass
        return result


class PostgresTarget:
    """Ziel PostgreSQL (Schema ``shop``), über dieselbe Dokumentform wie die Zugriffsschicht."""
    kind = "postgres"

    def __init__(self, dsn):
        self.dsn = dsn

    async def run(self, base, docs, run_record, apply):
        import psycopg
        result = {}
        async with await psycopg.AsyncConnection.connect(self.dsn) as conn:
            try:
                async with conn.cursor() as cur:
                    for collection in COLLECTIONS:
                        rows = [(doc["_id"], base.encode({k: v for k, v in doc.items() if k != "_id"})) for doc in docs[collection]]
                        try:
                            inserted, updated, unchanged = await common.write_target(cur, collection, rows)
                        except psycopg.Error as exc:
                            raise Abort(f"{collection}: das Ziel weist die Daten ab ({type(exc).__name__}, SQLSTATE {exc.sqlstate})") from None
                        result[collection] = (inserted, updated, unchanged, await common.read_target(base, cur, collection))
                    good = all(r[3].value == run_record["digests"][c] and r[3].count == len(docs[c]) for c, r in result.items())
                    if apply and good:
                        body = base.encode({k: v for k, v in run_record.items() if k != "_id"})
                        await cur.execute("insert into shop.imports (id, doc) values (%s, %s::json) on conflict (id) do nothing", (run_record["_id"], body))
                if apply and good:
                    await conn.commit()
                else:
                    await conn.rollback()
            except BaseException:
                await conn.rollback()
                raise
        return result


async def transfer(source, target, *, apply=False, contract=None, expect_min=None, sample=20, log=print, now=None):
    """Führt die Übernahme aus und gibt den Bericht zurück. Abort bei jeder Abweichung; dann ist nichts geschrieben."""
    proof = check_contract(contract, expect_min) if apply else None
    base = common.load_base()
    docs, digests = await read_source(base, source)
    if expect_min is not None and digests["products"].count < expect_min:
        raise Abort(f"products: Quelle trägt {digests['products'].count} Produkte, erwartet sind mindestens {expect_min}; nichts geschrieben")
    for collection in COLLECTIONS:
        log(json.dumps({"step": "source", "collection": collection, "count": digests[collection].count, "digest": digests[collection].value}))
    stamps = sorted(p["imported_at"] for p in docs["products"] if isinstance(p.get("imported_at"), str))
    combined = hashlib.sha256("".join(digests[c].value for c in COLLECTIONS).encode()).hexdigest()
    moment = (now or datetime.now(timezone.utc)).isoformat()
    # Lauf-Eintrag: finished_at ist das Alter der Daten (jüngster Importzeitpunkt der Quelle), nicht der Zeitpunkt der Übernahme.
    run_record = {"_id": "catalog-transfer-" + combined[:32], "status": "done", "mode": "catalog_transfer", "source": "Bestandsübernahme aus dem bisherigen Shop",
                  "started_at": moment, "finished_at": stamps[-1] if stamps else moment, "transferred_at": moment, "publication_contract": proof,
                  "counts": {c: digests[c].count for c in COLLECTIONS}, "digests": {c: digests[c].value for c in COLLECTIONS}}
    result = await target.run(base, docs, run_record, apply)
    report, mismatches = {}, []
    for collection in COLLECTIONS:
        inserted, updated, unchanged, digest = result[collection]
        match = digest.count == digests[collection].count and digest.value == digests[collection].value
        report[collection] = {"source_count": digests[collection].count, "source_digest": digests[collection].value, "target_count": digest.count,
                              "target_digest": digest.value, "inserted": inserted, "updated": updated, "unchanged": unchanged, "match": match}
        log(json.dumps({"step": "target", "collection": collection, **{k: v for k, v in report[collection].items() if not k.startswith("source")}}))
        if not match:
            differing = digests[collection].difference(digest)
            mismatches.append(f"{collection}: Quelle {digests[collection].count} / Ziel {digest.count}, abweichende Kennungen (höchstens 5): {[str(k)[:40] for k in differing[:5]]}")
    if mismatches:
        raise Abort("Abweichung zwischen Quelle und Ziel; nichts festgeschrieben. " + " | ".join(mismatches))
    ids = sorted(digests["products"].rows)
    step = max(1, len(ids) // sample) if sample else 1
    chosen = ids[::step][:sample] if sample else []
    checked = [{"id": str(i)[:40], "equal": result["products"][3].rows.get(i) == digests["products"].rows[i]} for i in chosen]
    log(json.dumps({"step": "sample", "checked": len(checked), "equal": sum(c["equal"] for c in checked)}))
    return {"outcome": "applied" if apply else "dry_run", "target": target.kind, "collections": report, "sample": checked,
            "published": sum(1 for p in docs["products"] if p.get("active") is True), "run": run_record["_id"] if apply else None}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Katalog des bisherigen Shops in die neue Fassung übernehmen. Ohne --apply wird nichts geschrieben.")
    parser.add_argument("--apply", action="store_true", help="bei vollständiger Gleichheit festschreiben (verlangt --publication-contract)")
    parser.add_argument("--publication-contract", help="Datei mit dem belegten Veröffentlichungsvertrag (JSON, nur Verweise, kein Geheimnis)")
    parser.add_argument("--expect-min", type=int, help="Abbruch, wenn die Quelle weniger Produkte trägt")
    parser.add_argument("--sample", type=int, default=20, help="Größe der Stichprobe im Bericht")
    parser.add_argument("--log", required=True, help="Protokolldatei (JSON je Zeile); jeder Lauf wird angehängt")
    args = parser.parse_args(argv)
    kind = os.environ.get("CATALOG_TARGET_KIND", "")
    needed = ["CATALOG_SOURCE_MONGO_URL", "CATALOG_SOURCE_DB_NAME", "CATALOG_TARGET_KIND"]
    needed += {"mongodb": ["CATALOG_TARGET_MONGO_URL", "CATALOG_TARGET_DB_NAME"], "postgres": ["CATALOG_TARGET_POSTGRES_DSN"]}.get(kind, [])
    missing = [name for name in needed if not os.environ.get(name)]
    if missing or kind not in ("mongodb", "postgres"):
        print("Konfiguration fehlt oder ungültig: " + (", ".join(missing) or "CATALOG_TARGET_KIND muss mongodb oder postgres sein"), file=sys.stderr)
        return 3
    contract = None
    if args.apply:
        try:
            contract = json.loads(Path(args.publication_contract).read_text(encoding="utf-8"))
        except (TypeError, OSError, ValueError):
            print("Festschreiben verlangt --publication-contract mit einer lesbaren JSON-Datei (D-008/OA-071).", file=sys.stderr)
            return 3
    if kind == "mongodb" and (os.environ["CATALOG_TARGET_MONGO_URL"], os.environ["CATALOG_TARGET_DB_NAME"]) == (os.environ["CATALOG_SOURCE_MONGO_URL"], os.environ["CATALOG_SOURCE_DB_NAME"]):
        print("Quelle und Ziel sind dieselbe Datenbank.", file=sys.stderr)
        return 3
    handle = open(args.log, "a", encoding="utf-8")

    def log(line):
        print(line)
        handle.write(line + "\n"); handle.flush()

    async def run():
        from motor.motor_asyncio import AsyncIOMotorClient
        clients = [AsyncIOMotorClient(os.environ["CATALOG_SOURCE_MONGO_URL"], serverSelectionTimeoutMS=10000)]
        try:
            if kind == "mongodb":
                clients.append(AsyncIOMotorClient(os.environ["CATALOG_TARGET_MONGO_URL"], serverSelectionTimeoutMS=10000))
                target = MongoTarget(clients[1][os.environ["CATALOG_TARGET_DB_NAME"]])
            else:
                target = PostgresTarget(os.environ["CATALOG_TARGET_POSTGRES_DSN"])
            return await transfer(clients[0][os.environ["CATALOG_SOURCE_DB_NAME"]], target, apply=args.apply, contract=contract,
                                  expect_min=args.expect_min, sample=args.sample, log=log)
        finally:
            for client in clients:
                client.close()

    try:
        log(json.dumps({"step": "start", "mode": "apply" if args.apply else "dry_run", "target": kind, "at": datetime.now(timezone.utc).isoformat()}))
        try:
            result = asyncio.run(run())
        except Abort as exc:
            log(json.dumps({"step": "abort", "reason": str(exc)}, ensure_ascii=False))
            return 2
        except Exception as exc:  # Treibertexte können Adressen enthalten; nur die Art nennen.
            log(json.dumps({"step": "abort", "reason": "Fehler der Art " + type(exc).__name__}))
            return 2
        log(json.dumps({"step": "done", "outcome": result["outcome"], "published": result["published"], "run": result["run"],
                        "sample_equal": sum(c["equal"] for c in result["sample"]), "sample_checked": len(result["sample"])}))
        return 0
    finally:
        handle.close()


if __name__ == "__main__":
    sys.exit(main())
