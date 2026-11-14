"""Journal: jeder Schritt mit Zeit und Eingabe-/Ausgabe-Hash – ohne Inhalte.

Das Journal nimmt nur Kennungen, feste Codes, Zahlen und Hashes an. Freitext,
Argumente, Ergebnisse, Auftragstexte und Fehlermeldungen können technisch nicht
hineingeschrieben werden: Jedes Textfeld wird gegen ein enges Muster geprüft.
Hashes sind mit einem Salz je Journal gebildet (HMAC), damit sich kurze Eingaben
wie eine E-Mail-Adresse nicht durch Ausprobieren zurückrechnen lassen.
Die Einträge sind verkettet; eine nachträgliche Änderung fällt bei `kette_pruefen` auf.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
import hashlib
import hmac
import re
from typing import Callable

from nexify_knowledge import Mandant

from .typen import KernFehler, code_pruefen, kanonisch

_KENNUNG = re.compile(r"[A-Za-z0-9][A-Za-z0-9._/-]{0,127}")
_HASH = re.compile(r"[0-9a-f]{64}")
NULL_HASH = "0" * 64


class Ereignis(str, Enum):
    LAUF_ANGELEGT = "lauf_angelegt"
    MODELL_ENTSCHEIDUNG = "modell_entscheidung"
    WERKZEUG_AUFRUF = "werkzeug_aufruf"
    WERKZEUG_WIEDERHOLUNG = "werkzeug_wiederholung"
    IDEMPOTENZ_TREFFER = "idempotenz_treffer"
    FREIGABE_ANGEFORDERT = "freigabe_angefordert"
    FREIGABE_ERTEILT = "freigabe_erteilt"
    FREIGABE_ABGELEHNT = "freigabe_abgelehnt"
    SKILL_GELADEN = "skill_geladen"
    UNTERLAUF_GESTARTET = "unterlauf_gestartet"
    UNTERLAUF_BEENDET = "unterlauf_beendet"
    AUFGABEN_VORGESCHLAGEN = "aufgaben_vorgeschlagen"
    AUFGABEN_VERWORFEN = "aufgaben_verworfen"
    FEHLERABLAGE = "fehlerablage"
    GRENZE_ERREICHT = "grenze_erreicht"
    LAUF_ABGESCHLOSSEN = "lauf_abgeschlossen"
    LAUF_ABGEBROCHEN = "lauf_abgebrochen"


@dataclass(frozen=True, slots=True)
class Journaleintrag:
    nr: int
    zeit: str
    mandant: str
    lauf: str
    schritt: int
    ereignis: str
    bezug: str | None          # Werkzeug- oder Skillname, Kennung eines Unterlaufs oder einer Freigabe
    eingabe_hash: str | None   # HMAC der Eingabe, nie die Eingabe
    ausgabe_hash: str | None   # HMAC der Ausgabe, nie die Ausgabe
    akteur_hash: str | None    # HMAC der Kennung eines handelnden Menschen
    kosten: int
    code: str                  # fester Ergebniscode
    vorgaenger: str
    pruefsumme: str

    def als_dict(self) -> dict:
        return asdict(self)


def _hash_feld(wert: object) -> str | None:
    if wert is None:
        return None
    if type(wert) is not str or _HASH.fullmatch(wert) is None:
        raise KernFehler("journal_nimmt_nur_hashes")
    return wert


class Journal:
    def __init__(self, salz: bytes, uhr: Callable[[], datetime]) -> None:
        if type(salz) is not bytes or len(salz) < 16:
            raise KernFehler("journal_salz_zu_kurz")
        self.__salz = salz
        self.__uhr = uhr
        self.__eintraege: list[Journaleintrag] = []

    def hash(self, wert: object) -> str:
        """Gesalzener Hash eines beliebigen serialisierbaren Werts."""
        return hmac.new(self.__salz, kanonisch(wert), hashlib.sha256).hexdigest()

    def eintragen(self, *, mandant: Mandant, lauf: str, schritt: int, ereignis: Ereignis, code: str,
                  bezug: str | None = None, eingabe_hash: str | None = None,
                  ausgabe_hash: str | None = None, akteur_hash: str | None = None,
                  kosten: int = 0) -> Journaleintrag:
        if type(mandant) is not Mandant or type(ereignis) is not Ereignis:
            raise KernFehler("journal_feld_ungueltig")
        if type(lauf) is not str or _KENNUNG.fullmatch(lauf) is None:
            raise KernFehler("journal_feld_ungueltig")
        if bezug is not None and (type(bezug) is not str or _KENNUNG.fullmatch(bezug) is None):
            raise KernFehler("journal_feld_ungueltig")
        if type(schritt) is not int or schritt < 0 or type(kosten) is not int or kosten < 0:
            raise KernFehler("journal_feld_ungueltig")
        zeit = self.__uhr()
        if type(zeit) is not datetime or zeit.tzinfo is None:
            raise KernFehler("journal_zeit_braucht_zeitzone")
        vorgaenger = self.__eintraege[-1].pruefsumme if self.__eintraege else NULL_HASH
        felder = {
            "nr": len(self.__eintraege) + 1, "zeit": zeit.isoformat(), "mandant": mandant.kennung,
            "lauf": lauf, "schritt": schritt, "ereignis": ereignis.value, "bezug": bezug,
            "eingabe_hash": _hash_feld(eingabe_hash), "ausgabe_hash": _hash_feld(ausgabe_hash),
            "akteur_hash": _hash_feld(akteur_hash), "kosten": kosten, "code": code_pruefen(code), "vorgaenger": vorgaenger,
        }
        eintrag = Journaleintrag(**felder, pruefsumme=hashlib.sha256(kanonisch(felder)).hexdigest())
        self.__eintraege.append(eintrag)
        return eintrag

    def eintraege(self, mandant: Mandant, lauf: str | None = None) -> tuple[Journaleintrag, ...]:
        """Lesen nur je Mandant; ein fremder Mandant sieht nichts."""
        if type(mandant) is not Mandant:
            raise KernFehler("mandant_ist_pflichtargument")
        return tuple(e for e in self.__eintraege
                     if e.mandant == mandant.kennung and (lauf is None or e.lauf == lauf))

    def kette_pruefen(self) -> bool:
        vorgaenger = NULL_HASH
        for nr, eintrag in enumerate(self.__eintraege, start=1):
            felder = eintrag.als_dict()
            pruefsumme = felder.pop("pruefsumme")
            if (eintrag.nr != nr or eintrag.vorgaenger != vorgaenger
                    or hashlib.sha256(kanonisch(felder)).hexdigest() != pruefsumme):
                return False
            vorgaenger = pruefsumme
        return True
