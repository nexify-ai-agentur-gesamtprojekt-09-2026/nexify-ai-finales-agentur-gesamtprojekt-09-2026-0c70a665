"""Außenwächter: prüft die Erreichbarkeit fester Adressen und meldet je Störung genau einmal.

Liest nur Statuscodes. Kein Inhalt, keine Anmeldung, kein Formular.
Ein einzelner Fehlversuch ist ein Verdacht; erst ``stoerung_ab_fehlversuchen``
aufeinanderfolgende Fehlversuche gelten als Störung. Je Störung geht ein
Alarm hinaus, bei Ende der Störung eine Entwarnung.

Ergänzt, ersetzt nicht: ``tools/live-check.mjs`` und ``tools/gleichmacher.mjs``
prüfen Inhalt und Gleichheit der Seiten, dieser Wächter nur „antwortet oder
antwortet nicht“.
"""
from __future__ import annotations

import urllib.error
import urllib.request

import kern
import zustellung

KENNUNG = "waechter"


def _abruf(url: str, zeitlimit: float) -> int:
    anfrage = urllib.request.Request(url, method="GET", headers={"User-Agent": "nexify-waechter/1"})
    try:
        with urllib.request.urlopen(anfrage, timeout=zeitlimit) as antwort:  # noqa: S310 - Adressen stehen fest in der Konfiguration
            return antwort.status
    except urllib.error.HTTPError as fehler:
        return fehler.code


def pruefe_ziele(eintrag: dict, abruf) -> list[dict]:
    ergebnisse = []
    for ziel in eintrag["ziele"]:
        if not str(ziel["url"]).startswith("https://"):
            raise kern.Konfigurationsfehler(f"Ziel {ziel['id']}: nur https-Adressen")
        try:
            status = abruf(ziel["url"], float(eintrag["grenzen"].get("zeitlimit_je_abruf_s", 10)))
            hinweis = ""
        except Exception as fehler:  # noqa: BLE001 - Zeitüberschreitung, DNS, TLS: alles „antwortet nicht“
            status, hinweis = 0, type(fehler).__name__
        ergebnisse.append({"id": ziel["id"], "status": status, "ok": status in ziel["erwartet"], "hinweis": hinweis})
    return ergebnisse


def lauf(konfig: dict, zustand: kern.Zustand, *, umgebung: dict | None = None, abruf=_abruf, transport=None, erzwungen: bool = False) -> dict:
    schalter = kern.schalterzustand(konfig, KENNUNG, umgebung)
    if not schalter["ein"] and not erzwungen:
        return kern.aus(KENNUNG, schalter)
    eintrag = kern.automatisierung(konfig, KENNUNG)
    schwelle = int(eintrag["grenzen"].get("stoerung_ab_fehlversuchen", 2))
    jetzt = zustand.uhr().isoformat()
    meldungen: list[tuple[str, str, str]] = []
    lage = []
    for ziel, ergebnis in zip(eintrag["ziele"], pruefe_ziele(eintrag, abruf)):
        vorher = zustand.merker(KENNUNG, f"ziel:{ziel['id']}", {"zustand": "ok", "fehlversuche": 0, "seit": None})
        nachher = dict(vorher, letzter_status=ergebnis["status"], geprueft=jetzt)
        nur_bericht = ziel.get("nur_bericht") is True
        if ergebnis["ok"]:
            if vorher["zustand"] == "gestoert" and not nur_bericht:
                meldungen.append((
                    kern.schluessel(ziel["id"], vorher["seit"], "entwarnung"),
                    f"Entwarnung: {ziel['id']} antwortet wieder",
                    zustellung.vorlage("entwarnung.md", ZIEL=ziel["id"], ADRESSE=ziel["url"], STATUS=ergebnis["status"], SEIT=vorher["seit"], JETZT=jetzt),
                ))
            nachher.update(zustand="ok", fehlversuche=0, seit=None)
        else:
            fehlversuche = int(vorher["fehlversuche"]) + 1
            nachher["fehlversuche"] = fehlversuche
            if fehlversuche >= schwelle and vorher["zustand"] != "gestoert":
                nachher.update(zustand="gestoert", seit=jetzt)
                if not nur_bericht:
                    meldungen.append((
                        kern.schluessel(ziel["id"], jetzt, "alarm"),
                        f"Störung: {ziel['id']} antwortet nicht wie erwartet",
                        zustellung.vorlage(
                            "alarm.md", ZIEL=ziel["id"], ADRESSE=ziel["url"], STATUS=ergebnis["status"] or ergebnis["hinweis"] or "keine Antwort",
                            ERWARTET=", ".join(str(s) for s in ziel["erwartet"]), FEHLVERSUCHE=fehlversuche, SEIT=jetzt,
                        ),
                    ))
            elif vorher["zustand"] != "gestoert":
                nachher["zustand"] = "verdacht"
        zustand.merke(KENNUNG, f"ziel:{ziel['id']}", nachher)
        lage.append({"id": ziel["id"], "zustand": nachher["zustand"], "status": ergebnis["status"], "seit": nachher["seit"], "nur_bericht": nur_bericht})
    zustand.merke(KENNUNG, "lage", {"geprueft": jetzt, "ziele": lage})
    zugestellt = []
    for schluessel, betreff, text in meldungen:
        argumente = {"umgebung": umgebung}
        if transport is not None:
            argumente["transport"] = transport
        zugestellt.append(zustellung.zustellen(konfig, zustand, KENNUNG, schluessel, betreff, text, **argumente))
    zustand.protokoll(KENNUNG, "lauf", ziele=len(lage), gestoert=sum(1 for z in lage if z["zustand"] == "gestoert"), meldungen=len(meldungen))
    return {"automatisierung": KENNUNG, "status": "gelaufen", "lage": lage, "wirkungen": len(meldungen), "zustellung": zugestellt}
