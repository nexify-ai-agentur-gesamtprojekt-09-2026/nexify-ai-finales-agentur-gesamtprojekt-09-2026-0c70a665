"""Postausgang (PostgreSQL): ein Auftrag je Ereignisschlüssel, Zustandsübergänge nur bedingt.

Zustände: wartend -> wird_vorbereitet -> wird_gesendet -> gesendet; daneben zurückgestellt,
fehlgeschlagen und abgleich_erforderlich. Ein Auftrag gehört während der Zustellung dem Arbeiter,
dessen ``claim_id`` darin steht; jeder Übergang prüft Zustand und Besitzer, ein verdrängter
Arbeiter ändert nichts mehr. Zeitpunkte gibt der Aufrufer vor (UTC als ISO-Text). Diese Schicht
versendet nichts und schreibt weder Empfänger noch Inhalte in Protokolle.
"""
import re

import psycopg

from ..errors import AlreadyExists
from . import base

# now_iso() schreibt UTC als Text; nur diese Form lässt sich als Text sicher ordnen.
UTC_ISO = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?\+00:00$")
WITHOUT_BODY = ("html", "text")
RUNNING = ("wird_vorbereitet", "wird_gesendet")
DELIVERABLE = "(status in ('wartend', 'zurückgestellt') or (status = 'fehlgeschlagen' and retry_safe)) and attempts < %s"


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def deliverable(doc, max_attempts):
    state = doc.get("status")
    return (state in ("wartend", "zurückgestellt") or (state == "fehlgeschlagen" and doc.get("retry_safe") is True)) \
        and number(doc.get("attempts")) and doc["attempts"] < max_attempts


def before(doc, key, cutoff):
    return isinstance(doc.get(key), str) and doc[key] < cutoff


class PgOutboxStore:
    def __init__(self, db):
        self.db = db

    async def add(self, event_key, to, subject, html, text, reply_to, created_at):
        """Legt den Auftrag wartend an. AlreadyExists, wenn es den Schlüssel schon gibt; der vorhandene bleibt unverändert."""
        try:
            async with self.db.cursor() as cur:
                await base.insert(cur, "outbox", {"_id": event_key, "to": to, "subject": subject, "html": html, "text": text, "reply_to": reply_to,
                                                  "status": "wartend", "attempts": 0, "created_at": created_at})
        except psycopg.errors.UniqueViolation:
            raise AlreadyExists() from None

    async def summary(self, event_key):
        """Der Auftrag ohne Inhalt (html, text); None, wenn es ihn nicht gibt."""
        entry = await self.get(event_key)
        return base.project(entry, without=WITHOUT_BODY) if entry else None

    async def get(self, event_key):
        if not base.text_id(event_key):
            return None
        async with self.db.cursor() as cur:
            return await base.fetch_one(cur, "outbox", event_key)

    async def recent_summaries(self, limit):
        """Neueste zuerst nach ``created_at``, ohne Inhalt."""
        async with self.db.cursor() as cur:
            rows = await base.fetch_all(cur, "outbox", order="created_at desc nulls last, seq", limit=limit)
        return [base.project(row, without=WITHOUT_BODY) for row in rows]

    async def order_mails(self, order_id):
        """Stand, Betreff und Versuche der Bestätigungs- und Statusmails einer Bestellung (Schlüssel ``order_paid:…`` und ``order_status:…``)."""
        pattern = re.compile("^order_(paid|status):[a-z:_]*" + order_id)
        async with self.db.cursor() as cur:
            rows = await base.fetch_all(cur, "outbox", "id like 'order\\_%%'")
        return [base.project(row, only=("status", "subject", "attempts")) for row in rows if pattern.search(row["_id"])]

    async def claim(self, event_key, claim_id, at, max_attempts):
        """Nimmt einen zustellbaren Auftrag in Vorbereitung und gibt ihn mit Inhalt zurück; None, wenn er nicht zustellbar ist.

        Zustellbar: wartend, zurückgestellt oder fehlgeschlagen mit ``retry_safe``, und weniger als ``max_attempts`` Versuche.
        """
        async with self.db.cursor() as cur:
            done = await base.compare_and_change(cur, "outbox", event_key, lambda doc: deliverable(doc, max_attempts),
                                                 lambda doc: base.change(doc, set={"status": "wird_vorbereitet", "claimed_at": at, "claim_id": claim_id}))
        return done[0] if done else None

    async def count_sent_since(self, since):
        """Gesendete Aufträge mit ``sent_at`` ab ``since`` (Textvergleich, Grenze einschließlich)."""
        async with self.db.cursor() as cur:
            await cur.execute("select count(*) from outbox where status = 'gesendet' and sent_at >= %s", (since,))
            return (await cur.fetchone())[0]

    async def start_sending(self, event_key, claim_id, at):
        """Vorbereitung -> Sendung, nur für den Besitzer. Wahr, wenn der Übergang stattfand."""
        async with self.db.cursor() as cur:
            return bool(await base.compare_and_change(cur, "outbox", event_key,
                lambda doc: doc.get("status") == "wird_vorbereitet" and doc.get("claim_id") == claim_id,
                lambda doc: base.change(doc, set={"status": "wird_gesendet", "claimed_at": at})))

    async def mark_sent(self, event_key, claim_id, sent_at, provider_id):
        """Sendung -> gesendet, nur für den Besitzer; zählt den Versuch."""
        async with self.db.cursor() as cur:
            await base.compare_and_change(cur, "outbox", event_key,
                lambda doc: doc.get("status") == "wird_gesendet" and doc.get("claim_id") == claim_id,
                lambda doc: base.change(doc, set={"status": "gesendet", "sent_at": sent_at, "provider_id": provider_id}, inc={"attempts": 1}))

    async def finish(self, event_key, claim_id, status, error, at, *, count_attempt, retry_safe):
        """Beendet einen eigenen Versuch (in Vorbereitung oder Sendung) ohne Erfolg mit ``status`` und Fehlerkennung."""
        async with self.db.cursor() as cur:
            await base.compare_and_change(cur, "outbox", event_key,
                lambda doc: doc.get("status") in RUNNING and doc.get("claim_id") == claim_id,
                lambda doc: base.change(doc, set={"status": status, "last_error": error, "updated_at": at, "retry_safe": retry_safe},
                                        inc={"attempts": 1} if count_attempt else None))

    async def _change_running(self, where, params, condition, changes):
        """Ändert alle laufenden Aufträge, auf die ``condition`` am gesperrten Stand zutrifft."""
        async with self.db.cursor() as cur:
            for entry in await base.fetch_all(cur, "outbox", where, params, lock=True):
                if condition(entry):
                    await base.write(cur, "outbox", base.change(entry, set=changes))

    async def quarantine_unverifiable_claims(self):
        """Laufende Aufträge, deren Übernahmezeit nicht in der geschriebenen UTC-Form vorliegt: Abgleich erforderlich."""
        await self._change_running("status in ('wird_vorbereitet', 'wird_gesendet')", [],
            lambda doc: doc.get("status") in RUNNING and not (isinstance(doc.get("claimed_at"), str) and UTC_ISO.search(doc["claimed_at"])),
            {"status": "abgleich_erforderlich", "last_error": "claim_time_unverifiable"})

    async def release_stale_preparations(self, cutoff):
        """Vorbereitungen vor ``cutoff`` haben den Anbieter nicht erreicht: wieder wartend; das verdrängt den alten Besitzer."""
        await self._change_running("status = 'wird_vorbereitet' and claimed_at < %s", [cutoff],
            lambda doc: doc.get("status") == "wird_vorbereitet" and before(doc, "claimed_at", cutoff),
            {"status": "wartend", "last_error": "preparation_lease_expired"})

    async def quarantine_stale_sendings(self, cutoff):
        """Sendungen vor ``cutoff`` oder ohne Übernahmezeit können schon zugestellt sein: Abgleich erforderlich."""
        await self._change_running("status = 'wird_gesendet' and (claimed_at < %s or not has_claimed_at)", [cutoff],
            lambda doc: doc.get("status") == "wird_gesendet" and (before(doc, "claimed_at", cutoff) or "claimed_at" not in doc),
            {"status": "abgleich_erforderlich", "last_error": "delivery_outcome_unknown"})

    async def deliverable_keys(self, max_attempts, limit):
        async with self.db.cursor() as cur:
            await cur.execute(f"select id from outbox where {DELIVERABLE} order by seq limit %s", (max_attempts, limit))
            return [row[0] for row in await cur.fetchall()]

    async def record_provider_event(self, event_key, event, checked_at):
        async with self.db.cursor() as cur:
            await base.compare_and_change(cur, "outbox", event_key, lambda doc: True,
                                          lambda doc: base.change(doc, set={"provider_event": event, "checked_at": checked_at}))
