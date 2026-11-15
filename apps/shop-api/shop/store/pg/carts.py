"""Warenkörbe (PostgreSQL): eine Zeile je Eigentümer, Vergleichen-und-Setzen über ``revision``.

Die Zusammenführung Gast -> Konto läuft in einer Transaktion mit festem Lesestand. Ein
gleichzeitiger Schreiber führt zu einem Konflikt; ``work`` wird dann erneut aufgerufen.
"""
import psycopg

from ...db import now_iso
from ..errors import ArchiveTooLarge, RevisionStale, StoreUnavailable
from . import base

RETRIES = 5


def at_revision(doc, revision):
    """revision None = Altdokument ohne Stand; das ist nicht dasselbe wie Stand 0."""
    return "revision" not in doc if revision is None else ("revision" in doc and type(doc["revision"]) is not bool and doc["revision"] == revision)


class PgCartStore:
    def __init__(self, db):
        self.db = db

    @staticmethod
    async def _locked(cur, owner):
        await cur.execute("select id, doc::text from carts where owner = %s for update", (owner,))
        row = await cur.fetchone()
        return base.join(*row) if row else None

    async def get(self, owner, *, tx=None):
        async with self.db.cursor(tx) as cur:
            await cur.execute("select id, doc::text from carts where owner = %s", (owner,))
            row = await cur.fetchone()
        return base.join(*row) if row else None

    async def replace_items(self, owner, expected_revision, items, *, create, tx=None, archive_entry=None):
        """Setzt die Positionen und erhöht den Stand. RevisionStale, wenn der erwartete Stand nicht mehr gilt.

        create: Es gab beim Lesen keinen Warenkorb; er wird angelegt. archive_entry: Beleg einer Zusammenführung.
        """
        push = {} if archive_entry is None else {"merge_history": archive_entry}
        try:
            async with self.db.cursor(tx) as cur:
                cart = await self._locked(cur, owner)
                if cart is not None and at_revision(cart, expected_revision):
                    await base.write(cur, "carts", base.change(cart, set={"items": items, "updated_at": now_iso()}, inc={"revision": 1}, push=push))
                    return
                if not create or cart is not None:
                    raise RevisionStale()
                fresh = {"owner": owner} if expected_revision is None else {"owner": owner, "revision": expected_revision}
                await base.insert(cur, "carts", base.change(fresh, set={"items": items, "updated_at": now_iso()}, inc={"revision": 1}, push=push))
        except psycopg.errors.UniqueViolation:
            raise RevisionStale() from None

    async def remove_products(self, owner, expected_revision, product_ids):
        """Nimmt die genannten Produkte heraus und erhöht den Stand, aber nur bei genau dem erwarteten Stand.

        Ein inzwischen geänderter oder fehlender Warenkorb bleibt unberührt; das ist kein Fehler.
        """
        async with self.db.cursor() as cur:
            cart = await self._locked(cur, owner)
            if cart is None or not at_revision(cart, expected_revision):
                return
            if "items" in cart:
                cart["items"] = [item for item in cart["items"] if not (isinstance(item, dict) and item.get("product_id") in product_ids)]
            await base.write(cur, "carts", base.change(cart, inc={"revision": 1}))

    def check_archivable(self, candidate):
        """ArchiveTooLarge, wenn der Warenkorb mit Beleg die Schutzgrenze erreicht; StoredDataInvalid, wenn er nicht ablegbar ist."""
        if len(base.encode(candidate).encode()) > base.MAX_DOCUMENT_BYTES:
            raise ArchiveTooLarge()

    async def in_transaction(self, work):
        """Führt ``work(tx)`` atomar aus; bei einem Schreibkonflikt wird es erneut aufgerufen.

        Fehler aus ``work`` selbst gehen unverändert durch. Speicherfehler werden zu
        RevisionStale oder StoreUnavailable.
        """
        for attempt in range(RETRIES):
            try:
                async with self.db.transaction() as tx:
                    await work(tx)
                return
            except (psycopg.errors.SerializationFailure, psycopg.errors.DeadlockDetected):
                if attempt == RETRIES - 1:
                    raise StoreUnavailable() from None
            except psycopg.errors.UniqueViolation:
                raise RevisionStale() from None
            except psycopg.Error:
                raise StoreUnavailable() from None
