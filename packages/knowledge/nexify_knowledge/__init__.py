"""NeXify Wissensport – schmale, mandantenpflichtige Schnittstelle zum Wissensspeicher.

Keine Netzaufrufe, keine Modellaufrufe, nur Standardbibliothek.
"""
from .arbeitsspeicher import ArbeitsspeicherWissen
from .cognee import (
    OHNE_SPRACHMODELL, CogneeAdapter, CogneeKonfiguration, CogneeTransport,
    LokalerEinbetter, RouterAufrufer, datensatz_name,
)
from .port import WissensPort
from .typen import (
    AdapterNichtKonfiguriert, Dateninhalt, Datensatz, Exporteintrag, Exportpaket, Herkunft,
    Inhaltsart, Loeschart, Loeschauswahl, Loeschbeleg, Mandant, MandantErforderlich,
    Mandantenverletzung, MetadatenFehler, Rechtsgrundlage, RuecklesenFehlgeschlagen,
    Speicherbeleg, Treffer, WissensFehler, Wissenseintrag, Zustand, eintrag_kennung,
)

__all__ = [
    "AdapterNichtKonfiguriert", "ArbeitsspeicherWissen", "CogneeAdapter", "CogneeKonfiguration",
    "CogneeTransport", "Dateninhalt", "Datensatz", "Exporteintrag", "Exportpaket", "Herkunft",
    "Inhaltsart", "Loeschart", "Loeschauswahl", "Loeschbeleg", "LokalerEinbetter", "Mandant",
    "MandantErforderlich", "Mandantenverletzung", "MetadatenFehler", "OHNE_SPRACHMODELL",
    "Rechtsgrundlage", "RouterAufrufer", "RuecklesenFehlgeschlagen", "Speicherbeleg", "Treffer",
    "WissensFehler", "WissensPort", "Wissenseintrag", "Zustand", "datensatz_name",
    "eintrag_kennung",
]
