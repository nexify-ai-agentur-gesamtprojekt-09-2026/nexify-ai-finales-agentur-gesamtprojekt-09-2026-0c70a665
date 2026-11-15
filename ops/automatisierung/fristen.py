"""Wiedervorlage für Fristen und Zugänge.

Zwei Quellen, beide nur gelesen:

- ``config/loesungsregister.json``: Zugänge, die als offengelegt geführt sind
  oder deren Erneuerung fällig ist. Das Register enthält keine Werte, nur
  Bezeichnungen; mehr als die Bezeichnung erscheint auch hier nicht.
- ``termine`` in ``config/prozess-automatisierung.json``: datierte Fristen
  (zum Beispiel Ablauf einer Sicherung, Vertragsende), die der Inhaber oder
  die koordinierende Sitzung dort einträgt.

Je Eintrag und Stufe eine Meldung: Vorwarnung, fällig, danach je Kalenderwoche.
"""
from __future__ import annotations

import datetime as dt
import json
import re
from zoneinfo import ZoneInfo

import kern
import zustellung

KENNUNG = "fristen"
DATUM = re.compile(r"^\d{4}-\d{2}-\d{2}$")
REGISTER = kern.ROOT / "config" / "loesungsregister.json"


def faellige_zugaenge(register_pfad=REGISTER) -> list[dict]:
    daten = json.loads(register_pfad.read_text(encoding="utf-8"))
    treffer = []
    for loesung in daten.get("loesungen", []):
        for zugang in loesung.get("zugaenge", []):
            if zugang.get("erneuerung_faellig") is True or zugang.get("offengelegt") is True:
                treffer.append({
                    "loesung": loesung["id"],
                    "bezeichnung": zugang["bezeichnung"],
                    "offengelegt": zugang.get("offengelegt") is True,
                })
    return sorted(treffer, key=lambda z: (z["loesung"], z["bezeichnung"]))


def stufe_fuer(faellig: dt.date, heute: dt.date, vorwarnung_tage: int) -> str | None:
    abstand = (faellig - heute).days
    if abstand > vorwarnung_tage:
        return None
    if abstand > 0:
        return "vorwarnung"
    if abstand == 0:
        return "faellig"
    jahr, woche, _ = heute.isocalendar()
    return f"ueberfaellig-{jahr}-W{woche:02d}"


def lauf(konfig: dict, zustand: kern.Zustand, *, umgebung: dict | None = None, register_pfad=REGISTER,
         transport=None, erzwungen: bool = False) -> dict:
    schalter = kern.schalterzustand(konfig, KENNUNG, umgebung)
    if not schalter["ein"] and not erzwungen:
        return kern.aus(KENNUNG, schalter)
    eintrag = kern.automatisierung(konfig, KENNUNG)
    heute = zustand.uhr().astimezone(ZoneInfo(konfig.get("zeitzone", "Europe/Amsterdam"))).date()
    vorwarnung = int(eintrag["grenzen"].get("vorwarnung_tage", 7))
    argumente = {"umgebung": umgebung}
    if transport is not None:
        argumente["transport"] = transport
    zugestellt = []
    lage_termine = []

    for termin in eintrag.get("termine", []):
        if not isinstance(termin, dict) or not termin.get("id") or not DATUM.match(str(termin.get("faellig", ""))):
            zustand.protokoll(KENNUNG, "termin_abgelehnt", grund="id oder faellig (JJJJ-MM-TT) fehlt")
            continue
        faellig = dt.date.fromisoformat(termin["faellig"])
        stufe = stufe_fuer(faellig, heute, vorwarnung)
        lage_termine.append({"id": termin["id"], "faellig": termin["faellig"], "stufe": stufe})
        if stufe is None:
            continue
        text = zustellung.vorlage(
            "frist.md", TITEL=termin.get("titel", termin["id"]), FAELLIG=termin["faellig"], STUFE=stufe,
            TAGE=(faellig - heute).days, QUELLE=termin.get("quelle", "nicht angegeben"),
        )
        zugestellt.append(zustellung.zustellen(
            konfig, zustand, KENNUNG, kern.schluessel("termin", termin["id"], termin["faellig"], stufe),
            f"Frist: {termin.get('titel', termin['id'])} ({stufe})", text, **argumente,
        ))

    zugaenge = faellige_zugaenge(register_pfad)
    if zugaenge:
        jahr, woche, _ = heute.isocalendar()
        zeilen = "\n".join(
            f"- {z['loesung']}: {z['bezeichnung']}" + (" (als offengelegt geführt)" if z["offengelegt"] else "") for z in zugaenge
        )
        text = zustellung.vorlage("zugaenge.md", ANZAHL=len(zugaenge), LISTE=zeilen, WOCHE=f"{jahr}-W{woche:02d}")
        zugestellt.append(zustellung.zustellen(
            konfig, zustand, KENNUNG, kern.schluessel("zugaenge", jahr, woche),
            f"{len(zugaenge)} Zugänge zur Erneuerung fällig (Woche {woche})", text, **argumente,
        ))
    zustand.merke(KENNUNG, "lage", {"geprueft": zustand.uhr().isoformat(), "zugaenge_faellig": len(zugaenge), "termine": lage_termine})
    zustand.protokoll(KENNUNG, "lauf", zugaenge=len(zugaenge), termine=len(lage_termine), meldungen=len(zugestellt))
    return {"automatisierung": KENNUNG, "status": "gelaufen", "zugaenge_faellig": len(zugaenge), "termine": lage_termine,
            "wirkungen": len(zugestellt), "zustellung": zugestellt}
