"""Konten, Sitzungen, Fehlversuche und Rücksetz-Token (PostgreSQL).

Hier liegen nur Hashes: von Passwörtern (bcrypt, im Fachcode gebildet) und von Sitzungs- und
Rücksetz-Token (sha256). Klartext-Token oder Passwörter erreichen diese Schicht nie, und sie
schreibt nichts in Protokolle. Zeitpunkte kommen wie bisher als UTC ohne Zeitzone zurück und
sind auf Millisekunden gekürzt. Abgelaufene Einträge entfernt ``purge_expired`` (in MongoDB
erledigen das TTL-Indizes); der Aufrufer prüft den Ablauf trotzdem selbst.
"""
from datetime import timedelta

import psycopg

from ..errors import AlreadyExists
from . import base


class PgAccountStore:
    def __init__(self, db):
        self.db = db

    async def ensure_indexes(self, lock_window_seconds, database=None):
        """Indizes und Eindeutigkeit legt die Migration an; hier ist nichts zu tun."""

    async def purge_expired(self, now, lock_window_seconds):
        """Entfernt abgelaufene Sitzungen, Rücksetz-Token und Fehlversuche außerhalb des Fensters; gibt die Anzahl zurück."""
        async with self.db.cursor() as cur:
            await cur.execute("select purge_expired(%s, %s)", (base.aware(now), timedelta(seconds=lock_window_seconds)))
            return (await cur.fetchone())[0]

    # Konten -------------------------------------------------------------------------------
    async def create_user(self, user):
        """AlreadyExists, wenn E-Mail oder user_id schon vergeben sind."""
        created = "_id" not in user
        try:
            async with self.db.cursor() as cur:
                await base.insert(cur, "users", user)
        except psycopg.errors.UniqueViolation:
            if created:
                user.pop("_id", None)
            raise AlreadyExists() from None

    async def _user(self, column, value):
        if not isinstance(value, str):
            return None
        async with self.db.cursor() as cur:
            rows = await base.fetch_all(cur, "users", f"{column} = %s", [value], limit=1)
        return rows[0] if rows else None

    async def _change_user(self, column, value, changes):
        if not isinstance(value, str):
            return
        async with self.db.cursor() as cur:
            rows = await base.fetch_all(cur, "users", f"{column} = %s", [value], limit=1, lock=True)
            if rows:
                await base.write(cur, "users", base.change(rows[0], set=changes))

    async def email_taken(self, email):
        return bool(await self._user("email", email))

    async def user_by_email(self, email):
        """Vollständiger Datensatz einschließlich password_hash; nur für die Anmeldung."""
        return await self._user("email", email)

    async def user_by_id(self, user_id):
        return await self._user("user_id", user_id)

    async def profile_by_id(self, user_id):
        """Ohne password_hash und ohne interne Kennung: das, was eine Sitzung über ihren Nutzer wissen darf."""
        user = await self._user("user_id", user_id)
        return base.project(user, without=("_id", "password_hash")) if user else None

    async def role_and_hash_by_email(self, email):
        user = await self._user("email", email)
        return {k: v for k, v in user.items() if k in ("password_hash", "role")} if user else None

    async def set_role_and_password_hash(self, email, role, password_hash):
        await self._change_user("email", email, {"role": role, "password_hash": password_hash})

    async def set_password_hash(self, user_id, password_hash):
        await self._change_user("user_id", user_id, {"password_hash": password_hash})

    async def set_password_hash_verified(self, user_id, password_hash):
        """Neues Passwort nach eingelöstem Rücksetz-Link: die Adresse gilt damit als bestätigt."""
        await self._change_user("user_id", user_id, {"password_hash": password_hash, "email_verified": True})

    async def revoke_api_keys_of(self, user_id, at):
        """Sperrt alle noch gültigen Schlüssel des Kontos; schon gesperrte behalten ihren Zeitpunkt."""
        async with self.db.cursor() as cur:
            for key in await base.fetch_all(cur, "api_keys", "tenant_id = %s and not revoked", [user_id], lock=True):
                await base.write(cur, "api_keys", base.change(key, set={"revoked_at": at}))

    async def mark_google_linked(self, user_id):
        await self._change_user("user_id", user_id, {"google_linked": True})

    # Sitzungen ----------------------------------------------------------------------------
    async def create_session(self, token_hash, user_id, created_at, expires_at):
        try:
            async with self.db.cursor() as cur:
                await cur.execute("insert into sessions (id, token_hash, user_id, created_at, expires_at) values (%s, %s, %s, %s, %s)",
                                  (base.new_id(), token_hash, user_id, created_at, base.aware(expires_at)))
        except psycopg.errors.UniqueViolation:
            raise AlreadyExists() from None

    async def session(self, token_hash):
        async with self.db.cursor() as cur:
            await cur.execute("select id, token_hash, user_id, created_at, expires_at from sessions where token_hash = %s", (token_hash,))
            row = await cur.fetchone()
        return {"_id": row[0], "token_hash": row[1], "user_id": row[2], "created_at": row[3], "expires_at": base.naive_utc(row[4])} if row else None

    async def delete_session(self, token_hash):
        async with self.db.cursor() as cur:
            await cur.execute("delete from sessions where token_hash = %s", (token_hash,))

    async def delete_sessions_of(self, user_id):
        async with self.db.cursor() as cur:
            await cur.execute("delete from sessions where user_id = %s", (user_id,))

    # Fehlversuche -------------------------------------------------------------------------
    async def count_login_failures(self, email, since):
        async with self.db.cursor() as cur:
            await cur.execute("select count(*) from login_failures where email = %s and at >= %s", (email, base.aware(since)))
            return (await cur.fetchone())[0]

    async def record_login_failure(self, email, at):
        async with self.db.cursor() as cur:
            await cur.execute("insert into login_failures (id, email, at) values (%s, %s, %s)", (base.new_id(), email, base.aware(at)))

    async def clear_login_failures(self, email):
        async with self.db.cursor() as cur:
            await cur.execute("delete from login_failures where email = %s", (email,))

    # Passwort zurücksetzen ----------------------------------------------------------------
    async def create_password_reset(self, token_hash, user_id, expires_at):
        try:
            async with self.db.cursor() as cur:
                await cur.execute("insert into password_resets (id, token_hash, user_id, used, expires_at) values (%s, %s, %s, false, %s)",
                                  (base.new_id(), token_hash, user_id, base.aware(expires_at)))
        except psycopg.errors.UniqueViolation:
            raise AlreadyExists() from None

    async def set_password_reset_mail_status(self, token_hash, status):
        async with self.db.cursor() as cur:
            await cur.execute("update password_resets set mail_status = %s where token_hash = %s", (status, token_hash))

    async def consume_password_reset(self, token_hash, now):
        """Löst ein unbenutztes, nicht abgelaufenes Token genau einmal ein; sonst None."""
        async with self.db.cursor() as cur:
            await cur.execute("update password_resets set used = true where token_hash = %s and not used and expires_at > %s "
                              "returning id, token_hash, user_id, expires_at, mail_status", (token_hash, base.aware(now)))
            row = await cur.fetchone()
        if row is None:
            return None
        reset = {"_id": row[0], "token_hash": row[1], "user_id": row[2], "used": False, "expires_at": base.naive_utc(row[3])}
        if row[4] is not None:
            reset["mail_status"] = row[4]
        return reset
