"""Lauf-Objekt und seine festen Bestandteile: Grenzen, Rechte, Freigaben, Auskunft."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .typen import (
    Aktionsklasse, GrenzenFehler, KernFehler, Laufstatus, Mensch, RechteErweiterung, name_pruefen,
)


def _ganz(wert: object, mindestens: int) -> bool:
    return type(wert) is int and wert >= mindestens


@dataclass(frozen=True, slots=True)
class Grenzen:
    """Alle Grenzen sind Pflicht; es gibt keine Standardwerte und kein „unbegrenzt".

    `max_kosten` zählt ganze Kosteneinheiten. Welche Einheit und welcher Betrag
    gelten, entscheidet der Inhaber; der Kern rechnet nur.
    """

    max_schritte: int
    max_kosten: int
    max_tiefe: int
    max_wiederholungen: int

    def __post_init__(self) -> None:
        if not (_ganz(self.max_schritte, 1) and _ganz(self.max_kosten, 1)
                and _ganz(self.max_tiefe, 0) and _ganz(self.max_wiederholungen, 0)):
            raise GrenzenFehler("grenzen_ungueltig")


@dataclass(frozen=True, slots=True)
class Rechte:
    """Was ein Lauf darf. Werkzeugrechte kommen nie aus Inhalten oder vom Modell."""

    werkzeuge: frozenset[str]
    skills: frozenset[str]
    aufgaben_vorschlagen: bool

    def __post_init__(self) -> None:
        if type(self.werkzeuge) is not frozenset or type(self.skills) is not frozenset \
                or type(self.aufgaben_vorschlagen) is not bool:
            raise KernFehler("rechte_ungueltig")
        for name in (*self.werkzeuge, *self.skills):
            name_pruefen(name, "rechte_ungueltig")

    def eingeengt(self, werkzeuge: frozenset[str], skills: frozenset[str]) -> "Rechte":
        """Rechte für einen Sub-Agenten: nur Teilmengen, sonst Verweigerung."""
        if type(werkzeuge) is not frozenset or type(skills) is not frozenset:
            raise KernFehler("rechte_ungueltig")
        if not (werkzeuge <= self.werkzeuge and skills <= self.skills):
            raise RechteErweiterung("rechte_erweiterung_verweigert")
        return Rechte(werkzeuge, skills, self.aufgaben_vorschlagen)


@dataclass(frozen=True, slots=True)
class Wiederholungsregel:
    """Wartezeit vor Wiederholung n: basis · faktor^(n-1), gedeckelt. Pflichtangabe."""

    basis_s: float
    faktor: float
    max_s: float

    def __post_init__(self) -> None:
        for wert in (self.basis_s, self.faktor, self.max_s):
            if type(wert) not in (int, float) or wert < 0:
                raise GrenzenFehler("wiederholungsregel_ungueltig")
        if self.faktor < 1:
            raise GrenzenFehler("wiederholungsregel_ungueltig")

    def wartezeit(self, versuch: int) -> float:
        return float(min(self.max_s, self.basis_s * self.faktor ** (versuch - 1)))


@dataclass(frozen=True, slots=True)
class Freigabeanfrage:
    """Der Lauf hält an und zeigt dem Menschen genau diese eine Aktion."""

    kennung: str
    lauf: str
    schritt: int
    werkzeug: str
    aktionsklasse: Aktionsklasse
    argumente_hash: str            # SHA-256 der kanonischen Argumente; der Mensch bestätigt ihn
    argumente: Mapping[str, object]


@dataclass(frozen=True, slots=True)
class Freigabe:
    anfrage: str
    freigeber: Mensch
    erteilt: bool
    zeit: str
    grund: str | None


@dataclass(frozen=True, slots=True)
class Aufgabenentwurf:
    """Ergebnisobjekt. Der Kern legt nirgends eine Aufgabe an und führt keine aus."""

    mandant: str
    lauf: str
    titel: str
    beschreibung: str
    status: str = "entwurf"


@dataclass(frozen=True, slots=True)
class Fehlerfall:
    """Eintrag der Fehlerablage – ohne Argumente, ohne Meldungstext."""

    mandant: str
    lauf: str
    schritt: int
    bezug: str | None
    code: str
    versuche: int
    eingabe_hash: str | None
    zeit: str


@dataclass(frozen=True, slots=True)
class Laufauskunft:
    """Unveränderliche Momentaufnahme eines Laufs."""

    kennung: str
    mandant: str
    rolle: str
    tiefe: int
    status: Laufstatus
    schritte: int
    kosten: int
    grenzen: Grenzen
    rechte: Rechte
    offene_freigabe: Freigabeanfrage | None
    ergebnis: str | None
    aufgaben: tuple[Aufgabenentwurf, ...]
    ende_code: str | None
    freigaben: tuple[Freigabe, ...]
    unterlauf: "Laufauskunft | None"
