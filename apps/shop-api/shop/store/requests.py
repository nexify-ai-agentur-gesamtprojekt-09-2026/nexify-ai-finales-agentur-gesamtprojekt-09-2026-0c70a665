"""Kontaktanfragen (MongoDB). Die Kennung entsteht im Fachcode aus dem Idempotenzschlüssel."""
from pymongo.errors import DuplicateKeyError

from .errors import AlreadyExists


class MongoRequestStore:
    def __init__(self, db):
        self.db = db

    async def get(self, request_id):
        return await self.db.requests.find_one({"_id": request_id})

    async def count_from_email_since(self, email, since):
        """since und created_at sind ISO-Zeitpunkte in UTC als Text; Grenze einschließlich."""
        return await self.db.requests.count_documents({"email": email, "created_at": {"$gte": since}})

    async def add(self, request):
        """AlreadyExists, wenn es die Kennung schon gibt; die vorhandene Anfrage bleibt unverändert."""
        try:
            await self.db.requests.insert_one(request)
        except DuplicateKeyError:
            raise AlreadyExists() from None

    async def record_notification(self, request_id, status):
        """Hält den Stand der internen Benachrichtigung fest und nimmt die Anfrage aus der Nachholliste."""
        await self.db.requests.update_one({"_id": request_id}, {"$set": {"notify_status": status, "notify_recovery_pending": False}})

    async def pending_notifications(self, limit):
        return [doc async for doc in self.db.requests.find({"notify_recovery_pending": True}).limit(limit)]
