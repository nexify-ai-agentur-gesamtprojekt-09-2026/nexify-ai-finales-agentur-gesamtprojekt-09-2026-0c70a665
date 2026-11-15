"""Anfrage-Nachverfolgung: aus jeder eingegangenen Anfrage wird ein Vorgang mit Antwortfrist.

Dieses Modul empfängt keine Anfragen und antwortet niemandem. Es bekommt
Ereignisse vom Empfänger der Anfrage (heute: Ereignisdatei; später der Aufruf
aus dem Empfänger) und erinnert intern, wenn eine Anfrage zu lange offen ist.

Gespeichert wird je Vorgang nur: Kennung, Art, Zeitpunkt des Eingangs, Zustand.
Kein Name, keine Adresse, kein Text der Anfrage. Der Inhalt bleibt dort, wo
die Anfrage gespeichert ist.

Ereignisse (JSON, ein Objekt oder eine Liste):
  {"ereignis": "anfrage.eingegangen", "anfrage_id": "…", "art": "kontakt", "eingegangen": "2026-11-16T09:12:00+00:00"}
  {"ereignis": "anfrage.beantwortet", "anfrage_id": "…"}
"""
from __future__ import annotations

import datetime as dt
import re

import kern
import zustellung

KENNUNG = "anfragen"
KENNUNG_FORM = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$")
ERLAUBTE_FELDER = {"ereignis", "anfrage_id", "art", "eingegangen"}


class Ereignisfehler(ValueError):
    pass


def werktage_zwischen(von: dt.datetime, bis: dt.datetime) -> int:
    """Volle Werktage (Montag bis Freitag) nach dem Tag des Eingangs bis einschließlich heute."""
    tag, ende, zahl = von.date(), bis.date(), 0
    while tag < ende:
        tag += dt.timedelta(days=1)
        if tag.weekday() < 5:
            zahl += 1
    return zahl


def _pruefe(ereignis: dict, arten: list[str]) -> dict:
    if not isinstance(ereignis, dict):
        raise Ereignisfehler("Ereignis ist kein Objekt")
    zusatz = set(ereignis) - ERLAUBTE_FELDER
    if zusatz:
        # Zusätzliche Felder könnten personenbezogene Angaben tragen; sie werden nicht stillschweigend übernommen.
        raise Ereignisfehler(f"nicht erlaubte Felder: {', '.join(sorted(zusatz))}")
    kennung = str(ereignis.get("anfrage_id", ""))
    if not KENNUNG_FORM.match(kennung):
        raise Ereignisfehler("anfrage_id fehlt oder hat eine unzulässige Form")
    name = ereignis.get("ereignis")
    if name == "anfrage.eingegangen":
        if ereignis.get("art") not in arten:
            raise Ereignisfehler("Art der Anfrage ist nicht bekannt")
        try:
            eingang = dt.datetime.fromisoformat(str(ereignis.get("eingegangen")))
        except ValueError as fehler:
            raise Ereignisfehler("eingegangen ist kein Zeitpunkt") from fehler
        if eingang.tzinfo is None:
            raise Ereignisfehler("eingegangen braucht eine Zeitzone")
        return {"ereignis": name, "anfrage_id": kennung, "art": ereignis["art"], "eingegangen": eingang.isoformat()}
    if name == "anfrage.beantwortet":
        return {"ereignis": name, "anfrage_id": kennung}
    raise Ereignisfehler("unbekanntes Ereignis")


def lauf(konfig: dict, zustand: kern.Zustand, *, ereignisse: list | None = None, umgebung: dict | None = None,
         transport=None, erzwungen: bool = False) -> dict:
    schalter = kern.schalterzustand(konfig, KENNUNG, umgebung)
    if not schalter["ein"] and not erzwungen:
        return kern.aus(KENNUNG, schalter)
    eintrag = kern.automatisierung(konfig, KENNUNG)
    fristen = eintrag["fristen"]
    jetzt = zustand.uhr()
    offen: list[str] = list(zustand.merker(KENNUNG, "offen", []))
    abgelehnt = 0
    neu = 0

    for roh in ereignisse or []:
        try:
            ereignis = _pruefe(roh, eintrag["arten"])
        except Ereignisfehler as fehler:
            abgelehnt += 1
            zustand.protokoll(KENNUNG, "ereignis_abgelehnt", grund=str(fehler))
            continue
        kennung = ereignis["anfrage_id"]
        vorgang = zustand.merker(KENNUNG, f"vorgang:{kennung}")
        if ereignis["ereignis"] == "anfrage.eingegangen":
            if vorgang is not None:
                # Derselbe Eingang ein zweites Mal: ein Vorgang, keine zweite Wirkung.
                zustand.protokoll(KENNUNG, kern.DOPPELT, schluessel=kern.schluessel(kennung))
                continue
            zustand.merke(KENNUNG, f"vorgang:{kennung}", {"art": ereignis["art"], "eingegangen": ereignis["eingegangen"], "zustand": "offen"})
            offen.append(kennung)
            neu += 1
            zustand.protokoll(KENNUNG, "vorgang_angelegt", schluessel=kern.schluessel(kennung), art=ereignis["art"])
        elif vorgang is not None and vorgang["zustand"] == "offen":
            zustand.merke(KENNUNG, f"vorgang:{kennung}", dict(vorgang, zustand="beantwortet", beantwortet=jetzt.isoformat()))
            offen = [k for k in offen if k != kennung]
            zustand.protokoll(KENNUNG, "vorgang_beantwortet", schluessel=kern.schluessel(kennung))
    zustand.merke(KENNUNG, "offen", offen)

    zugestellt = []
    ueberfaellig = []
    for kennung in offen:
        vorgang = zustand.merker(KENNUNG, f"vorgang:{kennung}")
        tage = werktage_zwischen(dt.datetime.fromisoformat(vorgang["eingegangen"]), jetzt)
        if tage >= int(fristen["antwort_werktage"]):
            ueberfaellig.append({"anfrage_id": kennung, "art": vorgang["art"], "werktage": tage})
        erreichte = [s for s in fristen["erinnerungsstufen_werktage"] if tage >= int(s)]
        if not erreichte:
            continue
        stufe = max(erreichte)
        text = zustellung.vorlage(
            "anfrage-erinnerung.md", ANFRAGE=kennung, ART=vorgang["art"], EINGEGANGEN=vorgang["eingegangen"],
            WERKTAGE=tage, FRIST=fristen["antwort_werktage"], STUFE=stufe,
        )
        argumente = {"umgebung": umgebung}
        if transport is not None:
            argumente["transport"] = transport
        zugestellt.append(zustellung.zustellen(
            konfig, zustand, KENNUNG, kern.schluessel(kennung, "stufe", stufe),
            f"Anfrage {kennung} seit {tage} Werktag(en) offen", text, **argumente,
        ))
    zustand.merke(KENNUNG, "lage", {"geprueft": jetzt.isoformat(), "offen": len(offen), "ueberfaellig": ueberfaellig})
    zustand.protokoll(KENNUNG, "lauf", neu=neu, offen=len(offen), ueberfaellig=len(ueberfaellig), abgelehnt=abgelehnt)
    return {"automatisierung": KENNUNG, "status": "gelaufen", "neu": neu, "offen": len(offen), "ueberfaellig": ueberfaellig,
            "abgelehnt": abgelehnt, "wirkungen": len(zugestellt), "zustellung": zugestellt}
