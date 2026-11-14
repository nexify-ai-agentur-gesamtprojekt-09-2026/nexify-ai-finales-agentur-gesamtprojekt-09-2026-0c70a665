"""Skill-Register für das Format „Agent Skills": Ordner mit SKILL.md und Kopf.

- Geladen wird nur aus EINER erlaubten Wurzel und nur, was per SHA-256
  gebunden ist (wie in config/project-skills.json). Abweichung sperrt den Skill.
- Dreistufig: Verzeichnis (Name, Beschreibung) → voller Text → gebundene Beilage.
- Dieses Modul führt nichts aus. Es gibt keine Funktion, die Skill-Skripte
  startet; Dateien unter `scripts/` werden nicht einmal gelesen.
- „Anthropic-Skills" sind hier ein Dateiformat, keine Modellbindung.
"""
from __future__ import annotations

from dataclasses import dataclass, field
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
from types import MappingProxyType
from typing import Iterable, Mapping

from .typen import KernFehler

MAX_BYTES = 512 * 1024
MAX_BESCHREIBUNG = 1024
_SKILLNAME = re.compile(r"(?=.{1,64}\Z)[a-z0-9]+(?:-[a-z0-9]+)*")
_SHA = re.compile(r"[0-9a-f]{64}")
_SCHLUESSEL = re.compile(r"[A-Za-z][A-Za-z0-9_-]*")


class SkillFehler(KernFehler):
    """Skill fehlt, ist gesperrt oder nicht lesbar. Meldung = fester Code."""


def _relativ(pfad: object) -> PurePosixPath:
    if type(pfad) is not str or not pfad or "\\" in pfad or any(ord(c) < 32 or ord(c) == 127 for c in pfad):
        raise SkillFehler("pfad_unsicher")
    p = PurePosixPath(pfad)
    if p.is_absolute() or p.as_posix() != pfad or any(t in ("", ".", "..") for t in p.parts):
        raise SkillFehler("pfad_unsicher")
    return p


@dataclass(frozen=True, slots=True)
class Skillbindung:
    """Hash-Bindung eines Skills: `pfad` ist relativ zur Wurzel und endet auf `<name>/SKILL.md`."""

    name: str
    pfad: str
    sha256: str
    beilagen: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if type(self.name) is not str or _SKILLNAME.fullmatch(self.name) is None:
            raise SkillFehler("skillname_ungueltig")
        teile = _relativ(self.pfad).parts
        if len(teile) < 2 or teile[-1] != "SKILL.md" or teile[-2] != self.name:
            raise SkillFehler("skillpfad_passt_nicht_zum_namen")
        if type(self.sha256) is not str or _SHA.fullmatch(self.sha256) is None:
            raise SkillFehler("hash_ungueltig")
        gebunden = {}
        for pfad, pruefsumme in dict(self.beilagen).items():
            teile = _relativ(pfad).parts
            if "scripts" in teile:
                raise SkillFehler("skripte_werden_nicht_gebunden")
            if type(pruefsumme) is not str or _SHA.fullmatch(pruefsumme) is None:
                raise SkillFehler("hash_ungueltig")
            gebunden[pfad] = pruefsumme
        object.__setattr__(self, "beilagen", MappingProxyType(gebunden))


@dataclass(frozen=True, slots=True)
class Skillkopf:
    name: str
    beschreibung: str


@dataclass(frozen=True, slots=True)
class Skill:
    name: str
    beschreibung: str
    kopf: Mapping[str, object]
    text: str
    sha256: str
    beilagen: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class Beilage:
    skill: str
    pfad: str
    text: str
    sha256: str


def _skalar(roh: str) -> str:
    wert = roh.strip()
    if len(wert) >= 2 and wert[0] == wert[-1] and wert[0] in "\"'":
        return wert[1:-1]
    return wert


def kopf_lesen(text: str) -> tuple[dict[str, object], str]:
    """Liest den Kopf zwischen `---`-Zeilen. Bewusst kleine YAML-Teilmenge:
    Schlüssel-Wert-Zeilen, eingerückte Fortsetzungen, `>`/`|`-Blöcke, eine Ebene
    verschachtelter Schlüssel und einfache Listen. Alles andere wird abgelehnt."""
    zeilen = text.split("\n")
    if not zeilen or zeilen[0].rstrip("\r") != "---":
        raise SkillFehler("kopf_fehlt")
    try:
        ende = next(i for i in range(1, len(zeilen)) if zeilen[i].rstrip("\r") == "---")
    except StopIteration:
        raise SkillFehler("kopf_nicht_geschlossen") from None
    kopf: dict[str, object] = {}
    schluessel: str | None = None
    block = False
    for roh in (z.rstrip("\r") for z in zeilen[1:ende]):
        if not roh.strip() or roh.lstrip().startswith("#"):
            continue
        if "\t" in roh[: len(roh) - len(roh.lstrip())]:
            raise SkillFehler("kopf_nicht_lesbar")
        if roh[0] != " ":
            name, trenner, rest = roh.partition(":")
            if not trenner or _SCHLUESSEL.fullmatch(name) is None or name in kopf:
                raise SkillFehler("kopf_nicht_lesbar")
            schluessel, rest = name, rest.strip()
            block = rest in (">", "|", ">-", "|-")
            kopf[name] = "" if (block or not rest) else _skalar(rest)
            if not block and rest[:1] in ("[", "{", "&", "*", "!"):
                raise SkillFehler("kopf_nicht_lesbar")
            continue
        if schluessel is None:
            raise SkillFehler("kopf_nicht_lesbar")
        teil, bisher = roh.strip(), kopf[schluessel]
        if not block and bisher == "" and teil.startswith("- "):
            kopf[schluessel] = [_skalar(teil[2:])]
        elif isinstance(bisher, list):
            if not teil.startswith("- "):
                raise SkillFehler("kopf_nicht_lesbar")
            bisher.append(_skalar(teil[2:]))
        elif not block and (bisher == "" or isinstance(bisher, dict)):
            name, trenner, rest = teil.partition(":")
            if trenner and _SCHLUESSEL.fullmatch(name) and rest[:1] in ("", " "):
                if bisher == "":
                    bisher = kopf[schluessel] = {}
                if name in bisher:
                    raise SkillFehler("kopf_nicht_lesbar")
                bisher[name] = _skalar(rest)
            elif bisher == "":
                kopf[schluessel] = teil  # Wert beginnt erst in der Folgezeile
            else:
                raise SkillFehler("kopf_nicht_lesbar")
        else:
            kopf[schluessel] = f"{bisher} {teil}".strip()
    return kopf, "\n".join(zeilen[ende + 1:])


class SkillRegister:
    """Unveränderliches Register über genau eine Wurzel."""

    def __init__(self, wurzel: Path | str, bindungen: Iterable[Skillbindung]) -> None:
        wurzel = Path(wurzel)
        if not wurzel.is_absolute() or wurzel.is_symlink() or not wurzel.is_dir():
            raise SkillFehler("wurzel_ungueltig")
        self.__wurzel = wurzel.resolve(strict=True)
        eintraege: dict[str, Skillbindung] = {}
        for bindung in bindungen:
            if type(bindung) is not Skillbindung or bindung.name in eintraege:
                raise SkillFehler("bindung_ungueltig_oder_doppelt")
            eintraege[bindung.name] = bindung
        self.__bindungen = MappingProxyType(eintraege)

    # ---- sicheres Lesen ----------------------------------------------------------

    def __lesen(self, relativ: str, erwartet: str) -> bytes:
        teile = _relativ(relativ).parts
        aktuell = self.__wurzel
        for teil in teile:
            aktuell = aktuell / teil
            if aktuell.is_symlink():
                raise SkillFehler("symlink_nicht_erlaubt")
        try:
            aufgeloest = aktuell.resolve(strict=True)
        except OSError:
            raise SkillFehler("quelle_fehlt") from None
        if not aufgeloest.is_relative_to(self.__wurzel):
            raise SkillFehler("ausserhalb_der_wurzel")
        try:
            fd = os.open(aufgeloest, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
        except OSError:
            raise SkillFehler("quelle_fehlt") from None
        with os.fdopen(fd, "rb") as strom:
            if not stat.S_ISREG(os.fstat(strom.fileno()).st_mode):
                raise SkillFehler("quelle_keine_datei")
            daten = strom.read(MAX_BYTES + 1)
        if len(daten) > MAX_BYTES:
            raise SkillFehler("quelle_zu_gross")
        if hashlib.sha256(daten).hexdigest() != erwartet:
            raise SkillFehler("hash_abweichung_skill_gesperrt")
        return daten

    def __bindung(self, name: object) -> Skillbindung:
        if type(name) is not str or name not in self.__bindungen:
            raise SkillFehler("skill_unbekannt")
        return self.__bindungen[name]

    # ---- drei Stufen -------------------------------------------------------------

    def namen(self) -> tuple[str, ...]:
        return tuple(sorted(self.__bindungen))

    def laden(self, name: str) -> Skill:
        """Stufe 2: voller Text. Der Hash wird bei JEDEM Laden neu geprüft."""
        bindung = self.__bindung(name)
        roh = self.__lesen(bindung.pfad, bindung.sha256)
        try:
            text = roh.decode("utf-8")
        except UnicodeDecodeError:
            raise SkillFehler("kopf_nicht_lesbar") from None
        kopf, rumpf = kopf_lesen(text)
        beschreibung = kopf.get("description")
        if kopf.get("name") != bindung.name:
            raise SkillFehler("kopfname_passt_nicht_zum_ordner")
        if type(beschreibung) is not str or not beschreibung or len(beschreibung) > MAX_BESCHREIBUNG:
            raise SkillFehler("beschreibung_fehlt_oder_zu_lang")
        return Skill(bindung.name, beschreibung, MappingProxyType(kopf), rumpf, bindung.sha256,
                     tuple(sorted(bindung.beilagen)))

    def verzeichnis(self) -> tuple[Skillkopf, ...]:
        """Stufe 1: nur Name und Beschreibung der ladbaren Skills."""
        koepfe = []
        for name in self.namen():
            try:
                skill = self.laden(name)
            except SkillFehler:
                continue
            koepfe.append(Skillkopf(skill.name, skill.beschreibung))
        return tuple(koepfe)

    def gesperrt(self) -> Mapping[str, str]:
        """Skills, die gerade nicht ladbar sind, mit festem Grundcode."""
        gruende = {}
        for name in self.namen():
            try:
                self.laden(name)
            except SkillFehler as fehler:
                gruende[name] = str(fehler)
        return MappingProxyType(gruende)

    def beilage(self, name: str, pfad: str) -> Beilage:
        """Stufe 3: eine gebundene Textbeilage. Skripte sind ausgeschlossen."""
        bindung = self.__bindung(name)
        self.laden(name)  # ein gesperrter Skill gibt auch keine Beilagen heraus
        if type(pfad) is not str or pfad not in bindung.beilagen:
            raise SkillFehler("beilage_nicht_gebunden")
        roh = self.__lesen(pfad, bindung.beilagen[pfad])
        try:
            return Beilage(bindung.name, pfad, roh.decode("utf-8"), bindung.beilagen[pfad])
        except UnicodeDecodeError:
            raise SkillFehler("beilage_kein_text") from None


# ---- Bindungen aus den im Repo vorhandenen Registern lesen ----------------------------

def _json(pfad: Path | str) -> dict:
    daten = json.loads(Path(pfad).read_text(encoding="utf-8"))
    if not isinstance(daten, dict):
        raise SkillFehler("register_ungueltig")
    return daten


def _ohne_praefix(pfad: str, praefix: str) -> str:
    if not pfad.startswith(praefix):
        raise SkillFehler("registerpfad_ausserhalb_der_wurzel")
    return pfad[len(praefix):]


def bindungen_aus_projektregister(pfad: Path | str, praefix: str = "skills/") -> tuple[Skillbindung, ...]:
    """Liest `config/project-skills.json` (Felder name, source_path, sha256)."""
    try:
        return tuple(Skillbindung(s["name"], _ohne_praefix(s["source_path"], praefix), s["sha256"])
                     for s in _json(pfad)["skills"])
    except (KeyError, TypeError):
        raise SkillFehler("register_ungueltig") from None


def bindungen_aus_small_business(pfad: Path | str,
                                 praefix: str = "small-business/") -> tuple[Skillbindung, ...]:
    """Liest `config/integrations/small-business.json` (workflows + source_files).

    Beilagen sind die dort gebundenen Referenzdateien des Skills und die
    gemeinsamen Regeln. Das Lesen des Registers lädt keinen Skill und keine Quelle.
    """
    try:
        daten = _json(pfad)
        inventar = {d["path"]: d["sha256"] for d in daten["source_files"]}
        bindungen = []
        for ablauf in daten["workflows"]:
            quelle = ablauf["source"]
            if inventar.get(quelle["path"]) != quelle["sha256"]:
                raise SkillFehler("register_widerspruechlich")
            beilagen = {_ohne_praefix(p, praefix): inventar[p]
                        for p in (*ablauf.get("local_reference_paths", ()), *daten.get("shared_rules", ()))}
            bindungen.append(Skillbindung(ablauf["id"], _ohne_praefix(quelle["path"], praefix),
                                          quelle["sha256"], beilagen))
        return tuple(bindungen)
    except (KeyError, TypeError):
        raise SkillFehler("register_ungueltig") from None
