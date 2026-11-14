"""Grundtypen des Laufzeitkerns. Nur Standardbibliothek, keine Ein-/Ausgabe."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import hashlib
import json
import re

CODE = re.compile(r"[a-z][a-z0-9_]{0,79}")
NAME = re.compile(r"[a-z0-9]+(?:[._-][a-z0-9]+)*")
MAX_NAME = 64


class KernFehler(Exception):
    """Basis aller Fehler des Kerns. Die Meldung ist ein fester Code, nie ein Inhalt."""


class LaufUnbekannt(KernFehler):
    """Lauf existiert nicht – oder gehört einem anderen Mandanten (nicht unterscheidbar)."""


class LaufNichtWartend(KernFehler):
    """Für diesen Lauf ist keine passende Freigabe offen."""


class FreigabeUngueltig(KernFehler):
    """Die Freigabe passt nicht zu Anfrage, Hash oder Freigeber."""


class IdempotenzKonflikt(KernFehler):
    """Gleicher Idempotenzschlüssel, aber anderer Auftrag, andere Grenzen oder Rechte."""


class RechteErweiterung(KernFehler):
    """Ein Sub-Agent sollte mehr dürfen als sein Auftraggeber."""


class GrenzenFehler(KernFehler):
    """Grenzen fehlen oder sind ungültig."""


class Aktionsklasse(str, Enum):
    """Klasse einer Werkzeugwirkung. Das Werkzeug legt sie fest, nie das Modell."""

    LESEN = "lesen"
    SCHREIBEN_INTERN = "schreiben_intern"
    ZAHLUNG = "zahlung"
    VERTRAG = "vertrag"
    LOESCHUNG = "loeschung"
    RECHTEAENDERUNG = "rechteaenderung"
    VERSAND_NACH_AUSSEN = "versand_nach_aussen"

    @property
    def freigabepflichtig(self) -> bool:
        """Fest im Code, ohne Schalter: alles außer den zwei harmlosen Klassen
        hält den Lauf an. Eine künftig ergänzte Klasse ist damit von selbst pflichtig."""
        return self not in (Aktionsklasse.LESEN, Aktionsklasse.SCHREIBEN_INTERN)


class Laufstatus(str, Enum):
    ANGELEGT = "angelegt"
    LAEUFT = "laeuft"
    WARTET_AUF_FREIGABE = "wartet_auf_freigabe"
    ABGESCHLOSSEN = "abgeschlossen"
    FEHLGESCHLAGEN = "fehlgeschlagen"
    ABGEBROCHEN = "abgebrochen"
    GRENZE_ERREICHT = "grenze_erreicht"

    @property
    def beendet(self) -> bool:
        return self in (Laufstatus.ABGESCHLOSSEN, Laufstatus.FEHLGESCHLAGEN,
                        Laufstatus.ABGEBROCHEN, Laufstatus.GRENZE_ERREICHT)


def name_pruefen(wert: object, code: str) -> str:
    if type(wert) is not str or len(wert) > MAX_NAME or NAME.fullmatch(wert) is None:
        raise KernFehler(code)
    return wert


def code_pruefen(wert: object) -> str:
    if type(wert) is not str or CODE.fullmatch(wert) is None:
        raise KernFehler("code_ungueltig")
    return wert


def kanonisch(wert: object) -> bytes:
    """Stabile JSON-Form für Hashes. Nicht serialisierbare Werte werden abgelehnt."""
    try:
        return json.dumps(wert, sort_keys=True, ensure_ascii=False, separators=(",", ":"),
                          allow_nan=False).encode("utf-8")
    except (TypeError, ValueError):
        raise KernFehler("wert_nicht_serialisierbar") from None


def sha256_hex(wert: object) -> str:
    return hashlib.sha256(kanonisch(wert)).hexdigest()


@dataclass(frozen=True, slots=True)
class Mensch:
    """Kennung eines angemeldeten Menschen, vergeben von der Sitzungsschicht.

    Der Kern kann Menschsein nicht beweisen. Er stellt sicher, dass dieser Typ
    nur über die Freigabe-Operationen der Laufzeit hereinkommt und weder Modell
    noch Werkzeug eine Freigabe erzeugen können.
    """

    kennung: str

    def __post_init__(self) -> None:
        name_pruefen(self.kennung, "mensch_kennung_ungueltig")
