"""Terminlogik des Werkstattservice, Stufe 1: Zustandsmaschine als reine Funktionen.

Quelle: docs/03-backend/werkstatt-terminlogik.md, Abschnitte 2, 3, 5.2 und 6. Dieses Modul kennt
keine Datenbank, keinen Versand und keine Uhr: "jetzt" ist immer ein Parameter. Es importiert nur die
Standardbibliothek und ist damit ohne Laufzeitumgebung des Shop-Dienstes prüfbar.

Das Zustandsmodell (Abschnitt 2) ist vom Inhaber noch nicht bestätigt. Die Übergänge stehen deshalb
an genau einer Stelle als Daten (UEBERGAENGE); eine Änderung des Modells ist eine Änderung dieser Tabelle.
Fristen haben keine Vorgabe im Code: fristen_aus() liefert None, solange ein Pflichtwert fehlt.
"""
import copy
import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

UTC = timezone.utc

KUNDE, WERKSTATT, SYSTEM, INHABER = "kunde", "werkstatt", "system", "inhaber"
GEGENSEITE = "gegenseite"  # bei verschoben: die Seite, die den Vorschlag nicht gemacht hat

ZUSTAENDE = ("wunsch", "bestaetigt", "verschoben", "abgelehnt", "abgesagt", "erledigt", "verfallen")
ENDZUSTAENDE = frozenset({"abgelehnt", "abgesagt", "erledigt", "verfallen"})
AKTIONEN = ("confirm", "decline", "propose", "accept", "cancel", "complete")  # Aufrufe der Schnittstelle, Abschnitt 9

# Abschnitt 2.2. Zustand und Aufruf bestimmen den Übergang eindeutig. "empfaenger" beschreibt, wer die
# Nachricht erhält: feste Rollen, GEGENSEITE (die jeweils andere Seite, beim Inhaber beide) oder
# "kunde_und_vorschlagende" (U10: der Kunde und die Seite, deren Vorschlag angenommen wurde).
UEBERGAENGE = (
    {"nr": "U1", "von": None, "nach": "wunsch", "aktion": "create", "ausloeser": (KUNDE,), "grund_pflicht": (), "nachricht": ("N2", "N1"), "empfaenger": None},
    {"nr": "U2", "von": "wunsch", "nach": "bestaetigt", "aktion": "confirm", "ausloeser": (WERKSTATT,), "grund_pflicht": (), "nachricht": ("N3",), "empfaenger": (KUNDE,)},
    {"nr": "U3", "von": "wunsch", "nach": "abgelehnt", "aktion": "decline", "ausloeser": (WERKSTATT,), "grund_pflicht": (WERKSTATT,), "nachricht": ("N4",), "empfaenger": (KUNDE,)},
    {"nr": "U4", "von": "wunsch", "nach": "verschoben", "aktion": "propose", "ausloeser": (WERKSTATT,), "grund_pflicht": (), "nachricht": ("N5",), "empfaenger": GEGENSEITE},
    {"nr": "U5", "von": "wunsch", "nach": "abgesagt", "aktion": "cancel", "ausloeser": (KUNDE, INHABER), "grund_pflicht": (INHABER,), "nachricht": ("N6",), "empfaenger": GEGENSEITE},
    {"nr": "U6", "von": "wunsch", "nach": "verfallen", "aktion": "expire", "ausloeser": (SYSTEM,), "grund_pflicht": (), "nachricht": ("N7",), "empfaenger": (KUNDE,)},
    {"nr": "U7", "von": "bestaetigt", "nach": "verschoben", "aktion": "propose", "ausloeser": (KUNDE, WERKSTATT), "grund_pflicht": (), "nachricht": ("N5",), "empfaenger": GEGENSEITE},
    {"nr": "U8", "von": "bestaetigt", "nach": "abgesagt", "aktion": "cancel", "ausloeser": (KUNDE, WERKSTATT, INHABER), "grund_pflicht": (WERKSTATT, INHABER), "nachricht": ("N6",), "empfaenger": GEGENSEITE},
    # N10 zu U9 ist OFFEN (E-11) und wird nicht gesendet.
    {"nr": "U9", "von": "bestaetigt", "nach": "erledigt", "aktion": "complete", "ausloeser": (WERKSTATT,), "grund_pflicht": (), "nachricht": (), "empfaenger": ()},
    {"nr": "U10", "von": "verschoben", "nach": "bestaetigt", "aktion": "accept", "ausloeser": (GEGENSEITE,), "grund_pflicht": (), "nachricht": ("N3",), "empfaenger": "kunde_und_vorschlagende"},
    {"nr": "U11", "von": "verschoben", "nach": "verschoben", "aktion": "propose", "ausloeser": (GEGENSEITE,), "grund_pflicht": (), "nachricht": ("N5",), "empfaenger": GEGENSEITE},
    # 2.2 nennt bei U12 keinen Pflichtgrund, 5.2 verlangt ihn für Werkstatt und Inhaber. Gebaut ist die engere Fassung.
    {"nr": "U12", "von": "verschoben", "nach": "abgesagt", "aktion": "cancel", "ausloeser": (KUNDE, WERKSTATT, INHABER), "grund_pflicht": (WERKSTATT, INHABER), "nachricht": ("N6",), "empfaenger": GEGENSEITE},
    {"nr": "U13", "von": "verschoben", "nach": "verfallen", "aktion": "expire", "ausloeser": (SYSTEM,), "grund_pflicht": (), "nachricht": ("N7",), "empfaenger": (KUNDE, WERKSTATT)},
)

# "Grund aus fester Liste" (2.2, 5.2): Die Spezifikation nennt die Liste nicht. ENTWURF, vom Inhaber zu bestätigen.
GRUND_CODES = {
    "decline": ("keine_kapazitaet", "leistung_nicht_moeglich", "zeitraum_nicht_moeglich", "sonstiges"),
    "cancel": ("verhindert", "zeitraum_nicht_moeglich", "betrieblich", "sonstiges"),
}
GRUND_TEXT_MAX = 200

# Pflichtwerte der Konfiguration (Abschnitt 3.1). Ohne jeden einzelnen bleibt die Funktion geschlossen.
FRIST_NAMEN = (
    "TEILEKLAR_APPOINTMENTS_F1_MINUTES",   # Antwortfrist der Werkstatt auf einen Wunsch
    "TEILEKLAR_APPOINTMENTS_F2_MINUTES",   # Antwortfrist der Gegenseite auf einen Vorschlag
    "TEILEKLAR_APPOINTMENTS_F3_MINUTES",   # Mindestvorlauf
    "TEILEKLAR_APPOINTMENTS_F4_MINUTES",   # Höchstvorlauf
    "TEILEKLAR_APPOINTMENTS_F5_MINUTES",   # Abstand vor dem Termin, bis zu dem eine Verlegung zulässig ist
    "TEILEKLAR_APPOINTMENTS_F11_ROUNDS",   # Höchstzahl der Vorschlagsrunden
)

# Zeitzone je Markt des Verzeichnisses (6.3, ANNAHME). Der Wert wird am Termin gespeichert.
ZEITZONE_JE_LAND = {"DE": "Europe/Berlin", "AT": "Europe/Vienna", "NL": "Europe/Amsterdam", "BE": "Europe/Brussels",
                    "CH": "Europe/Zurich", "LU": "Europe/Luxembourg"}

EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
JAHR_VON, JAHR_BIS = 2000, 2199   # technische Grenze der Eingabe, keine Frist: außerhalb ist die Umrechnung nicht verlässlich
ZEITFORM = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?", re.ASCII)

# Sichten nach Abschnitt 5.2 ("Sichtbar für"). zugriff_kunde sieht niemand.
SICHT_GEMEINSAM = ("id", "nummer", "werkstatt_id", "werkstatt_name", "werkstatt_anschrift", "zustand", "version", "wunsch_von", "wunsch_bis",
                   "zeitzone", "termin_am", "dauer_minuten", "vorschlag_am", "vorschlag_von", "vorschlag_runde", "antwort_bis",
                   "grund_code", "grund_text", "abgesagt_von", "vorgaenger_id", "erstellt_am", "geaendert_am")
SICHT_WERKSTATT_ZUSATZ = ("kunde_name", "fahrzeug", "anliegen")  # Kontaktdaten des Kunden erst nach E-09
SICHT_NIEMAND = ("zugriff_kunde",)
# Was ein Übergang ändern kann. Jeder Verlaufseintrag hält diesen Stand fest, damit die Wiederholung eines
# Aufrufs das damalige Ergebnis liefert und nicht den heutigen Stand (6.1).
STAND_FELDER = ("zustand", "version", "termin_am", "dauer_minuten", "vorschlag_am", "vorschlag_von", "vorschlag_runde", "antwort_bis",
                "grund_code", "grund_text", "abgesagt_von", "geaendert_am")
VERLAUF_OEFFENTLICH = ("nr", "von", "nach", "ausloeser", "zeit", "version", "grund_code")


class Abweisung(Exception):
    """Fachliche Abweisung mit HTTP-Status und Fehlercode aus Abschnitt 9. Trägt nie Daten anderer Mandanten."""

    def __init__(self, status, code, **extra):
        super().__init__(code)
        self.status, self.code, self.extra = status, code, extra

    def detail(self):
        return {"error": self.code, **self.extra}


class Feldfehler(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


class UnbekannteZeitzone(Exception):
    """Die Zeitzone des Betriebs ist nicht auflösbar; ohne sie wird kein Zeitpunkt angenommen."""


@dataclass(frozen=True)
class Fristen:
    f1: timedelta
    f2: timedelta
    f3: timedelta
    f4: timedelta
    f5: timedelta
    f11: int


@dataclass
class Aenderung:
    """Ergebnis eines Übergangs: was zu setzen ist, der Verlaufseintrag und die fälligen Nachrichten."""
    nr: str
    setze: dict
    eintrag: dict
    nachrichten: list = field(default_factory=list)  # [(Nachricht, Empfängerrolle)]


def fristen_aus(werte):
    """Liest F1 bis F5 und F11 aus einer Abbildung Name -> Text. None, wenn ein Wert fehlt oder unbrauchbar ist."""
    zahlen = []
    for name in FRIST_NAMEN:
        roh = werte.get(name)
        if not isinstance(roh, str) or not re.fullmatch(r"[0-9]{1,7}", roh.strip()):
            return None
        zahlen.append(int(roh.strip()))
    f1, f2, f3, f4, f5, f11 = zahlen
    if f1 < 1 or f2 < 1 or f4 < 1 or f11 < 1 or f3 >= f4:
        return None
    return Fristen(timedelta(minutes=f1), timedelta(minutes=f2), timedelta(minutes=f3), timedelta(minutes=f4), timedelta(minutes=f5), f11)


# ---------------------------------------------------------------- Zeit (Abschnitt 6.3)

def zeitzone_fuer_markt(markt):
    if not isinstance(markt, str):
        return None
    return ZEITZONE_JE_LAND.get(markt.strip().split("-")[-1].upper())


def _zone(zeitzone):
    try:
        return ZoneInfo(zeitzone)
    except Exception:
        raise UnbekannteZeitzone() from None


def utc_text(zeitpunkt):
    """Form der gespeicherten Zeitpunkte: UTC, Sekunden, immer mit +00:00 (ordnet sich als Text)."""
    return zeitpunkt.astimezone(UTC).replace(microsecond=0).isoformat()


def aus_text(text):
    return datetime.fromisoformat(text).astimezone(UTC)


def lies_zeitpunkt(text, zeitzone):
    """Ortszeit der Werkstatt (ohne Versatz) oder Zeitpunkt mit Versatz -> UTC.

    Eine Ortszeit, die es nicht gibt, und eine, die es zweimal gibt, werden abgewiesen, nie verschoben.
    Ein Versatz wird nur angenommen, wenn er am Ort der Werkstatt zu dieser Uhrzeit gilt.
    """
    zone = _zone(zeitzone)
    if text is None or text == "":
        raise Feldfehler("required")
    if not isinstance(text, str) or not ZEITFORM.fullmatch(text.strip()):
        raise Feldfehler("invalid")
    try:
        gelesen = datetime.fromisoformat(text.strip().replace("Z", "+00:00"))
        if not JAHR_VON <= gelesen.year <= JAHR_BIS:
            raise ValueError("Jahr außerhalb des angenommenen Bereichs")
        wand = gelesen.replace(tzinfo=None)
        moeglich = []
        for fold in (0, 1):
            kandidat = wand.replace(tzinfo=zone, fold=fold).astimezone(UTC)
            if kandidat.astimezone(zone).replace(tzinfo=None) == wand and kandidat not in moeglich:
                moeglich.append(kandidat)
    except (ValueError, OverflowError):
        raise Feldfehler("invalid") from None
    if not moeglich:
        raise Feldfehler("time_not_existent")
    if gelesen.tzinfo is None:
        if len(moeglich) > 1:
            raise Feldfehler("time_ambiguous")
        return moeglich[0]
    genannt = gelesen.astimezone(UTC)
    if genannt not in moeglich:
        raise Feldfehler("invalid")
    return genannt


def ortszeit_text(utc, zeitzone):
    """Anzeige in Ortszeit der Werkstatt mit Nennung der Zeitzone, zum Beispiel für Nachrichten."""
    ort = aus_text(utc).astimezone(_zone(zeitzone))
    versatz = ort.strftime("%z")
    return "%s Uhr (%s, UTC%s:%s)" % (ort.strftime("%d.%m.%Y, %H:%M"), zeitzone, versatz[:3], versatz[3:])


def erinnerung_am_vortag(termin_utc, zeitzone):
    """Dieselbe Uhrzeit am Vortag in Ortszeit der Werkstatt (F6, F7); über eine Umstellung sind das 23 oder 25 Stunden.

    Ungenutzt, bis E-11 entschieden ist. Wirft Feldfehler, wenn es die Uhrzeit am Vortag nicht oder zweimal gibt.
    """
    zone = _zone(zeitzone)
    ort = aus_text(termin_utc).astimezone(zone)
    vortag = ort.replace(tzinfo=None) - timedelta(days=1)
    # Gibt es die Uhrzeit am Vortag nicht oder zweimal, wird nichts verschoben: Feldfehler wie bei jeder Eingabe.
    return utc_text(lies_zeitpunkt(vortag.strftime("%Y-%m-%dT%H:%M:%S"), zeitzone))


def pruefsumme(wert):
    return hashlib.sha256(json.dumps(wert, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8", "backslashreplace")).hexdigest()


# ---------------------------------------------------------------- Anlegen (U1)

def _text(eingabe, name):
    wert = eingabe.get(name)
    return wert.strip() if isinstance(wert, str) else ""


def nutzlast_wunsch(werkstatt_id, eingabe):
    """Bereinigte Nutzlast für die Wiederholungsprüfung (6.1): gleicher Schlüssel, andere Nutzlast = Konflikt."""
    return {"werkstatt_id": werkstatt_id, "name": _text(eingabe, "name"), "email": _text(eingabe, "email").lower(),
            "telefon": _text(eingabe, "telefon"), "fahrzeug": _text(eingabe, "fahrzeug"), "anliegen": _text(eingabe, "anliegen"),
            "einwilligung": eingabe.get("einwilligung") is True, "einwilligung_fassung": _text(eingabe, "einwilligung_fassung"),
            "wunsch_von": _text(eingabe, "wunsch_von"), "wunsch_bis": _text(eingabe, "wunsch_bis"),
            "seite": _text(eingabe, "seite"), "sprache": _text(eingabe, "sprache") or "de", "vorgaenger_id": _text(eingabe, "vorgaenger_id")}


def neuer_wunsch(eingabe, werkstatt, jetzt, fristen, *, kennung, schluessel_pruefsumme, nutzlast_pruefsumme, zugriff_pruefsumme,
                 kunde_user_id=None, vorgaenger_id=None):
    """U1. werkstatt = {"id", "name", "anschrift", "zeitzone"} aus dem geprüften Partnerprofil, nie aus der Anfrage."""
    werte, fehler = nutzlast_wunsch(werkstatt["id"], eingabe), {}
    if len(werte["name"]) < 2:
        fehler["name"] = "required"
    elif len(werte["name"]) > 100:
        fehler["name"] = "invalid"
    if not werte["email"]:
        fehler["email"] = "required"
    elif len(werte["email"]) > 160 or not EMAIL.fullmatch(werte["email"]):
        fehler["email"] = "invalid"
    if not werte["anliegen"]:
        fehler["anliegen"] = "required"
    elif len(werte["anliegen"]) < 10:
        fehler["anliegen"] = "too_short"
    elif len(werte["anliegen"]) > 2000:
        fehler["anliegen"] = "invalid"
    if len(werte["telefon"]) > 40:
        fehler["telefon"] = "invalid"
    if len(werte["fahrzeug"]) > 160:
        fehler["fahrzeug"] = "invalid"
    if not werte["einwilligung"]:
        fehler["einwilligung"] = "required"
    if not werte["einwilligung_fassung"]:
        fehler["einwilligung_fassung"] = "required"
    elif not re.fullmatch(r"[A-Za-z0-9._-]{1,40}", werte["einwilligung_fassung"]):
        fehler["einwilligung_fassung"] = "invalid"
    if len(werte["seite"]) > 200:
        fehler["seite"] = "invalid"
    if not re.fullmatch(r"[a-z]{2}", werte["sprache"]):
        fehler["sprache"] = "invalid"
    zeiten = {}
    for name in ("wunsch_von", "wunsch_bis"):
        try:
            zeiten[name] = lies_zeitpunkt(werte[name], werkstatt["zeitzone"])
        except Feldfehler as feldfehler:
            fehler[name] = feldfehler.code
    if len(zeiten) == 2:
        if zeiten["wunsch_von"] < jetzt + fristen.f3:
            fehler["wunsch_von"] = "too_early"
        elif zeiten["wunsch_von"] > jetzt + fristen.f4:
            fehler["wunsch_von"] = "too_late"
        if zeiten["wunsch_bis"] <= zeiten["wunsch_von"]:
            fehler["wunsch_bis"] = "window_invalid"
        elif zeiten["wunsch_bis"] > jetzt + fristen.f4:
            fehler["wunsch_bis"] = "too_late"
    if fehler:
        raise Abweisung(422, "appointment_invalid", fields=fehler)
    stempel = utc_text(jetzt)
    # Feste technische Regel (3.1): Die Antwortfrist endet spätestens mit dem Ende des Wunschfensters.
    antwort_bis = min(jetzt + fristen.f1, zeiten["wunsch_bis"])
    termin = {
        "id": kennung, "nummer": "TK-T-%s-%s" % (jetzt.astimezone(UTC).strftime("%Y%m%d"), kennung[:10].upper()), "marke": "teileklar",
        "werkstatt_id": werkstatt["id"], "werkstatt_name": werkstatt["name"], "werkstatt_anschrift": werkstatt["anschrift"],
        "zustand": "wunsch", "version": 1,
        "wunsch_von": utc_text(zeiten["wunsch_von"]), "wunsch_bis": utc_text(zeiten["wunsch_bis"]), "zeitzone": werkstatt["zeitzone"],
        "ortszeit_eingabe": {"wunsch_von": werte["wunsch_von"], "wunsch_bis": werte["wunsch_bis"]},
        "termin_am": None, "dauer_minuten": None, "vorschlag_am": None, "vorschlag_von": None, "vorschlag_runde": 0,
        "antwort_bis": utc_text(antwort_bis),
        "kunde_name": werte["name"], "kunde_email": werte["email"], "kunde_telefon": werte["telefon"], "kunde_user_id": kunde_user_id,
        "fahrzeug": werte["fahrzeug"], "anliegen": werte["anliegen"],
        "einwilligung": {"zeit": stempel, "fassung": werte["einwilligung_fassung"], "sprache": werte["sprache"]},
        "seite": werte["seite"], "sprache": werte["sprache"],
        "grund_code": None, "grund_text": None, "abgesagt_von": None,
        "verlauf": [{"art": "uebergang", "nr": "U1", "von": None, "nach": "wunsch", "aktion": "create", "ausloeser": KUNDE, "zeit": stempel,
                     "version": 1, "schluessel_pruefsumme": schluessel_pruefsumme, "nutzlast_pruefsumme": nutzlast_pruefsumme, "grund_code": None}],
        "zugriff_kunde": zugriff_pruefsumme, "nutzlast_pruefsumme": nutzlast_pruefsumme, "benachrichtigungen": [],
        "vorgaenger_id": vorgaenger_id, "erstellt_am": stempel, "geaendert_am": stempel,
    }
    termin["verlauf"][0]["stand"] = {name: termin[name] for name in STAND_FELDER}
    return termin, [("N2", WERKSTATT), ("N1", KUNDE)]


# ---------------------------------------------------------------- Fristablauf (U6, U13)

def ist_faellig(termin, jetzt):
    """Schweigen ist nie Zustimmung: Mit Erreichen von antwort_bis ist der Wunsch oder Vorschlag verfallen."""
    return termin["zustand"] in ("wunsch", "verschoben") and bool(termin.get("antwort_bis")) and jetzt >= aus_text(termin["antwort_bis"])


def verfall(termin, jetzt):
    """Die Änderung zu U6 oder U13, wenn die Frist erreicht ist; sonst None. Einziger Übergang des Systems."""
    if not ist_faellig(termin, jetzt):
        return None
    zeile = _zeile(termin["zustand"], "expire")
    eintrag = _eintrag(zeile, termin, SYSTEM, jetzt, None, None, antwort_bis_zuvor=termin["antwort_bis"], vorschlag_am_zuvor=termin.get("vorschlag_am"))
    setze = {"zustand": "verfallen", "version": termin["version"] + 1, "antwort_bis": None, "vorschlag_am": None, "geaendert_am": utc_text(jetzt)}
    eintrag["stand"] = _stand_nach(termin, setze)
    return Aenderung(zeile["nr"], setze, eintrag, [(nachricht, rolle) for nachricht in zeile["nachricht"] for rolle in zeile["empfaenger"]])


# ---------------------------------------------------------------- Übergänge (U2 bis U5, U7 bis U12)

def _zeile(zustand, aktion):
    for zeile in UEBERGAENGE:
        if zeile["von"] == zustand and zeile["aktion"] == aktion and zeile["von"] is not None:
            return zeile
    return None


def _darf(zeile, termin, rolle):
    """Rollenprüfung. Die Rolle kommt aus der geprüften Sitzung oder dem geprüften Nachweis, nie aus der Anfrage."""
    if rolle in zeile["ausloeser"]:
        return True
    return GEGENSEITE in zeile["ausloeser"] and rolle in (KUNDE, WERKSTATT) and termin.get("vorschlag_von") in (KUNDE, WERKSTATT) and rolle != termin["vorschlag_von"]


def _bedingung(zeile, termin, jetzt, fristen):
    """Bedingungen aus 2.2, die keine Feldfehler sind."""
    if zeile["nr"] == "U7":   # Verlegung noch zulässig (F5); was sonst nach F5 gilt, ist E-04
        return bool(termin.get("termin_am")) and jetzt <= aus_text(termin["termin_am"]) - fristen.f5
    if zeile["nr"] == "U9":   # bestätigter Zeitpunkt liegt in der Vergangenheit
        return bool(termin.get("termin_am")) and jetzt > aus_text(termin["termin_am"])
    if zeile["nr"] == "U11":  # Zahl der Runden unter der Grenze F11
        return termin.get("vorschlag_runde", 0) < fristen.f11
    return True


def _stand_nach(termin, setze):
    return {name: setze.get(name, termin.get(name)) for name in STAND_FELDER}


def _stand(termin):
    return {"zustand": termin["zustand"], "version": termin["version"]}


def _eintrag(zeile, termin, rolle, jetzt, schluessel_pruefsumme, nutzlast_pruefsumme, **zusatz):
    return {"art": "uebergang", "nr": zeile["nr"], "von": zeile["von"], "nach": zeile["nach"], "aktion": zeile["aktion"], "ausloeser": rolle,
            "zeit": utc_text(jetzt), "version": termin["version"] + 1, "schluessel_pruefsumme": schluessel_pruefsumme,
            "nutzlast_pruefsumme": nutzlast_pruefsumme, "grund_code": None, **zusatz}


def _empfaenger(zeile, termin, rolle):
    regel = zeile["empfaenger"]
    if regel == GEGENSEITE:
        return [seite for seite in (KUNDE, WERKSTATT) if seite != rolle]
    if regel == "kunde_und_vorschlagende":
        return [KUNDE] + ([WERKSTATT] if termin.get("vorschlag_von") == WERKSTATT else [])
    return list(regel)


def pruefe_eingabe(termin, aktion, rolle, eingabe, jetzt, fristen=None):
    """Feldprüfung eines Übergangs (422). Liefert die bereinigten Werte."""
    fehler, werte, hinweis = {}, {}, None
    version = eingabe.get("version")
    if version is None:
        fehler["version"] = "version_required"
    elif type(version) is not int:
        fehler["version"] = "invalid"
    werte["version"] = version
    feld = {"confirm": "termin_am", "propose": "vorschlag_am"}.get(aktion)
    if feld:
        try:
            zeitpunkt = lies_zeitpunkt(eingabe.get(feld), termin["zeitzone"])
        except Feldfehler as feldfehler:
            fehler[feld] = feldfehler.code
        else:
            werte[feld] = utc_text(zeitpunkt)
            im_fenster = aus_text(termin["wunsch_von"]) <= zeitpunkt <= aus_text(termin["wunsch_bis"])
            if zeitpunkt <= jetzt:
                fehler[feld] = "in_past"
            elif fristen is not None and zeitpunkt > jetzt + fristen.f4:
                fehler[feld] = "too_late"   # auch ein Vorschlag liegt höchstens so weit voraus wie ein Wunsch (F4)
            elif termin["zustand"] == "wunsch" and aktion == "confirm" and not im_fenster:
                fehler[feld], hinweis = "window_invalid", "propose"   # U2: nur im Wunschfenster; sonst U4
            elif termin["zustand"] == "wunsch" and aktion == "propose" and im_fenster:
                fehler[feld], hinweis = "window_invalid", "confirm"   # U4: nur außerhalb des Wunschfensters; sonst U2
    if aktion == "confirm":
        dauer = eingabe.get("dauer_minuten")
        if dauer is not None and (type(dauer) is not int or not 1 <= dauer <= 1440):
            fehler["dauer_minuten"] = "invalid"
        werte["dauer_minuten"] = dauer
    if aktion in ("confirm", "accept"):
        werte["ueberschneidung_bestaetigt"] = eingabe.get("ueberschneidung_bestaetigt") is True
    if aktion in GRUND_CODES:
        zeile = _zeile(termin["zustand"], aktion)
        code, text = eingabe.get("grund_code"), eingabe.get("grund_text")
        if code in (None, ""):
            if zeile and rolle in zeile["grund_pflicht"]:
                fehler["grund_code"] = "reason_required"
            code = None
        elif code not in GRUND_CODES[aktion]:
            fehler["grund_code"] = "invalid"
        if text in (None, ""):
            text = None
        elif not isinstance(text, str) or len(text.strip()) > GRUND_TEXT_MAX:
            fehler["grund_text"] = "invalid"
        else:
            text = text.strip() or None
        werte["grund_code"], werte["grund_text"] = code, text
    if fehler:
        extra = {"fields": fehler}
        if hinweis:
            extra["hinweis"] = hinweis
        raise Abweisung(422, "appointment_invalid", **extra)
    return werte


def wiederholung(termin, schluessel_pruefsumme, aktion, rolle, nutzlast_pruefsumme):
    """Idempotenz der Übergänge (6.1): True, wenn derselbe Schlüssel denselben Aufruf schon bewirkt hat.

    Derselbe Schlüssel für einen anderen Aufruf, eine andere Rolle oder eine andere Nutzlast ist ein Konflikt.
    """
    if not schluessel_pruefsumme:
        return False
    for eintrag in termin.get("verlauf", ()):
        if eintrag.get("schluessel_pruefsumme") == schluessel_pruefsumme:
            if (eintrag.get("aktion"), eintrag.get("ausloeser"), eintrag.get("nutzlast_pruefsumme")) != (aktion, rolle, nutzlast_pruefsumme):
                raise Abweisung(409, "idempotency_conflict")
            return True
    return False


def ergebnis_von(termin, schluessel_pruefsumme):
    """Der Termin, wie ihn der Aufruf mit diesem Schlüssel hinterlassen hat: gespeichertes Ergebnis einer Wiederholung."""
    for stelle, eintrag in enumerate(termin.get("verlauf", ())):
        if schluessel_pruefsumme and eintrag.get("schluessel_pruefsumme") == schluessel_pruefsumme:
            damals = copy.deepcopy(termin)
            damals.update(copy.deepcopy(eintrag.get("stand") or {}))
            damals["verlauf"] = damals["verlauf"][:stelle + 1]
            damals["benachrichtigungen"] = [a for a in damals.get("benachrichtigungen", ()) if a.get("version", 0) <= eintrag["version"]]
            return damals
    return None


def uebergang(termin, aktion, rolle, eingabe, jetzt, fristen, *, schluessel_pruefsumme, nutzlast_pruefsumme):
    """Prüft einen Aufruf in der Reihenfolge aus Abschnitt 9 und liefert die Änderung. Fasst den Termin nicht an.

    Reihenfolge: Feldprüfung (422) -> Frist (409 appointment_expired) -> Übergang und Rolle erlaubt (409)
    -> Version (409). Das Schreiben selbst ist Sache des Aufrufers und dort ein bedingter Schreibvorgang.
    """
    werte = pruefe_eingabe(termin, aktion, rolle, eingabe, jetzt, fristen)
    if ist_faellig(termin, jetzt):
        raise Abweisung(409, "appointment_expired", **_stand(termin))
    zeile = _zeile(termin["zustand"], aktion) if aktion in AKTIONEN else None
    if zeile is None or not _darf(zeile, termin, rolle) or not _bedingung(zeile, termin, jetzt, fristen):
        raise Abweisung(409, "appointment_transition_forbidden", **_stand(termin))
    if werte["version"] != termin["version"]:
        raise Abweisung(409, "appointment_version_conflict", **_stand(termin))
    nr = zeile["nr"]
    setze = {"zustand": zeile["nach"], "version": termin["version"] + 1, "geaendert_am": utc_text(jetzt)}
    zusatz = {}
    if nr == "U2":
        setze.update(termin_am=werte["termin_am"], dauer_minuten=werte["dauer_minuten"], antwort_bis=None)
    elif nr == "U3":
        setze.update(grund_code=werte["grund_code"], grund_text=werte["grund_text"], antwort_bis=None)
    elif nr in ("U4", "U7", "U11"):
        vorschlag = aus_text(werte["vorschlag_am"])
        # Feste technische Regel (3.1): Die Antwortfrist endet spätestens mit dem vorgeschlagenen Zeitpunkt.
        setze.update(vorschlag_am=werte["vorschlag_am"], vorschlag_von=rolle, antwort_bis=utc_text(min(jetzt + fristen.f2, vorschlag)),
                     vorschlag_runde=termin.get("vorschlag_runde", 0) + 1 if nr == "U11" else 1)
        if nr == "U7":  # ANNAHME zu U7: der bisherige Zeitpunkt ist nicht mehr zugesagt (E-05)
            zusatz["termin_am_zuvor"] = termin["termin_am"]
            setze.update(termin_am=None, dauer_minuten=None)
    elif nr in ("U5", "U8", "U12"):
        zusatz.update(termin_am_zuvor=termin.get("termin_am"), vorschlag_am_zuvor=termin.get("vorschlag_am"))
        setze.update(abgesagt_von=rolle, grund_code=werte["grund_code"], grund_text=werte["grund_text"], antwort_bis=None,
                     termin_am=None, dauer_minuten=None, vorschlag_am=None)
    elif nr == "U10":
        setze.update(termin_am=termin["vorschlag_am"], vorschlag_am=None, antwort_bis=None)
        zusatz["vorschlag_von"] = termin["vorschlag_von"]
    eintrag = _eintrag(zeile, termin, rolle, jetzt, schluessel_pruefsumme, nutzlast_pruefsumme, **zusatz)
    eintrag["grund_code"] = werte.get("grund_code")
    if werte.get("grund_text"):
        eintrag["grund_text"] = werte["grund_text"]
    eintrag["stand"] = _stand_nach(termin, setze)
    nachrichten = [(nachricht, seite) for nachricht in zeile["nachricht"] for seite in _empfaenger(zeile, termin, rolle)]
    return Aenderung(nr, setze, eintrag, nachrichten)


def anwenden(termin, aenderung):
    """Der Termin nach der Änderung, als Kopie. Der Speicher wendet dieselbe Änderung bedingt an."""
    neu = copy.deepcopy(termin)
    neu.update(copy.deepcopy(aenderung.setze))
    neu["verlauf"].append(copy.deepcopy(aenderung.eintrag))
    return neu


def erlaubte_aktionen(termin, rolle, jetzt, fristen):
    """Aus 2.2 für diese Rolle berechnet; für die Antwort der Schnittstelle (Abschnitt 9)."""
    if ist_faellig(termin, jetzt):
        return []
    erlaubt = []
    for aktion in AKTIONEN:
        zeile = _zeile(termin["zustand"], aktion)
        if zeile and _darf(zeile, termin, rolle) and _bedingung(zeile, termin, jetzt, fristen):
            erlaubt.append(aktion)
    return erlaubt


# ---------------------------------------------------------------- Sichten (5.2)

def sicht(termin, rolle):
    """Der Termin in der Sicht der Rolle. Feldlisten stehen oben als Daten; bei E-09 dort anzupassen."""
    if rolle == INHABER:
        bild = {name: copy.deepcopy(wert) for name, wert in termin.items() if name not in SICHT_NIEMAND and name != "_id"}
        return bild
    if rolle == KUNDE:
        felder = SICHT_GEMEINSAM
    elif rolle == WERKSTATT:
        felder = SICHT_GEMEINSAM + SICHT_WERKSTATT_ZUSATZ
    else:
        raise ValueError("keine Sicht für diese Rolle")
    bild = {name: copy.deepcopy(termin.get(name)) for name in felder}
    bild["verlauf"] = [{name: eintrag.get(name) for name in VERLAUF_OEFFENTLICH}
                       for eintrag in termin.get("verlauf", ()) if eintrag.get("art") == "uebergang"]
    return bild
