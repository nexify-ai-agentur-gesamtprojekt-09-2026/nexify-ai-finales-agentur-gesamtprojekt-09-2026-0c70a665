#!/usr/bin/env python3
"""Befehlszeile der vorbereiteten Automatisierungen.

  python3 ops/automatisierung/cli.py status
      Zeigt Schalter und Kanäle. Liest nur, schreibt nichts, kein Netz.

  python3 ops/automatisierung/cli.py lauf <kennung> [--ereignisse datei.json] [--pr-liste datei.json]
      Ein Lauf, wie ihn ein Zeitplan auslöst. Ist die Automatisierung aus,
      endet der Lauf ohne Wirkung mit Exit 0 und der Ausgabe "status": "aus".

  python3 ops/automatisierung/cli.py probe <kennung> --ausgabe <ordner> [--eingabe datei.json]
      Probelauf mit Testdaten: schreibt ausschließlich in <ordner>, sendet
      nichts und ruft keine Adresse ab. Braucht keinen Schalter.

Kennungen: tagesbericht, waechter, anfragen, fristen.
Exit 0 = gelaufen oder aus; 1 = endgültig fehlgeschlagene Wirkung; 2 = Aufruf oder Konfiguration fehlerhaft.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import anfragen  # noqa: E402
import fristen  # noqa: E402
import kern  # noqa: E402
import tagesbericht  # noqa: E402
import waechter  # noqa: E402
import zustellung  # noqa: E402

KENNUNGEN = ("tagesbericht", "waechter", "anfragen", "fristen")


def _lies_json(pfad: str | None):
    if not pfad:
        return None
    return json.loads(Path(pfad).read_text(encoding="utf-8"))


def _als_liste(daten) -> list:
    if daten is None:
        return []
    return daten if isinstance(daten, list) else [daten]


def _endgueltig(ergebnis: dict) -> bool:
    eintraege = ergebnis.get("zustellung", [])
    eintraege = eintraege if isinstance(eintraege, list) else [eintraege]
    return any(k.get("ergebnis") == kern.ENDGUELTIG for e in eintraege for k in e.values())


def status(konfig: dict, umgebung=None) -> dict:
    return {
        "zustand": konfig.get("zustand"),
        "automatisierungen": [kern.schalterzustand(konfig, a["id"], umgebung) for a in konfig["automatisierungen"]],
        "kanaele": [zustellung.kanal_bereit(konfig, k, umgebung) for k in konfig.get("zustellung", {}) if not k.startswith("$")],
        "llm_aufrufe_erlaubt": kern.llm_erlaubt(konfig),
    }


def lauf(konfig: dict, kennung: str, zustand: kern.Zustand, args, *, umgebung=None, erzwungen=False, probe=False) -> dict:
    if kennung == "tagesbericht":
        zusatz = {"git_merges": (lambda _repo: _lies_json(args.eingabe))} if probe else {}
        return tagesbericht.lauf(konfig, zustand, umgebung=umgebung, pr_liste=Path(args.pr_liste) if getattr(args, "pr_liste", None) else None,
                                 erzwungen=erzwungen, **zusatz)
    if kennung == "waechter":
        zusatz = {}
        if probe:
            # Probe: Statuscodes kommen aus der Eingabedatei ({"<ziel-id>": 200, …}); keine Adresse wird abgerufen.
            antworten = _lies_json(args.eingabe) or {}
            nach_url = {z["url"]: int(antworten.get(z["id"], 200)) for z in kern.automatisierung(konfig, kennung)["ziele"]}
            zusatz["abruf"] = lambda url, _zeitlimit: nach_url[url]
        return waechter.lauf(konfig, zustand, umgebung=umgebung, erzwungen=erzwungen, **zusatz)
    if kennung == "anfragen":
        quelle = args.eingabe if probe else getattr(args, "ereignisse", None)
        return anfragen.lauf(konfig, zustand, ereignisse=_als_liste(_lies_json(quelle)), umgebung=umgebung, erzwungen=erzwungen)
    if kennung == "fristen":
        return fristen.lauf(konfig, zustand, umgebung=umgebung, erzwungen=erzwungen)
    raise kern.Konfigurationsfehler(f"unbekannte Automatisierung: {kennung}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Vorbereitete Automatisierungen (Standard: aus)")
    unter = parser.add_subparsers(dest="befehl", required=True)
    unter.add_parser("status")
    p_lauf = unter.add_parser("lauf")
    p_lauf.add_argument("kennung", choices=KENNUNGEN)
    p_lauf.add_argument("--ereignisse")
    p_lauf.add_argument("--pr-liste", dest="pr_liste")
    p_probe = unter.add_parser("probe")
    p_probe.add_argument("kennung", choices=KENNUNGEN)
    p_probe.add_argument("--ausgabe", required=True)
    p_probe.add_argument("--eingabe")
    args = parser.parse_args(argv)
    try:
        konfig = kern.lade_konfiguration()
        if args.befehl == "status":
            print(json.dumps(status(konfig), ensure_ascii=False, indent=2))
            return 0
        if args.befehl == "probe":
            # Leere Umgebung: kein Mailkanal kann bereit sein, kein Schalter wird gelesen.
            zustand = kern.Zustand(Path(args.ausgabe), zeitzone=konfig.get("zeitzone", "Europe/Amsterdam"))
            ergebnis = lauf(konfig, args.kennung, zustand, args, umgebung={}, erzwungen=True, probe=True)
        else:
            if not kern.ist_ein(konfig, args.kennung):
                # Aus: nichts lesen, nichts anlegen.
                print(json.dumps(kern.aus(args.kennung, kern.schalterzustand(konfig, args.kennung)), ensure_ascii=False))
                return 0
            zustand = kern.Zustand(kern.zustandsordner(konfig), zeitzone=konfig.get("zeitzone", "Europe/Amsterdam"))
            ergebnis = lauf(konfig, args.kennung, zustand, args)
        zustand.schliessen()
    except (kern.Konfigurationsfehler, OSError, json.JSONDecodeError) as fehler:
        print(json.dumps({"status": "fehler", "grund": f"{type(fehler).__name__}: {fehler}"}, ensure_ascii=False), file=sys.stderr)
        return 2
    ergebnis.pop("bericht", None)
    print(json.dumps(ergebnis, ensure_ascii=False, indent=2))
    return 1 if _endgueltig(ergebnis) else 0


if __name__ == "__main__":
    raise SystemExit(main())
