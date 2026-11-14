"""Shop-Einstellungen schreiben (MongoDB): Aufschlag, Versandpauschale und Preisfreigabe.

Gelesen werden sie über ``catalog.shop_settings``. Der Aufschlag ist Text mit zwei Nachkommastellen,
so wie ihn der Fachcode geprüft hat; diese Schicht rechnet nicht und prüft keine Preise.
Freigabe setzen und Freigabe protokollieren sind zwei getrennte Schritte ohne gemeinsame Transaktion.
"""


class MongoSettingsStore:
    def __init__(self, db):
        self.db = db

    async def save_pricing(self, markup_percent, shipping_cents, updated_at, updated_by):
        """Legt die Einstellungen an oder ändert genau diese Felder; eine bestehende Freigabe bleibt gespeichert."""
        await self.db.settings.update_one({"_id": "shop"}, {"$set": {"markup_percent": markup_percent, "shipping_cents": shipping_cents,
                                                                     "updated_at": updated_at, "updated_by": updated_by}}, upsert=True)

    async def set_price_release(self, release):
        """Hält die Freigabe fest und schreibt deren Aufschlag als geltenden Aufschlag."""
        await self.db.settings.update_one({"_id": "shop"}, {"$set": {"price_release": release, "markup_percent": release["markup_percent"]}}, upsert=True)

    async def log_price_release(self, entry):
        """Fügt dem Freigabeprotokoll einen Eintrag an; vorhandene Einträge ändert nichts."""
        await self.db.price_releases.insert_one(entry)
