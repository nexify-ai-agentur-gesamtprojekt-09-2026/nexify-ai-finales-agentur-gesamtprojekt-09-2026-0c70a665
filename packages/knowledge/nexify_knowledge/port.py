"""Wissensport: die einzige Schnittstelle zum zentralen Wissensspeicher.

Vier Operationen – speichern, abrufen, loeschen, exportieren – plus zustand.
Der Mandant ist erstes Pflichtargument jeder Operation. Die öffentlichen
Methoden sind hier fest verdrahtet (Schablonenmethode): Sie prüfen Mandant
und Metadaten, rufen die Implementierung und prüfen deren Antwort erneut.
Eine Implementierung, die fremde Daten liefert, wird hier abgefangen.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Callable, Iterable

from .typen import (
    Dateninhalt, Datensatz, Exporteintrag, Exportpaket, Inhaltsart, Loeschart,
    Loeschauswahl, Loeschbeleg, Mandant, Mandantenverletzung, MetadatenFehler,
    RuecklesenFehlgeschlagen, Speicherbeleg, Treffer, WissensFehler, Wissenseintrag,
    Zustand, _KENNUNG, eintrag_kennung, mandant_pruefen,
)

MAX_TREFFER = 50
MAX_FRAGE_ZEICHEN = 4000
_FEST = ("speichern", "abrufen", "loeschen", "exportieren")


def _jetzt_utc() -> datetime:
    return datetime.now(timezone.utc)


class WissensPort(ABC):
    """Basisklasse aller Implementierungen. Unterklassen füllen nur `_…`-Methoden."""

    def __init_subclass__(cls, **kw) -> None:
        super().__init_subclass__(**kw)
        for name in _FEST:
            if name in cls.__dict__:
                raise TypeError(f"{name} ist fest; Implementierungen fuellen nur die _-Methoden")

    def __init__(self, uhr: Callable[[], datetime] = _jetzt_utc) -> None:
        self._uhr = uhr

    # ---- öffentliche, feste Schnittstelle -------------------------------------------

    def speichern(self, mandant: Mandant, eintrag: Wissenseintrag) -> Speicherbeleg:
        """Schreiben → exakt zurücklesen → Inhalt vergleichen. Wiederholung ist folgenlos."""
        mandant = mandant_pruefen(mandant)
        if type(eintrag) is not Wissenseintrag:
            raise MetadatenFehler("wissenseintrag_pflicht")
        kennung = eintrag_kennung(mandant, eintrag)
        neu = self._lesen(mandant, kennung) is None
        if neu:
            self._schreiben(Datensatz(kennung, mandant, eintrag, self._uhr()))
        gelesen = self._lesen(mandant, kennung)
        if (type(gelesen) is not Datensatz or gelesen.mandant != mandant or gelesen.kennung != kennung
                or gelesen.eintrag.inhalt_sha256 != eintrag.inhalt_sha256):
            raise RuecklesenFehlgeschlagen("ruecklesen_oder_inhaltsvergleich_fehlgeschlagen")
        return Speicherbeleg(kennung, eintrag.inhalt_sha256, neu, True)

    def abrufen(self, mandant: Mandant, frage: str, *, limit: int = 5,
                art: Inhaltsart | None = None) -> tuple[Treffer, ...]:
        """Suche nur im Speicher dieses Mandanten. Treffer sind Daten mit Herkunft."""
        mandant = mandant_pruefen(mandant)
        if type(frage) is not str or not frage.strip() or len(frage) > MAX_FRAGE_ZEICHEN:
            raise MetadatenFehler("frage_ungueltig")
        if type(limit) is not int or not 1 <= limit <= MAX_TREFFER:
            raise MetadatenFehler("limit_ungueltig")
        if art is not None and type(art) is not Inhaltsart:
            raise MetadatenFehler("art_ungueltig")
        jetzt = self._uhr()
        treffer = []
        for satz, wertung in self._suchen(mandant, frage, art):
            self._eigen(mandant, satz)
            e = satz.eintrag
            if e.loeschen_ab is not None and e.loeschen_ab <= jetzt:
                continue  # abgelaufene Inhalte werden nie mehr ausgeliefert
            if art is not None and e.herkunft.art is not art:
                continue
            treffer.append(Treffer(satz.kennung, Dateninhalt(e.inhalt, e.inhalt_sha256), e.herkunft,
                                   e.rechtsgrundlage, e.loeschen_ab, float(wertung)))
            if len(treffer) == limit:
                break
        return tuple(treffer)

    def loeschen(self, mandant: Mandant, auswahl: Loeschauswahl) -> Loeschbeleg:
        """Löschung nur innerhalb des Mandanten; die Gegenprobe ist Teil des Belegs."""
        mandant = mandant_pruefen(mandant)
        if type(auswahl) is not Loeschauswahl:
            raise MetadatenFehler("loeschauswahl_pflicht")
        jetzt = self._uhr()
        betroffen = []
        for satz in self._alle(mandant):
            self._eigen(mandant, satz)
            e = satz.eintrag
            if ((auswahl.art is Loeschart.MANDANT)
                    or (auswahl.art is Loeschart.EINTRAG and satz.kennung == auswahl.wert)
                    or (auswahl.art is Loeschart.GESPRAECH and e.gespraech == auswahl.wert)
                    or (auswahl.art is Loeschart.PERSON and e.betroffene_person == auswahl.wert)
                    or (auswahl.art is Loeschart.ABGELAUFEN and e.loeschen_ab is not None
                        and e.loeschen_ab <= jetzt)):
                betroffen.append(satz.kennung)
        kennungen = tuple(sorted(betroffen))
        if kennungen:
            self._entfernen(mandant, kennungen)
        if any(self._lesen(mandant, k) is not None for k in kennungen):
            raise WissensFehler("loeschung_unvollstaendig_gegenprobe_nicht_leer")
        return Loeschbeleg(auswahl.art, len(kennungen), kennungen, jetzt, True)

    def exportieren(self, mandant: Mandant, *, betroffene_person: str | None = None) -> Exportpaket:
        """Auskunft/Übertragbarkeit: alles dieses Mandanten oder einer Person darin."""
        mandant = mandant_pruefen(mandant)
        if betroffene_person is not None and (
                type(betroffene_person) is not str or _KENNUNG.fullmatch(betroffene_person) is None):
            raise MetadatenFehler("betroffene_person_ungueltig")
        eintraege = []
        for satz in sorted(self._alle(mandant), key=lambda s: getattr(s, "kennung", "")):
            self._eigen(mandant, satz)
            e = satz.eintrag
            if betroffene_person is not None and e.betroffene_person != betroffene_person:
                continue
            eintraege.append(Exporteintrag(
                satz.kennung, Dateninhalt(e.inhalt, e.inhalt_sha256), e.herkunft, e.rechtsgrundlage,
                e.einwilligung_ref, e.loeschen_ab, e.betroffene_person, e.gespraech, satz.gespeichert_am))
        return Exportpaket(mandant, self._uhr(), betroffene_person, tuple(eintraege))

    # ---- von Implementierungen zu füllen ---------------------------------------------

    @abstractmethod
    def zustand(self) -> Zustand:
        """Betriebszustand ohne Inhalte und ohne Geheimnisse."""

    @abstractmethod
    def _schreiben(self, satz: Datensatz) -> None: ...

    @abstractmethod
    def _lesen(self, mandant: Mandant, kennung: str) -> Datensatz | None: ...

    @abstractmethod
    def _suchen(self, mandant: Mandant, frage: str,
                art: Inhaltsart | None) -> Iterable[tuple[Datensatz, float]]:
        """Beste Treffer zuerst; die Basisklasse filtert und begrenzt."""

    @abstractmethod
    def _alle(self, mandant: Mandant) -> Iterable[Datensatz]: ...

    @abstractmethod
    def _entfernen(self, mandant: Mandant, kennungen: tuple[str, ...]) -> None: ...

    # ---- Schutz -------------------------------------------------------------------

    @staticmethod
    def _eigen(mandant: Mandant, satz: object) -> None:
        if type(satz) is not Datensatz or satz.mandant != mandant:
            raise Mandantenverletzung("implementierung_lieferte_fremden_mandanten")
