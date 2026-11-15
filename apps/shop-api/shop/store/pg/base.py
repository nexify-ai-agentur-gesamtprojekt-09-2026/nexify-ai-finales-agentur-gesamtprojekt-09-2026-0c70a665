"""Gemeinsame Grundlage der PostgreSQL-Umsetzung: Verbindung, Dokumentform, bedingtes Ändern.

Eine Zeile trägt das Dokument als JSON-Text in genau der Feldfolge, in der MongoDB es führen
würde: ``_id`` steht in der Spalte ``id`` und beim Lesen wieder vorn; ein geändertes Feld behält
seinen Platz, neue Felder kommen in alphabetischer Folge ans Ende (so verarbeitet MongoDB ab
5.0 die Änderungsoperatoren). Bedingte Änderungen sperren die Zeile (``for update``), prüfen
die Bedingung am aktuellen Stand und schreiben dann: Von mehreren gleichzeitigen Aufrufen
gewinnt genau einer. Treibertext und Verbindungsdaten verlassen diese Schicht nicht.
"""
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
from uuid import uuid4

from ..errors import StoreUnavailable, StoredDataInvalid

SCHEMA = "shop"
MAX_DOCUMENT_BYTES = 16 * 1024 * 1024 - 1024  # dieselbe Schutzgrenze wie in der MongoDB-Umsetzung


def _default(value):
    if isinstance(value, datetime):
        moment = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return {"$date": to_ms(moment).astimezone(timezone.utc).isoformat()}
    if type(value).__name__ == "ObjectId":
        return {"$oid": str(value)}
    raise TypeError("not storable")


def _hook(obj):
    if len(obj) == 1:
        if "$date" in obj and isinstance(obj["$date"], str):
            return datetime.fromisoformat(obj["$date"]).astimezone(timezone.utc).replace(tzinfo=None)
        if "$oid" in obj and isinstance(obj["$oid"], str):
            return obj["$oid"]
    return obj


def encode(doc):
    """Dokument als JSON-Text. StoredDataInvalid, wenn es sich so nicht ablegen lässt."""
    try:
        text = json.dumps(doc, default=_default, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    except (TypeError, ValueError, RecursionError):
        raise StoredDataInvalid() from None
    if "\\u0000" in text:
        raise StoredDataInvalid()
    return text


def decode(text):
    return json.loads(text, object_hook=_hook)


def to_ms(moment):
    """Zeitpunkte auf Millisekunden kürzen, wie MongoDB sie speichert."""
    return moment.replace(microsecond=moment.microsecond // 1000 * 1000)


def aware(moment):
    return to_ms(moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc))


def naive_utc(moment):
    """So gibt der bisherige Treiber Zeitpunkte zurück: UTC ohne Zeitzone."""
    return moment.astimezone(timezone.utc).replace(tzinfo=None)


def new_id():
    return uuid4().hex


def split(doc):
    """(Kennung, Dokument ohne ``_id``). Fehlt ``_id``, entsteht eine und wird wie bisher in das übergebene Dokument eingetragen."""
    if "_id" not in doc:
        doc["_id"] = new_id()
    return doc["_id"], {k: v for k, v in doc.items() if k != "_id"}


def join(row_id, text):
    return {"_id": row_id, **decode(text)}


def change(doc, set=None, unset=(), inc=None, push=None):
    """Wendet Änderungen an: vorhandene Felder am Platz, neue in alphabetischer Folge am Ende."""
    set, inc, push = set or {}, inc or {}, push or {}
    for key in unset:
        doc.pop(key, None)
    for key in sorted({*set, *inc, *push}):
        if key in set:
            doc[key] = set[key]
        elif key in inc:
            doc[key] = doc.get(key, 0) + inc[key]
        else:
            doc[key] = [*doc.get(key, []), push[key]]
    return doc


def project(doc, only=None, without=()):
    """Auswahl von Feldern in der Folge des Dokuments; ``_id`` bleibt, wenn es nicht ausgeschlossen ist."""
    if only is not None:
        return {k: v for k, v in doc.items() if k == "_id" or k in only}
    return {k: v for k, v in doc.items() if k not in without}


class PgDatabase:
    """Verbindungsvorrat zu einer PostgreSQL-Datenbank mit dem Schema ``shop``. Öffnet erst beim ersten Zugriff."""

    def __init__(self, conninfo, *, max_size=4, timeout=10.0):
        self._conninfo, self._max_size, self._timeout = conninfo, max_size, timeout
        self._pool, self._lock = None, None

    async def _open(self):
        if self._pool is not None:
            return self._pool
        if self._lock is None:
            self._lock = asyncio.Lock()
        async with self._lock:
            if self._pool is None:
                try:
                    from psycopg_pool import AsyncConnectionPool
                    pool = AsyncConnectionPool(self._conninfo, min_size=0, max_size=self._max_size, timeout=self._timeout, open=False,
                                               kwargs={"options": "-c search_path=%s -c statement_timeout=15000 -c lock_timeout=10000" % SCHEMA})
                    await pool.open()
                except Exception:
                    raise StoreUnavailable() from None
                self._pool = pool
        return self._pool

    async def close(self):
        if self._pool is not None:
            pool, self._pool = self._pool, None
            await pool.close()

    @asynccontextmanager
    async def cursor(self, tx=None):
        """Ein Cursor in einer Transaktion: der übergebenen (``tx``) oder einer eigenen, die hier endet."""
        import psycopg
        failure = None
        try:
            if tx is not None:
                async with tx.cursor() as cur:
                    yield cur
                return
            pool = await self._open()
            async with pool.connection() as conn:
                async with conn.cursor() as cur:
                    yield cur
        except (psycopg.errors.UniqueViolation, psycopg.errors.SerializationFailure, psycopg.errors.DeadlockDetected):
            raise  # der Aufrufer in dieser Schicht übersetzt sie
        except (psycopg.errors.DataError, psycopg.errors.CheckViolation, psycopg.errors.NotNullViolation):
            failure = StoredDataInvalid()
        except psycopg.Error:
            failure = StoreUnavailable()
        except TimeoutError:
            failure = StoreUnavailable()
        if failure is not None:
            raise failure from None

    @asynccontextmanager
    async def transaction(self):
        """Eine Verbindung mit festem Lesestand (repeatable read) für mehrere Schritte; Abschluss beim Verlassen."""
        import psycopg
        pool = await self._open()
        async with pool.connection() as conn:
            await conn.set_isolation_level(psycopg.IsolationLevel.REPEATABLE_READ)
            try:
                yield conn
                await conn.commit()
            except BaseException:
                await conn.rollback()
                raise
            finally:
                await conn.set_isolation_level(None)


# --- Bausteine über Dokumenttabellen -----------------------------------------------------
async def fetch_one(cur, table, row_id):
    await cur.execute(f"select id, doc::text from {table} where id = %s", (row_id,))
    row = await cur.fetchone()
    return join(*row) if row else None


async def fetch_all(cur, table, where="true", params=(), order="seq", limit=None, offset=None, lock=False):
    sql = f"select id, doc::text from {table} where {where} order by {order}"
    params = list(params)
    if limit is not None:
        sql += " limit %s"; params.append(limit)
    if offset:
        sql += " offset %s"; params.append(offset)
    if lock:
        sql += " for update"
    await cur.execute(sql, params)
    return [join(*row) for row in await cur.fetchall()]


async def insert(cur, table, doc):
    """Legt das Dokument an; ein vergebener Schlüssel kommt als ``UniqueViolation`` des Treibers zurück."""
    row_id, body = split(doc)
    await cur.execute(f"insert into {table} (id, doc) values (%s, %s::json)", (row_id, encode(body)))
    return row_id


async def write(cur, table, doc):
    row_id, body = split(doc)
    await cur.execute(f"update {table} set doc = %s::json where id = %s", (encode(body), row_id))


async def compare_and_change(cur, table, row_id, condition, mutate):
    """Sperrt die Zeile, prüft ``condition`` am aktuellen Dokument und schreibt ``mutate(doc)``.

    Gibt (vorher, nachher) zurück oder None, wenn es die Zeile nicht gibt oder die Bedingung nicht gilt.
    """
    await cur.execute(f"select id, doc::text from {table} where id = %s for update", (row_id,))
    row = await cur.fetchone()
    if row is None:
        return None
    before = join(*row)
    if not condition(before):
        return None
    after = mutate(join(*row))
    await write(cur, table, after)
    return before, after


def text_id(value):
    """Kennungen sind Text; anderes passt wie bisher auf keine Zeile."""
    return isinstance(value, str)
