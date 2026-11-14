"""Arbeitsspeicher-Implementierung für Tests und Entwicklung. Nicht dauerhaft."""
from __future__ import annotations

import re
from typing import Iterable

from .port import WissensPort
from .typen import Datensatz, Inhaltsart, Mandant, Zustand

_WORT = re.compile(r"\w+", re.UNICODE)


def woerter(text: str) -> frozenset[str]:
    return frozenset(w.casefold() for w in _WORT.findall(text))


class ArbeitsspeicherWissen(WissensPort):
    """Ein getrenntes Fach je Mandant; es gibt keine Abfrage über Fächer hinweg."""

    def __init__(self, **kw) -> None:
        super().__init__(**kw)
        self.__faecher: dict[str, dict[str, Datensatz]] = {}

    def zustand(self) -> Zustand:
        return Zustand(True, "arbeitsspeicher", None, True, None)

    def __fach(self, mandant: Mandant) -> dict[str, Datensatz]:
        return self.__faecher.setdefault(mandant.kennung, {})

    def _schreiben(self, satz: Datensatz) -> None:
        self.__fach(satz.mandant)[satz.kennung] = satz

    def _lesen(self, mandant: Mandant, kennung: str) -> Datensatz | None:
        return self.__fach(mandant).get(kennung)

    def _suchen(self, mandant: Mandant, frage: str,
                art: Inhaltsart | None) -> Iterable[tuple[Datensatz, float]]:
        gesucht = woerter(frage)
        funde = []
        for satz in self.__fach(mandant).values():
            gemeinsam = gesucht & woerter(satz.eintrag.inhalt)
            if gemeinsam:
                funde.append((satz, len(gemeinsam) / len(gesucht)))
        funde.sort(key=lambda f: (-f[1], f[0].kennung))
        return funde

    def _alle(self, mandant: Mandant) -> Iterable[Datensatz]:
        return tuple(self.__fach(mandant).values())

    def _entfernen(self, mandant: Mandant, kennungen: tuple[str, ...]) -> None:
        fach = self.__fach(mandant)
        for kennung in kennungen:
            fach.pop(kennung, None)
