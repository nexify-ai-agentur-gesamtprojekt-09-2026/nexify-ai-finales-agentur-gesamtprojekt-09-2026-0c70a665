"""Bestellungen (MongoDB): ein unveränderlicher Auftrag je Eigentümer und Idempotenzschlüssel.

Zustandswechsel sind bedingte Einzelschritte ohne Transaktion: nach „bezahlt“ genau einmal
(``paid_transitions`` zählt mit), die Übergabe an den Lieferanten nur nach einer Übernahme
(``bigbuy_submitting``), „versendet“ nie aus „versendet“ oder „zugestellt“. Zeitpunkte gibt der
Aufrufer vor. Beträge, Positionen und Adresse schreibt nur ``add``; nichts hier rechnet oder ändert sie.
"""
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from .errors import AlreadyExists

PAID, OPEN, FAILED = "bezahlt", "zahlung_offen", "zahlung_nicht_abgeschlossen"
SHIPPED = "versendet"
DELIVERED = "zugestellt"


class MongoOrderStore:
    def __init__(self, db):
        self.db = db

    # Anlegen und Lesen --------------------------------------------------------------------
    async def add(self, order):
        """AlreadyExists, wenn der Eigentümer diesen Idempotenzschlüssel schon benutzt hat; die erste Bestellung bleibt."""
        try:
            await self.db.orders.insert_one(order)
        except DuplicateKeyError:
            raise AlreadyExists() from None

    async def get(self, order_id):
        return await self.db.orders.find_one({"_id": order_id})

    async def by_idempotency_key(self, owner, idempotency_key):
        return await self.db.orders.find_one({"owner": owner, "idempotency_key": idempotency_key})

    async def get_for_owners(self, order_id, owners):
        """Die Bestellung nur, wenn sie einem der genannten Eigentümer gehört."""
        return await self.db.orders.find_one({"_id": order_id, "owner": {"$in": owners}})

    async def by_provider_order_id(self, provider_order_id):
        return await self.db.orders.find_one({"revolut_order_id": provider_order_id})

    async def recent_of_owner(self, owner, limit):
        """Neueste zuerst nach ``created_at``."""
        return [o async for o in self.db.orders.find({"owner": owner}).sort("created_at", -1).limit(limit)]

    async def recent_without_lines(self, limit):
        """Alle Eigentümer, neueste zuerst, ohne die Positionen."""
        return [o async for o in self.db.orders.find({}, {"lines": 0}).sort("created_at", -1).limit(limit)]

    # Zahlung ------------------------------------------------------------------------------
    async def record_payment_error(self, order_id, code):
        await self.db.orders.update_one({"_id": order_id}, {"$set": {"payment_error": code}})

    async def record_checkout(self, order_id, provider_order_id, checkout_url, payment_state):
        """Hält die beim Zahlungsanbieter angelegte Zahlung fest und löscht einen früheren Fehler."""
        await self.db.orders.update_one({"_id": order_id}, {"$set": {"revolut_order_id": provider_order_id, "checkout_url": checkout_url, "payment_state": payment_state}, "$unset": {"payment_error":""}})

    async def record_payment_state(self, order_id, state):
        await self.db.orders.update_one({"_id": order_id}, {"$set": {"payment_state": state}})

    async def mark_paid(self, order_id, paid_at):
        """Der einmalige Übergang nach bezahlt. Wahr nur für den Aufruf, der ihn vollzogen hat.

        Setzt ``paid_at``, merkt die Bestätigungsmails als ausstehend vor und zählt ``paid_transitions`` um eins hoch.
        """
        return bool(await self.db.orders.find_one_and_update({"_id": order_id, "status": {"$ne": PAID}},
                                                             {"$set": {"status": PAID, "paid_at": paid_at, "paid_mail_recovery_pending": True}, "$inc": {"paid_transitions": 1}}))

    async def mark_payment_failed(self, order_id):
        """Nur eine offene Zahlung wird als nicht abgeschlossen vermerkt; eine bezahlte Bestellung bleibt bezahlt."""
        await self.db.orders.update_one({"_id": order_id, "status": OPEN}, {"$set": {"status": FAILED}})

    # Bestätigungsmails --------------------------------------------------------------------
    async def mark_paid_mails_recorded(self, order_id):
        """Beide Mailaufträge liegen im Postausgang; gilt nur für eine bezahlte Bestellung."""
        await self.db.orders.update_one({"_id": order_id, "status": PAID}, {"$set": {"paid_mail_intents_recorded": True, "paid_mail_recovery_pending": False}})

    async def paid_with_pending_mails(self):
        """Bezahlte Bestellungen, deren Mailaufträge noch nicht festgehalten sind; einzeln geliefert, nicht als Liste."""
        async for order in self.db.orders.find({"status": PAID, "paid_mail_recovery_pending": True}):
            yield order

    # Lieferant ----------------------------------------------------------------------------
    async def claim_supplier_submission(self, order_id, at):
        """Übernimmt die Übergabe an den Lieferanten. Wahr nur, wenn noch keine Lieferantenbestellung besteht und niemand sonst übergibt."""
        return bool(await self.db.orders.find_one_and_update(
            {"_id": order_id, "bigbuy_order_id": {"$in": [None, ""]}, "bigbuy_submitting": {"$ne": True}},
            {"$set": {"bigbuy_submitting": True, "fulfillment_checked_at": at}}))

    async def record_supplier_failure(self, order_id, code, at):
        """Gibt die Übernahme zurück und merkt die Übergabe zur Wiederholung vor."""
        await self.db.orders.update_one({"_id": order_id}, {"$set": {
            "fulfillment_error": code, "bigbuy_submit_pending": True, "bigbuy_submitting": False,
            "fulfillment_checked_at": at}})

    async def record_supplier_order(self, order_id, known_supplier_order_id, supplier_order_id, carrier, submitted_at, processing_at=None):
        """Hält die Lieferantenbestellung fest, sofern nicht inzwischen eine andere eingetragen ist.

        ``processing_at`` gesetzt: der Lieferstand wechselt zugleich nach „in_bearbeitung“.
        """
        update = {"bigbuy_order_id": supplier_order_id, "bigbuy_submitted_at": submitted_at, "bigbuy_submit_pending": False,
                  "fulfillment_error": None, "bigbuy_carrier": carrier, "bigbuy_submitting": False}
        if processing_at is not None:
            update["fulfilment"] = "in_bearbeitung"
            update["processing_at"] = processing_at
        await self.db.orders.update_one({"_id": order_id, "bigbuy_order_id": {"$in": [None, "", known_supplier_order_id]}},
                                        {"$set": update})

    async def change_delivery_state(self, order_id, expected_state, changes):
        """Schreibt die Felder des neuen Lieferstands, wenn der gespeicherte noch ``expected_state`` ist (None = noch keiner).

        Gibt die Bestellung nach der Änderung zurück, sonst None; dann hat sich nichts geändert.
        """
        return await self.db.orders.find_one_and_update({"_id": order_id, "fulfilment": expected_state}, {"$set": changes}, return_document=ReturnDocument.AFTER)

    async def mark_shipped(self, order_id, tracking_number, carrier, shipped_at):
        """Der einmalige Übergang nach versendet; nie zurück aus versendet oder zugestellt. Wahr, wenn er stattfand."""
        return bool(await self.db.orders.find_one_and_update(
            {"_id": order_id, "fulfilment": {"$nin": [SHIPPED, DELIVERED]}},
            {"$set": {"fulfilment": SHIPPED, "tracking_number": tracking_number,
                      "carrier": carrier, "shipped_at": shipped_at}}))
