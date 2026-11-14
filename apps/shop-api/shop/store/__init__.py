"""Datenzugriff des Shops hinter schmalen Schnittstellen; je Fachbereich genau eine Umsetzung (MongoDB).

Der Fachcode kennt nur diese Objekte und fachliche Fehler.
Treiberfehler, Abfragesprache, Transaktionen und Größenprüfungen bleiben hier.
"""
from ..db import db
from .catalog import MongoCatalogStore

catalog = MongoCatalogStore(db)

__all__ = ["catalog"]
