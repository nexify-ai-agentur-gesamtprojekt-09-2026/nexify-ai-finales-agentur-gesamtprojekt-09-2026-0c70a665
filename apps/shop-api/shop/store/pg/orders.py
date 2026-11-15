"""Bestellungen (PostgreSQL): ein unveränderlicher Auftrag je Eigentümer und Idempotenzschlüssel.

Zustandswechsel sind bedingte Einzelschritte: nach „bezahlt“ genau einmal (``paid_transitions``
zählt mit, die Datenbank lässt höchstens 1 zu), die Übergabe an den Lieferanten nur nach einer
Übernahme (``bigbuy_submitting``), „versendet“ nie aus „versendet“ oder „zugestellt“. Zeitpunkte
gibt der Aufrufer vor. Beträge, Positionen und Adresse schreibt nur ``add``; nichts hier rechnet
oder ändert sie. Beträge sind ganze Cent; anderes weist die Datenbank ab (StoredDataInvalid).
"""
import psycopg

from ..errors import AlreadyExists
from . import base

PAID, OPEN, FAILED = "bezahlt", "zahlung_offen", "zahlung_nicht_abgeschlossen"
SHIPPED = "versendet"
DELIVERED = "zugestellt"


class PgOrderStore:
    def __init__(self, db):
        self.db = db

    async def _first(self, where, params):
        async with self.db.cursor() as cur:
            rows = await base.fetch_all(cur, "orders", where, params, limit=1)
        return rows[0] if rows else None

    async def _change(self, order_id, condition, mutate):
        if not base.text_id(order_id):
            return None
        async with self.db.cursor() as cur:
            return await base.compare_and_change(cur, "orders", order_id, condition, mutate)

    # Anlegen und Lesen --------------------------------------------------------------------
    async def add(self, order):
        """AlreadyExists, wenn der Eigentümer diesen Idempotenzschlüssel schon benutzt hat; die erste Bestellung bleibt."""
        try:
            async with self.db.cursor() as cur:
                await base.insert(cur, "orders", order)
        except psycopg.errors.UniqueViolation:
            raise AlreadyExists() from None

    async def get(self, order_id):
        if not base.text_id(order_id):
            return None
        async with self.db.cursor() as cur:
            return await base.fetch_one(cur, "orders", order_id)

    async def by_idempotency_key(self, owner, idempotency_key):
        return await self._first("owner = %s and idempotency_key = %s", [owner, idempotency_key])

    async def get_for_owners(self, order_id, owners):
        """Die Bestellung nur, wenn sie einem der genannten Eigentümer gehört."""
        return await self._first("id = %s and owner = any(%s)", [order_id, [o for o in owners if isinstance(o, str)]])

    async def by_provider_order_id(self, provider_order_id):
        return await self._first("revolut_order_id = %s", [provider_order_id])

    async def recent_of_owner(self, owner, limit):
        """Neueste zuerst nach ``created_at``."""
        async with self.db.cursor() as cur:
            return await base.fetch_all(cur, "orders", "owner = %s", [owner], order="created_at desc nulls last, seq", limit=limit)

    async def recent_without_lines(self, limit):
        """Alle Eigentümer, neueste zuerst, ohne die Positionen."""
        async with self.db.cursor() as cur:
            rows = await base.fetch_all(cur, "orders", order="created_at desc nulls last, seq", limit=limit)
        return [base.project(row, without=("lines",)) for row in rows]

    # Zahlung ------------------------------------------------------------------------------
    async def record_payment_error(self, order_id, code):
        await self._change(order_id, lambda doc: True, lambda doc: base.change(doc, set={"payment_error": code}))

    async def record_checkout(self, order_id, provider_order_id, checkout_url, payment_state):
        """Hält die beim Zahlungsanbieter angelegte Zahlung fest und löscht einen früheren Fehler."""
        await self._change(order_id, lambda doc: True, lambda doc: base.change(
            doc, set={"revolut_order_id": provider_order_id, "checkout_url": checkout_url, "payment_state": payment_state}, unset=("payment_error",)))

    async def record_payment_state(self, order_id, state):
        await self._change(order_id, lambda doc: True, lambda doc: base.change(doc, set={"payment_state": state}))

    async def mark_paid(self, order_id, paid_at):
        """Der einmalige Übergang nach bezahlt. Wahr nur für den Aufruf, der ihn vollzogen hat.

        Setzt ``paid_at``, merkt die Bestätigungsmails als ausstehend vor und zählt ``paid_transitions`` um eins hoch.
        """
        return bool(await self._change(order_id, lambda doc: doc.get("status") != PAID, lambda doc: base.change(
            doc, set={"status": PAID, "paid_at": paid_at, "paid_mail_recovery_pending": True}, inc={"paid_transitions": 1})))

    async def mark_payment_failed(self, order_id):
        """Nur eine offene Zahlung wird als nicht abgeschlossen vermerkt; eine bezahlte Bestellung bleibt bezahlt."""
        await self._change(order_id, lambda doc: doc.get("status") == OPEN, lambda doc: base.change(doc, set={"status": FAILED}))

    # Bestätigungsmails --------------------------------------------------------------------
    async def mark_paid_mails_recorded(self, order_id):
        """Beide Mailaufträge liegen im Postausgang; gilt nur für eine bezahlte Bestellung."""
        await self._change(order_id, lambda doc: doc.get("status") == PAID, lambda doc: base.change(
            doc, set={"paid_mail_intents_recorded": True, "paid_mail_recovery_pending": False}))

    async def paid_with_pending_mails(self):
        """Bezahlte Bestellungen, deren Mailaufträge noch nicht festgehalten sind; einzeln geliefert, nicht als Liste."""
        async with self.db.cursor() as cur:
            rows = await base.fetch_all(cur, "orders", "status = 'bezahlt' and paid_mail_recovery_pending")
        for order in rows:
            yield order

    # Lieferant ----------------------------------------------------------------------------
    async def claim_supplier_submission(self, order_id, at):
        """Übernimmt die Übergabe an den Lieferanten. Wahr nur, wenn noch keine Lieferantenbestellung besteht und niemand sonst übergibt."""
        return bool(await self._change(order_id,
            lambda doc: doc.get("bigbuy_order_id") in (None, "") and doc.get("bigbuy_submitting") is not True,
            lambda doc: base.change(doc, set={"bigbuy_submitting": True, "fulfillment_checked_at": at})))

    async def record_supplier_failure(self, order_id, code, at):
        """Gibt die Übernahme zurück und merkt die Übergabe zur Wiederholung vor."""
        await self._change(order_id, lambda doc: True, lambda doc: base.change(doc, set={
            "fulfillment_error": code, "bigbuy_submit_pending": True, "bigbuy_submitting": False, "fulfillment_checked_at": at}))

    async def record_supplier_order(self, order_id, known_supplier_order_id, supplier_order_id, carrier, submitted_at, processing_at=None):
        """Hält die Lieferantenbestellung fest, sofern nicht inzwischen eine andere eingetragen ist.

        ``processing_at`` gesetzt: der Lieferstand wechselt zugleich nach „in_bearbeitung“.
        """
        update = {"bigbuy_order_id": supplier_order_id, "bigbuy_submitted_at": submitted_at, "bigbuy_submit_pending": False,
                  "fulfillment_error": None, "bigbuy_carrier": carrier, "bigbuy_submitting": False}
        if processing_at is not None:
            update["fulfilment"] = "in_bearbeitung"
            update["processing_at"] = processing_at
        await self._change(order_id, lambda doc: doc.get("bigbuy_order_id") in (None, "", known_supplier_order_id),
                           lambda doc: base.change(doc, set=update))

    async def change_delivery_state(self, order_id, expected_state, changes):
        """Schreibt die Felder des neuen Lieferstands, wenn der gespeicherte noch ``expected_state`` ist (None = noch keiner).

        Gibt die Bestellung nach der Änderung zurück, sonst None; dann hat sich nichts geändert.
        """
        done = await self._change(order_id, lambda doc: doc.get("fulfilment") == expected_state and ("fulfilment" in doc or expected_state is None),
                                  lambda doc: base.change(doc, set=dict(changes)))
        return done[1] if done else None

    async def mark_shipped(self, order_id, tracking_number, carrier, shipped_at):
        """Der einmalige Übergang nach versendet; nie zurück aus versendet oder zugestellt. Wahr, wenn er stattfand."""
        return bool(await self._change(order_id, lambda doc: doc.get("fulfilment") not in (SHIPPED, DELIVERED), lambda doc: base.change(
            doc, set={"fulfilment": SHIPPED, "tracking_number": tracking_number, "carrier": carrier, "shipped_at": shipped_at})))
