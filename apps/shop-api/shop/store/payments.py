"""Zahlungsanbieter (MongoDB): die Webhook-Anmeldung je Betriebsart und die empfangenen Ereignisse.

Die Anmeldung enthält das Signaturgeheimnis des Anbieters. Es wird hier nur gespeichert und an
die Signaturprüfung zurückgegeben, nie protokolliert und nie in Fehlertexte übernommen.
"""
from pymongo.errors import DuplicateKeyError

from .errors import AlreadyExists


class MongoPaymentStore:
    def __init__(self, db):
        self.db = db

    async def webhook_registration(self, mode):
        return await self.db.revolut_webhooks.find_one({"_id": mode})

    async def save_webhook_registration(self, mode, registration):
        """Genau eine Anmeldung je Betriebsart; eine vorhandene wird vollständig ersetzt."""
        await self.db.revolut_webhooks.replace_one({"_id": mode}, registration, upsert=True)

    async def webhook_registrations(self):
        return [h async for h in self.db.revolut_webhooks.find({})]

    async def record_webhook_event(self, event_key, event, order_id, received_at):
        """AlreadyExists, wenn dieses Ereignis (Schlüssel = Hash des Inhalts) schon empfangen wurde."""
        try:
            await self.db.webhook_events.insert_one({"event_key": event_key, "event": event, "order_id": order_id, "received_at": received_at})
        except DuplicateKeyError:
            raise AlreadyExists() from None
