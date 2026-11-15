"""Warenkörbe (MongoDB): ein Dokument je Eigentümer, Vergleichen-und-Setzen über ``revision``.

Die Zusammenführung Gast -> Konto läuft in einer Transaktion (Snapshot lesen, Majority schreiben)
und braucht ein Replica Set. Es gibt keinen Weg ohne Transaktion.
"""
import inspect

from bson import BSON
from bson.errors import InvalidDocument
from pymongo.errors import DocumentTooLarge, DuplicateKeyError, PyMongoError
from pymongo.read_concern import ReadConcern
from pymongo.write_concern import WriteConcern

from ..db import now_iso
from .errors import ArchiveTooLarge, RevisionStale, StoreUnavailable, StoredDataInvalid

MAX_CART_BSON_BYTES = 16 * 1024 * 1024 - 1024


def revision_filter(owner, revision):
    """revision None = Altdokument ohne Stand; das ist nicht dasselbe wie Stand 0."""
    return {'owner': owner, 'revision': {'$exists': False} if revision is None else revision}


class MongoCartStore:
    def __init__(self, db):
        self.db = db

    async def get(self, owner, *, tx=None):
        if tx is None:
            return await self.db.carts.find_one({'owner': owner})
        return await self.db.carts.find_one({'owner': owner}, session=tx)

    async def replace_items(self, owner, expected_revision, items, *, create, tx=None, archive_entry=None):
        """Setzt die Positionen und erhöht den Stand. RevisionStale, wenn der erwartete Stand nicht mehr gilt.

        create: Es gab beim Lesen keinen Warenkorb; er wird angelegt. archive_entry: Beleg einer Zusammenführung.
        """
        update = {'$set': {'items': items, 'updated_at': now_iso()}, '$inc': {'revision': 1}}
        if archive_entry is not None:
            update['$push'] = {'merge_history': archive_entry}
        try:
            result = await self.db.carts.update_one(revision_filter(owner, expected_revision),
                update, upsert=create, session=tx)
        except DuplicateKeyError:
            raise RevisionStale() from None
        if not result.matched_count and result.upserted_id is None:
            raise RevisionStale()

    async def remove_products(self, owner, expected_revision, product_ids):
        """Nimmt die genannten Produkte heraus und erhöht den Stand, aber nur bei genau dem erwarteten Stand.

        Ein inzwischen geänderter oder fehlender Warenkorb bleibt unberührt; das ist kein Fehler.
        """
        await self.db.carts.update_one(revision_filter(owner, expected_revision),
            {"$pull": {"items": {"product_id": {"$in": product_ids}}}, "$inc": {"revision": 1}})

    def check_archivable(self, candidate):
        """ArchiveTooLarge, wenn der Warenkorb mit Beleg die Dokumentgrenze erreicht; StoredDataInvalid, wenn er nicht ablegbar ist."""
        try:
            if len(BSON.encode(candidate)) > MAX_CART_BSON_BYTES:
                raise ArchiveTooLarge()
        except InvalidDocument:
            raise StoredDataInvalid() from None

    async def in_transaction(self, work):
        """Führt ``work(tx)`` atomar aus; bei einem Schreibkonflikt kann es erneut aufgerufen werden.

        Fehler aus ``work`` selbst gehen unverändert durch. Speicherfehler werden zu
        RevisionStale, ArchiveTooLarge oder StoreUnavailable.
        """
        try:
            session = self.db.client.start_session()
            if inspect.isawaitable(session):
                session = await session
            async with session:
                await session.with_transaction(work, read_concern=ReadConcern('snapshot'), write_concern=WriteConcern('majority'))
        except DuplicateKeyError:
            raise RevisionStale() from None
        except DocumentTooLarge:
            raise ArchiveTooLarge() from None
        except PyMongoError:
            raise StoreUnavailable() from None
