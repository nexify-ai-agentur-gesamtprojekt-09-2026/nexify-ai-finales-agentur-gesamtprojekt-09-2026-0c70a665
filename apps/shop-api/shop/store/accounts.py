"""Konten, Sitzungen, Fehlversuche und Rücksetz-Token (MongoDB).

Hier liegen nur Hashes: von Passwörtern (bcrypt, im Fachcode gebildet) und von Sitzungs- und
Rücksetz-Token (sha256). Klartext-Token oder Passwörter erreichen diese Schicht nie, und sie
schreibt nichts in Protokolle. Zeitpunkte ohne Zeitzone, die der Treiber zurückgibt, sind UTC.
Abgelaufene Sitzungen, Fehlversuche und Token entfernt MongoDB über TTL-Indizes; der Aufrufer
prüft den Ablauf trotzdem selbst.
"""
from pymongo.errors import DuplicateKeyError

from .errors import AlreadyExists


class MongoAccountStore:
    def __init__(self, db):
        self.db = db

    async def ensure_indexes(self, lock_window_seconds, database=None):
        d = database if database is not None else self.db
        await d.users.create_index("email", unique=True)
        await d.users.create_index("user_id", unique=True)
        await d.sessions.create_index("token_hash", unique=True)
        await d.sessions.create_index("expires_at", expireAfterSeconds=0)
        await d.login_failures.create_index("at", expireAfterSeconds=lock_window_seconds)
        await d.password_resets.create_index("expires_at", expireAfterSeconds=0)

    # Konten -------------------------------------------------------------------------------
    async def create_user(self, user):
        """AlreadyExists, wenn E-Mail oder user_id schon vergeben sind."""
        try:
            await self.db.users.insert_one(user)
        except DuplicateKeyError:
            raise AlreadyExists() from None

    async def email_taken(self, email):
        return bool(await self.db.users.find_one({"email": email}, {"_id": 1}))

    async def user_by_email(self, email):
        """Vollständiger Datensatz einschließlich password_hash; nur für die Anmeldung."""
        return await self.db.users.find_one({"email": email})

    async def user_by_id(self, user_id):
        return await self.db.users.find_one({"user_id": user_id})

    async def profile_by_id(self, user_id):
        """Ohne password_hash und ohne interne Kennung: das, was eine Sitzung über ihren Nutzer wissen darf."""
        return await self.db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})

    async def role_and_hash_by_email(self, email):
        return await self.db.users.find_one({"email": email}, {"_id": 0, "password_hash": 1, "role": 1})

    async def set_role_and_password_hash(self, email, role, password_hash):
        await self.db.users.update_one({"email": email}, {"$set": {"role": role, "password_hash": password_hash}})

    async def set_password_hash(self, user_id, password_hash):
        await self.db.users.update_one({"user_id": user_id}, {"$set": {"password_hash": password_hash}})

    async def set_password_hash_verified(self, user_id, password_hash):
        """Neues Passwort nach eingelöstem Rücksetz-Link: die Adresse gilt damit als bestätigt."""
        await self.db.users.update_one({"user_id": user_id}, {"$set": {"password_hash": password_hash, "email_verified": True}})

    async def revoke_api_keys_of(self, user_id, at):
        """Sperrt alle noch gültigen Schlüssel des Kontos; schon gesperrte behalten ihren Zeitpunkt."""
        await self.db.api_keys.update_many({"tenant_id": user_id, "revoked_at": None}, {"$set": {"revoked_at": at}})

    async def mark_google_linked(self, user_id):
        await self.db.users.update_one({"user_id": user_id}, {"$set": {"google_linked": True}})

    # Sitzungen ----------------------------------------------------------------------------
    async def create_session(self, token_hash, user_id, created_at, expires_at):
        await self.db.sessions.insert_one({"token_hash": token_hash, "user_id": user_id, "created_at": created_at,
                                           "expires_at": expires_at})

    async def session(self, token_hash):
        return await self.db.sessions.find_one({"token_hash": token_hash})

    async def delete_session(self, token_hash):
        await self.db.sessions.delete_one({"token_hash": token_hash})

    async def delete_sessions_of(self, user_id):
        await self.db.sessions.delete_many({"user_id": user_id})

    # Fehlversuche -------------------------------------------------------------------------
    async def count_login_failures(self, email, since):
        return await self.db.login_failures.count_documents({"email": email, "at": {"$gte": since}})

    async def record_login_failure(self, email, at):
        await self.db.login_failures.insert_one({"email": email, "at": at})

    async def clear_login_failures(self, email):
        await self.db.login_failures.delete_many({"email": email})

    # Passwort zurücksetzen ----------------------------------------------------------------
    async def create_password_reset(self, token_hash, user_id, expires_at):
        await self.db.password_resets.insert_one({"token_hash": token_hash, "user_id": user_id, "used": False,
                                                  "expires_at": expires_at})

    async def set_password_reset_mail_status(self, token_hash, status):
        await self.db.password_resets.update_one({"token_hash": token_hash}, {"$set": {"mail_status": status}})

    async def consume_password_reset(self, token_hash, now):
        """Löst ein unbenutztes, nicht abgelaufenes Token genau einmal ein; sonst None."""
        return await self.db.password_resets.find_one_and_update({"token_hash": token_hash, "used": False, "expires_at": {"$gt": now}}, {"$set": {"used": True}})
