"""Zustellkanäle der Automatisierungen.

Zwei Kanäle, mehr nicht:

- ``datei``: schreibt die Meldung in den Zustandsordner (``ausgang/``). Kein Netz.
- ``resend_intern``: sendet eine Textmail über Resend an genau eine interne
  Adresse, die aus einer Umgebungsvariable kommt. Eigener Schalter, Standard AUS.
  Es gibt keinen Weg, über diesen Kanal an Kunden oder Dritte zu senden: Der
  Empfänger ist kein Parameter der Automatisierungen.

Der Schlüssel für Resend wird nur aus der Umgebung gelesen, nie protokolliert
und nie in eine Datei geschrieben. In Umgebungen, in denen ein Proxy den
Schlüssel einsetzt, genügt ein Platzhalter.
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

import kern

ADRESSE = re.compile(r"^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$")
SICHERER_NAME = re.compile(r"[^a-z0-9._-]+")


class Zustellfehler(RuntimeError):
    pass


def _http_post(url: str, kopf: dict, koerper: bytes, zeitlimit: float) -> tuple[int, bytes]:
    anfrage = urllib.request.Request(url, data=koerper, headers=kopf, method="POST")
    try:
        with urllib.request.urlopen(anfrage, timeout=zeitlimit) as antwort:  # noqa: S310 - fester https-Host
            return antwort.status, antwort.read(4096)
    except urllib.error.HTTPError as fehler:
        return fehler.code, fehler.read(4096)


def kanal_bereit(konfig: dict, kanal: str, umgebung: dict | None = None) -> dict:
    """Auskunft, ob ein Kanal senden würde. Ohne Nebenwirkung."""
    umgebung = os.environ if umgebung is None else umgebung
    angabe = konfig.get("zustellung", {}).get(kanal)
    if angabe is None:
        return {"kanal": kanal, "bereit": False, "gruende": ["Kanal nicht definiert"]}
    gruende = []
    if angabe.get("aktiv") is not True:
        gruende.append("in der Konfiguration nicht aktiv")
    if kanal == "resend_intern":
        if str(umgebung.get(angabe["schalter"], "")).strip() != kern.EIN:
            gruende.append(f"Variable {angabe['schalter']} ist nicht `{kern.EIN}`")
        for feld in ("empfaenger_variable", "absender_variable", "schluessel_variable"):
            if not str(umgebung.get(angabe[feld], "")).strip():
                gruende.append(f"Variable {angabe[feld]} fehlt")
        empfaenger = str(umgebung.get(angabe["empfaenger_variable"], "")).strip()
        if empfaenger and not ADRESSE.match(empfaenger):
            gruende.append("interne Empfängeradresse ist keine einzelne gültige Adresse")
    return {"kanal": kanal, "bereit": not gruende, "gruende": gruende}


def _datei(zustand: kern.Zustand, kennung: str, schluessel: str, betreff: str, text: str) -> str:
    ordner = zustand.ordner / "ausgang" / kennung
    ordner.mkdir(parents=True, exist_ok=True)
    name = SICHERER_NAME.sub("-", f"{kern.ortstag(zustand.uhr(), zustand.zeitzone)}-{schluessel}".lower())
    ziel = ordner / f"{name}.md"
    ziel.write_text(f"# {betreff}\n\n{text.rstrip()}\n", encoding="utf-8")
    return str(ziel)


def _resend(konfig: dict, umgebung: dict, schluessel: str, betreff: str, text: str, transport) -> str:
    angabe = konfig["zustellung"]["resend_intern"]
    koerper = json.dumps(
        {
            "from": str(umgebung[angabe["absender_variable"]]).strip(),
            "to": [str(umgebung[angabe["empfaenger_variable"]]).strip()],
            "subject": betreff[:200],
            "text": text,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    kopf = {
        "Authorization": "Bearer " + str(umgebung[angabe["schluessel_variable"]]).strip(),
        "Content-Type": "application/json",
        # Derselbe Schlüssel bei einer Wiederholung: Der Anbieter soll nicht doppelt senden.
        "Idempotency-Key": f"nexify-auto-{schluessel}",
        "User-Agent": "nexify-automatisierung/1",
    }
    status, antwort = transport(f"https://{angabe['host']}/emails", kopf, koerper, 15.0)
    if status < 200 or status >= 300:
        # Die Antwort kann Angaben zum Konto enthalten; nur der Statuscode geht ins Protokoll.
        raise Zustellfehler(f"Resend antwortet mit {status}")
    return f"resend:{status}"


def zustellen(konfig: dict, zustand: kern.Zustand, kennung: str, schluessel: str, betreff: str, text: str,
              *, umgebung: dict | None = None, transport=_http_post, schlaf=None) -> dict:
    """Stellt eine Meldung über die Kanäle der Automatisierung zu, je Kanal höchstens einmal.

    Jeder Kanal ist eine eigene Wirkung mit eigenem Schlüssel: Scheitert die
    Mail, bleibt die Datei bestehen und umgekehrt.
    """
    umgebung = os.environ if umgebung is None else umgebung
    eintrag = kern.automatisierung(konfig, kennung)
    grenzen = eintrag["grenzen"]
    ergebnis: dict = {}
    for kanal in eintrag["kanaele"]:
        bereit = kanal_bereit(konfig, kanal, umgebung)
        if not bereit["bereit"]:
            ergebnis[kanal] = {"ergebnis": "kanal_aus", "gruende": bereit["gruende"]}
            continue
        if kanal == "datei":
            wirkung = lambda: _datei(zustand, kennung, schluessel, betreff, text)  # noqa: E731
            grenze_tag = grenzen["max_wirkungen_je_tag"]
            buchname = kennung
        elif kanal == "resend_intern":
            wirkung = lambda: _resend(konfig, umgebung, schluessel, betreff, text, transport)  # noqa: E731
            # Gemeinsame Tagesgrenze aller Automatisierungen für das geteilte Versandkonto.
            grenze_tag = min(grenzen["max_wirkungen_je_tag"], int(konfig["zustellung"]["resend_intern"]["max_mails_je_tag"]))
            buchname = "mail"
        else:
            ergebnis[kanal] = {"ergebnis": "kanal_aus", "gruende": ["unbekannter Kanal"]}
            continue
        argumente = {"max_versuche": grenzen["max_versuche"], "max_je_tag": grenze_tag, "pause_s": 2.0 if kanal != "datei" else 0.0}
        if schlaf is not None:
            argumente["schlaf"] = schlaf
        ergebnis[kanal] = zustand.einmal(buchname if kanal != "datei" else kennung, f"{kennung}:{schluessel}:{kanal}", wirkung, **argumente)
    return ergebnis


def vorlage(name: str, **werte: object) -> str:
    """Füllt eine Vorlage aus ``vorlagen/``. Ein fehlender Platzhalter ist ein Fehler, kein leerer Text."""
    text = (Path(__file__).resolve().parent / "vorlagen" / name).read_text(encoding="utf-8")

    def ersetze(treffer: re.Match) -> str:
        feld = treffer.group(1)
        if feld not in werte:
            raise Zustellfehler(f"Platzhalter {feld} ohne Wert in {name}")
        return str(werte[feld])

    return re.sub(r"\{\{([A-Z_]+)\}\}", ersetze, text)
