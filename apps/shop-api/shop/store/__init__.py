"""Datenzugriff des Shops hinter schmalen Schnittstellen; je Fachbereich genau eine Umsetzung (MongoDB).

Der Fachcode kennt nur diese Objekte und die fachlichen Fehler aus ``errors``.
Treiberfehler, Abfragesprache, Transaktionen und Größenprüfungen bleiben hier.
"""
from ..db import db
from .accounts import MongoAccountStore
from .carts import MongoCartStore
from .catalog import MongoCatalogStore
from .errors import AlreadyExists, ArchiveTooLarge, RevisionStale, StoreUnavailable, StoredDataInvalid
from .outbox import MongoOutboxStore
from .requests import MongoRequestStore
from .workshops import MongoWorkshopStore

catalog = MongoCatalogStore(db)
carts = MongoCartStore(db)
accounts = MongoAccountStore(db)
workshops = MongoWorkshopStore(db)
requests = MongoRequestStore(db)
outbox = MongoOutboxStore(db)

__all__ = ["AlreadyExists", "ArchiveTooLarge", "RevisionStale", "StoreUnavailable", "StoredDataInvalid", "accounts", "carts", "catalog", "outbox", "requests", "workshops"]
