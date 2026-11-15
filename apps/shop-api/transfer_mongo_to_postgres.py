"""Datenumzug des Shops: MongoDB -> PostgreSQL (Schema ``shop``). Wiederholbar, mit Trockenlauf und Prüfsummen.

  python apps/shop-api/transfer_mongo_to_postgres.py --source-report   # nur Quelle lesen und prüfen
  python apps/shop-api/transfer_mongo_to_postgres.py --dry-run         # alles ausführen, am Ende verwerfen
  python apps/shop-api/transfer_mongo_to_postgres.py --apply           # nur bei vollständiger Gleichheit festschreiben

Zugänge kommen ausschließlich aus der Umgebung und werden nie ausgegeben:
  TRANSFER_SOURCE_MONGO_URL, TRANSFER_SOURCE_DB_NAME, TRANSFER_TARGET_POSTGRES_DSN
(bewusst andere Namen als die des laufenden Dienstes, damit kein Lauf versehentlich dessen Bindung nimmt).

Regeln:
* Die Quelle wird nur gelesen (ausschließlich ``find``); dieses Skript enthält keinen Schreibaufruf an MongoDB.
  Empfohlen ist zusätzlich ein MongoDB-Zugang mit reinem Leserecht.
* Das Ziel wird in EINER Transaktion beschrieben. Danach wird je Sammlung/Tabelle gezählt und eine Prüfsumme
  über alle Dokumente in Kennungsfolge verglichen. Jede Abweichung führt zum Abbruch: nichts wird festgeschrieben.
* Wiederholbar: Ein zweiter Lauf über unveränderte Daten schreibt keine Zeile neu. Im Ziel wird nie gelöscht;
  eine Zeile, die es nur im Ziel gibt, ist eine Abweichung.
* Das Protokoll nennt Sammlungen, Zahlen, Prüfsummen und höchstens fünf Kennungen je Abweichung, nie Inhalte.
* Nur nach Freigabe des Inhabers gegen echte Daten ausführen (DECISIONS.md D-013, D-016).
"""
import argparse
import asyncio
from datetime import datetime, timezone
import hashlib
import importlib
import json
import os
from pathlib import Path
import sys
from types import ModuleType
from uuid import uuid4

SHOP = Path(__file__).resolve().parent / "shop"

# Sammlung -> Art der Zieltabelle. "doc": Dokumentzeile. "append": Dokumentzeile, die nie geändert wird.
DOCUMENT_TABLES = {"products": "doc", "categories": "doc", "imports": "doc", "source_manifests": "append", "settings": "doc",
                   "price_releases": "append", "carts": "doc", "users": "doc", "api_keys": "doc", "orders": "doc",
                   "revolut_webhooks": "doc", "outbox": "doc", "requests": "doc", "workshops": "doc", "workshop_requests": "append"}
# Typisierte Tabellen: Spalten in der Feldfolge des Dokuments; (Pflichtfelder, erlaubte Felder, Zeitfelder, änderbar).
TYPED_TABLES = {
    "sessions": (("token_hash", "user_id", "expires_at"), ("token_hash", "user_id", "created_at", "expires_at"), ("expires_at",), False),
    "login_failures": (("email", "at"), ("email", "at"), ("at",), False),
    "password_resets": (("token_hash", "user_id", "expires_at"), ("token_hash", "user_id", "used", "expires_at", "mail_status"), ("expires_at",), True),
    "webhook_events": (("event_key",), ("event_key", "event", "order_id", "received_at"), (), False),
}
COLLECTIONS = [*DOCUMENT_TABLES, *TYPED_TABLES]
INTEGER_ID = {"categories"}
BATCH = 500


class Abort(Exception):
    """Der Lauf endet ohne Festschreiben; die Meldung nennt Sammlung und Grund, nie Inhalte."""


def load_base():
    """Dieselbe Dokumentform wie die Zugriffsschicht (shop/store/pg/base.py), ohne den Dienst oder dessen Bindung zu laden."""
    name = "_shop_transfer_" + uuid4().hex
    package = ModuleType(name); package.__path__ = [str(SHOP)]
    inert = ModuleType(name + ".db"); inert.db = None; inert.now_iso = lambda: datetime.now(timezone.utc).isoformat()
    previous = os.environ.get("SHOP_STORE_BACKEND")
    os.environ["SHOP_STORE_BACKEND"] = "mongodb"
    sys.modules[name], sys.modules[name + ".db"] = package, inert
    try:
        return importlib.import_module(name + ".store.pg.base")
    finally:
        if previous is None:
            os.environ.pop("SHOP_STORE_BACKEND", None)
        else:
            os.environ["SHOP_STORE_BACKEND"] = previous


def canonical(doc):
    return json.dumps(doc, default=lambda v: v.isoformat() if isinstance(v, datetime) else str(v), ensure_ascii=False, separators=(",", ":"))


class Digest:
    """Zahl und Prüfsumme einer Sammlung: sha256 über die sha256 der Dokumente in Kennungsfolge."""

    def __init__(self):
        self.rows = {}

    def add(self, row_id, doc):
        self.rows[row_id] = hashlib.sha256(canonical(doc).encode()).hexdigest()

    @property
    def count(self):
        return len(self.rows)

    @property
    def value(self):
        total = hashlib.sha256()
        for key in sorted(self.rows, key=str):
            total.update(str(key).encode()); total.update(b"\0"); total.update(self.rows[key].encode())
        return total.hexdigest()

    def difference(self, other):
        keys = sorted({*self.rows, *other.rows}, key=str)
        return [k for k in keys if self.rows.get(k) != other.rows.get(k)]


def target_id(collection, raw):
    if collection in INTEGER_ID:
        if type(raw) is not int:
            raise Abort(f"{collection}: Kennung ist keine ganze Zahl")
        return raw
    if isinstance(raw, str):
        return raw
    if type(raw).__name__ == "ObjectId":
        return str(raw)
    raise Abort(f"{collection}: Kennung hat eine nicht unterstützte Art ({type(raw).__name__})")


def moment(base, value, collection, field):
    if not isinstance(value, datetime):
        raise Abort(f"{collection}: Feld {field} ist kein Zeitpunkt")
    return base.aware(value)


def prepare(base, collection, doc):
    """Quelle -> (Kennung, Zeile fürs Ziel, Vergleichsform). Abort, wenn sich ein Dokument nicht verlustfrei ablegen lässt."""
    if "_id" not in doc:
        raise Abort(f"{collection}: Dokument ohne Kennung")
    row_id = target_id(collection, doc["_id"])
    body = {k: v for k, v in doc.items() if k != "_id"}
    if collection in DOCUMENT_TABLES:
        try:
            text = base.encode(body)
        except Exception:
            raise Abort(f"{collection}: Dokument {str(row_id)[:40]} lässt sich nicht als JSON ablegen") from None
        return row_id, text, base.join(row_id, text)
    required, allowed, moments, _ = TYPED_TABLES[collection]
    unknown, missing = sorted(set(body) - set(allowed)), [f for f in required if body.get(f) is None]
    if unknown or missing:
        raise Abort(f"{collection}: Dokument {str(row_id)[:40]} passt nicht zur festen Form (unerwartet: {unknown}, fehlt: {missing})")
    row = {"used": False, **body} if collection == "password_resets" else dict(body)
    for field in moments:
        row[field] = moment(base, row[field], collection, field)
    if collection == "password_resets" and type(row["used"]) is not bool:
        raise Abort(f"{collection}: Feld used ist kein Wahrheitswert")
    for field in allowed:
        if field not in moments and field != "used" and row.get(field) is not None and not isinstance(row[field], str):
            raise Abort(f"{collection}: Feld {field} ist kein Text")
    return row_id, row, typed_view(base, collection, row_id, row)


def typed_view(base, collection, row_id, row):
    _, allowed, moments, _ = TYPED_TABLES[collection]
    view = {"_id": row_id}
    for field in allowed:
        value = row.get(field)
        view[field] = base.naive_utc(value) if field in moments and value is not None else value
    return view


async def read_source(base, source, collection):
    """Liest eine Sammlung vollständig in Ablagereihenfolge. Einziger Zugriff auf die Quelle: ``find``."""
    rows, digest = [], Digest()
    async for doc in source[collection].find({}):
        row_id, row, view = prepare(base, collection, doc)
        if row_id in digest.rows:
            raise Abort(f"{collection}: Kennung doppelt nach der Umsetzung")
        rows.append((row_id, row)); digest.add(row_id, view)
    return rows, digest


async def write_target(cur, collection, rows):
    """Schreibt fehlende und geänderte Zeilen; gibt (neu, geändert, unverändert) zurück."""
    inserted = updated = 0
    if collection in DOCUMENT_TABLES:
        if DOCUMENT_TABLES[collection] == "doc":
            sql = (f"insert into shop.{collection} as t (id, doc) values (%s, %s::json) on conflict (id) do update set doc = excluded.doc "
                   "where t.doc::text is distinct from excluded.doc::text returning (xmax = 0)")
        else:
            sql = f"insert into shop.{collection} (id, doc) values (%s, %s::json) on conflict (id) do nothing returning true"
        for row in rows:
            await cur.execute(sql, row)
            result = await cur.fetchone()
            inserted += bool(result and result[0]); updated += bool(result and not result[0])
        return inserted, updated, len(rows) - inserted - updated
    _, allowed, _, changeable = TYPED_TABLES[collection]
    columns = ", ".join(("id", *allowed))
    marks = ", ".join(["%s"] * (len(allowed) + 1))
    if changeable:
        changes = ", ".join(f"{c} = excluded.{c}" for c in allowed)
        differs = " or ".join(f"t.{c} is distinct from excluded.{c}" for c in allowed)
        sql = f"insert into shop.{collection} as t ({columns}) values ({marks}) on conflict (id) do update set {changes} where {differs} returning (xmax = 0)"
    else:
        sql = f"insert into shop.{collection} ({columns}) values ({marks}) on conflict (id) do nothing returning true"
    for row_id, row in rows:
        await cur.execute(sql, (row_id, *(row.get(c) for c in allowed)))
        result = await cur.fetchone()
        inserted += bool(result and result[0]); updated += bool(result and not result[0])
    return inserted, updated, len(rows) - inserted - updated


async def read_target(base, cur, collection):
    digest = Digest()
    if collection in DOCUMENT_TABLES:
        await cur.execute(f"select id, doc::text from shop.{collection} order by seq")
        for row_id, text in await cur.fetchall():
            digest.add(row_id, base.join(row_id, text))
        return digest
    _, allowed, _, _ = TYPED_TABLES[collection]
    await cur.execute(f"select id, {', '.join(allowed)} from shop.{collection} order by seq")
    for row_id, *values in await cur.fetchall():
        digest.add(row_id, typed_view(base, collection, row_id, dict(zip(allowed, values))))
    return digest


async def transfer(source, target_dsn, *, apply, log=print, collections=None):
    """Führt den Umzug aus. Gibt den Bericht je Sammlung zurück; wirft Abort, wenn etwas nicht übereinstimmt.

    ``source``: Datenbankobjekt, von dem nur ``source[name].find({})`` benutzt wird. ``target_dsn`` None: nur die Quelle prüfen.
    """
    base = load_base()
    wanted = list(collections or COLLECTIONS)
    unknown = [c for c in wanted if c not in COLLECTIONS]
    if unknown:
        raise Abort(f"unbekannte Sammlung: {unknown}")
    report, prepared = {}, {}
    for collection in wanted:
        rows, digest = await read_source(base, source, collection)
        prepared[collection] = rows
        report[collection] = {"source_count": digest.count, "source_digest": digest.value, "_digest": digest}
        log(json.dumps({"step": "source", "collection": collection, "count": digest.count, "digest": digest.value}))
    if target_dsn is None:
        return _finish(report, "source_report")
    import psycopg
    mismatches = []
    async with await psycopg.AsyncConnection.connect(target_dsn) as conn:
        try:
            async with conn.cursor() as cur:
                for collection in wanted:
                    try:
                        inserted, updated, unchanged = await write_target(cur, collection, prepared[collection])
                    except psycopg.Error as exc:
                        raise Abort(f"{collection}: das Ziel weist die Daten ab ({type(exc).__name__}, SQLSTATE {exc.sqlstate})") from None
                    target = await read_target(base, cur, collection)
                    entry = report[collection]
                    entry.update(target_count=target.count, target_digest=target.value, inserted=inserted, updated=updated, unchanged=unchanged)
                    entry["match"] = target.count == entry["source_count"] and target.value == entry["source_digest"]
                    log(json.dumps({"step": "target", "collection": collection, "count": target.count, "digest": target.value,
                                    "inserted": inserted, "updated": updated, "unchanged": unchanged, "match": entry["match"]}))
                    if not entry["match"]:
                        differing = entry["_digest"].difference(target)
                        mismatches.append(f"{collection}: Quelle {entry['source_count']} / Ziel {target.count}, abweichende Kennungen (höchstens 5): "
                                          f"{[str(k)[:40] for k in differing[:5]]}")
            if mismatches:
                raise Abort("Abweichung zwischen Quelle und Ziel; nichts festgeschrieben. " + " | ".join(mismatches))
            if apply:
                await conn.commit()
            else:
                await conn.rollback()
        except BaseException:
            await conn.rollback()
            raise
    return _finish(report, "applied" if apply else "dry_run")


def _finish(report, outcome):
    for entry in report.values():
        entry.pop("_digest", None)
    return {"outcome": outcome, "collections": report}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Shop-Daten von MongoDB nach PostgreSQL übertragen (Trockenlauf ist die Voreinstellung der Praxis: zuerst --dry-run).")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--source-report", action="store_true", help="nur die Quelle lesen, zählen und auf Übertragbarkeit prüfen")
    mode.add_argument("--dry-run", action="store_true", help="vollständig ausführen und vergleichen, am Ende verwerfen")
    mode.add_argument("--apply", action="store_true", help="bei vollständiger Gleichheit festschreiben")
    parser.add_argument("--collections", help="kommagetrennte Auswahl; ohne Angabe alle")
    parser.add_argument("--log", help="Datei für das Protokoll (JSON je Zeile); ohne Angabe nur die Standardausgabe")
    args = parser.parse_args(argv)
    needed = ["TRANSFER_SOURCE_MONGO_URL", "TRANSFER_SOURCE_DB_NAME"] + ([] if args.source_report else ["TRANSFER_TARGET_POSTGRES_DSN"])
    missing = [name for name in needed if not os.environ.get(name)]
    if missing:
        print("Konfiguration fehlt: " + ", ".join(missing), file=sys.stderr)
        return 3
    handle = open(args.log, "a", encoding="utf-8") if args.log else None

    def log(line):
        print(line)
        if handle:
            handle.write(line + "\n"); handle.flush()

    async def run():
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(os.environ["TRANSFER_SOURCE_MONGO_URL"], serverSelectionTimeoutMS=10000)
        try:
            return await transfer(client[os.environ["TRANSFER_SOURCE_DB_NAME"]], None if args.source_report else os.environ["TRANSFER_TARGET_POSTGRES_DSN"],
                                  apply=args.apply, log=log, collections=args.collections.split(",") if args.collections else None)
        finally:
            client.close()

    try:
        log(json.dumps({"step": "start", "mode": "source_report" if args.source_report else "apply" if args.apply else "dry_run",
                        "at": datetime.now(timezone.utc).isoformat()}))
        try:
            result = asyncio.run(run())
        except Abort as exc:
            log(json.dumps({"step": "abort", "reason": str(exc)}, ensure_ascii=False))
            return 2
        except Exception as exc:  # Treibertexte können Adressen enthalten; nur die Art nennen.
            log(json.dumps({"step": "abort", "reason": "Fehler der Art " + type(exc).__name__}))
            return 2
        log(json.dumps({"step": "done", "outcome": result["outcome"]}))
        return 0
    finally:
        if handle:
            handle.close()


if __name__ == "__main__":
    sys.exit(main())
