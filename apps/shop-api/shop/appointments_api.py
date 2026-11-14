"""Terminbuchung des Werkstattservice, Stufe 1: Schnittstelle (docs/03-backend/werkstatt-terminlogik.md, Abschnitt 9).

NICHT EINGEBUNDEN. Dieses Modul wird von main.py und vercel_app.py nicht geladen (Teil B5 steht aus); die
Routen sind in der Auslieferung nicht erreichbar. Es importiert weder die Datenbank noch die Konfiguration des
Shop-Dienstes: alles, was es von außen braucht, kommt über `Abhaengigkeiten` herein.

Geschlossen, solange nicht ausdrücklich geöffnet:
- Schalter TEILEKLAR_APPOINTMENTS ungleich "1": jeder Pfad antwortet auf jede Methode mit demselben 404 wie ein
  unbekannter Pfad des Dienstes ({"detail": "Not Found"}); der Baustein ist dann von außen nicht erkennbar.
- Ein Pflichtwert F1 bis F5 oder F11 fehlt (appointments.FRIST_NAMEN, ohne Vorgabe im Code): 503.
- Versand von Terminnachrichten nur, wenn appointment_mails.VOM_INHABER_FREIGEGEBEN True ist (heute False: die Texte
  sind Entwurf) UND TEILEKLAR_APPOINTMENT_MAILS = "1"; an Werkstätten zusätzlich nur mit
  TEILEKLAR_APPOINTMENT_MAILS_WORKSHOP = "1".
- Jeder unerwartete Fehler (Speicher, Verzeichnis, Sitzung) endet als 503 ohne Fehlertext, nie als 500.

Offen und hier NICHT gelöst (Entscheidung E-07 des Inhabers, mit Rechtsberatung): Das Anlegen ist ohne Anmeldung
möglich. Damit kann jemand im Namen einer fremden E-Mail-Adresse einen Wunsch senden, die Antwort
appointment_duplicate verrät, dass eine Adresse bei einem Betrieb einen offenen Wunsch hat, und die Grenze je Adresse
kann den echten Inhaber der Adresse aussperren. Vorgesehen ist dafür nur die Anschlussstelle
Abhaengigkeiten.herkunftsgrenze (Begrenzung je Herkunft); gebunden wird sie beim Einbinden (B5).

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
import base64
import re
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Callable, Optional

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
METHODEN = ("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")
NICHT_GEFUNDEN = {"detail": "Not Found"}   # wortgleich mit dem 404 des Dienstes für unbekannte Pfade
UEBERGANGSFELDER = ("version", "termin_am", "dauer_minuten", "ueberschneidung_bestaetigt", "vorschlag_am", "grund_code", "grund_text")
OHNE_CACHE = {"Cache-Control": "no-store"}


class SchonVorhanden(Exception):
    """Die Kennung ist schon vergeben. Entspricht AlreadyExists der Zugriffsschicht; trägt keinen Treibertext."""


class MengeErreicht(Exception):
    """Die Adresse hat in der Stunde schon so viele Wünsche gesendet, wie der Schutzwert zulässt."""


class DoppelterWunsch(Exception):
    """Dieselbe Adresse hat beim selben Betrieb schon einen nicht beendeten Termin mit überlappendem Fenster."""


class BeginnBelegt(Exception):
    """Beim selben Betrieb ist schon ein Termin mit demselben Beginn bestätigt."""


class SpeicherNichtVerfuegbar(Exception):
    """Der Speicher hat den Vorgang nicht ausgeführt oder nicht bestätigt. Entspricht StoreUnavailable; ohne Treibertext."""


class ArbeitsspeicherTermine:
    """Speicher im Arbeitsspeicher für Tests und als Beschreibung der Schnittstelle. Gibt nur Kopien heraus.

    Die Bedingungen gehören zum Schreibvorgang, nicht zu einer Abfrage davor. Eine dauerhafte Umsetzung muss
    dieselben Zusagen unter gleichzeitigen Aufrufen halten, über eindeutige Schlüssel der Datenbank:
    - lege_an: eindeutiger Schlüssel auf der Kennung (SchonVorhanden); Mengengrenze über einen Zählerdatensatz mit
      eindeutigem Schlüssel (Adresse, Stunde), der bedingt erhöht wird (MengeErreicht); Doppelwunsch über einen
      Sperrdatensatz mit eindeutigem Schlüssel (Betrieb, Adresse), unter dem Prüfung und Einfügen in einer
      Transaktion laufen (DoppelterWunsch).
    - schreibe_uebergang: EIN bedingter Schreibvorgang über Kennung, Betrieb, Zustand und Version (6.2); mit
      beginn_frei zusätzlich ein eindeutiger Schlüssel (Betrieb, Beginn) für bestätigte Termine ohne ausdrückliche
      Doppelbestätigung (BeginnBelegt).
    Treiberfehler werden zu SpeicherNichtVerfuegbar übersetzt. Hier genügt, dass zwischen Prüfung und Schreiben
    kein Wechsel der Ausführung liegt.
    """

    def __init__(self):
        self.zeilen = {}

    async def hole(self, termin_id):
        await asyncio.sleep(0)
        return copy.deepcopy(self.zeilen.get(termin_id))

    @staticmethod
    def _faellig(zeile, jetzt):
        return zeile["zustand"] in ("wunsch", "verschoben") and bool(zeile.get("antwort_bis")) and zeile["antwort_bis"] <= jetzt

    async def lege_an(self, termin, seit=None, grenze=None, jetzt=None):
        """Legt den Termin an, wenn alle Bedingungen im selben Schreibvorgang gelten.

        seit, grenze: höchstens `grenze` Termine derselben Adresse mit erstellt_am >= seit, sonst MengeErreicht.
        jetzt: ein nicht beendeter, zu `jetzt` nicht fälliger Termin derselben Adresse beim selben Betrieb mit
        überlappendem Wunschfenster ergibt DoppelterWunsch. Alle Zeitpunkte sind UTC-Text.
        """
        await asyncio.sleep(0)
        if termin["id"] in self.zeilen:
            raise SchonVorhanden()
        gleiche = [zeile for zeile in self.zeilen.values() if zeile["kunde_email"] == termin["kunde_email"]]
        if grenze is not None and len([1 for zeile in gleiche if zeile["erstellt_am"] >= seit]) >= grenze:
            raise MengeErreicht()
        if jetzt is not None:
            for zeile in gleiche:
                if zeile["werkstatt_id"] == termin["werkstatt_id"] and zeile["zustand"] not in termine.ENDZUSTAENDE \
                        and not self._faellig(zeile, jetzt) \
                        and zeile["wunsch_von"] < termin["wunsch_bis"] and termin["wunsch_von"] < zeile["wunsch_bis"]:
                    raise DoppelterWunsch()
        self.zeilen[termin["id"]] = copy.deepcopy(termin)

    async def schreibe_uebergang(self, termin_id, werkstatt_id, zustand, version, setze, eintrag, absichten, beginn_frei=None):
        """Schreibt nur, wo Kennung, Betrieb, Zustand und Version passen. True, wenn geschrieben wurde.

        beginn_frei: Beginn (UTC-Text), der beim Betrieb noch nicht bestätigt sein darf; sonst BeginnBelegt.
        """
        await asyncio.sleep(0)
        zeile = self.zeilen.get(termin_id)
        if not zeile or (zeile["werkstatt_id"], zeile["zustand"], zeile["version"]) != (werkstatt_id, zustand, version):
            return False
        if beginn_frei is not None and [1 for andere in self.zeilen.values() if andere["werkstatt_id"] == werkstatt_id
                                        and andere["zustand"] == "bestaetigt" and andere["termin_am"] == beginn_frei and andere["id"] != termin_id]:
            raise BeginnBelegt()
        zeile.update(copy.deepcopy(setze))
        zeile["verlauf"].append(copy.deepcopy(eintrag))
        zeile["benachrichtigungen"].extend(copy.deepcopy(absichten))
        return True

    async def vermerke_versand(self, termin_id, status_je_schluessel):
        """Hält den Versandstatus je Ereignisschlüssel fest. Ändert weder Zustand noch Version."""
        for absicht in self.zeilen.get(termin_id, {}).get("benachrichtigungen", ()):
            if absicht["schluessel"] in status_je_schluessel:
                absicht["status"] = status_je_schluessel[absicht["schluessel"]]

    async def vermerke_zugriff(self, termin_id, eintrag):
        """Interner Verlaufseintrag (Lesezugriff des Inhabers), höchstens einer je Kalendertag (UTC).

        Ändert weder Zustand noch Version. Die Grenze je Tag hält den Verlauf endlich.
        """
        zeile = self.zeilen.get(termin_id)
        tag = eintrag["zeit"][:10]
        if zeile and not [1 for alt in zeile["verlauf"] if alt.get("art") == "zugriff" and alt.get("zeit", "")[:10] == tag]:
            zeile["verlauf"].append(copy.deepcopy(eintrag))

    async def liste(self, werkstatt_id=None, zustand=None, von=None, bis=None, ab=0, anzahl=SEITENGROESSE, jetzt=None):
        """Neueste zuerst. von/bis grenzen den maßgeblichen Zeitpunkt ein (Termin, sonst Vorschlag, sonst Wunschbeginn).

        jetzt: Ein zu `jetzt` fälliger Wunsch oder Vorschlag zählt für den Zustandsfilter schon als verfallen,
        damit Filter und Seitenwahl dem Stand entsprechen, den der Aufrufer danach sieht.
        """
        treffer = []
        for zeile in self.zeilen.values():
            zeitpunkt = zeile.get("termin_am") or zeile.get("vorschlag_am") or zeile["wunsch_von"]
            wirksam = "verfallen" if jetzt is not None and self._faellig(zeile, jetzt) else zeile["zustand"]
            if (werkstatt_id is None or zeile["werkstatt_id"] == werkstatt_id) and (zustand is None or wirksam == zustand) \
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
    herkunftsgrenze          optional: async (request) -> bool. False heißt: von dieser Herkunft (Anschluss, Netz) kamen
                             zu viele Wünsche; das Anlegen antwortet 429. Nicht gebunden = keine Begrenzung je Herkunft
                             (offen, E-07; beim Einbinden zu binden).
    einwilligung_fassungen   optional: zulässige Kennungen des Einwilligungstextes. Nicht gebunden = jede wohlgeformte
                             Kennung wird angenommen; der Nachweis der Fassung ist dann nur die Angabe des Aufrufers (E-09).
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
    herkunftsgrenze: Optional[Callable] = None
    einwilligung_fassungen: Optional[tuple] = None


def _pruefsumme_text(text):
    return hashlib.sha256(text.encode()).hexdigest()


def router_fuer(abh):
    """Baut die Routen aus Abschnitt 9 über den übergebenen Abhängigkeiten."""
    router = APIRouter()

    # ------------------------------------------------------------ Rahmen
    async def rahmen(request, methode, kern):
        kopf = dict(OHNE_CACHE)
        try:
            if abh.einstellung(SCHALTER) != "1":
                return JSONResponse(NICHT_GEFUNDEN, status_code=404)   # ohne eigene Köpfe: wie jeder unbekannte Pfad
            if request.method != methode:
                return JSONResponse({"detail": "Method Not Allowed"}, status_code=405, headers={**kopf, "Allow": methode})
            herkunft = request.headers.get("origin")
            if request.method != "GET" and herkunft and herkunft.rstrip("/") != abh.herkunft:
                raise Abweisung(403, "origin_rejected")
            fristen = termine.fristen_aus({name: abh.einstellung(name) for name in termine.FRIST_NAMEN})
            if fristen is None:
                raise Abweisung(503, "appointments_not_configured")
            status, rumpf = await kern(abh.uhr(), fristen)
        except Abweisung as abweisung:
            status, rumpf = abweisung.status, {"detail": abweisung.detail()}
        except Exception:
            # Speicher, Verzeichnis oder Sitzung haben nicht geantwortet. Kein Fehlertext nach außen, nie ein 500.
            status, rumpf = 503, {"detail": {"error": "appointments_unavailable"}}
        return JSONResponse(rumpf, status_code=status, headers=kopf)

    async def lies_rumpf(request):
        ungueltig = Abweisung(422, "appointment_invalid", fields={"rumpf": "invalid"})
        angekuendigt = request.headers.get("content-length", "")
        if angekuendigt.isdigit() and int(angekuendigt) > RUMPF_MAX:
            raise ungueltig   # abgewiesen, bevor ein Byte gelesen ist
        teile, laenge = [], 0
        async for teil in request.stream():
            laenge += len(teil)
            if laenge > RUMPF_MAX:
                raise ungueltig   # nie mehr als die Grenze im Arbeitsspeicher
            teile.append(teil)
        roh = b"".join(teile)
        try:
            rumpf = json.loads(roh) if roh.strip() else {}
            json.dumps(rumpf, ensure_ascii=False).encode("utf-8")   # einzelne Surrogate lassen sich nicht ablegen
        except (ValueError, RecursionError):
            raise ungueltig from None
        if not isinstance(rumpf, dict):
            raise ungueltig
        return rumpf

    def lies_schluessel(request):
        schluessel = request.headers.get("idempotency-key")
        if not isinstance(schluessel, str) or not SCHLUESSEL_FORM.fullmatch(schluessel):
            raise Abweisung(400, "idempotency_key_required")
        return schluessel, _pruefsumme_text(schluessel)

    def nachweis_fuer(schluessel, nutzlast):
        """Zugriffsnachweis des Kunden: 256 Bit, abgeleitet aus Idempotenzschlüssel und Nutzlast des Wunsches.

        So liefert die Wiederholung desselben Aufrufs denselben Nachweis, obwohl nur seine Prüfsumme gespeichert
        ist; geht die erste Antwort verloren, ist der Termin nicht unerreichbar. Wer den Nachweis ableiten will,
        braucht den Schlüssel UND die vollständige Nutzlast mit den Kontaktdaten des Kunden; aus der Kennung des
        Termins folgt er nicht. Voraussetzung: Der Aufrufer wählt den Schlüssel zufällig (Aufgabe der Oberfläche, B6).
        """
        roh = hashlib.sha256(("teileklar-termin-zugriff\0%s\0%s" % (schluessel, nutzlast)).encode()).digest()
        return base64.urlsafe_b64encode(roh).decode().rstrip("=")

    # ------------------------------------------------------------ Nachrichten
    def ein(name):
        return abh.einstellung(name) == "1"

    async def betrieb_aktiv(werkstatt_id):
        """Das Profil, wenn der Betrieb heute freigeschalteter Partner und nicht gesperrt ist; sonst None."""
        profil = await abh.verzeichnis(werkstatt_id)
        return profil if profil and profil.get("partner") is True and not profil.get("gesperrt") else None

    def absichten_fuer(termin_id, version, nachrichten, jetzt):
        return [{"schluessel": "appointment:%s:%s:%d:%s" % (termin_id, code, version, rolle), "ereignis": code, "empfaenger": rolle,
                 "version": version, "status": "wartend", "zeit": termine.utc_text(jetzt)} for code, rolle in nachrichten]

    def pruefe_vorlagen(termin, absichten):
        """Rendert jede fällige Nachricht VOR dem Schreiben. Scheitert eine Vorlage an den Daten, wird nichts gespeichert
        (503); ein Vorlagenfehler kann so nicht erst nach dem gespeicherten Übergang auffallen."""
        for absicht in absichten:
            appointment_mails.nachricht(absicht["ereignis"], termin, absicht["empfaenger"], verwaltungslink="https://beispiel.invalid/#zugriff=x",
                                        werkstatt_benachrichtigt=True, fuss_html=abh.fuss_html, fuss_text=abh.fuss_text)

    async def sende(termin, absichten, zugriff=None):
        """Reiht die Nachrichten eines Übergangs ein. Ein Fehler hier ändert den Termin nie (4.2)."""
        status_je_schluessel, werkstatt_gesendet = {}, False
        for absicht in absichten:
            rolle, an, status = absicht["empfaenger"], "", None
            if appointment_mails.VOM_INHABER_FREIGEGEBEN is not True:
                status = "nicht_freigegeben"   # die Texte sind Entwurf; kein Umgebungsschalter hebt das auf
            elif not ein(SCHALTER_NACHRICHTEN) or (rolle == WERKSTATT and not ein(SCHALTER_NACHRICHTEN_WERKSTATT)):
                status = "ausgeschaltet"
            elif rolle == WERKSTATT:
                # Nur an Betriebe mit bestätigter Partnerschaft und hinterlegter Kontaktadresse (4.2, OA-086).
                try:
                    profil = await betrieb_aktiv(termin["werkstatt_id"])
                except Exception:
                    profil, status = None, "nicht_eingereiht"   # der Übergang ist gespeichert; der Versand ändert ihn nie
                if profil and profil.get("kontakt_email"):
                    an = profil["kontakt_email"]
            else:
                an = termin["kunde_email"]
            if status is None and not an:
                status = "kein_empfaenger"
            if status is None:
                link = ""
                if rolle == KUNDE and zugriff:
                    link = "%s%s?id=%s#zugriff=%s" % (abh.herkunft, VERWALTUNGSPFAD, termin["id"], zugriff)
                try:
                    betreff, html, text = appointment_mails.nachricht(absicht["ereignis"], termin, rolle, verwaltungslink=link,
                                                                      werkstatt_benachrichtigt=werkstatt_gesendet,
                                                                      fuss_html=abh.fuss_html, fuss_text=abh.fuss_text)
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
        neu = termine.anwenden(termin, aenderung)
        neu["benachrichtigungen"] = termin.get("benachrichtigungen", []) + absichten
        pruefe_vorlagen(neu, absichten)
        if not await abh.speicher.schreibe_uebergang(termin["id"], termin["werkstatt_id"], termin["zustand"], termin["version"],
                                                     aenderung.setze, aenderung.eintrag, absichten):
            return await abh.speicher.hole(termin["id"]) or termin, False   # jemand anderes hat zuerst geschrieben
        await sende(neu, absichten)
        return await abh.speicher.hole(termin["id"]) or neu, True

    async def rolle_am_termin(termin, sitzung, nachweis):
        """Die Rolle kommt aus der geprüften Sitzung oder dem geprüften Nachweis, nie aus einem Feld der Anfrage."""
        gespeichert = termin.get("zugriff_kunde") if termin else None
        gespeichert = gespeichert if isinstance(gespeichert, str) and len(gespeichert) == 64 else "0" * 64
        # Vergleich in konstanter Zeit, auch wenn es den Termin nicht gibt; nur über den Kopf, nie über die Adresse.
        nachweis_passt = hmac.compare_digest(_pruefsumme_text(nachweis if nachweis and len(nachweis) <= 128 else ""), gespeichert)
        if not termin:
            return None
        if sitzung:
            if sitzung.get("role") == "admin":
                return INHABER
            if sitzung.get("role") == "partner" and termin["werkstatt_id"] in (sitzung.get("werkstatt_ids") or ()):
                # Ein gesperrter oder nicht mehr freigeschalteter Betrieb liest und ändert nichts. Was mit seinen
                # offenen Terminen geschieht, ist E-15; bis dahin wird verweigert statt erlaubt.
                if await betrieb_aktiv(termin["werkstatt_id"]):
                    return WERKSTATT
            elif isinstance(sitzung.get("user_id"), str) and sitzung["user_id"] and termin.get("kunde_user_id") == sitzung["user_id"]:
                return KUNDE
        return KUNDE if nachweis_passt else None

    async def lade(request, termin_id, jetzt):
        """Fremder Betrieb, falscher Nachweis und unbekannte Kennung antworten gleich: 404 (5.3).

        Erst die Rolle, dann der Fristablauf: Ein Aufruf ohne Berechtigung schreibt nichts und löst keine Nachricht aus.
        """
        termin = await abh.speicher.hole(termin_id)
        rolle = await rolle_am_termin(termin, await abh.sitzung(request), request.headers.get(NACHWEIS_KOPF))
        if rolle is None:
            raise Abweisung(404, "appointment_not_found")
        termin, eben_verfallen = await verfall_feststellen(termin, jetzt)
        return termin, rolle, eben_verfallen

    async def vermerke_lesen(termin, jetzt):
        """Jeder Lesezugriff des Inhabers steht im Verlauf (5.3), je Termin höchstens einmal je Tag."""
        await abh.speicher.vermerke_zugriff(termin["id"], {"art": "zugriff", "aktion": "lesen", "ausloeser": INHABER, "zeit": termine.utc_text(jetzt)})

    # ------------------------------------------------------------ Routen
    def route(pfad, methode, kern):
        """Registriert den Pfad für JEDE Methode: bei Schalter aus antwortet alles gleich (404), sonst 405 für fremde Methoden."""
        async def eingang(request: Request):
            async def gebunden(jetzt, fristen):
                return await kern(request, jetzt, fristen)
            return await rahmen(request, methode, gebunden)
        eingang.__name__ = "termin_" + re.sub(r"[^a-z]+", "_", pfad.lower()).strip("_")
        router.add_api_route(pfad, eingang, methods=list(METHODEN), include_in_schema=False)
        ohne_umleitung(pfad)

    def ohne_umleitung(pfad):
        """Der Pfad mit Schrägstrich am Ende antwortet selbst mit dem 404 des Dienstes. Sonst leitete das Routing auf den
        Pfad ohne Schrägstrich um (307 mit Location) und verriete den Baustein auch bei ausgeschaltetem Schalter."""
        async def kein_pfad(request: Request):
            return JSONResponse(NICHT_GEFUNDEN, status_code=404)
        kein_pfad.__name__ = "termin_kein_pfad_" + re.sub(r"[^a-z]+", "_", pfad.lower()).strip("_")
        router.add_api_route(pfad + "/", kein_pfad, methods=list(METHODEN), include_in_schema=False)

    # ------------------------------------------------------------ U1
    async def anlegen(request, jetzt, fristen):
        werkstatt_id = request.path_params["werkstatt_id"]
        profil = await abh.verzeichnis(werkstatt_id)
        if not profil or profil.get("gesperrt"):
            raise Abweisung(404, "workshop_not_found")
        if profil.get("partner") is not True:
            raise Abweisung(409, "workshop_not_partner")   # nichts wird gespeichert, auch keine Kontaktdaten
        try:
            termine.lies_zeitpunkt("2000-01-01T12:00", profil.get("zeitzone"))
        except termine.UnbekannteZeitzone:
            raise Abweisung(503, "appointments_not_configured") from None
        schluessel_roh, schluessel = lies_schluessel(request)
        eingabe = await lies_rumpf(request)
        nutzlast = termine.pruefsumme(termine.nutzlast_wunsch(werkstatt_id, eingabe))
        zugriff = nachweis_fuer(schluessel_roh, nutzlast)

        async def wiederholung():
            vorhanden = await abh.speicher.hole(schluessel)
            if vorhanden is None:
                return None
            if vorhanden.get("nutzlast_pruefsumme") != nutzlast:
                raise Abweisung(409, "idempotency_conflict")
            # Gespeichertes Ergebnis des ersten Aufrufs; derselbe Schlüssel mit derselben Nutzlast ergibt denselben Nachweis.
            return 200, {**antwort(termine.ergebnis_von(vorhanden, schluessel) or vorhanden, KUNDE, jetzt, fristen), "zugriff": zugriff}

        bekannt = await wiederholung()
        if bekannt:
            return bekannt
        if abh.herkunftsgrenze is not None and not await abh.herkunftsgrenze(request):
            raise Abweisung(429, "rate_limited")
        sitzung = await abh.sitzung(request)
        benutzer = (sitzung or {}).get("user_id")
        werkstatt = {"id": profil["id"], "name": profil.get("name") or "", "anschrift": profil.get("anschrift") or "", "zeitzone": profil["zeitzone"]}
        vorgaenger_id = eingabe.get("vorgaenger_id").strip() if isinstance(eingabe.get("vorgaenger_id"), str) and eingabe.get("vorgaenger_id").strip() else None
        termin, nachrichten = termine.neuer_wunsch(eingabe, werkstatt, jetzt, fristen, kennung=schluessel, schluessel_pruefsumme=schluessel,
                                                   nutzlast_pruefsumme=nutzlast, zugriff_pruefsumme=_pruefsumme_text(zugriff),
                                                   kunde_user_id=benutzer if isinstance(benutzer, str) and benutzer else None, vorgaenger_id=vorgaenger_id)
        if abh.einwilligung_fassungen is not None and termin["einwilligung"]["fassung"] not in abh.einwilligung_fassungen:
            raise Abweisung(422, "appointment_invalid", fields={"einwilligung_fassung": "invalid"})
        if vorgaenger_id:
            # Ein Vorgänger ist ein beendeter Termin derselben Adresse beim selben Betrieb; sonst dieselbe Antwort für alles.
            vorgaenger = await abh.speicher.hole(vorgaenger_id)
            if not vorgaenger or vorgaenger["werkstatt_id"] != werkstatt_id or vorgaenger["kunde_email"] != termin["kunde_email"] \
                    or vorgaenger["zustand"] not in termine.ENDZUSTAENDE:
                raise Abweisung(422, "appointment_invalid", fields={"vorgaenger_id": "invalid"})
        # Termin und Absicht der Nachrichten sind ein Datensatz. Mengengrenze und Doppelwunsch sind Bedingungen des
        # Schreibvorgangs selbst (6.1, 6.4): gleichzeitige Aufrufe entscheidet der Speicher, nicht eine Abfrage davor.
        termin["benachrichtigungen"] = absichten_fuer(termin["id"], 1, nachrichten, jetzt)
        pruefe_vorlagen(termin, termin["benachrichtigungen"])
        try:
            await abh.speicher.lege_an(termin, seit=termine.utc_text(jetzt - timedelta(hours=1)), grenze=abh.stundengrenze, jetzt=termine.utc_text(jetzt))
        except SchonVorhanden:
            bekannt = await wiederholung()   # Wettlauf zweier Aufrufe mit demselben Schlüssel: der eindeutige Schlüssel entscheidet
            if not bekannt:
                raise Abweisung(503, "appointments_unavailable") from None
            return bekannt
        except MengeErreicht:
            raise Abweisung(429, "rate_limited") from None
        except DoppelterWunsch:
            raise Abweisung(409, "appointment_duplicate") from None
        await sende(termin, termin["benachrichtigungen"], zugriff=zugriff)
        return 201, {**antwort(await abh.speicher.hole(termin["id"]) or termin, KUNDE, jetzt, fristen), "zugriff": zugriff}

    # ------------------------------------------------------------ Lesen
    async def lesen(request, jetzt, fristen):
        termin, rolle, _ = await lade(request, request.path_params["termin_id"], jetzt)
        if rolle == INHABER:
            await vermerke_lesen(termin, jetzt)
            termin = await abh.speicher.hole(termin["id"]) or termin
        return 200, antwort(termin, rolle, jetzt, fristen)

    # ------------------------------------------------------------ U2 bis U5, U7 bis U12
    def uebergang_fuer(aktion):
        async def kern(request, jetzt, fristen):
            termin, rolle, eben_verfallen = await lade(request, request.path_params["termin_id"], jetzt)
            _, schluessel = lies_schluessel(request)
            eingabe = await lies_rumpf(request)
            if "version" not in eingabe:
                kopf = (request.headers.get("if-match") or "").strip().strip('"')
                if re.fullmatch(r"[0-9]{1,9}", kopf):
                    eingabe["version"] = int(kopf)
            nutzlast = termine.pruefsumme({"aktion": aktion, **{name: eingabe.get(name) for name in UEBERGANGSFELDER}})
            if termine.wiederholung(termin, schluessel, aktion, rolle, nutzlast):
                # Derselbe Schlüssel: kein zweiter Effekt, und die Antwort ist das damalige Ergebnis, nicht der heutige Stand.
                return 200, antwort(termine.ergebnis_von(termin, schluessel) or termin, rolle, jetzt, fristen)
            if eben_verfallen:
                termine.pruefe_eingabe(termin, aktion, rolle, eingabe, jetzt, fristen)
                raise Abweisung(409, "appointment_expired", zustand=termin["zustand"], version=termin["version"])
            aenderung = termine.uebergang(termin, aktion, rolle, eingabe, jetzt, fristen, schluessel_pruefsumme=schluessel, nutzlast_pruefsumme=nutzlast)
            # Stufe 1 (6.4): keine Sperre, aber keine versehentliche Doppelbestätigung desselben Beginns. Die Bedingung
            # gehört zum Schreibvorgang; nur die ausdrückliche zweite Bestätigung hebt sie auf.
            beginn_frei = None
            if aenderung.setze["zustand"] == "bestaetigt" and eingabe.get("ueberschneidung_bestaetigt") is not True:
                beginn_frei = aenderung.setze["termin_am"]
            absichten = absichten_fuer(termin["id"], termin["version"] + 1, aenderung.nachrichten, jetzt)
            neu = termine.anwenden(termin, aenderung)
            neu["benachrichtigungen"] = termin.get("benachrichtigungen", []) + absichten
            pruefe_vorlagen(neu, absichten)
            try:
                geschrieben = await abh.speicher.schreibe_uebergang(termin["id"], termin["werkstatt_id"], termin["zustand"], termin["version"],
                                                                    aenderung.setze, aenderung.eintrag, absichten, beginn_frei=beginn_frei)
            except BeginnBelegt:
                raise Abweisung(409, "appointment_overlap", zustand=termin["zustand"], version=termin["version"]) from None
            if not geschrieben:
                # Jemand anderes hat zuerst geschrieben. Kein automatisches Wiederholen mit neuer Version (6.2).
                aktuell = await abh.speicher.hole(termin["id"]) or termin
                raise Abweisung(409, "appointment_version_conflict", zustand=aktuell["zustand"], version=aktuell["version"])
            await sende(neu, absichten)
            return 200, antwort(await abh.speicher.hole(termin["id"]) or neu, rolle, jetzt, fristen)
        return kern

    # ------------------------------------------------------------ Listen
    def lies_filter(request, mit_zeit):
        fehler, werte = {}, {"zustand": None, "von": None, "bis": None, "ab": 0}
        zustand = request.query_params.get("zustand") or None
        if zustand is not None and zustand not in termine.ZUSTAENDE:
            fehler["zustand"] = "invalid"
        werte["zustand"] = zustand
        seite = request.query_params.get("seite") or "1"
        if not re.fullmatch(r"[1-9][0-9]{0,5}", seite):
            fehler["seite"] = "invalid"
        else:
            werte["ab"] = (int(seite) - 1) * SEITENGROESSE
        for name in (("von", "bis") if mit_zeit else ()):
            roh = request.query_params.get(name)
            if roh:
                try:
                    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})", roh, re.ASCII):
                        raise ValueError("Form")
                    gelesen = termine.aus_text(roh.replace("Z", "+00:00"))
                    if not termine.JAHR_VON <= gelesen.year <= termine.JAHR_BIS:
                        raise ValueError("Jahr")
                    werte[name] = termine.utc_text(gelesen)
                except (ValueError, OverflowError):
                    fehler[name] = "invalid"
        if fehler:
            raise Abweisung(422, "appointment_invalid", fields=fehler)
        return werte, int(seite)

    async def liste(rolle, werkstatt_id, werte, seite, jetzt, fristen):
        # Der Speicher filtert schon nach dem Stand, den der Fristablauf gleich herstellt; Filter und Seiten stimmen damit.
        zeilen = await abh.speicher.liste(werkstatt_id=werkstatt_id, zustand=werte["zustand"], von=werte["von"], bis=werte["bis"],
                                          ab=werte["ab"], anzahl=SEITENGROESSE + 1, jetzt=termine.utc_text(jetzt))
        bilder = []
        for zeile in zeilen[:SEITENGROESSE]:
            zeile, _ = await verfall_feststellen(zeile, jetzt)
            if rolle == INHABER:
                await vermerke_lesen(zeile, jetzt)   # die Liste des Inhabers zeigt Kontaktdaten: auch das ist ein Zugriff
            bilder.append(antwort(zeile, rolle, jetzt, fristen))
        return 200, {"termine": bilder, "seite": seite, "weitere": len(zeilen) > SEITENGROESSE}

    async def liste_des_betriebs(request, jetzt, fristen):
        werkstatt_id = request.path_params["werkstatt_id"]
        sitzung = await abh.sitzung(request)
        if not sitzung:
            raise Abweisung(401, "authentication_required")
        if sitzung.get("role") == "admin":
            rolle = INHABER
        elif sitzung.get("role") == "partner" and werkstatt_id in (sitzung.get("werkstatt_ids") or ()) and await betrieb_aktiv(werkstatt_id):
            rolle = WERKSTATT
        else:
            raise Abweisung(404, "appointment_not_found")   # keine Auskunft, ob es den Betrieb oder Termine gibt
        werte, seite = lies_filter(request, mit_zeit=True)
        return await liste(rolle, werkstatt_id, werte, seite, jetzt, fristen)

    async def liste_des_inhabers(request, jetzt, fristen):
        sitzung = await abh.sitzung(request)
        if not sitzung:
            raise Abweisung(401, "authentication_required")
        if sitzung.get("role") != "admin":
            raise Abweisung(403, "admin_required")
        werte, seite = lies_filter(request, mit_zeit=False)
        return await liste(INHABER, request.query_params.get("werkstatt_id") or None, werte, seite, jetzt, fristen)

    route("/api/workshops/appointments/{termin_id}", "GET", lesen)
    for aktion in termine.AKTIONEN:
        route("/api/workshops/appointments/{termin_id}/" + aktion, "POST", uebergang_fuer(aktion))
    router.add_api_route("/api/workshops/{werkstatt_id}/appointments", _zwei_methoden(rahmen, {"POST": anlegen, "GET": liste_des_betriebs}),
                         methods=list(METHODEN), include_in_schema=False)
    ohne_umleitung("/api/workshops/{werkstatt_id}/appointments")
    route("/api/admin/appointments", "GET", liste_des_inhabers)
    return router


def _zwei_methoden(rahmen, kerne):
    """Ein Pfad mit zwei Methoden (Anlegen und Liste des Betriebs); alle anderen Methoden laufen in denselben Rahmen."""
    async def eingang(request: Request):
        methode = request.method if request.method in kerne else next(iter(kerne))
        kern = kerne[methode]

        async def gebunden(jetzt, fristen):
            return await kern(request, jetzt, fristen)
        return await rahmen(request, methode, gebunden)
    eingang.__name__ = "termin_betrieb"
    return eingang
