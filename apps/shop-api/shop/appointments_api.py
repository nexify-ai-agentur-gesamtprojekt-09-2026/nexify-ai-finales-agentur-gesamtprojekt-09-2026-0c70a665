"""Terminbuchung des Werkstattservice, Stufe 1: Schnittstelle (docs/03-backend/werkstatt-terminlogik.md, Abschnitt 9).

NICHT EINGEBUNDEN. Dieses Modul wird von main.py und vercel_app.py nicht geladen (Teil B5 steht aus); die
Routen sind in der Auslieferung nicht erreichbar. Es importiert weder die Datenbank noch die Konfiguration des
Shop-Dienstes: alles, was es von außen braucht, kommt über `Abhaengigkeiten` herein.

Geschlossen, solange nicht ausdrücklich geöffnet:
- Schalter TEILEKLAR_APPOINTMENTS ungleich "1": jede Route antwortet 404.
- Ein Pflichtwert F1 bis F5 oder F11 fehlt (appointments.FRIST_NAMEN, ohne Vorgabe im Code): 503.
- Versand von Terminnachrichten nur mit TEILEKLAR_APPOINTMENT_MAILS = "1" (die Texte sind Entwurf und
  brauchen die Freigabe des Inhabers), an Werkstätten zusätzlich nur mit TEILEKLAR_APPOINTMENT_MAILS_WORKSHOP = "1".

Prüfreihenfolge je Aufruf (Abschnitt 9): Schalter -> Herkunft -> Anmeldung und Rolle -> Auffinden mit
Mandantenbindung (404) -> Idempotenzschlüssel -> Wiederholung -> Feldprüfung (422) -> Frist (409) ->
Übergang erlaubt (409) -> Version (409) -> bedingtes Schreiben -> Nachricht einreihen.

Der Speicher steht hinter einer schmalen Schnittstelle (ArbeitsspeicherTermine zeigt sie). Die dauerhafte Ablage
folgt dem Muster der Zugriffsschicht shop/store (PR 150): eine Klasse je Bereich, Methoden nach fachlicher
Absicht, fachliche Fehler ohne Treibertext; Entscheidungen bleiben hier und in appointments.py.
"""
import asyncio
import copy
import hashlib
import hmac
import json
import re
import secrets
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Callable

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from . import appointment_mails
from . import appointments as termine
from .appointments import INHABER, KUNDE, WERKSTATT, Abweisung

SCHALTER = "TEILEKLAR_APPOINTMENTS"
SCHALTER_NACHRICHTEN = "TEILEKLAR_APPOINTMENT_MAILS"
SCHALTER_NACHRICHTEN_WERKSTATT = "TEILEKLAR_APPOINTMENT_MAILS_WORKSHOP"
NACHWEIS_KOPF = "x-appointment-access"   # Zugriffsnachweis des Kunden: als Kopf, nie als Teil der Adresse
SCHLUESSEL_FORM = re.compile(r"[A-Za-z0-9_-]{16,128}")
STUNDENGRENZE = 5        # Schutzwert je E-Mail-Adresse und Stunde, übernommen aus requests_api.HOURLY_LIMIT; keine Frist
SEITENGROESSE = 50
RUMPF_MAX = 16384
VERWALTUNGSPFAD = "/teileklar/termine"   # Vorschlag; die Seite ist Teil B6
UEBERGANGSFELDER = ("version", "termin_am", "dauer_minuten", "ueberschneidung_bestaetigt", "vorschlag_am", "grund_code", "grund_text")
OHNE_CACHE = {"Cache-Control": "no-store"}


class SchonVorhanden(Exception):
    """Die Kennung ist schon vergeben. Entspricht AlreadyExists der Zugriffsschicht; trägt keinen Treibertext."""


class ArbeitsspeicherTermine:
    """Speicher im Arbeitsspeicher für Tests und als Beschreibung der Schnittstelle. Gibt nur Kopien heraus.

    Eine dauerhafte Umsetzung muss dieselben Zusagen halten, insbesondere: lege_an scheitert am eindeutigen
    Schlüssel der Datenbank, und schreibe_uebergang ist EIN bedingter Schreibvorgang (6.2).
    """

    def __init__(self):
        self.zeilen = {}

    async def hole(self, termin_id):
        await asyncio.sleep(0)
        return copy.deepcopy(self.zeilen.get(termin_id))

    async def lege_an(self, termin):
        await asyncio.sleep(0)
        if termin["id"] in self.zeilen:
            raise SchonVorhanden()
        self.zeilen[termin["id"]] = copy.deepcopy(termin)

    async def schreibe_uebergang(self, termin_id, werkstatt_id, zustand, version, setze, eintrag, absichten):
        """Schreibt nur, wo Kennung, Betrieb, Zustand und Version passen. True, wenn geschrieben wurde."""
        await asyncio.sleep(0)
        zeile = self.zeilen.get(termin_id)
        if not zeile or (zeile["werkstatt_id"], zeile["zustand"], zeile["version"]) != (werkstatt_id, zustand, version):
            return False
        zeile.update(copy.deepcopy(setze))
        zeile["verlauf"].append(copy.deepcopy(eintrag))
        zeile["benachrichtigungen"].extend(copy.deepcopy(absichten))
        return True

    async def vermerke_versand(self, termin_id, status_je_schluessel):
        """Hält den Versandstatus je Ereignisschlüssel fest. Ändert weder Zustand noch Version."""
        for absicht in self.zeilen.get(termin_id, {}).get("benachrichtigungen", ()):
            if absicht["schluessel"] in status_je_schluessel:
                absicht["status"] = status_je_schluessel[absicht["schluessel"]]

    async def haenge_verlauf_an(self, termin_id, eintrag):
        """Interner Verlaufseintrag (Zugriff des Inhabers). Ändert weder Zustand noch Version."""
        if termin_id in self.zeilen:
            self.zeilen[termin_id]["verlauf"].append(copy.deepcopy(eintrag))

    async def zaehle_von_email_seit(self, email, seit):
        """seit und erstellt_am sind UTC-Zeitpunkte als Text; Grenze einschließlich."""
        return len([1 for zeile in self.zeilen.values() if zeile["kunde_email"] == email and zeile["erstellt_am"] >= seit])

    async def nicht_beendete_von_email(self, werkstatt_id, email):
        await asyncio.sleep(0)
        return [copy.deepcopy(zeile) for zeile in self.zeilen.values()
                if zeile["werkstatt_id"] == werkstatt_id and zeile["kunde_email"] == email and zeile["zustand"] not in termine.ENDZUSTAENDE]

    async def zaehle_bestaetigte_mit_beginn(self, werkstatt_id, termin_am, ausser_id):
        await asyncio.sleep(0)
        return len([1 for zeile in self.zeilen.values() if zeile["werkstatt_id"] == werkstatt_id and zeile["zustand"] == "bestaetigt"
                    and zeile["termin_am"] == termin_am and zeile["id"] != ausser_id])

    async def liste(self, werkstatt_id=None, zustand=None, von=None, bis=None, ab=0, anzahl=SEITENGROESSE):
        """Neueste zuerst. von/bis grenzen den maßgeblichen Zeitpunkt ein (Termin, sonst Vorschlag, sonst Wunschbeginn)."""
        treffer = []
        for zeile in self.zeilen.values():
            zeitpunkt = zeile.get("termin_am") or zeile.get("vorschlag_am") or zeile["wunsch_von"]
            if (werkstatt_id is None or zeile["werkstatt_id"] == werkstatt_id) and (zustand is None or zeile["zustand"] == zustand) \
                    and (von is None or zeitpunkt >= von) and (bis is None or zeitpunkt <= bis):
                treffer.append(zeile)
        treffer.sort(key=lambda zeile: (zeile["erstellt_am"], zeile["id"]), reverse=True)
        return [copy.deepcopy(zeile) for zeile in treffer[ab:ab + anzahl]]


@dataclass
class Abhaengigkeiten:
    """Alles, was die Schnittstelle von außen braucht. B5 bindet die echten Bausteine, die Tests binden Stellvertreter.

    speicher     Schnittstelle wie ArbeitsspeicherTermine.
    verzeichnis  async (werkstatt_id) -> None oder {"id", "name", "anschrift", "partner": bool, "zeitzone",
                 "kontakt_email", optional "gesperrt"}. "partner" heißt freigeschalteter Partner; auf main gibt es
                 dieses Merkmal noch nicht (PR 122).
    sitzung      async (request) -> None oder {"user_id", "role", optional "werkstatt_ids"}; role wie im Shop-Dienst
                 ("admin", "customer"), dazu "partner" mit der Liste der eigenen Betriebe (W7, noch nicht gebaut).
    post         async (schluessel, an, betreff, html, text) -> Status der Warteschlange; höchstens ein Datensatz je Schlüssel.
    uhr          () -> jetzt als Zeitpunkt mit Zeitzone. Die Serverzeit ist maßgeblich, nie eine Uhrzeit aus der Anfrage.
    einstellung  (name) -> Text; liefert Schalter und Fristen.
    herkunft     öffentliche Herkunft des Shops für die Herkunftsprüfung und den Verwaltungslink.
    """
    speicher: Any
    verzeichnis: Callable
    sitzung: Callable
    post: Callable
    uhr: Callable
    einstellung: Callable
    herkunft: str
    stundengrenze: int = STUNDENGRENZE
    fuss_html: str = ""
    fuss_text: str = ""


def _pruefsumme_text(text):
    return hashlib.sha256(text.encode()).hexdigest()


def router_fuer(abh):
    """Baut die Routen aus Abschnitt 9 über den übergebenen Abhängigkeiten."""
    router = APIRouter()

    # ------------------------------------------------------------ Rahmen
    async def rahmen(request, kern):
        try:
            if abh.einstellung(SCHALTER) != "1":
                raise Abweisung(404, "appointment_not_found")
            herkunft = request.headers.get("origin")
            if request.method != "GET" and herkunft and herkunft.rstrip("/") != abh.herkunft:
                raise Abweisung(403, "origin_rejected")
            fristen = termine.fristen_aus({name: abh.einstellung(name) for name in termine.FRIST_NAMEN})
            if fristen is None:
                raise Abweisung(503, "appointments_not_configured")
            status, rumpf = await kern(abh.uhr(), fristen)
        except Abweisung as abweisung:
            status, rumpf = abweisung.status, {"detail": abweisung.detail()}
        return JSONResponse(rumpf, status_code=status, headers=OHNE_CACHE)

    async def lies_rumpf(request):
        roh = await request.body()
        if len(roh) > RUMPF_MAX:
            raise Abweisung(422, "appointment_invalid", fields={"rumpf": "invalid"})
        try:
            rumpf = json.loads(roh) if roh.strip() else {}
        except ValueError:
            rumpf = None
        if not isinstance(rumpf, dict):
            raise Abweisung(422, "appointment_invalid", fields={"rumpf": "invalid"})
        return rumpf

    def lies_schluessel(request):
        schluessel = request.headers.get("idempotency-key")
        if not isinstance(schluessel, str) or not SCHLUESSEL_FORM.fullmatch(schluessel):
            raise Abweisung(400, "idempotency_key_required")
        return _pruefsumme_text(schluessel)

    # ------------------------------------------------------------ Nachrichten
    def ein(name):
        return abh.einstellung(name) == "1"

    def absichten_fuer(termin_id, version, nachrichten, jetzt):
        return [{"schluessel": "appointment:%s:%s:%d:%s" % (termin_id, code, version, rolle), "ereignis": code, "empfaenger": rolle,
                 "version": version, "status": "wartend", "zeit": termine.utc_text(jetzt)} for code, rolle in nachrichten]

    async def sende(termin, absichten, zugriff=None):
        """Reiht die Nachrichten eines Übergangs ein. Ein Fehler hier ändert den Termin nie (4.2)."""
        status_je_schluessel, werkstatt_gesendet = {}, False
        for absicht in absichten:
            rolle, an, status = absicht["empfaenger"], "", None
            if not ein(SCHALTER_NACHRICHTEN) or (rolle == WERKSTATT and not ein(SCHALTER_NACHRICHTEN_WERKSTATT)):
                status = "ausgeschaltet"
            elif rolle == WERKSTATT:
                # Nur an Betriebe mit bestätigter Partnerschaft und hinterlegter Kontaktadresse (4.2, OA-086).
                profil = await abh.verzeichnis(termin["werkstatt_id"])
                if profil and profil.get("partner") is True and not profil.get("gesperrt") and profil.get("kontakt_email"):
                    an = profil["kontakt_email"]
            else:
                an = termin["kunde_email"]
            if status is None and not an:
                status = "kein_empfaenger"
            if status is None:
                link = ""
                if rolle == KUNDE and zugriff:
                    link = "%s%s?id=%s#zugriff=%s" % (abh.herkunft, VERWALTUNGSPFAD, termin["id"], zugriff)
                betreff, html, text = appointment_mails.nachricht(absicht["ereignis"], termin, rolle, verwaltungslink=link,
                                                                  werkstatt_benachrichtigt=werkstatt_gesendet,
                                                                  fuss_html=abh.fuss_html, fuss_text=abh.fuss_text)
                try:
                    status = await abh.post(absicht["schluessel"], an, betreff, html, text) or "nicht_konfiguriert"
                except Exception:
                    status = "nicht_eingereiht"
            if absicht["ereignis"] == "N2" and status == "gesendet":
                werkstatt_gesendet = True   # erst dann sagt N1, die Werkstatt sei benachrichtigt
            status_je_schluessel[absicht["schluessel"]] = status
        if status_je_schluessel:
            try:
                await abh.speicher.vermerke_versand(termin["id"], status_je_schluessel)
            except Exception:
                pass
        return status_je_schluessel

    def antwort(termin, rolle, jetzt, fristen):
        bild = termine.sicht(termin, rolle)
        bild["erlaubte_aktionen"] = termine.erlaubte_aktionen(termin, rolle, jetzt, fristen)
        bild["benachrichtigung"] = [{"ereignis": a["ereignis"], "empfaenger": a["empfaenger"], "status": a["status"]}
                                    for a in termin.get("benachrichtigungen", ()) if a.get("version") == termin["version"]]
        return bild

    # ------------------------------------------------------------ Auffinden, Rolle, Fristablauf
    async def verfall_feststellen(termin, jetzt):
        """U6/U13 beim Lesen und bei jedem Übergangsversuch (3.2). Liefert (Termin, eben verfallen?)."""
        aenderung = termine.verfall(termin, jetzt)
        if aenderung is None:
            return termin, False
        absichten = absichten_fuer(termin["id"], termin["version"] + 1, aenderung.nachrichten, jetzt)
        if not await abh.speicher.schreibe_uebergang(termin["id"], termin["werkstatt_id"], termin["zustand"], termin["version"],
                                                     aenderung.setze, aenderung.eintrag, absichten):
            return await abh.speicher.hole(termin["id"]) or termin, False   # jemand anderes hat zuerst geschrieben
        neu = termine.anwenden(termin, aenderung)
        neu["benachrichtigungen"] = termin.get("benachrichtigungen", []) + absichten
        await sende(neu, absichten)
        return await abh.speicher.hole(termin["id"]) or neu, True

    def rolle_am_termin(termin, sitzung, nachweis):
        """Die Rolle kommt aus der geprüften Sitzung oder dem geprüften Nachweis, nie aus einem Feld der Anfrage."""
        gespeichert = termin["zugriff_kunde"] if termin else "0" * 64
        nachweis_passt = hmac.compare_digest(_pruefsumme_text(nachweis if nachweis and len(nachweis) <= 128 else ""), gespeichert)
        if not termin:
            return None
        if sitzung:
            if sitzung.get("role") == "admin":
                return INHABER
            if sitzung.get("role") == "partner" and termin["werkstatt_id"] in (sitzung.get("werkstatt_ids") or ()):
                return WERKSTATT
            if sitzung.get("user_id") and termin.get("kunde_user_id") == sitzung["user_id"]:
                return KUNDE
        return KUNDE if nachweis_passt else None

    async def lade(request, termin_id, jetzt):
        """Fremder Betrieb, falscher Nachweis und unbekannte Kennung antworten gleich: 404 (5.3)."""
        termin = await abh.speicher.hole(termin_id)
        rolle = rolle_am_termin(termin, await abh.sitzung(request), request.headers.get(NACHWEIS_KOPF))
        if rolle is None:
            raise Abweisung(404, "appointment_not_found")
        termin, eben_verfallen = await verfall_feststellen(termin, jetzt)
        return termin, rolle, eben_verfallen

    # ------------------------------------------------------------ U1
    @router.post("/api/workshops/{werkstatt_id}/appointments")
    async def anlegen(werkstatt_id: str, request: Request):
        async def kern(jetzt, fristen):
            profil = await abh.verzeichnis(werkstatt_id)
            if not profil or profil.get("gesperrt"):
                raise Abweisung(404, "workshop_not_found")
            if profil.get("partner") is not True:
                raise Abweisung(409, "workshop_not_partner")   # nichts wird gespeichert, auch keine Kontaktdaten
            try:
                termine.lies_zeitpunkt("2000-01-01T12:00", profil.get("zeitzone"))
            except termine.UnbekannteZeitzone:
                raise Abweisung(503, "appointments_not_configured") from None
            schluessel = lies_schluessel(request)
            eingabe = await lies_rumpf(request)
            nutzlast = termine.pruefsumme(termine.nutzlast_wunsch(werkstatt_id, eingabe))

            async def wiederholung():
                vorhanden = await abh.speicher.hole(schluessel)
                if vorhanden is None:
                    return None
                if vorhanden.get("nutzlast_pruefsumme") != nutzlast:
                    raise Abweisung(409, "idempotency_conflict")
                vorhanden, _ = await verfall_feststellen(vorhanden, jetzt)
                # Der Nachweis wird nur einmal ausgegeben; gespeichert ist nur seine Prüfsumme.
                return 200, {**antwort(vorhanden, KUNDE, jetzt, fristen), "zugriff": None}

            bekannt = await wiederholung()
            if bekannt:
                return bekannt
            sitzung = await abh.sitzung(request)
            zugriff = secrets.token_urlsafe(32)
            werkstatt = {"id": profil["id"], "name": profil.get("name") or "", "anschrift": profil.get("anschrift") or "", "zeitzone": profil["zeitzone"]}
            vorgaenger_id = eingabe.get("vorgaenger_id") if isinstance(eingabe.get("vorgaenger_id"), str) and eingabe.get("vorgaenger_id").strip() else None
            termin, nachrichten = termine.neuer_wunsch(eingabe, werkstatt, jetzt, fristen, kennung=schluessel, schluessel_pruefsumme=schluessel,
                                                       nutzlast_pruefsumme=nutzlast, zugriff_pruefsumme=_pruefsumme_text(zugriff),
                                                       kunde_user_id=(sitzung or {}).get("user_id"), vorgaenger_id=vorgaenger_id and vorgaenger_id.strip())
            if vorgaenger_id:
                # Ein Vorgänger ist ein beendeter Termin derselben Adresse beim selben Betrieb; sonst dieselbe Antwort für alles.
                vorgaenger = await abh.speicher.hole(vorgaenger_id.strip())
                if not vorgaenger or vorgaenger["werkstatt_id"] != werkstatt_id or vorgaenger["kunde_email"] != termin["kunde_email"] \
                        or vorgaenger["zustand"] not in termine.ENDZUSTAENDE:
                    raise Abweisung(422, "appointment_invalid", fields={"vorgaenger_id": "invalid"})
            seit = termine.utc_text(jetzt - timedelta(hours=1))
            if await abh.speicher.zaehle_von_email_seit(termin["kunde_email"], seit) >= abh.stundengrenze:
                bekannt = await wiederholung()
                if bekannt:
                    return bekannt
                raise Abweisung(429, "rate_limited")
            for offen in await abh.speicher.nicht_beendete_von_email(werkstatt_id, termin["kunde_email"]):
                if offen["id"] != termin["id"] and not termine.ist_faellig(offen, jetzt) \
                        and offen["wunsch_von"] < termin["wunsch_bis"] and termin["wunsch_von"] < offen["wunsch_bis"]:
                    raise Abweisung(409, "appointment_duplicate")
            # Termin und Absicht der Nachrichten sind ein Datensatz.
            termin["benachrichtigungen"] = absichten_fuer(termin["id"], 1, nachrichten, jetzt)
            try:
                await abh.speicher.lege_an(termin)
            except SchonVorhanden:
                bekannt = await wiederholung()   # Wettlauf zweier Aufrufe: der eindeutige Schlüssel entscheidet
                if not bekannt:
                    raise Abweisung(503, "appointment_readback_unavailable") from None
                return bekannt
            await sende(termin, termin["benachrichtigungen"], zugriff=zugriff)
            return 201, {**antwort(await abh.speicher.hole(termin["id"]) or termin, KUNDE, jetzt, fristen), "zugriff": zugriff}
        return await rahmen(request, kern)

    # ------------------------------------------------------------ Lesen
    @router.get("/api/workshops/appointments/{termin_id}")
    async def lesen(termin_id: str, request: Request):
        async def kern(jetzt, fristen):
            termin, rolle, _ = await lade(request, termin_id, jetzt)
            if rolle == INHABER:   # jeder Zugriff des Inhabers steht im Verlauf (5.3)
                await abh.speicher.haenge_verlauf_an(termin_id, {"art": "zugriff", "aktion": "lesen", "ausloeser": INHABER, "zeit": termine.utc_text(jetzt)})
                termin = await abh.speicher.hole(termin_id) or termin
            return 200, antwort(termin, rolle, jetzt, fristen)
        return await rahmen(request, kern)

    # ------------------------------------------------------------ U2 bis U5, U7 bis U12
    def uebergangsroute(aktion):
        async def route(termin_id: str, request: Request):
            async def kern(jetzt, fristen):
                termin, rolle, eben_verfallen = await lade(request, termin_id, jetzt)
                schluessel = lies_schluessel(request)
                eingabe = await lies_rumpf(request)
                if "version" not in eingabe:
                    kopf = (request.headers.get("if-match") or "").strip().strip('"')
                    if re.fullmatch(r"\d{1,9}", kopf):
                        eingabe["version"] = int(kopf)
                nutzlast = termine.pruefsumme({"aktion": aktion, **{name: eingabe.get(name) for name in UEBERGANGSFELDER}})
                if termine.wiederholung(termin, schluessel, aktion, rolle, nutzlast):
                    return 200, antwort(termin, rolle, jetzt, fristen)   # derselbe Schlüssel: kein zweiter Effekt
                if eben_verfallen:
                    termine.pruefe_eingabe(termin, aktion, rolle, eingabe, jetzt)
                    raise Abweisung(409, "appointment_expired", zustand=termin["zustand"], version=termin["version"])
                aenderung = termine.uebergang(termin, aktion, rolle, eingabe, jetzt, fristen, schluessel_pruefsumme=schluessel, nutzlast_pruefsumme=nutzlast)
                if aenderung.setze["zustand"] == "bestaetigt" and eingabe.get("ueberschneidung_bestaetigt") is not True:
                    # Stufe 1 (6.4): keine Sperre, aber keine versehentliche Doppelbestätigung desselben Beginns.
                    if await abh.speicher.zaehle_bestaetigte_mit_beginn(termin["werkstatt_id"], aenderung.setze["termin_am"], termin["id"]):
                        raise Abweisung(409, "appointment_overlap", zustand=termin["zustand"], version=termin["version"])
                absichten = absichten_fuer(termin["id"], termin["version"] + 1, aenderung.nachrichten, jetzt)
                if not await abh.speicher.schreibe_uebergang(termin["id"], termin["werkstatt_id"], termin["zustand"], termin["version"],
                                                             aenderung.setze, aenderung.eintrag, absichten):
                    # Jemand anderes hat zuerst geschrieben. Kein automatisches Wiederholen mit neuer Version (6.2).
                    aktuell = await abh.speicher.hole(termin["id"]) or termin
                    raise Abweisung(409, "appointment_version_conflict", zustand=aktuell["zustand"], version=aktuell["version"])
                neu = termine.anwenden(termin, aenderung)
                neu["benachrichtigungen"] = termin.get("benachrichtigungen", []) + absichten
                await sende(neu, absichten)
                return 200, antwort(await abh.speicher.hole(termin["id"]) or neu, rolle, jetzt, fristen)
            return await rahmen(request, kern)
        route.__name__ = "termin_" + aktion
        return route

    for aktion in termine.AKTIONEN:
        router.add_api_route("/api/workshops/appointments/{termin_id}/" + aktion, uebergangsroute(aktion), methods=["POST"])

    # ------------------------------------------------------------ Listen
    def lies_filter(request, mit_zeit):
        fehler, werte = {}, {"zustand": None, "von": None, "bis": None, "ab": 0}
        zustand = request.query_params.get("zustand") or None
        if zustand is not None and zustand not in termine.ZUSTAENDE:
            fehler["zustand"] = "invalid"
        werte["zustand"] = zustand
        seite = request.query_params.get("seite") or "1"
        if not re.fullmatch(r"[1-9]\d{0,5}", seite):
            fehler["seite"] = "invalid"
        else:
            werte["ab"] = (int(seite) - 1) * SEITENGROESSE
        for name in (("von", "bis") if mit_zeit else ()):
            roh = request.query_params.get(name)
            if roh:
                if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})", roh):
                    fehler[name] = "invalid"
                    continue
                try:
                    werte[name] = termine.utc_text(termine.aus_text(roh.replace("Z", "+00:00")))
                except ValueError:
                    fehler[name] = "invalid"
        if fehler:
            raise Abweisung(422, "appointment_invalid", fields=fehler)
        return werte, int(seite)

    async def liste(rolle, werkstatt_id, werte, seite, jetzt, fristen):
        zeilen = await abh.speicher.liste(werkstatt_id=werkstatt_id, zustand=werte["zustand"], von=werte["von"], bis=werte["bis"],
                                          ab=werte["ab"], anzahl=SEITENGROESSE + 1)
        bilder = []
        for zeile in zeilen[:SEITENGROESSE]:
            zeile, _ = await verfall_feststellen(zeile, jetzt)
            if werte["zustand"] in (None, zeile["zustand"]):
                bilder.append(antwort(zeile, rolle, jetzt, fristen))
        return 200, {"termine": bilder, "seite": seite, "weitere": len(zeilen) > SEITENGROESSE}

    @router.get("/api/workshops/{werkstatt_id}/appointments")
    async def liste_des_betriebs(werkstatt_id: str, request: Request):
        async def kern(jetzt, fristen):
            sitzung = await abh.sitzung(request)
            if not sitzung:
                raise Abweisung(401, "authentication_required")
            if sitzung.get("role") == "admin":
                rolle = INHABER
            elif sitzung.get("role") == "partner" and werkstatt_id in (sitzung.get("werkstatt_ids") or ()):
                rolle = WERKSTATT
            else:
                raise Abweisung(404, "appointment_not_found")   # keine Auskunft, ob es den Betrieb oder Termine gibt
            werte, seite = lies_filter(request, mit_zeit=True)
            return await liste(rolle, werkstatt_id, werte, seite, jetzt, fristen)
        return await rahmen(request, kern)

    @router.get("/api/admin/appointments")
    async def liste_des_inhabers(request: Request):
        async def kern(jetzt, fristen):
            sitzung = await abh.sitzung(request)
            if not sitzung:
                raise Abweisung(401, "authentication_required")
            if sitzung.get("role") != "admin":
                raise Abweisung(403, "admin_required")
            werte, seite = lies_filter(request, mit_zeit=False)
            return await liste(INHABER, request.query_params.get("werkstatt_id") or None, werte, seite, jetzt, fristen)
        return await rahmen(request, kern)

    return router
