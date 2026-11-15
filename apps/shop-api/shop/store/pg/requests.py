"""Kontaktanfragen (PostgreSQL). Die Kennung entsteht im Fachcode aus dem Idempotenzschlüssel."""
import psycopg

from ..errors import AlreadyExists
from . import base


class PgRequestStore:
    def __init__(self, db):
        self.db = db

    async def get(self, request_id):
        if not base.text_id(request_id):
            return None
        async with self.db.cursor() as cur:
            return await base.fetch_one(cur, "requests", request_id)

    async def count_from_email_since(self, email, since):
        """since und created_at sind ISO-Zeitpunkte in UTC als Text; Grenze einschließlich."""
        async with self.db.cursor() as cur:
            await cur.execute("select count(*) from shop.requests where email = %s and created_at >= %s", (email, since))
            return (await cur.fetchone())[0]

    async def add(self, request):
        """AlreadyExists, wenn es die Kennung schon gibt; die vorhandene Anfrage bleibt unverändert."""
        try:
            async with self.db.cursor() as cur:
                await base.insert(cur, "requests", request)
        except psycopg.errors.UniqueViolation:
            raise AlreadyExists() from None

    async def record_notification(self, request_id, status):
        """Hält den Stand der internen Benachrichtigung fest und nimmt die Anfrage aus der Nachholliste."""
        async with self.db.cursor() as cur:
            await base.compare_and_change(cur, "requests", request_id, lambda doc: True,
                                          lambda doc: base.change(doc, set={"notify_status": status, "notify_recovery_pending": False}))

    async def pending_notifications(self, limit):
        async with self.db.cursor() as cur:
            return await base.fetch_all(cur, "requests", "notify_recovery_pending", limit=limit)
