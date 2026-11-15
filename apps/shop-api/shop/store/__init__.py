"""Datenzugriff des Shops hinter schmalen Schnittstellen; je Fachbereich ein Speicher.

Der Fachcode kennt nur diese Objekte und die fachlichen Fehler aus ``errors``.
Treiberfehler, Abfragesprache, Transaktionen und Größenprüfungen bleiben hier.

Umsetzung: MongoDB (Standard, IST) oder PostgreSQL (Zielbild D-013, vorbereitet und ausgeschaltet).
Gewählt wird über ``SHOP_STORE_BACKEND``; fehlt die Variable, gilt ``mongodb`` und nichts ändert sich.
``postgres`` verlangt zusätzlich ``SHOP_POSTGRES_DSN`` (nur serverseitig). Ein anderer Wert ist ein
Fehler beim Start, kein stiller Rückfall. Umschalten ist eine Entscheidung des Inhabers (D-016).
"""
import os

from ..db import db
from .accounts import MongoAccountStore
from .carts import MongoCartStore
from .catalog import MongoCatalogStore
from .errors import AlreadyExists, ArchiveTooLarge, RevisionStale, StoreUnavailable, StoredDataInvalid
from .orders import MongoOrderStore
from .outbox import MongoOutboxStore
from .payments import MongoPaymentStore
from .requests import MongoRequestStore
from .settings import MongoSettingsStore
from .workshops import MongoWorkshopStore

BACKEND = os.environ.get("SHOP_STORE_BACKEND", "mongodb")

if BACKEND == "mongodb":
    catalog = MongoCatalogStore(db)
    carts = MongoCartStore(db)
    accounts = MongoAccountStore(db)
    workshops = MongoWorkshopStore(db)
    requests = MongoRequestStore(db)
    outbox = MongoOutboxStore(db)
    orders = MongoOrderStore(db)
    payments = MongoPaymentStore(db)
    settings = MongoSettingsStore(db)
elif BACKEND == "postgres":
    if not os.environ.get("SHOP_POSTGRES_DSN"):
        raise RuntimeError("SHOP_POSTGRES_DSN is required when SHOP_STORE_BACKEND is postgres")
    from . import pg as _pg
    _bound = _pg.bind(_pg.PgDatabase(os.environ["SHOP_POSTGRES_DSN"]))
    catalog, carts, accounts, workshops, requests = _bound.catalog, _bound.carts, _bound.accounts, _bound.workshops, _bound.requests
    outbox, orders, payments, settings = _bound.outbox, _bound.orders, _bound.payments, _bound.settings
else:
    raise RuntimeError("SHOP_STORE_BACKEND must be mongodb or postgres")

__all__ = ["BACKEND", "AlreadyExists", "ArchiveTooLarge", "RevisionStale", "StoreUnavailable", "StoredDataInvalid", "accounts", "carts", "catalog", "orders", "outbox", "payments", "requests", "settings", "workshops"]
