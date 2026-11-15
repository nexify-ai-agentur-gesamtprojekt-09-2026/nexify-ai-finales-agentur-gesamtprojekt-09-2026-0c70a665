"""Tagesbericht an den Inhaber: ein Bericht je Kalendertag, aus belegten Quellen.

Der Bericht fasst nur zusammen, was gelesen werden kann: Merges auf ``main``
(Git), die Lage der anderen Automatisierungen (Zustandsordner), fällige
Zugänge (Lösungsregister) und endgültig fehlgeschlagene Wirkungen. Was keine
Quelle hat, steht als „nicht erhoben“ im Bericht, nicht als Null.

Kein Modellaufruf: Der Bericht ist eine feste Zusammenstellung.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import fristen
import kern
import zustellung

KENNUNG = "tagesbericht"


def _git_merges(repo: Path) -> list[str] | None:
    """Betreffzeilen der Commits auf origin/main der letzten 24 Stunden; None, wenn Git nichts liefert."""
    try:
        ausgabe = subprocess.run(  # noqa: S603 - fester Befehl ohne Eingaben von außen
            ["git", "-C", str(repo), "log", "--since=24 hours ago", "--first-parent", "--format=%h %s", "origin/main"],
            capture_output=True, text=True, timeout=30, check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if ausgabe.returncode != 0:
        return None
    return [zeile[:140] for zeile in ausgabe.stdout.splitlines() if zeile.strip()]


def _offene_prs(pfad: Path | None) -> list[dict] | None:
    """Optionale Liste offener Pull Requests, die der Aufrufer bereitstellt (JSON-Liste mit number, title, draft)."""
    if pfad is None or not Path(pfad).exists():
        return None
    daten = json.loads(Path(pfad).read_text(encoding="utf-8"))
    return [d for d in daten if isinstance(d, dict) and "number" in d] if isinstance(daten, list) else None


def baue_bericht(konfig: dict, zustand: kern.Zustand, *, umgebung: dict | None, merges, prs, register_pfad=fristen.REGISTER) -> str:
    eintrag = kern.automatisierung(konfig, KENNUNG)
    jetzt = zustand.uhr()
    tag = kern.ortstag(jetzt, konfig.get("zeitzone", "Europe/Amsterdam"))
    z: list[str] = [
        f"Stand: {tag}, erzeugt {jetzt.strftime('%H:%M')} UTC. Automatisch zusammengestellt; keine Freigabe, keine Abnahme.",
        "",
        "## 1. Merges auf main (24 Stunden)",
    ]
    if merges is None:
        z.append("- nicht erhoben (Git lieferte kein Ergebnis)")
    elif not merges:
        z.append("- keine")
    else:
        z += [f"- {m}" for m in merges[:15]]
        if len(merges) > 15:
            z.append(f"- … und {len(merges) - 15} weitere")

    z += ["", "## 2. Offene Pull Requests"]
    if prs is None:
        z.append("- nicht erhoben (keine Liste übergeben)")
    else:
        entwuerfe = sum(1 for p in prs if p.get("draft"))
        z.append(f"- {len(prs)} offen, davon {entwuerfe} Entwürfe")

    z += ["", "## 3. Erreichbarkeit (Außenwächter)"]
    lage = zustand.merker("waechter", "lage")
    if lage is None:
        z.append("- nicht erhoben (Wächter ist nicht gelaufen)")
    else:
        z.append(f"- zuletzt geprüft: {lage['geprueft']}")
        for ziel in lage["ziele"]:
            if ziel["zustand"] != "ok":
                zusatz = " (bekannter Befund, kein Alarm)" if ziel.get("nur_bericht") else ""
                z.append(f"- {ziel['id']}: {ziel['zustand']}, Status {ziel['status']}, seit {ziel['seit'] or 'diesem Lauf'}{zusatz}")
        if all(ziel["zustand"] == "ok" for ziel in lage["ziele"]):
            z.append(f"- alle {len(lage['ziele'])} Ziele antworten wie erwartet")

    z += ["", "## 4. Anfragen"]
    lage = zustand.merker("anfragen", "lage")
    if lage is None:
        z.append("- nicht erhoben (Nachverfolgung ist nicht gelaufen)")
    else:
        z.append(f"- offen: {lage['offen']}, über der Antwortfrist: {len(lage['ueberfaellig'])}")
        z += [f"- {u['anfrage_id']} ({u['art']}): {u['werktage']} Werktag(e) offen" for u in lage["ueberfaellig"][:10]]

    z += ["", "## 5. Fristen und Zugänge"]
    try:
        zugaenge = fristen.faellige_zugaenge(register_pfad)
        z.append(f"- Zugänge mit fälliger Erneuerung laut Lösungsregister: {len(zugaenge)}")
    except (OSError, ValueError, KeyError):
        z.append("- Lösungsregister nicht lesbar")
    lage = zustand.merker("fristen", "lage")
    for termin in (lage or {}).get("termine", []):
        if termin["stufe"]:
            z.append(f"- {termin['id']}: fällig {termin['faellig']} ({termin['stufe']})")

    z += ["", "## 6. Fehlgeschlagene Automatisierungen"]
    fehler = zustand.offene_fehler()
    if not fehler:
        z.append("- keine")
    else:
        z += [f"- {f['zeit'][:16]} {f['automatisierung']}: {f['grund'][:100]} ({f['versuche']} Versuche)" for f in fehler[-10:]]

    z += ["", "## 7. Kosten", "- nicht erhoben (keine Kostenquelle angebunden; Modellaufrufe dieser Automatisierungen: 0)"]

    z += ["", "## 8. Schalter"]
    for a in konfig["automatisierungen"]:
        z.append(f"- {a['id']}: {'EIN' if kern.ist_ein(konfig, a['id'], umgebung) else 'aus'}")
    grenze = int(eintrag["grenzen"].get("max_zeilen", 60))
    if len(z) > grenze:
        z = z[: grenze - 1] + [f"(gekürzt auf {grenze} Zeilen)"]
    return "\n".join(z)


def lauf(konfig: dict, zustand: kern.Zustand, *, umgebung: dict | None = None, git_merges=_git_merges, pr_liste: Path | None = None,
         register_pfad=fristen.REGISTER, transport=None, erzwungen: bool = False) -> dict:
    schalter = kern.schalterzustand(konfig, KENNUNG, umgebung)
    if not schalter["ein"] and not erzwungen:
        return kern.aus(KENNUNG, schalter)
    tag = kern.ortstag(zustand.uhr(), konfig.get("zeitzone", "Europe/Amsterdam"))
    schluessel = kern.schluessel("tagesbericht", tag)
    if (zustand.status(KENNUNG, f"{KENNUNG}:{schluessel}:datei") or {}).get("status") == kern.ERLEDIGT:
        # Zweiter Auslöser am selben Tag: kein zweiter Bericht, auch keine erneute Erhebung.
        zustand.protokoll(KENNUNG, kern.DOPPELT, schluessel=schluessel)
        return {"automatisierung": KENNUNG, "status": "gelaufen", "tag": tag, "wirkungen": 0, "zustellung": {"datei": {"ergebnis": kern.DOPPELT}}}
    text = baue_bericht(konfig, zustand, umgebung=umgebung, merges=git_merges(kern.ROOT), prs=_offene_prs(pr_liste), register_pfad=register_pfad)
    argumente = {"umgebung": umgebung}
    if transport is not None:
        argumente["transport"] = transport
    zugestellt = zustellung.zustellen(konfig, zustand, KENNUNG, schluessel, f"NeXify Tagesbericht {tag}", text, **argumente)
    wirkungen = sum(1 for e in zugestellt.values() if e.get("ergebnis") == kern.ERLEDIGT)
    zustand.protokoll(KENNUNG, "lauf", tag=tag, wirkungen=wirkungen)
    return {"automatisierung": KENNUNG, "status": "gelaufen", "tag": tag, "wirkungen": wirkungen, "zustellung": zugestellt, "bericht": text}
