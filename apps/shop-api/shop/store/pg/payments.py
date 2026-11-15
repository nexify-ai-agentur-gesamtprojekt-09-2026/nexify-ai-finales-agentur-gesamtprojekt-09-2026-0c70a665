"""Zahlungsanbieter (PostgreSQL): die Webhook-Anmeldung je Betriebsart und die empfangenen Ereignisse.

Die Anmeldung enthält das Signaturgeheimnis des Anbieters. Es wird hier nur gespeichert und an
die Signaturprüfung zurückgegeben, nie protokolliert und nie in Fehlertexte übernommen.
"""
import psycopg

from ..errors import AlreadyExists
from . import base


class PgPaymentStore:
    def __init__(self, db):
        self.db = db

    async def webhook_registration(self, mode):
        if not base.text_id(mode):
            return None
        async with self.db.cursor() as cur:
            return await base.fetch_one(cur, "revolut_webhooks", mode)

    async def has_webhook_registration(self, mode):
        """Ohne das Signaturgeheimnis zu lesen."""
        async with self.db.cursor() as cur:
            await cur.execute("select 1 from shop.revolut_webhooks where id = %s", (mode,))
            return bool(await cur.fetchone())

    async def save_webhook_registration(self, mode, registration):
        """Genau eine Anmeldung je Betriebsart; eine vorhandene wird vollständig ersetzt."""
        body = base.encode({k: v for k, v in registration.items() if k != "_id"})
        async with self.db.cursor() as cur:
            await cur.execute("insert into shop.revolut_webhooks (id, doc) values (%s, %s::json) on conflict (id) do update set doc = excluded.doc", (mode, body))

    async def webhook_registrations(self):
        async with self.db.cursor() as cur:
            return await base.fetch_all(cur, "revolut_webhooks")

    async def record_webhook_event(self, event_key, event, order_id, received_at):
        """AlreadyExists, wenn dieses Ereignis (Schlüssel = Hash des Inhalts) schon empfangen wurde."""
        try:
            async with self.db.cursor() as cur:
                await cur.execute("insert into shop.webhook_events (id, event_key, event, order_id, received_at) values (%s, %s, %s, %s, %s)",
                                  (base.new_id(), event_key, event, order_id, received_at))
        except psycopg.errors.UniqueViolation:
            raise AlreadyExists() from None

    async def webhook_events(self):
        """Empfangene Ereignisse in Eingangsfolge; für Prüfung und Datenumzug."""
        async with self.db.cursor() as cur:
            await cur.execute("select id, event_key, event, order_id, received_at from shop.webhook_events order by seq")
            return [{"_id": r[0], "event_key": r[1], "event": r[2], "order_id": r[3], "received_at": r[4]} for r in await cur.fetchall()]
