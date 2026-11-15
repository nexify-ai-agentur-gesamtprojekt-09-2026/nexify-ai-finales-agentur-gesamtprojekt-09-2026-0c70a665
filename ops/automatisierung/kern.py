"""Gemeinsamer Kern der vorbereiteten Automatisierungen.

Stellt bereit, was jede Automatisierung braucht, und sonst nichts:

- Schalter: Eine Automatisierung wirkt nur, wenn sie in
  ``config/prozess-automatisierung.json`` auf ``aktiv`` steht UND ihre
  Umgebungsvariable den Wert ``ein`` hat UND der Notaus nicht gesetzt ist.
  Ist sie aus, wird nichts gelesen, nichts geschrieben und nichts gesendet.
- Idempotenz: Jede Wirkung trägt einen Schlüssel. Derselbe Schlüssel führt
  höchstens einmal zum Erfolg (SQLite, Primärschlüssel).
- Begrenzte Wiederholung: höchstens ``max_versuche`` je Schlüssel, über alle
  Läufe gezählt. Danach endgültig fehlgeschlagen, nie stille Dauerschleife.
- Fehlerweg: Endgültige Fehlschläge stehen in ``fehler.jsonl`` und erscheinen
  im Tagesbericht.
- Protokoll: ``protokoll.jsonl``, eine Zeile je Entscheidung, ohne
  personenbezogene Angaben und ohne Geheimniswerte.
- Kostenbremse: Obergrenze der Wirkungen je Automatisierung und Tag. Kein
  Modellaufruf: ``llm_erlaubt`` ist fest verneint, solange die Konfiguration
  es nicht ausdrücklich freigibt.

Nur Standardbibliothek. Dieses Modul startet nichts von selbst und kennt
keinen Zeitplan.
"""
from __future__ import annotations

import contextlib
import datetime as dt
import hashlib
import json
import os
import sqlite3
import time
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
KONFIG_PFAD = ROOT / "config" / "prozess-automatisierung.json"
EIN = "ein"
MODELL = "deepseek/deepseek-v4.1-flash-1017"
REASONING = "high"

# Ergebnisse von ``einmal``
ERLEDIGT = "erledigt"
DOPPELT = "doppelt"
FEHLVERSUCH = "fehlversuch"
ENDGUELTIG = "endgueltig_fehlgeschlagen"
GEBREMST = "kostenbremse"
BELEGT = "laeuft_bereits"


class Konfigurationsfehler(ValueError):
    """Die Konfiguration ist unvollständig oder widersprüchlich. Es wird nichts ausgeführt."""


def lade_konfiguration(pfad: Path | None = None) -> dict:
    daten = json.loads(Path(pfad or KONFIG_PFAD).read_text(encoding="utf-8"))
    if daten.get("schema_version") != 1:
        raise Konfigurationsfehler("schema_version muss 1 sein")
    kennungen = [a.get("id") for a in daten.get("automatisierungen", [])]
    if len(kennungen) != len(set(kennungen)) or not all(kennungen):
        raise Konfigurationsfehler("Kennungen der Automatisierungen fehlen oder sind doppelt")
    for eintrag in daten["automatisierungen"]:
        for feld in ("schalter", "grenzen", "kanaele"):
            if feld not in eintrag:
                raise Konfigurationsfehler(f"{eintrag['id']}: Feld {feld} fehlt")
        grenzen = eintrag["grenzen"]
        for feld in ("max_versuche", "max_wirkungen_je_tag"):
            wert = grenzen.get(feld)
            # Eine fehlende oder unsinnige Grenze schaltet keinen Schutz ab, sondern die Automatisierung.
            if not isinstance(wert, int) or isinstance(wert, bool) or wert < 1 or wert > 1000:
                raise Konfigurationsfehler(f"{eintrag['id']}: Grenze {feld} fehlt oder ist unzulässig")
    llm = daten.get("llm", {})
    if llm.get("modell") != MODELL or llm.get("reasoning") != REASONING or llm.get("ersatzmodelle") != []:
        raise Konfigurationsfehler("Modellbindung weicht von der Vorgabe ab")
    return daten


def automatisierung(konfig: dict, kennung: str) -> dict:
    for eintrag in konfig["automatisierungen"]:
        if eintrag["id"] == kennung:
            return eintrag
    raise Konfigurationsfehler(f"unbekannte Automatisierung: {kennung}")


def schalterzustand(konfig: dict, kennung: str, umgebung: dict | None = None) -> dict:
    """Liest den Schalter. Reine Auskunft, ohne Nebenwirkung."""
    umgebung = os.environ if umgebung is None else umgebung
    eintrag = automatisierung(konfig, kennung)
    notaus = bool(str(umgebung.get(konfig.get("notaus", "NEXIFY_AUTO_NOTAUS"), "")).strip())
    in_konfig = eintrag.get("aktiv") is True
    in_umgebung = str(umgebung.get(eintrag["schalter"], "")).strip() == EIN
    gruende = []
    if notaus:
        gruende.append("Notaus gesetzt")
    if not in_konfig:
        gruende.append("in der Konfiguration nicht aktiv")
    if not in_umgebung:
        gruende.append(f"Variable {eintrag['schalter']} ist nicht `{EIN}`")
    return {"id": kennung, "ein": not gruende, "gruende": gruende}


def ist_ein(konfig: dict, kennung: str, umgebung: dict | None = None) -> bool:
    return schalterzustand(konfig, kennung, umgebung)["ein"]


def llm_erlaubt(konfig: dict) -> bool:
    """Modellaufrufe sind vorbereitet, nicht freigegeben. Keine Automatisierung ruft ein Modell auf."""
    return konfig.get("llm", {}).get("aufrufe_erlaubt") is True


def zustandsordner(konfig: dict, umgebung: dict | None = None) -> Path:
    umgebung = os.environ if umgebung is None else umgebung
    angabe = konfig.get("zustandsordner", {})
    wert = str(umgebung.get(angabe.get("variable", "NEXIFY_AUTO_ZUSTAND"), "")).strip() or angabe.get("vorgabe", ".local/automatisierung")
    pfad = Path(wert)
    return pfad if pfad.is_absolute() else ROOT / pfad


def schluessel(*teile: object) -> str:
    """Stabiler Idempotenzschlüssel aus fachlichen Teilen (kein Klartext im Protokoll nötig)."""
    roh = "\x1f".join(str(t) for t in teile)
    return hashlib.sha256(roh.encode("utf-8")).hexdigest()[:32]


def jetzt_utc() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def ortstag(zeitpunkt: dt.datetime, zeitzone: str = "Europe/Amsterdam") -> str:
    return zeitpunkt.astimezone(ZoneInfo(zeitzone)).date().isoformat()


class Zustand:
    """Buch der Wirkungen, Protokoll und Fehlerliste in einem Ordner.

    Der Ordner wird erst beim ersten Schreiben angelegt. Wer nur den Schalter
    liest, hinterlässt keine Datei.
    """

    def __init__(self, ordner: Path, uhr=jetzt_utc, zeitzone: str = "Europe/Amsterdam"):
        self.ordner = Path(ordner)
        self.uhr = uhr
        self.zeitzone = zeitzone
        self._db: sqlite3.Connection | None = None

    # -- Ablage ---------------------------------------------------------------

    def _verbindung(self) -> sqlite3.Connection:
        if self._db is None:
            self.ordner.mkdir(parents=True, exist_ok=True)
            self._db = sqlite3.connect(self.ordner / "buch.sqlite", timeout=10, isolation_level=None)
            self._db.execute(
                "CREATE TABLE IF NOT EXISTS wirkung ("
                " automatisierung TEXT NOT NULL, schluessel TEXT NOT NULL, status TEXT NOT NULL,"
                " versuche INTEGER NOT NULL, tag TEXT NOT NULL, begonnen TEXT NOT NULL, beendet TEXT,"
                " hinweis TEXT, PRIMARY KEY (automatisierung, schluessel))"
            )
            self._db.execute(
                "CREATE TABLE IF NOT EXISTS merker ("
                " automatisierung TEXT NOT NULL, name TEXT NOT NULL, wert TEXT NOT NULL,"
                " PRIMARY KEY (automatisierung, name))"
            )
        return self._db

    def schliessen(self) -> None:
        if self._db is not None:
            self._db.close()
            self._db = None

    def _zeile(self, datei: str, eintrag: dict) -> None:
        self.ordner.mkdir(parents=True, exist_ok=True)
        with open(self.ordner / datei, "a", encoding="utf-8") as ziel:
            ziel.write(json.dumps(eintrag, ensure_ascii=False, sort_keys=True) + "\n")

    def protokoll(self, kennung: str, ereignis: str, **angaben: object) -> None:
        self._zeile("protokoll.jsonl", {"zeit": self.uhr().isoformat(), "automatisierung": kennung, "ereignis": ereignis, **angaben})

    def fehler(self, kennung: str, schluessel_: str, grund: str, versuche: int) -> None:
        self._zeile(
            "fehler.jsonl",
            {"zeit": self.uhr().isoformat(), "automatisierung": kennung, "schluessel": schluessel_, "grund": grund[:300], "versuche": versuche},
        )

    def offene_fehler(self) -> list[dict]:
        pfad = self.ordner / "fehler.jsonl"
        if not pfad.exists():
            return []
        return [json.loads(z) for z in pfad.read_text(encoding="utf-8").splitlines() if z.strip()]

    # -- Merker (kleiner Zustand je Automatisierung, etwa „Störung seit“) ------

    def merke(self, kennung: str, name: str, wert: object) -> None:
        self._verbindung().execute(
            "INSERT INTO merker (automatisierung, name, wert) VALUES (?, ?, ?)"
            " ON CONFLICT(automatisierung, name) DO UPDATE SET wert = excluded.wert",
            (kennung, name, json.dumps(wert, ensure_ascii=False)),
        )

    def merker(self, kennung: str, name: str, vorgabe: object = None) -> object:
        zeile = self._verbindung().execute(
            "SELECT wert FROM merker WHERE automatisierung = ? AND name = ?", (kennung, name)
        ).fetchone()
        return vorgabe if zeile is None else json.loads(zeile[0])

    # -- Wirkungen -------------------------------------------------------------

    def wirkungen_heute(self, kennung: str) -> int:
        tag = ortstag(self.uhr(), self.zeitzone)
        zeile = self._verbindung().execute(
            "SELECT COUNT(*) FROM wirkung WHERE automatisierung = ? AND tag = ? AND status = ?",
            (kennung, tag, ERLEDIGT),
        ).fetchone()
        return int(zeile[0])

    def status(self, kennung: str, schluessel_: str) -> dict | None:
        zeile = self._verbindung().execute(
            "SELECT status, versuche, hinweis FROM wirkung WHERE automatisierung = ? AND schluessel = ?",
            (kennung, schluessel_),
        ).fetchone()
        return None if zeile is None else {"status": zeile[0], "versuche": zeile[1], "hinweis": zeile[2]}

    def einmal(self, kennung: str, schluessel_: str, wirkung, *, max_versuche: int, max_je_tag: int,
               pause_s: float = 0.0, schlaf=time.sleep, sperrfrist_s: int = 900) -> dict:
        """Führt ``wirkung()`` für diesen Schlüssel höchstens einmal erfolgreich aus.

        Rückgabe: ``{"ergebnis": ERLEDIGT | DOPPELT | FEHLVERSUCH | ENDGUELTIG | GEBREMST | BELEGT, ...}``.
        Ein Fehlschlag wird im selben Lauf bis zur Grenze wiederholt; die Zahl
        der Versuche bleibt über Läufe hinweg erhalten.
        """
        db = self._verbindung()
        jetzt = self.uhr()
        tag = ortstag(jetzt, self.zeitzone)
        # Anspruch atomar anmelden; die Datenbank entscheidet bei gleichzeitigen Läufen.
        db.execute("BEGIN IMMEDIATE")
        try:
            vorhanden = db.execute(
                "SELECT status, versuche, begonnen FROM wirkung WHERE automatisierung = ? AND schluessel = ?",
                (kennung, schluessel_),
            ).fetchone()
            if vorhanden is not None:
                status, versuche, begonnen = vorhanden
                if status == ERLEDIGT:
                    db.execute("COMMIT")
                    self.protokoll(kennung, DOPPELT, schluessel=schluessel_)
                    return {"ergebnis": DOPPELT, "versuche": versuche}
                if status == ENDGUELTIG:
                    db.execute("COMMIT")
                    return {"ergebnis": ENDGUELTIG, "versuche": versuche}
                if status == "begonnen":
                    alter = (jetzt - dt.datetime.fromisoformat(begonnen)).total_seconds()
                    if alter < sperrfrist_s:
                        db.execute("COMMIT")
                        self.protokoll(kennung, BELEGT, schluessel=schluessel_)
                        return {"ergebnis": BELEGT, "versuche": versuche}
                    # Abgebrochener Lauf mit ungewissem Ausgang: zählt als Versuch.
                if versuche >= max_versuche:
                    db.execute(
                        "UPDATE wirkung SET status = ?, beendet = ?, hinweis = ? WHERE automatisierung = ? AND schluessel = ?",
                        (ENDGUELTIG, jetzt.isoformat(), "Versuche ausgeschöpft", kennung, schluessel_),
                    )
                    db.execute("COMMIT")
                    self.fehler(kennung, schluessel_, "Versuche ausgeschöpft (auch abgebrochene Läufe zählen)", versuche)
                    self.protokoll(kennung, ENDGUELTIG, schluessel=schluessel_, versuche=versuche)
                    return {"ergebnis": ENDGUELTIG, "versuche": versuche}
            else:
                versuche = 0
            heute = db.execute(
                "SELECT COUNT(*) FROM wirkung WHERE automatisierung = ? AND tag = ? AND status = ?",
                (kennung, tag, ERLEDIGT),
            ).fetchone()[0]
            if heute >= max_je_tag:
                db.execute("COMMIT")
                self.protokoll(kennung, GEBREMST, schluessel=schluessel_, heute=heute, grenze=max_je_tag)
                return {"ergebnis": GEBREMST, "versuche": versuche}
            db.execute(
                "INSERT INTO wirkung (automatisierung, schluessel, status, versuche, tag, begonnen) VALUES (?, ?, 'begonnen', ?, ?, ?)"
                " ON CONFLICT(automatisierung, schluessel) DO UPDATE SET status = 'begonnen', begonnen = excluded.begonnen, tag = excluded.tag",
                (kennung, schluessel_, versuche, tag, jetzt.isoformat()),
            )
            db.execute("COMMIT")
        except BaseException:
            with contextlib.suppress(sqlite3.Error):
                db.execute("ROLLBACK")
            raise

        letzter_fehler = ""
        while versuche < max_versuche:
            versuche += 1
            db.execute(
                "UPDATE wirkung SET versuche = ? WHERE automatisierung = ? AND schluessel = ?", (versuche, kennung, schluessel_)
            )
            try:
                wert = wirkung()
            except Exception as fehler:  # noqa: BLE001 - jeder Fehlschlag geht in den Fehlerweg
                letzter_fehler = f"{type(fehler).__name__}: {fehler}"
                self.protokoll(kennung, FEHLVERSUCH, schluessel=schluessel_, versuch=versuche, grund=letzter_fehler[:200])
                if versuche < max_versuche and pause_s > 0:
                    schlaf(pause_s * (2 ** (versuche - 1)))
                continue
            db.execute(
                "UPDATE wirkung SET status = ?, beendet = ? WHERE automatisierung = ? AND schluessel = ?",
                (ERLEDIGT, self.uhr().isoformat(), kennung, schluessel_),
            )
            self.protokoll(kennung, ERLEDIGT, schluessel=schluessel_, versuch=versuche)
            return {"ergebnis": ERLEDIGT, "versuche": versuche, "wert": wert}

        db.execute(
            "UPDATE wirkung SET status = ?, beendet = ?, hinweis = ? WHERE automatisierung = ? AND schluessel = ?",
            (ENDGUELTIG, self.uhr().isoformat(), letzter_fehler[:300], kennung, schluessel_),
        )
        self.fehler(kennung, schluessel_, letzter_fehler, versuche)
        self.protokoll(kennung, ENDGUELTIG, schluessel=schluessel_, versuche=versuche)
        return {"ergebnis": ENDGUELTIG, "versuche": versuche, "grund": letzter_fehler}


def aus(kennung: str, zustand_: dict) -> dict:
    """Einheitliche Antwort eines ausgeschalteten Laufs. Schreibt nichts."""
    return {"automatisierung": kennung, "status": "aus", "gruende": zustand_["gruende"], "wirkungen": 0}
