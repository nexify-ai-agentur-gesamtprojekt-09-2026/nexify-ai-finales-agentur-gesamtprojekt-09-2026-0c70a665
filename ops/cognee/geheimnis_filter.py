#!/usr/bin/env python3
"""Musterabgleich auf Geheimniswerte im Aufnahmegut.

Das ist ein Musterabgleich, kein Schutz: Er erkennt gängige Schlüsselformen und einige
Verschleierungen (Umbruch, unsichtbare Zeichen, Sperrschrift), aber kein beliebiges
Kennwort und keinen Wert, der wie ein gewöhnliches Wort aussieht. Den Schutz trägt die
Positivliste der Quellen; dieser Filter ist die zweite Linie dahinter.

Grundlage sind die Muster des Lösungsregisters (``tools/check_loesungsregister.py``),
ergänzt um weitere Formen. Funde werden ohne Wert gemeldet (Art, Zeile, Länge).
Die Laufzeit ist linear in der Textlänge.
"""
from __future__ import annotations

import importlib.util
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

_VOR = r"(?<![A-Za-z0-9])"
_ADRESSE = "Zugangsdaten in Adresse"

# Zusätzlich zu den Mustern des Lösungsregisters.
WEITERE_MUSTER = (
    ("Google-Schlüssel", re.compile(_VOR + r"AIza[0-9A-Za-z_\-]{30,}")),
    ("Telegram-Bot-Token", re.compile(_VOR + r"[0-9]{8,10}:[A-Za-z0-9_\-]{30,}")),
    ("Webhook-Signaturschlüssel", re.compile(_VOR + r"whsec_[A-Za-z0-9+/=_\-]{12,}")),
    ("Stripe-Schlüssel", re.compile(_VOR + r"(?:rk|pk)_(?:live|test)_[A-Za-z0-9]{12,}")),
    ("Basic-Anmeldung", re.compile(r"(?i)\bAuthorization[\"']?[ \t]{0,3}[:=][ \t]{0,3}[\"']?Basic[ \t]+[A-Za-z0-9+/]{8,}={0,2}")),
    ("Zuweisung an eine Geheimnis-Variable", re.compile(
        r"(?<![A-Za-z0-9_])[A-Z][A-Z0-9_]{0,60}(?:PASSWORD|PASSWD|SECRET|TOKEN|APIKEY|API_KEY|PRIVATE_KEY|ACCESS_KEY)"
        r"[A-Z0-9_]{0,30}[ \t]{0,3}=[ \t]{0,3}[\"']?(?![$<*{\[\"'\s])[^\s\"'`]{6,}")),
    ("Zuweisung an ein Kennwortfeld", re.compile(
        r"(?i)(?<![A-Za-z0-9_])(?:password|passwort|passwd|kennwort|secret|api[_-]?key|access[_-]?token)"
        r"[ \t]{0,3}=[ \t]{0,3}[\"']?(?![$<*{\[\"'\s])(?![A-Za-z_][A-Za-z0-9_]{0,40}[.(\[])[^\s\"'`]{6,}")),
)
# Kürzere Hex-Folgen als im Register (dort ab 32), mindestens eine Ziffer und ein Buchstabe.
HEX_KURZ = re.compile(r"(?<![0-9A-Za-z])(?=[0-9a-fA-F]{0,40}[0-9])(?=[0-9a-fA-F]{0,40}[a-fA-F])[0-9a-fA-F]{24,}(?![0-9A-Za-z])")
KLEIN_ZIFFERN = re.compile(r"(?<![0-9A-Za-z])[a-z0-9]{32,}(?![0-9A-Za-z])")
BASE64_BREIT = re.compile(r"(?<![A-Za-z0-9+/_=\-])[A-Za-z0-9+/_=\-]{40,}(?![A-Za-z0-9+/_=\-])")
LANGES_WORT = re.compile(r"[a-zäöüß]{8,}")

# Verschleierungen, die vor dem Abgleich aufgelöst werden.
_UMBRUCH_IM_TOKEN = re.compile(r"(?<=[A-Za-z0-9+/_=\-]{8})[ \t]*\r?\n[ \t>|]*(?=[A-Za-z0-9+/_=\-]{8})")
_SPERRSCHRIFT = re.compile(r"(?<!\S)(?:\S[ \t]){11,}\S(?!\S)")
_ERLAUBTE_STEUERZEICHEN = "\n\r\t"

_REGISTER = None


def _register():
    global _REGISTER
    if _REGISTER is None:
        spec = importlib.util.spec_from_file_location(
            "check_loesungsregister", ROOT / "tools/check_loesungsregister.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _REGISTER = module
    return _REGISTER


def is_plain_text(text: str) -> bool:
    """Falsch bei NUL und anderen Steuerzeichen (zum Beispiel UTF-16 ohne Kennung)."""
    return not any(ord(c) < 32 and c not in _ERLAUBTE_STEUERZEICHEN for c in text) and "\x7f" not in text


def _ohne_unsichtbare(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    return "".join(c for c in text if unicodedata.category(c) not in ("Cf", "Cc") or c in _ERLAUBTE_STEUERZEICHEN)


def _varianten(text: str):
    yield "", text
    sichtbar = _ohne_unsichtbare(text)
    if sichtbar != text:
        yield " nach Entfernen unsichtbarer Zeichen", sichtbar
    verbunden = _UMBRUCH_IM_TOKEN.sub("", sichtbar)
    if verbunden != sichtbar:
        yield " über einen Zeilenumbruch hinweg", verbunden
    entsperrt = _SPERRSCHRIFT.sub(lambda m: re.sub(r"[ \t]", "", m.group(0)), sichtbar)
    if entsperrt != sichtbar:
        yield " in Sperrschrift", entsperrt


def _adressen(text: str):
    """Zugangsdaten in einer Adresse, linear: nur das Stück nach jedem ``://`` wird geprüft."""
    start = 0
    while True:
        index = text.find("://", start)
        if index < 0:
            return
        start = index + 3
        if index == 0 or not (text[index - 1].isascii() and text[index - 1].isalnum()):
            continue
        end = start
        limit = min(len(text), start + 600)
        while end < limit and not text[end].isspace() and text[end] not in "/`":
            end += 1
        authority = text[start:end]
        at = authority.rfind("@")
        if at > 0 and ":" in authority[:at] and not authority[:at].endswith(":"):
            yield index, end - index


def _klassen(value: str) -> tuple[bool, bool, bool]:
    return (any(c.isdigit() for c in value), any("a" <= c <= "z" for c in value),
            any("A" <= c <= "Z" for c in value))


def find_secrets(text: str) -> list[str]:
    """Funde als Beschreibung ohne Wert. Leere Liste heißt nur: kein Muster hat gegriffen."""
    register = _register()
    erlaubt = register.ERLAUBTE_KENNUNGEN
    hits: list[str] = []
    counted: dict[tuple[str, int], int] = {}
    for zusatz, variant in _varianten(text):
        found: dict[tuple[str, int], list[int]] = {}

        def add(kind: str, start: int, length: int, value: str | None = None) -> None:
            if value is not None and value in erlaubt:
                return
            starts = found.setdefault((kind, length), [])
            if start not in starts:
                starts.append(start)

        for kind, pattern in tuple(register.GEHEIMNIS_MUSTER) + WEITERE_MUSTER:
            if kind == _ADRESSE or (zusatz and kind.startswith("Zuweisung")):
                # Zuweisungen gelten nur im Original: verbundene Zeilen erzeugen sonst Scheinzuweisungen.
                continue
            for match in pattern.finditer(variant):
                add(kind, match.start(), len(match.group(0)), match.group(0))
        for start, length in _adressen(variant):
            add(_ADRESSE, start, length)
        for match in HEX_KURZ.finditer(variant):
            add("Hex-Folge ab 24 Zeichen", match.start(), len(match.group(0)), match.group(0))
        for match in register.ZUFALLSFOLGE.finditer(variant):
            if all(_klassen(match.group(0))):
                add("lange Zufallsfolge", match.start(), len(match.group(0)), match.group(0))
        for match in KLEIN_ZIFFERN.finditer(variant):
            digit, lower, _ = _klassen(match.group(0))
            if digit and lower and not HEX_KURZ.fullmatch(match.group(0)):
                add("lange Folge aus Kleinbuchstaben und Ziffern", match.start(), len(match.group(0)), match.group(0))
        for match in BASE64_BREIT.finditer(variant):
            value = match.group(0)
            if ("/" in value or "-" in value) and all(_klassen(value)) and not LANGES_WORT.search(value):
                add("lange Folge in Base64-Form", match.start(), len(value), value)
        # Je Art und Länge nur melden, was über die schon gemeldeten Funde hinausgeht.
        for (kind, length), starts in found.items():
            known = counted.get((kind, length), 0)
            for start in sorted(starts)[known:] if zusatz else sorted(starts):
                line = variant.count("\n", 0, start) + 1
                hits.append(f"Zeile {line}: {kind}{zusatz} ({length} Zeichen)")
            counted[(kind, length)] = max(known, len(starts))
    return hits
