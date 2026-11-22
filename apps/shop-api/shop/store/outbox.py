"""Postausgang (MongoDB): ein Auftrag je Ereignisschlüssel, Zustandsübergänge nur bedingt.

Zustände: wartend -> wird_vorbereitet -> wird_gesendet -> gesendet; daneben zurückgestellt,
fehlgeschlagen und abgleich_erforderlich. Ein Auftrag gehört während der Zustellung dem Arbeiter,
dessen ``claim_id`` darin steht; jeder Übergang prüft Zustand und Besitzer, ein verdrängter
Arbeiter ändert nichts mehr. Zeitpunkte gibt der Aufrufer vor (UTC als ISO-Text). Diese Schicht
versendet nichts und schreibt weder Empfänger noch Inhalte in Protokolle.
"""
from pymongo.errors import DuplicateKeyError

from .errors import AlreadyExists

# now_iso() schreibt UTC als Text; nur diese Form lässt sich als Text sicher ordnen.
UTC_ISO = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?\+00:00$"
WITHOUT_BODY = {"html": 0, "text": 0}


class MongoOutboxStore:
    def __init__(self, db):
        self.db = db

    async def add(self, event_key, to, subject, html, text, reply_to, created_at):
        """Legt den Auftrag wartend an. AlreadyExists, wenn es den Schlüssel schon gibt; der vorhandene bleibt unverändert."""
        try:
            await self.db.outbox.insert_one({"_id": event_key, "to": to, "subject": subject, "html": html, "text": text, "reply_to": reply_to,
                                             "status": "wartend", "attempts": 0, "created_at": created_at})
        except DuplicateKeyError:
            raise AlreadyExists() from None

    async def summary(self, event_key):
        """Der Auftrag ohne Inhalt (html, text); None, wenn es ihn nicht gibt."""
        return await self.db.outbox.find_one({"_id": event_key}, WITHOUT_BODY)

    async def get(self, event_key):
        return await self.db.outbox.find_one({"_id": event_key})

    async def recent_summaries(self, limit):
        """Neueste zuerst nach ``created_at``, ohne Inhalt."""
        return [m async for m in self.db.outbox.find({}, WITHOUT_BODY).sort("created_at", -1).limit(limit)]

    async def order_mails(self, order_id):
        """Stand, Betreff und Versuche der Bestätigungs- und Statusmails einer Bestellung (Schlüssel ``order_paid:…`` und ``order_status:…``)."""
        return [m async for m in self.db.outbox.find({"_id": {"$regex": "^order_(paid|status):[a-z:_]*" + order_id}}, {"status": 1, "subject": 1, "attempts": 1})]

    async def claim(self, event_key, claim_id, at, max_attempts):
        """Nimmt einen zustellbaren Auftrag in Vorbereitung und gibt ihn mit Inhalt zurück; None, wenn er nicht zustellbar ist.

        Zustellbar: wartend, zurückgestellt oder fehlgeschlagen mit ``retry_safe``, und weniger als ``max_attempts`` Versuche.
        """
        return await self.db.outbox.find_one_and_update({"_id": event_key, "$or": [{"status": {"$in": ["wartend", "zurückgestellt"]}}, {"status": "fehlgeschlagen", "retry_safe": True}], "attempts": {"$lt": max_attempts}},
                                                        {"$set": {"status": "wird_vorbereitet", "claimed_at": at, "claim_id": claim_id}})

    async def count_sent_since(self, since):
        """Gesendete Aufträge mit ``sent_at`` ab ``since`` (Textvergleich, Grenze einschließlich)."""
        return await self.db.outbox.count_documents({"status": "gesendet", "sent_at": {"$gte": since}})

    async def start_sending(self, event_key, claim_id, at):
        """Vorbereitung -> Sendung, nur für den Besitzer. Wahr, wenn der Übergang stattfand."""
        return bool(await self.db.outbox.find_one_and_update(
            {"_id": event_key, "status": "wird_vorbereitet", "claim_id": claim_id},
            {"$set": {"status": "wird_gesendet", "claimed_at": at}}))

    async def mark_sent(self, event_key, claim_id, sent_at, provider_id):
        """Sendung -> gesendet, nur für den Besitzer; zählt den Versuch."""
        await self.db.outbox.update_one({"_id": event_key, "status": "wird_gesendet", "claim_id": claim_id}, {"$set": {"status": "gesendet", "sent_at": sent_at, "provider_id": provider_id}, "$inc": {"attempts": 1}})

    async def finish(self, event_key, claim_id, status, error, at, *, count_attempt, retry_safe):
        """Beendet einen eigenen Versuch (in Vorbereitung oder Sendung) ohne Erfolg mit ``status`` und Fehlerkennung."""
        update = {"$set": {"status": status, "last_error": error, "updated_at": at, "retry_safe": retry_safe}}
        if count_attempt:
            update["$inc"] = {"attempts": 1}
        await self.db.outbox.update_one({"_id": event_key, "claim_id": claim_id, "status": {"$in": ["wird_vorbereitet", "wird_gesendet"]}}, update)

    async def quarantine_unverifiable_claims(self):
        """Laufende Aufträge, deren Übernahmezeit nicht in der geschriebenen UTC-Form vorliegt: Abgleich erforderlich."""
        await self.db.outbox.update_many({"status": {"$in": ["wird_vorbereitet", "wird_gesendet"]}, "claimed_at": {"$not": {"$regex": UTC_ISO}}},
                                         {"$set": {"status": "abgleich_erforderlich", "last_error": "claim_time_unverifiable"}})

    async def release_stale_preparations(self, cutoff):
        """Vorbereitungen vor ``cutoff`` haben den Anbieter nicht erreicht: wieder wartend; das verdrängt den alten Besitzer."""
        await self.db.outbox.update_many({"status": "wird_vorbereitet", "claimed_at": {"$lt": cutoff}},
                                         {"$set": {"status": "wartend", "last_error": "preparation_lease_expired"}})

    async def quarantine_stale_sendings(self, cutoff):
        """Sendungen vor ``cutoff`` oder ohne Übernahmezeit können schon zugestellt sein: Abgleich erforderlich."""
        await self.db.outbox.update_many({"status": "wird_gesendet", "$or": [{"claimed_at": {"$lt": cutoff}}, {"claimed_at": {"$exists": False}}]},
                                         {"$set": {"status": "abgleich_erforderlich", "last_error": "delivery_outcome_unknown"}})

    async def deliverable_keys(self, max_attempts, limit):
        return [d["_id"] async for d in self.db.outbox.find({"$or": [{"status": {"$in": ["zurückgestellt", "wartend"]}}, {"status": "fehlgeschlagen", "retry_safe": True}], "attempts": {"$lt": max_attempts}}, {"_id": 1}).limit(limit)]

    async def record_provider_event(self, event_key, event, checked_at):
        await self.db.outbox.update_one({"_id": event_key}, {"$set": {"provider_event": event, "checked_at": checked_at}})
