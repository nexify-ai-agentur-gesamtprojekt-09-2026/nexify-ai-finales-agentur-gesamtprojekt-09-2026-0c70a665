"""Datenzugriff des Shops hinter schmalen Schnittstellen; je Fachbereich genau eine Umsetzung (MongoDB).

Der Fachcode kennt nur diese Objekte und die fachlichen Fehler aus ``errors``.
Treiberfehler, Abfragesprache, Transaktionen und Größenprüfungen bleiben hier.
"""
from ..db import db
from .carts import MongoCartStore
from .catalog import MongoCatalogStore
from .errors import ArchiveTooLarge, RevisionStale, StoreUnavailable, StoredDataInvalid

catalog = MongoCatalogStore(db)
carts = MongoCartStore(db)

__all__ = ["ArchiveTooLarge", "RevisionStale", "StoreUnavailable", "StoredDataInvalid", "carts", "catalog"]
