"""Shop-Einstellungen schreiben (PostgreSQL): Aufschlag, Versandpauschale und Preisfreigabe.

Gelesen werden sie über ``catalog.shop_settings``. Der Aufschlag ist Text mit zwei Nachkommastellen,
so wie ihn der Fachcode geprüft hat; diese Schicht rechnet nicht und prüft keine Preise.
Freigabe setzen und Freigabe protokollieren sind zwei getrennte Schritte ohne gemeinsame Transaktion.
"""
import psycopg

from . import base


class PgSettingsStore:
    def __init__(self, db):
        self.db = db

    async def _upsert_shop(self, changes):
        for _ in range(2):
            try:
                async with self.db.cursor() as cur:
                    if await base.compare_and_change(cur, "settings", "shop", lambda doc: True, lambda doc: base.change(doc, set=changes)) is None:
                        await base.insert(cur, "settings", base.change({"_id": "shop"}, set=changes))
                return
            except psycopg.errors.UniqueViolation:
                continue  # ein gleichzeitiger Aufruf hat die Zeile angelegt; dann ändern

    async def save_pricing(self, markup_percent, shipping_cents, updated_at, updated_by):
        """Legt die Einstellungen an oder ändert genau diese Felder; eine bestehende Freigabe bleibt gespeichert."""
        await self._upsert_shop({"markup_percent": markup_percent, "shipping_cents": shipping_cents, "updated_at": updated_at, "updated_by": updated_by})

    async def set_price_release(self, release):
        """Hält die Freigabe fest und schreibt deren Aufschlag als geltenden Aufschlag."""
        await self._upsert_shop({"price_release": release, "markup_percent": release["markup_percent"]})

    async def log_price_release(self, entry):
        """Fügt dem Freigabeprotokoll einen Eintrag an; vorhandene Einträge ändert nichts."""
        async with self.db.cursor() as cur:
            await base.insert(cur, "price_releases", entry)
