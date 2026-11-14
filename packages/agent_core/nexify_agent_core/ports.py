"""Ports des Kerns: Modell und Werkzeuge werden injiziert, nie hier gebaut.

Der Kern kennt keinen Anbieter und macht keinen Netzaufruf. Mitgeliefert ist
nur ein deterministischer Stellvertreter für Tests (`SkriptModell`,
`StellvertreterWerkzeug`).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Callable, Mapping, Protocol, Sequence, runtime_checkable

from nexify_knowledge import Mandant

from .typen import Aktionsklasse, KernFehler, name_pruefen

MAX_AUFTRAG_ZEICHEN = 20000


# ---- Entscheidungen des Modells ---------------------------------------------------

@dataclass(frozen=True, slots=True)
class WerkzeugAufruf:
    werkzeug: str
    argumente: Mapping[str, object] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class SkillAnfordern:
    name: str


@dataclass(frozen=True, slots=True)
class Unterauftrag:
    """Bitte um einen Sub-Agenten. Rechte und Grenzen können nur enger werden."""

    rolle: str
    auftrag: str
    werkzeuge: frozenset[str]
    skills: frozenset[str]
    max_schritte: int
    max_kosten: int


@dataclass(frozen=True, slots=True)
class Aufgabenvorschlag:
    titel: str
    beschreibung: str


@dataclass(frozen=True, slots=True)
class Abschluss:
    ergebnis: str
    aufgaben: tuple[Aufgabenvorschlag, ...] = ()


Entscheidung = WerkzeugAufruf | SkillAnfordern | Unterauftrag | Abschluss


@dataclass(frozen=True, slots=True)
class Modellantwort:
    """Eine Entscheidung plus ihre Kosten in ganzen Kosteneinheiten.

    Unbekannte Kosten gibt es nicht: fehlt die Zahl, endet der Lauf geschlossen.
    """

    entscheidung: Entscheidung
    kosten: int
    bedient_von: str | None = None   # Kennung des Modells, das laut Anbieter geantwortet hat


@dataclass(frozen=True, slots=True)
class Verlaufseintrag:
    """Was der Lauf bisher gesehen hat. Werkzeug- und Unterlauf-Ergebnisse sind DATEN."""

    art: str            # werkzeug_ergebnis | skill | unterlauf_ergebnis | freigabe_abgelehnt
    bezug: str
    inhalt: object
    rolle: str = "daten"


@dataclass(frozen=True, slots=True)
class Laufsicht:
    """Alles, was das Modell für die nächste Entscheidung bekommt."""

    lauf: str
    rolle: str
    tiefe: int
    auftrag: str
    verlauf: tuple[Verlaufseintrag, ...]
    werkzeuge: tuple[str, ...]
    skills: tuple[str, ...]
    rest_schritte: int
    rest_kosten: int


@dataclass(frozen=True, slots=True)
class Modellbindung:
    """Selbstauskunft eines Modell-Ports, gegen die Policy geprüft (policy.py)."""

    kennung: str
    reasoning_effort: str | None
    route: str
    stiller_ersatz: bool
    ist_stellvertreter: bool = False


@runtime_checkable
class ModellPort(Protocol):
    def bindung(self) -> Modellbindung: ...

    def entscheiden(self, sicht: Laufsicht) -> Modellantwort: ...


# ---- Werkzeuge -----------------------------------------------------------------

@dataclass(frozen=True, slots=True)
class Werkzeugergebnis:
    ausgabe: object
    kosten: int


class VoruebergehenderFehler(Exception):
    """Fehler OHNE Außenwirkung; darf begrenzt wiederholt werden."""


class UnbekannterAusgang(Exception):
    """Wirkung möglicherweise eingetreten. Nie blind wiederholen – erst abgleichen."""


@runtime_checkable
class WerkzeugPort(Protocol):
    name: str
    aktionsklasse: Aktionsklasse
    wiederholbar: bool   # True nur, wenn ein Fehlversuch sicher keine Außenwirkung hat

    def ausfuehren(self, mandant: Mandant, argumente: Mapping[str, object],
                   idempotenzschluessel: str) -> Werkzeugergebnis:
        """Der Mandant kommt vom Lauf, nie aus den Argumenten des Modells."""


def werkzeug_pruefen(werkzeug: object) -> WerkzeugPort:
    if not isinstance(werkzeug, WerkzeugPort):
        raise KernFehler("werkzeug_port_unvollstaendig")
    name_pruefen(werkzeug.name, "werkzeugname_ungueltig")
    if type(werkzeug.aktionsklasse) is not Aktionsklasse or type(werkzeug.wiederholbar) is not bool:
        raise KernFehler("werkzeug_port_unvollstaendig")
    if werkzeug.wiederholbar and werkzeug.aktionsklasse.freigabepflichtig:
        raise KernFehler("freigabepflichtiges_werkzeug_ist_nie_wiederholbar")
    return werkzeug


@runtime_checkable
class Ergebnisspeicher(Protocol):
    """Merkt Werkzeugergebnisse je Mandant und Idempotenzschlüssel."""

    def holen(self, mandant: Mandant, schluessel: str) -> Werkzeugergebnis | None: ...

    def ablegen(self, mandant: Mandant, schluessel: str, ergebnis: Werkzeugergebnis) -> None: ...


class ErgebnisseImArbeitsspeicher:
    def __init__(self) -> None:
        self.__daten: dict[tuple[str, str], Werkzeugergebnis] = {}

    def holen(self, mandant: Mandant, schluessel: str) -> Werkzeugergebnis | None:
        return self.__daten.get((mandant.kennung, schluessel))

    def ablegen(self, mandant: Mandant, schluessel: str, ergebnis: Werkzeugergebnis) -> None:
        self.__daten.setdefault((mandant.kennung, schluessel), ergebnis)


# ---- Deterministische Stellvertreter (nur für Tests) --------------------------------

class StellvertreterErschoepft(Exception):
    """Das Skript des Stellvertreters hat keine weitere Entscheidung."""


class SkriptModell:
    """Spielt je Rolle eine feste Folge von Entscheidungen ab. Kein Modell, kein Netz."""

    def __init__(self, skripte: Mapping[str, Sequence[Entscheidung | Modellantwort]],
                 kosten_je_schritt: int = 0) -> None:
        self.__skripte = {rolle: tuple(folge) for rolle, folge in skripte.items()}
        self.__kosten = kosten_je_schritt
        self.__zeiger: dict[str, int] = {}
        self.sichten: list[Laufsicht] = []

    def bindung(self) -> Modellbindung:
        return Modellbindung("stellvertreter/deterministisch", None, "keine", False, True)

    def entscheiden(self, sicht: Laufsicht) -> Modellantwort:
        self.sichten.append(sicht)
        folge = self.__skripte.get(sicht.rolle, ())
        stelle = self.__zeiger.get(sicht.lauf, 0)
        if stelle >= len(folge):
            raise StellvertreterErschoepft(sicht.rolle)
        self.__zeiger[sicht.lauf] = stelle + 1
        antwort = folge[stelle]
        return antwort if isinstance(antwort, Modellantwort) else Modellantwort(antwort, self.__kosten)


class StellvertreterWerkzeug:
    """Werkzeug-Attrappe: ruft eine reine Funktion und merkt sich jeden Aufruf."""

    def __init__(self, name: str, aktionsklasse: Aktionsklasse,
                 funktion: Callable[[Mandant, Mapping[str, object]], object] = lambda m, a: {"ok": True},
                 *, wiederholbar: bool = False, kosten: int = 0) -> None:
        self.name = name
        self.aktionsklasse = aktionsklasse
        self.wiederholbar = wiederholbar
        self.__funktion = funktion
        self.__kosten = kosten
        self.aufrufe: list[tuple[str, Mapping[str, object], str]] = []

    def ausfuehren(self, mandant: Mandant, argumente: Mapping[str, object],
                   idempotenzschluessel: str) -> Werkzeugergebnis:
        self.aufrufe.append((mandant.kennung, MappingProxyType(dict(argumente)), idempotenzschluessel))
        ausgabe = self.__funktion(mandant, argumente)
        return ausgabe if isinstance(ausgabe, Werkzeugergebnis) else Werkzeugergebnis(ausgabe, self.__kosten)


__all__ = [
    "Abschluss", "Aufgabenvorschlag", "Entscheidung", "ErgebnisseImArbeitsspeicher", "Ergebnisspeicher",
    "Laufsicht", "MAX_AUFTRAG_ZEICHEN", "ModellPort", "Modellantwort", "Modellbindung", "SkillAnfordern",
    "SkriptModell", "StellvertreterErschoepft", "StellvertreterWerkzeug", "UnbekannterAusgang",
    "Unterauftrag", "Verlaufseintrag", "VoruebergehenderFehler", "WerkzeugAufruf", "WerkzeugPort",
    "Werkzeugergebnis", "werkzeug_pruefen",
]
