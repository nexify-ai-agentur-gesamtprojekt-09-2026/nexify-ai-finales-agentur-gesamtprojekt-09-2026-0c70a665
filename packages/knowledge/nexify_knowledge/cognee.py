"""Adapter-GERÜST für einen selbst betriebenen Cognee-Speicher.

Stand: Entwurf. Dieses Modul spricht selbst mit keinem Dienst. Es enthält
nur die Regeln, die NICHT in Cognee liegen dürfen:

- Mandant → eigener Datensatz je Mandant und Inhaltsart, Name nur aus
  Server-Kennungen (`t-<mandant>--<art>`).
- Start nur mit vollständiger, ausdrücklicher Konfiguration. Es gibt keinen
  einzigen Standardwert; ein fehlender Wert führt nie zu einem Fremdanbieter.
- Einbettungen rechnet ein injizierter LOKALER Einbetter.
- Ein Sprachmodell wird nur über einen injizierten Aufrufer erreicht, der an
  den eigenen Router gebunden ist – oder ausdrücklich gar nicht.
- Zugriffskontrolle des Speichers muss vom Transport als eingeschaltet
  gemeldet werden.

Die eigentliche Anbindung (HTTP/SDK zu Cognee) ist die Naht `CogneeTransport`
und wird hier bewusst NICHT mitgeliefert: Sie ist ohne laufende, vermessene
Cognee-Instanz nicht belegbar. Getestet ist der Adapter gegen eine Attrappe.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Mapping, Protocol, Sequence, runtime_checkable

from .port import WissensPort
from .typen import (
    AdapterNichtKonfiguriert, Datensatz, Herkunft, Inhaltsart, Mandant, Rechtsgrundlage,
    Wissenseintrag, Zustand,
)

ROUTE_EIGENER_ROUTER = "eigener_router"
ANBIETER_LOKAL = "lokal"


class _OhneSprachmodell:
    """Ausdrückliche Wahl: Betrieb ohne Sprachmodell (nur Treffer, keine Verdichtung)."""

    def __repr__(self) -> str:
        return "OHNE_SPRACHMODELL"


OHNE_SPRACHMODELL = _OhneSprachmodell()


@runtime_checkable
class LokalerEinbetter(Protocol):
    lokal: bool      # muss exakt True sein
    anbieter: str    # muss exakt "lokal" sein
    modell: str      # Kennung des Einbettungsmodells, erscheint in zustand()

    def einbetten(self, texte: Sequence[str]) -> Sequence[Sequence[float]]: ...


@runtime_checkable
class RouterAufrufer(Protocol):
    """Der eigene Router. Die Modell-Policy prüft der Agentenkern, nicht dieses Paket."""

    route: str       # muss exakt "eigener_router" sein

    def aufrufen(self, anfrage: Mapping[str, object]) -> Mapping[str, object]: ...


@runtime_checkable
class CogneeTransport(Protocol):
    """Schmale, von NeXify definierte Naht. Kein Abbild einer Cognee-API."""

    def zustand(self) -> Mapping[str, object]:
        """Pflichtschlüssel: zugriffskontrolle_an, sprachmodell_anbieter, einbettung_anbieter."""

    def schreiben(self, datensatz: str, kennung: str, text: str, vektor: Sequence[float],
                  metadaten: Mapping[str, object]) -> None: ...

    def lesen(self, datensatz: str, kennung: str) -> Mapping[str, object] | None: ...

    def suchen(self, datensatz: str, frage: str,
               vektor: Sequence[float]) -> Sequence[tuple[str, float]]: ...

    def auflisten(self, datensatz: str) -> Sequence[str]: ...

    def entfernen(self, datensatz: str, kennungen: Sequence[str]) -> None: ...


@dataclass(frozen=True, slots=True)
class CogneeKonfiguration:
    """Alle Felder sind Pflicht. Bewusst ohne Standardwerte."""

    transport: CogneeTransport
    einbetter: LokalerEinbetter
    sprachmodell: RouterAufrufer | _OhneSprachmodell
    zugriffskontrolle_erzwungen: bool


_HINWEIS = (
    "Cognee-Adapter nicht konfiguriert: transport, einbetter, sprachmodell und "
    "zugriffskontrolle_erzwungen muessen ausdruecklich uebergeben werden. Es gibt keine "
    "Standardwerte und keinen Rueckfall auf einen Fremdanbieter."
)


def _verweigern(grund: str) -> AdapterNichtKonfiguriert:
    return AdapterNichtKonfiguriert(f"{_HINWEIS} Grund: {grund}")


def datensatz_name(mandant: Mandant, art: Inhaltsart) -> str:
    """Trenngrenze im Speicher. Eine Mandantenkennung enthält nie `--`."""
    return f"t-{mandant.kennung}--{art.value}"


def _zeit(wert: object) -> datetime | None:
    return None if wert is None else datetime.fromisoformat(str(wert))


class CogneeAdapter(WissensPort):
    def __init__(self, konfiguration: CogneeKonfiguration, **kw) -> None:
        super().__init__(**kw)
        if type(konfiguration) is not CogneeKonfiguration:
            raise _verweigern("keine_konfiguration")
        self.__k = konfiguration
        self.__startpruefung()

    def __startpruefung(self) -> Mapping[str, object]:
        k = self.__k
        if not isinstance(k.transport, CogneeTransport):
            raise _verweigern("transport_fehlt")
        e = k.einbetter
        if (not isinstance(e, LokalerEinbetter) or e.lokal is not True or e.anbieter != ANBIETER_LOKAL
                or type(e.modell) is not str or not e.modell):
            raise _verweigern("einbetter_muss_lokal_sein")
        ohne = k.sprachmodell is OHNE_SPRACHMODELL
        if not ohne and (not isinstance(k.sprachmodell, RouterAufrufer)
                         or k.sprachmodell.route != ROUTE_EIGENER_ROUTER):
            raise _verweigern("sprachmodell_nur_ueber_eigenen_router_oder_ausdruecklich_ohne")
        if k.zugriffskontrolle_erzwungen is not True:
            raise _verweigern("zugriffskontrolle_muss_erzwungen_sein")
        gemeldet = k.transport.zustand()
        if not isinstance(gemeldet, Mapping) or gemeldet.get("zugriffskontrolle_an") is not True:
            raise _verweigern("speicher_meldet_zugriffskontrolle_nicht_an")
        if gemeldet.get("einbettung_anbieter") != ANBIETER_LOKAL:
            raise _verweigern("speicher_nutzt_keine_lokale_einbettung")
        if gemeldet.get("sprachmodell_anbieter") != (None if ohne else ROUTE_EIGENER_ROUTER):
            raise _verweigern("speicher_nutzt_anderen_sprachmodell_anbieter")
        return gemeldet

    def zustand(self) -> Zustand:
        self.__startpruefung()
        ohne = self.__k.sprachmodell is OHNE_SPRACHMODELL
        return Zustand(True, "cognee_adapter_geruest", self.__k.einbetter.modell, True,
                       None if ohne else ROUTE_EIGENER_ROUTER)

    # ---- Implementierung über die Naht ---------------------------------------------

    def __vektor(self, text: str) -> Sequence[float]:
        vektoren = self.__k.einbetter.einbetten([text])
        if len(vektoren) != 1:
            raise _verweigern("einbetter_lieferte_keinen_vektor")
        return vektoren[0]

    def _schreiben(self, satz: Datensatz) -> None:
        e = satz.eintrag
        metadaten = {
            "mandant": satz.mandant.kennung,
            "quelle": e.herkunft.quelle,
            "zeitpunkt": e.herkunft.zeitpunkt.isoformat(),
            "art": e.herkunft.art.value,
            "rechtsgrundlage": None if e.rechtsgrundlage is None else e.rechtsgrundlage.value,
            "einwilligung_ref": e.einwilligung_ref,
            "loeschen_ab": None if e.loeschen_ab is None else e.loeschen_ab.isoformat(),
            "betroffene_person": e.betroffene_person,
            "gespraech": e.gespraech,
            "gespeichert_am": satz.gespeichert_am.isoformat(),
            "inhalt_sha256": e.inhalt_sha256,
            "einbettungsmodell": self.__k.einbetter.modell,
        }
        self.__k.transport.schreiben(datensatz_name(satz.mandant, e.herkunft.art), satz.kennung,
                                     e.inhalt, self.__vektor(e.inhalt), metadaten)

    def __aus_roh(self, kennung: str, roh: Mapping[str, object]) -> Datensatz:
        m = roh["metadaten"]
        eintrag = Wissenseintrag(
            inhalt=roh["text"],
            herkunft=Herkunft(m["quelle"], _zeit(m["zeitpunkt"]), Inhaltsart(m["art"])),
            rechtsgrundlage=None if m["rechtsgrundlage"] is None else Rechtsgrundlage(m["rechtsgrundlage"]),
            einwilligung_ref=m["einwilligung_ref"],
            loeschen_ab=_zeit(m["loeschen_ab"]),
            betroffene_person=m["betroffene_person"],
            gespraech=m["gespraech"],
        )
        # Der Mandant kommt aus den gespeicherten Metadaten; die Basisklasse
        # verwirft jeden Satz, der nicht dem anfragenden Mandanten gehört.
        return Datensatz(kennung, Mandant(m["mandant"]), eintrag, _zeit(m["gespeichert_am"]))

    def _lesen(self, mandant: Mandant, kennung: str) -> Datensatz | None:
        for art in Inhaltsart:
            roh = self.__k.transport.lesen(datensatz_name(mandant, art), kennung)
            if roh is not None:
                return self.__aus_roh(kennung, roh)
        return None

    def _suchen(self, mandant: Mandant, frage: str,
                art: Inhaltsart | None) -> Iterable[tuple[Datensatz, float]]:
        vektor = self.__vektor(frage)
        funde: list[tuple[Datensatz, float]] = []
        for a in ((art,) if art is not None else tuple(Inhaltsart)):
            name = datensatz_name(mandant, a)
            for kennung, wertung in self.__k.transport.suchen(name, frage, vektor):
                roh = self.__k.transport.lesen(name, kennung)
                if roh is not None:
                    funde.append((self.__aus_roh(kennung, roh), float(wertung)))
        funde.sort(key=lambda f: (-f[1], f[0].kennung))
        return funde

    def _alle(self, mandant: Mandant) -> Iterable[Datensatz]:
        saetze = []
        for art in Inhaltsart:
            name = datensatz_name(mandant, art)
            for kennung in self.__k.transport.auflisten(name):
                roh = self.__k.transport.lesen(name, kennung)
                if roh is not None:
                    saetze.append(self.__aus_roh(kennung, roh))
        return saetze

    def _entfernen(self, mandant: Mandant, kennungen: tuple[str, ...]) -> None:
        for art in Inhaltsart:
            self.__k.transport.entfernen(datensatz_name(mandant, art), kennungen)
