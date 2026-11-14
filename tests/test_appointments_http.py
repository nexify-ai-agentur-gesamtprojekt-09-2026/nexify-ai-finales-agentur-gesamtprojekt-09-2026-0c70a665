"""Terminbuchung des Werkstattservice, Stufe 1: Schnittstelle über echtes FastAPI-Routing gegen einen Speicher im Arbeitsspeicher.

Testfälle aus docs/03-backend/werkstatt-terminlogik.md, Abschnitt 10; die Nummer steht im Namen.
Keine Datenbank, kein Versand, keine Uhr des Systems: "jetzt" ist die gestellte Uhr des Tests.
Fristen sind gesetzte Beispielwerte, keine Vorgaben für den Betrieb.
"""
import asyncio
import copy
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "shop-api"))

try:
    import httpx
    from fastapi import FastAPI
    from shop import appointments as A
    from shop import appointments_api as API
    HTTP_DEPS = True
except ImportError as fehlt:  # FastAPI/httpx fehlen außerhalb der Testumgebung (make test-env)
    if getattr(fehlt, "name", "") not in ("httpx", "fastapi", "starlette", "pydantic"):
        raise
    HTTP_DEPS = False

UTC = timezone.utc
JETZT = datetime(2027, 3, 1, 9, 0, tzinfo=UTC)
HERKUNFT = "https://shop.example.invalid"
BEISPIELWERTE = {
    "TEILEKLAR_APPOINTMENTS": "1",
    "TEILEKLAR_APPOINTMENT_MAILS": "1",
    "TEILEKLAR_APPOINTMENT_MAILS_WORKSHOP": "1",
    "TEILEKLAR_APPOINTMENTS_F1_MINUTES": "2880",
    "TEILEKLAR_APPOINTMENTS_F2_MINUTES": "1440",
    "TEILEKLAR_APPOINTMENTS_F3_MINUTES": "1440",
    "TEILEKLAR_APPOINTMENTS_F4_MINUTES": "86400",
    "TEILEKLAR_APPOINTMENTS_F5_MINUTES": "1440",
    "TEILEKLAR_APPOINTMENTS_F11_ROUNDS": "3",
}
WUNSCH = {"name": "Erika Beispiel", "email": "erika@example.invalid", "fahrzeug": "Beispielwagen 1.6", "anliegen": "Bremsen vorne prüfen.",
          "einwilligung": True, "einwilligung_fassung": "entwurf-0", "wunsch_von": "2027-03-10T09:00", "wunsch_bis": "2027-03-10T17:00",
          "seite": "/teileklar/termine", "sprache": "de"}
ADRESSE = {"P": "annahme@werkstatt-p.invalid", "P2": "annahme@werkstatt-p2.invalid", "V": "info@verzeichnis-v.invalid"}


class Uhr:
    def __init__(self, jetzt):
        self.jetzt, self.folge = jetzt, []

    def __call__(self):
        return self.folge.pop(0) if self.folge else self.jetzt


class Postfach:
    """Stellvertreter der Warteschlange: ein Datensatz je Ereignisschlüssel, kein Versand."""

    def __init__(self):
        self.eingereiht, self.versuche, self.status, self.wirft = {}, 0, "gesendet", False

    async def __call__(self, schluessel, an, betreff, html, text):
        self.versuche += 1
        if self.wirft:
            raise RuntimeError("nachgestellter Ausfall der Warteschlange")
        if schluessel not in self.eingereiht:
            self.eingereiht[schluessel] = {"an": an, "betreff": betreff, "html": html, "text": text, "status": self.status}
        return self.eingereiht[schluessel]["status"]

    def zahl(self, ereignis, an=None):
        return len([1 for schluessel, eintrag in self.eingereiht.items() if schluessel.split(":")[2] == ereignis and an in (None, eintrag["an"])])


@unittest.skipUnless(HTTP_DEPS, "FastAPI/httpx fehlen; Testumgebung mit make test-env bauen")
class Fall(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.speicher, self.post, self.uhr, self.werte = API.ArbeitsspeicherTermine(), Postfach(), Uhr(JETZT), dict(BEISPIELWERTE)
        self.betriebe = {
            "P": {"id": "P", "name": "Beispielwerkstatt P", "anschrift": "Musterweg 1, 52062 Aachen", "partner": True, "zeitzone": "Europe/Berlin", "kontakt_email": ADRESSE["P"]},
            "P2": {"id": "P2", "name": "Beispielwerkstatt P2", "anschrift": "Musterweg 2, 6211 AA Maastricht", "partner": True, "zeitzone": "Europe/Amsterdam", "kontakt_email": ADRESSE["P2"]},
            "V": {"id": "V", "name": "Verzeichnisbetrieb V", "anschrift": "Musterweg 3, 50667 Köln", "partner": False, "zeitzone": "Europe/Berlin", "kontakt_email": ADRESSE["V"]},
        }
        self.konten = {"sitzung-p": {"user_id": "u-p", "role": "partner", "werkstatt_ids": ["P"]},
                       "sitzung-p2": {"user_id": "u-p2", "role": "partner", "werkstatt_ids": ["P2"]},
                       "sitzung-inhaber": {"user_id": "u-inhaber", "role": "admin"},
                       "sitzung-kunde": {"user_id": "u-kunde", "role": "customer"},
                       "sitzung-fremd": {"user_id": "u-fremd", "role": "customer"}}
        self.nie_anschreiben = {ADRESSE["V"]}
        self.zaehler = 0

        async def verzeichnis(werkstatt_id):
            return copy.deepcopy(self.betriebe.get(werkstatt_id))

        async def sitzung(request):
            kopf = request.headers.get("authorization", "")
            return copy.deepcopy(self.konten.get(kopf[7:])) if kopf.lower().startswith("bearer ") else None

        abh = API.Abhaengigkeiten(speicher=self.speicher, verzeichnis=verzeichnis, sitzung=sitzung, post=self.post, uhr=self.uhr,
                                  einstellung=lambda name: self.werte.get(name, ""), herkunft=HERKUNFT)
        app = FastAPI()
        app.include_router(API.router_fuer(abh))
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url=HERKUNFT)

    async def asyncTearDown(self):
        await self.client.aclose()
        # Testfall 73, über alle Tests: nie eine Nachricht an einen Betrieb ohne freigeschaltete Partnerschaft.
        for schluessel, eintrag in self.post.eingereiht.items():
            self.assertNotIn(eintrag["an"], self.nie_anschreiben, schluessel)

    # ---- Hilfen ----
    def schluessel(self):
        self.zaehler += 1
        return "schluessel-%016d" % self.zaehler

    def als(self, wer):
        if isinstance(wer, dict):
            return dict(wer)
        return {"Authorization": "Bearer sitzung-" + wer} if wer else {}

    async def anlegen(self, werkstatt="P", schluessel=None, kopf=None, **eingabe):
        kopf = {"Idempotency-Key": schluessel or self.schluessel(), **(kopf or {})}
        return await self.client.post("/api/workshops/%s/appointments" % werkstatt, json={**WUNSCH, **eingabe}, headers=kopf)

    async def wunsch(self, **eingabe):
        antwort = await self.anlegen(**eingabe)
        self.assertEqual(antwort.status_code, 201, antwort.text)
        rumpf = antwort.json()
        return rumpf["id"], {"X-Appointment-Access": rumpf["zugriff"]}

    async def ruf(self, aktion, termin_id, wer, version, schluessel=None, **eingabe):
        rumpf = dict(eingabe) if version is None else {"version": version, **eingabe}
        return await self.client.post("/api/workshops/appointments/%s/%s" % (termin_id, aktion), json=rumpf,
                                      headers={"Idempotency-Key": schluessel or self.schluessel(), **self.als(wer)})

    async def lies(self, termin_id, wer):
        return await self.client.get("/api/workshops/appointments/" + termin_id, headers=self.als(wer))

    def gespeichert(self, termin_id):
        return self.speicher.zeilen[termin_id]

    def fehler(self, antwort, status, code):
        self.assertEqual((antwort.status_code, antwort.json()["detail"]["error"]), (status, code), antwort.text)
        self.assertEqual(antwort.headers["cache-control"], "no-store")
        return antwort.json()["detail"]

    async def bestaetigt(self, **eingabe):
        termin_id, kunde = await self.wunsch(**eingabe)
        antwort = await self.ruf("confirm", termin_id, "p", 1, termin_am="2027-03-10T10:00")
        self.assertEqual(antwort.status_code, 200, antwort.text)
        return termin_id, kunde

    async def verschoben(self):
        termin_id, kunde = await self.wunsch()
        antwort = await self.ruf("propose", termin_id, "p", 1, vorschlag_am="2027-03-12T10:00")
        self.assertEqual(antwort.status_code, 200, antwort.text)
        return termin_id, kunde


class Anlegen(Fall):
    async def test_01_gueltiger_wunsch(self):
        antwort = await self.anlegen()
        rumpf = antwort.json()
        self.assertEqual(antwort.status_code, 201, antwort.text)
        self.assertEqual((rumpf["zustand"], rumpf["version"], rumpf["antwort_bis"]), ("wunsch", 1, "2027-03-03T09:00:00+00:00"))
        self.assertEqual(antwort.headers["cache-control"], "no-store")
        self.assertEqual((self.post.zahl("N1", WUNSCH["email"]), self.post.zahl("N2", ADRESSE["P"]), len(self.post.eingereiht)), (1, 1, 2))
        self.assertEqual(rumpf["erlaubte_aktionen"], ["cancel"])
        self.assertEqual(sorted((n["ereignis"], n["empfaenger"], n["status"]) for n in rumpf["benachrichtigung"]),
                         [("N1", "kunde", "gesendet"), ("N2", "werkstatt", "gesendet")])
        termin = self.gespeichert(rumpf["id"])
        self.assertEqual((termin["werkstatt_id"], termin["marke"], termin["kunde_email"]), ("P", "teileklar", WUNSCH["email"]))
        self.assertNotEqual(termin["zugriff_kunde"], rumpf["zugriff"], "gespeichert ist nur die Prüfsumme des Nachweises")
        n1 = next(e for s, e in self.post.eingereiht.items() if ":N1:" in s)
        self.assertIn(HERKUNFT + "/teileklar/termine?id=" + rumpf["id"] + "#zugriff=" + rumpf["zugriff"], n1["text"])
        self.assertIn("benachrichtigt", n1["text"], "N2 ging nachweisbar in den Versand, erst dann sagt N1 das")
        n2 = next(e for s, e in self.post.eingereiht.items() if ":N2:" in s)
        for angabe in (WUNSCH["email"], WUNSCH["anliegen"], WUNSCH["name"], rumpf["zugriff"]):
            self.assertNotIn(angabe, n2["text"] + n2["html"])

    async def test_02_wiederholung_mit_demselben_schluessel(self):
        erste = await self.anlegen(schluessel="derselbe-schluessel-01")
        zweite = await self.anlegen(schluessel="derselbe-schluessel-01")
        self.assertEqual((erste.status_code, zweite.status_code), (201, 200))
        self.assertEqual(zweite.json()["id"], erste.json()["id"])
        self.assertEqual((len(self.speicher.zeilen), len(self.post.eingereiht)), (1, 2))
        self.assertIsNone(zweite.json()["zugriff"], "der Nachweis wird nur einmal ausgegeben; gespeichert ist nur seine Prüfsumme")
        self.assertEqual({k: v for k, v in zweite.json().items() if k != "zugriff"}, {k: v for k, v in erste.json().items() if k != "zugriff"})

    async def test_03_derselbe_schluessel_mit_anderer_nutzlast(self):
        erste = await self.anlegen(schluessel="derselbe-schluessel-01")
        vorher = copy.deepcopy(self.gespeichert(erste.json()["id"]))
        self.fehler(await self.anlegen(schluessel="derselbe-schluessel-01", anliegen="Ein ganz anderes Anliegen."), 409, "idempotency_conflict")
        self.fehler(await self.anlegen(werkstatt="P2", schluessel="derselbe-schluessel-01"), 409, "idempotency_conflict")
        self.assertEqual(self.gespeichert(erste.json()["id"]), vorher)
        self.assertEqual(len(self.speicher.zeilen), 1)

    async def test_04_zwei_gleichzeitige_aufrufe_mit_demselben_schluessel(self):
        a, b = await asyncio.gather(self.anlegen(schluessel="derselbe-schluessel-01"), self.anlegen(schluessel="derselbe-schluessel-01"))
        self.assertEqual(sorted((a.status_code, b.status_code)), [200, 201])
        self.assertEqual(a.json()["id"], b.json()["id"])
        self.assertEqual((len(self.speicher.zeilen), self.post.zahl("N1"), self.post.zahl("N2")), (1, 1, 1))

    async def test_05_ohne_oder_mit_falsch_geformtem_schluessel(self):
        ohne = await self.client.post("/api/workshops/P/appointments", json=WUNSCH)
        self.fehler(ohne, 400, "idempotency_key_required")
        for schluessel in ("a" * 15, "mit leerzeichen 12345", "a" * 129, "umlaut-ä-1234567890"):
            antwort = await self.client.post("/api/workshops/P/appointments", json=WUNSCH, headers={"Idempotency-Key": schluessel.encode("utf-8")})
            self.fehler(antwort, 400, "idempotency_key_required")
        termin_id, kunde = await self.wunsch()
        ohne = await self.client.post("/api/workshops/appointments/%s/cancel" % termin_id, json={"version": 1}, headers=kunde)
        self.fehler(ohne, 400, "idempotency_key_required")
        self.assertEqual((len(self.speicher.zeilen), self.gespeichert(termin_id)["zustand"]), (1, "wunsch"))

    async def test_06_wunsch_an_verzeichnisbetrieb(self):
        self.fehler(await self.anlegen(werkstatt="V"), 409, "workshop_not_partner")
        self.assertEqual((self.speicher.zeilen, self.post.eingereiht, self.post.versuche), ({}, {}, 0))

    async def test_07_unbekannter_oder_gesperrter_betrieb(self):
        self.fehler(await self.anlegen(werkstatt="gibt-es-nicht"), 404, "workshop_not_found")
        self.betriebe["P"]["gesperrt"] = True
        self.fehler(await self.anlegen(), 404, "workshop_not_found")
        self.assertEqual(self.speicher.zeilen, {})

    async def test_08_feldfehler(self):
        for eingabe, feld, code in (({"name": ""}, "name", "required"), ({"email": "keine-adresse"}, "email", "invalid"),
                                    ({"anliegen": "9 Zeichen"}, "anliegen", "too_short"), ({"einwilligung": False}, "einwilligung", "required")):
            detail = self.fehler(await self.anlegen(**eingabe), 422, "appointment_invalid")
            self.assertEqual(detail["fields"], {feld: code})
        for rumpf in (b"kein json", b"[1, 2]", b"x" * 20000):
            antwort = await self.client.post("/api/workshops/P/appointments", content=rumpf, headers={"Idempotency-Key": self.schluessel(), "Content-Type": "application/json"})
            self.assertEqual(self.fehler(antwort, 422, "appointment_invalid")["fields"], {"rumpf": "invalid"})
        self.assertEqual((self.speicher.zeilen, self.post.eingereiht), ({}, {}))

    async def test_09_vorlauf_und_fenster(self):
        for eingabe, feld, code in (({"wunsch_von": "2027-03-02T09:59", "wunsch_bis": "2027-03-02T17:00"}, "wunsch_von", "too_early"),
                                    ({"wunsch_von": "2027-04-30T11:01", "wunsch_bis": "2027-04-30T17:00"}, "wunsch_von", "too_late"),
                                    ({"wunsch_von": "2027-03-10T09:00", "wunsch_bis": "2027-03-10T08:00"}, "wunsch_bis", "window_invalid")):
            self.assertEqual(self.fehler(await self.anlegen(**eingabe), 422, "appointment_invalid")["fields"].get(feld), code)
        self.assertEqual(self.speicher.zeilen, {})

    async def test_10_zweiter_offener_wunsch_derselben_adresse(self):
        erster, kunde = await self.wunsch()
        self.fehler(await self.anlegen(wunsch_von="2027-03-10T16:00", wunsch_bis="2027-03-10T18:00"), 409, "appointment_duplicate")
        self.fehler(await self.anlegen(email="ERIKA@example.invalid"), 409, "appointment_duplicate")
        self.assertEqual((await self.anlegen(wunsch_von="2027-03-11T09:00", wunsch_bis="2027-03-11T12:00")).status_code, 201, "anderes Fenster")
        self.assertEqual((await self.anlegen(email="otto@example.invalid")).status_code, 201, "andere Adresse")
        self.assertEqual((await self.anlegen(werkstatt="P2")).status_code, 201, "anderer Betrieb")
        self.assertEqual((await self.ruf("cancel", erster, kunde, 1)).status_code, 200)
        self.assertEqual((await self.anlegen()).status_code, 201, "nach dem Endzustand des ersten ist ein neuer Wunsch möglich")

    async def test_11_mengenbegrenzung_je_adresse(self):
        for tag in range(10, 10 + API.STUNDENGRENZE):
            antwort = await self.anlegen(wunsch_von="2027-03-%dT09:00" % tag, wunsch_bis="2027-03-%dT12:00" % tag)
            self.assertEqual(antwort.status_code, 201, antwort.text)
        self.fehler(await self.anlegen(wunsch_von="2027-03-20T09:00", wunsch_bis="2027-03-20T12:00"), 429, "rate_limited")
        self.assertEqual(len(self.speicher.zeilen), API.STUNDENGRENZE)
        self.uhr.jetzt = JETZT + timedelta(minutes=61)
        self.assertEqual((await self.anlegen(wunsch_von="2027-03-20T09:00", wunsch_bis="2027-03-20T12:00")).status_code, 201)

    async def test_12_fremde_herkunft(self):
        self.fehler(await self.anlegen(kopf={"Origin": "https://fremd.example.invalid"}), 403, "origin_rejected")
        termin_id, kunde = await self.wunsch(kopf={"Origin": HERKUNFT})
        fremd = await self.client.post("/api/workshops/appointments/%s/cancel" % termin_id, json={"version": 1},
                                       headers={"Idempotency-Key": self.schluessel(), "Origin": "https://fremd.example.invalid", **kunde})
        self.fehler(fremd, 403, "origin_rejected")
        self.assertEqual((len(self.speicher.zeilen), self.gespeichert(termin_id)["zustand"]), (1, "wunsch"))

    async def test_13_schalter_aus_und_fehlende_fristen(self):
        termin_id, kunde = await self.wunsch()
        for wert in ("", "0", "true", "an"):
            self.werte["TEILEKLAR_APPOINTMENTS"] = wert
            for antwort in (await self.anlegen(), await self.lies(termin_id, kunde), await self.ruf("cancel", termin_id, kunde, 1),
                            await self.client.get("/api/workshops/P/appointments", headers=self.als("p")),
                            await self.client.get("/api/admin/appointments", headers=self.als("inhaber"))):
                self.fehler(antwort, 404, "appointment_not_found")
        self.werte["TEILEKLAR_APPOINTMENTS"] = "1"
        for name in A.FRIST_NAMEN:
            ohne = dict(BEISPIELWERTE)
            del ohne[name]
            self.werte = ohne
            for antwort in (await self.anlegen(), await self.lies(termin_id, kunde), await self.ruf("cancel", termin_id, kunde, 1),
                            await self.client.get("/api/admin/appointments", headers=self.als("inhaber"))):
                self.fehler(antwort, 503, "appointments_not_configured")
        self.assertEqual((len(self.speicher.zeilen), self.gespeichert(termin_id)["zustand"]), (1, "wunsch"))
        self.werte = dict(BEISPIELWERTE)
        self.betriebe["P"]["zeitzone"] = "Mars/Olympus"
        self.fehler(await self.anlegen(email="otto@example.invalid"), 503, "appointments_not_configured")

    async def test_14_angemeldeter_und_nicht_angemeldeter_kunde(self):
        mit = await self.anlegen(kopf=self.als("kunde"))
        ohne = await self.anlegen(email="otto@example.invalid")
        self.assertEqual((mit.status_code, ohne.status_code), (201, 201))
        self.assertEqual((self.gespeichert(mit.json()["id"])["kunde_user_id"], self.gespeichert(ohne.json()["id"])["kunde_user_id"]), ("u-kunde", None))
        self.assertEqual((await self.lies(mit.json()["id"], "kunde")).status_code, 200, "das eigene Konto liest ohne Nachweis")
        self.fehler(await self.lies(mit.json()["id"], "fremd"), 404, "appointment_not_found")


class Ablauf(Fall):
    async def test_15_werkstatt_bestaetigt(self):
        termin_id, kunde = await self.wunsch()
        antwort = await self.ruf("confirm", termin_id, "p", 1, termin_am="2027-03-10T10:00")
        rumpf = antwort.json()
        self.assertEqual((antwort.status_code, rumpf["zustand"], rumpf["version"], rumpf["termin_am"]), (200, "bestaetigt", 2, "2027-03-10T09:00:00+00:00"))
        self.assertEqual((self.post.zahl("N3", WUNSCH["email"]), self.post.zahl("N3")), (1, 1))
        self.assertEqual(self.gespeichert(termin_id)["zustand"], "bestaetigt")
        self.assertEqual(rumpf["erlaubte_aktionen"], ["propose", "cancel"])
        kopf = await self.client.post("/api/workshops/appointments/%s/cancel" % termin_id, json={},
                                      headers={"Idempotency-Key": self.schluessel(), "If-Match": '"2"', **kunde})
        self.assertEqual((kopf.status_code, kopf.json()["zustand"]), (200, "abgesagt"), "die Version darf auch im Kopf If-Match stehen")

    async def test_16_17_bestaetigung_in_der_vergangenheit_oder_ausserhalb_des_fensters(self):
        termin_id, _ = await self.wunsch()
        detail = self.fehler(await self.ruf("confirm", termin_id, "p", 1, termin_am="2027-03-11T10:00"), 422, "appointment_invalid")
        self.assertEqual((detail["fields"], detail["hinweis"]), ({"termin_am": "window_invalid"}, "propose"))
        self.uhr.jetzt = JETZT + timedelta(days=1)
        self.assertEqual(self.fehler(await self.ruf("confirm", termin_id, "p", 1, termin_am="2027-03-01T10:00"), 422, "appointment_invalid")["fields"], {"termin_am": "in_past"})
        self.assertEqual((self.gespeichert(termin_id)["zustand"], self.gespeichert(termin_id)["version"], self.post.zahl("N3")), ("wunsch", 1, 0))

    async def test_18_werkstatt_lehnt_ab(self):
        termin_id, _ = await self.wunsch()
        self.assertEqual(self.fehler(await self.ruf("decline", termin_id, "p", 1), 422, "appointment_invalid")["fields"], {"grund_code": "reason_required"})
        antwort = await self.ruf("decline", termin_id, "p", 1, grund_code="keine_kapazitaet")
        self.assertEqual((antwort.status_code, antwort.json()["zustand"], antwort.json()["erlaubte_aktionen"]), (200, "abgelehnt", []))
        self.assertEqual((self.post.zahl("N4", WUNSCH["email"]), self.post.zahl("N4")), (1, 1))

    async def test_19_werkstatt_schlaegt_anderen_zeitpunkt_vor(self):
        termin_id, _ = await self.wunsch()
        rumpf = (await self.ruf("propose", termin_id, "p", 1, vorschlag_am="2027-03-12T10:00")).json()
        self.assertEqual((rumpf["zustand"], rumpf["vorschlag_von"], rumpf["vorschlag_runde"], rumpf["antwort_bis"]), ("verschoben", "werkstatt", 1, "2027-03-02T09:00:00+00:00"))
        self.assertEqual((self.post.zahl("N5", WUNSCH["email"]), self.post.zahl("N5")), (1, 1))

    async def test_20_kunde_zieht_zurueck(self):
        termin_id, kunde = await self.wunsch()
        rumpf = (await self.ruf("cancel", termin_id, kunde, 1)).json()
        self.assertEqual((rumpf["zustand"], rumpf["abgesagt_von"]), ("abgesagt", "kunde"))
        self.assertEqual((self.post.zahl("N6", ADRESSE["P"]), self.post.zahl("N6")), (1, 1))

    async def test_21_inhaber_sagt_ab(self):
        termin_id, _ = await self.wunsch()
        self.assertEqual(self.fehler(await self.ruf("cancel", termin_id, "inhaber", 1), 422, "appointment_invalid")["fields"], {"grund_code": "reason_required"})
        rumpf = (await self.ruf("cancel", termin_id, "inhaber", 1, grund_code="betrieblich")).json()
        self.assertEqual((rumpf["zustand"], rumpf["abgesagt_von"]), ("abgesagt", "inhaber"))
        self.assertEqual((self.post.zahl("N6", WUNSCH["email"]), self.post.zahl("N6", ADRESSE["P"]), self.post.zahl("N6")), (1, 1, 2))

    async def test_22_fristablauf_beim_lesen(self):
        termin_id, kunde = await self.wunsch()
        self.uhr.jetzt = datetime(2027, 3, 3, 8, 59, 59, tzinfo=UTC)
        self.assertEqual((await self.lies(termin_id, kunde)).json()["zustand"], "wunsch")
        self.uhr.jetzt = datetime(2027, 3, 3, 9, 0, 1, tzinfo=UTC)
        erste = await self.lies(termin_id, kunde)
        self.assertEqual((erste.status_code, erste.json()["zustand"], erste.json()["version"]), (200, "verfallen", 2))
        self.assertEqual((self.gespeichert(termin_id)["zustand"], self.gespeichert(termin_id)["verlauf"][-1]["nr"]), ("verfallen", "U6"))
        for wer in (kunde, "p", "inhaber"):
            self.assertEqual((await self.lies(termin_id, wer)).json()["zustand"], "verfallen")
        self.assertEqual((self.post.zahl("N7", WUNSCH["email"]), self.post.zahl("N7"), self.gespeichert(termin_id)["version"]), (1, 1, 2))

    async def test_23_verspaetete_bestaetigung(self):
        termin_id, _ = await self.wunsch()
        self.uhr.jetzt = datetime(2027, 3, 3, 9, 0, 1, tzinfo=UTC)
        detail = self.fehler(await self.ruf("confirm", termin_id, "p", 1, termin_am="2027-03-10T10:00"), 409, "appointment_expired")
        self.assertEqual((detail["zustand"], detail["version"]), ("verfallen", 2))
        self.assertEqual((self.gespeichert(termin_id)["zustand"], self.post.zahl("N3"), self.post.zahl("N7")), ("verfallen", 0, 1))
        # Danach ist verfallen ein Endzustand wie jeder andere (Testfall 45).
        self.fehler(await self.ruf("confirm", termin_id, "p", 2, termin_am="2027-03-10T10:00"), 409, "appointment_transition_forbidden")
        self.assertEqual(self.post.zahl("N7"), 1)

    async def test_25_verboten_aus_wunsch(self):
        termin_id, kunde = await self.wunsch()
        vorher = copy.deepcopy(self.gespeichert(termin_id))
        post = len(self.post.eingereiht)
        for aktion, wer, eingabe in (("confirm", kunde, {"termin_am": "2027-03-10T10:00"}), ("decline", kunde, {"grund_code": "sonstiges"}),
                                     ("accept", kunde, {}), ("complete", "p", {}), ("confirm", "inhaber", {"termin_am": "2027-03-10T10:00"}),
                                     ("decline", "inhaber", {"grund_code": "sonstiges"}), ("cancel", "p", {"grund_code": "sonstiges"})):
            detail = self.fehler(await self.ruf(aktion, termin_id, wer, 1, **eingabe), 409, "appointment_transition_forbidden")
            self.assertEqual((detail["zustand"], detail["version"]), ("wunsch", 1))
        nach = copy.deepcopy(self.gespeichert(termin_id))
        nach["verlauf"] = [e for e in nach["verlauf"] if e.get("art") == "uebergang"]
        self.assertEqual((nach, len(self.post.eingereiht)), (vorher, post))

    async def test_26_27_durchfuehrung_melden(self):
        termin_id, kunde = await self.bestaetigt()
        self.uhr.jetzt = datetime(2027, 3, 10, 8, 59, tzinfo=UTC)
        self.fehler(await self.ruf("complete", termin_id, "p", 2), 409, "appointment_transition_forbidden")
        self.uhr.jetzt = datetime(2027, 3, 10, 9, 0, 1, tzinfo=UTC)
        self.fehler(await self.ruf("complete", termin_id, kunde, 2), 409, "appointment_transition_forbidden")
        vor = len(self.post.eingereiht)
        antwort = await self.ruf("complete", termin_id, "p", 2)
        self.assertEqual((antwort.status_code, antwort.json()["zustand"], len(self.post.eingereiht)), (200, "erledigt", vor))

    async def test_28_29_verlegung(self):
        termin_id, kunde = await self.bestaetigt()
        rumpf = (await self.ruf("propose", termin_id, kunde, 2, vorschlag_am="2027-03-15T10:00")).json()
        self.assertEqual((rumpf["zustand"], rumpf["vorschlag_von"], rumpf["termin_am"]), ("verschoben", "kunde", None))
        self.assertEqual((self.post.zahl("N5", ADRESSE["P"]), self.post.zahl("N5")), (1, 1))
        zweiter, _ = await self.bestaetigt(email="otto@example.invalid")
        rumpf = (await self.ruf("propose", zweiter, "p", 2, vorschlag_am="2027-03-15T11:00")).json()
        self.assertEqual((rumpf["vorschlag_von"], self.post.zahl("N5", "otto@example.invalid"), self.post.zahl("N5")), ("werkstatt", 1, 2))

    async def test_30_31_absage_des_bestaetigten_termins(self):
        termin_id, kunde = await self.bestaetigt()
        self.assertEqual((await self.ruf("cancel", termin_id, kunde, 2)).json()["zustand"], "abgesagt")
        n6 = next(e for s, e in self.post.eingereiht.items() if ":N6:" in s)
        self.assertEqual(n6["an"], ADRESSE["P"])
        self.assertIn("10.03.2027, 10:00", n6["text"], "N6 nennt den abgesagten Zeitpunkt")
        zweiter, _ = await self.bestaetigt(email="otto@example.invalid")
        self.assertEqual(self.fehler(await self.ruf("cancel", zweiter, "p", 2), 422, "appointment_invalid")["fields"], {"grund_code": "reason_required"})
        self.assertEqual((await self.ruf("cancel", zweiter, "p", 2, grund_code="verhindert")).json()["abgesagt_von"], "werkstatt")
        self.assertEqual(self.post.zahl("N6", "otto@example.invalid"), 1)

    @unittest.skip("Testfall 32: Verhalten nach der Grenze F5 ist Entscheidung E-04 des Inhabers (offen); nicht bestanden, nicht gebaut")
    async def test_32_absage_oder_verlegung_nach_f5(self):
        pass

    async def test_33_34_bestaetigt_bleibt_bestaetigt(self):
        termin_id, kunde = await self.bestaetigt()
        for aktion, wer, eingabe in (("confirm", "p", {"termin_am": "2027-03-10T11:00"}), ("decline", "p", {"grund_code": "sonstiges"}),
                                     ("accept", kunde, {}), ("accept", "p", {}), ("complete", "inhaber", {})):
            self.fehler(await self.ruf(aktion, termin_id, wer, 2, **eingabe), 409, "appointment_transition_forbidden")
        self.uhr.jetzt = JETZT + timedelta(days=400)
        self.assertEqual((await self.lies(termin_id, kunde)).json()["zustand"], "bestaetigt")
        self.assertEqual((self.gespeichert(termin_id)["version"], self.post.zahl("N7")), (2, 0))

    async def test_35_36_annahme_des_vorschlags(self):
        termin_id, kunde = await self.verschoben()
        self.fehler(await self.ruf("accept", termin_id, "p", 2), 409, "appointment_transition_forbidden")
        self.fehler(await self.ruf("accept", termin_id, "inhaber", 2), 409, "appointment_transition_forbidden")
        rumpf = (await self.ruf("accept", termin_id, kunde, 2)).json()
        self.assertEqual((rumpf["zustand"], rumpf["termin_am"], rumpf["version"]), ("bestaetigt", "2027-03-12T09:00:00+00:00", 3))
        self.assertEqual((self.post.zahl("N3", WUNSCH["email"]), self.post.zahl("N3", ADRESSE["P"]), self.post.zahl("N3")), (1, 1, 2))

    async def test_37_bis_40_gegenvorschlaege_und_rundengrenze(self):
        termin_id, kunde = await self.verschoben()
        self.fehler(await self.ruf("propose", termin_id, "p", 2, vorschlag_am="2027-03-13T10:00"), 409, "appointment_transition_forbidden")
        rumpf = (await self.ruf("propose", termin_id, kunde, 2, vorschlag_am="2027-03-13T10:00")).json()
        self.assertEqual((rumpf["vorschlag_von"], rumpf["vorschlag_runde"], self.post.zahl("N5", ADRESSE["P"])), ("kunde", 2, 1))
        rumpf = (await self.ruf("propose", termin_id, "p", 3, vorschlag_am="2027-03-14T10:00")).json()
        self.assertEqual(rumpf["vorschlag_runde"], 3)
        self.fehler(await self.ruf("propose", termin_id, kunde, 4, vorschlag_am="2027-03-16T10:00"), 409, "appointment_transition_forbidden")
        self.assertEqual((await self.lies(termin_id, kunde)).json()["erlaubte_aktionen"], ["accept", "cancel"])
        self.assertEqual((await self.ruf("accept", termin_id, kunde, 4)).json()["zustand"], "bestaetigt")
        zweiter, kunde2 = await self.bestaetigt(email="otto@example.invalid")
        await self.ruf("propose", zweiter, kunde2, 2, vorschlag_am="2027-03-15T10:00")
        vor = self.post.zahl("N3")
        rumpf = (await self.ruf("accept", zweiter, "p", 3)).json()
        self.assertEqual((rumpf["zustand"], rumpf["termin_am"], self.post.zahl("N3") - vor), ("bestaetigt", "2027-03-15T09:00:00+00:00", 1))

    async def test_41_absage_aus_verschoben(self):
        termin_id, kunde = await self.verschoben()
        self.assertEqual((await self.ruf("cancel", termin_id, kunde, 2)).json()["abgesagt_von"], "kunde")
        self.assertEqual(self.post.zahl("N6", ADRESSE["P"]), 1)
        zweiter, _ = await self.wunsch(email="otto@example.invalid")
        await self.ruf("propose", zweiter, "p", 1, vorschlag_am="2027-03-12T11:00")
        self.assertEqual((await self.ruf("cancel", zweiter, "p", 2, grund_code="verhindert")).json()["abgesagt_von"], "werkstatt")
        self.assertEqual(self.post.zahl("N6", "otto@example.invalid"), 1)

    async def test_42_vorschlag_verfaellt(self):
        termin_id, kunde = await self.verschoben()
        self.uhr.jetzt = datetime(2027, 3, 2, 9, 0, 1, tzinfo=UTC)
        for _ in range(2):
            self.assertEqual((await self.lies(termin_id, "p")).json()["zustand"], "verfallen")
        self.assertEqual((self.post.zahl("N7", WUNSCH["email"]), self.post.zahl("N7", ADRESSE["P"]), self.post.zahl("N7")), (1, 1, 2))
        self.assertEqual(self.gespeichert(termin_id)["verlauf"][-1]["nr"], "U13")

    async def test_43_annahme_nach_dem_vorgeschlagenen_zeitpunkt(self):
        termin_id, kunde = await self.wunsch()
        self.uhr.jetzt = JETZT + timedelta(hours=1)
        await self.ruf("propose", termin_id, "p", 1, vorschlag_am="2027-03-02T08:00")
        self.uhr.jetzt = datetime(2027, 3, 2, 7, 0, 1, tzinfo=UTC)
        self.fehler(await self.ruf("accept", termin_id, kunde, 2), 409, "appointment_expired")
        self.assertEqual((self.gespeichert(termin_id)["zustand"], self.post.zahl("N3")), ("verfallen", 0))

    async def test_44_verboten_aus_verschoben(self):
        termin_id, kunde = await self.verschoben()
        for aktion, eingabe in (("confirm", {"termin_am": "2027-03-10T10:00"}), ("decline", {"grund_code": "sonstiges"}), ("complete", {})):
            for wer in (kunde, "p", "inhaber"):
                self.fehler(await self.ruf(aktion, termin_id, wer, 2, **eingabe), 409, "appointment_transition_forbidden")
        self.assertEqual((self.gespeichert(termin_id)["zustand"], self.gespeichert(termin_id)["version"]), ("verschoben", 2))

    async def test_45_endzustaende(self):
        abgelehnt, k1 = await self.wunsch(email="a@example.invalid")
        await self.ruf("decline", abgelehnt, "p", 1, grund_code="sonstiges")
        abgesagt, k2 = await self.wunsch(email="b@example.invalid")
        await self.ruf("cancel", abgesagt, k2, 1)
        verfallen, k3 = await self.wunsch(email="c@example.invalid", wunsch_von="2027-03-02T10:00", wunsch_bis="2027-03-02T12:00")
        erledigt, k4 = await self.bestaetigt(email="d@example.invalid")
        self.uhr.jetzt = datetime(2027, 3, 11, 9, 0, tzinfo=UTC)
        await self.ruf("complete", erledigt, "p", 2)
        await self.lies(verfallen, k3)
        enden = {"abgelehnt": (abgelehnt, k1), "abgesagt": (abgesagt, k2), "verfallen": (verfallen, k3), "erledigt": (erledigt, k4)}
        eingaben = {"confirm": {"termin_am": "2027-06-10T10:00"}, "decline": {"grund_code": "sonstiges"}, "propose": {"vorschlag_am": "2027-06-12T10:00"},
                    "accept": {}, "cancel": {"grund_code": "sonstiges"}, "complete": {}}
        self.assertEqual(set(enden), set(A.ENDZUSTAENDE))
        post = len(self.post.eingereiht)
        for zustand, (termin_id, kunde) in enden.items():
            vorher = copy.deepcopy(self.gespeichert(termin_id))
            self.assertEqual(vorher["zustand"], zustand)
            for aktion in A.AKTIONEN:
                for wer in (kunde, "p", "inhaber"):
                    detail = self.fehler(await self.ruf(aktion, termin_id, wer, vorher["version"], **eingaben[aktion]), 409, "appointment_transition_forbidden")
                    self.assertEqual((detail["zustand"], detail["version"]), (zustand, vorher["version"]))
            self.assertEqual(self.gespeichert(termin_id), vorher, "Zustand, Version und Verlauf unverändert")
        self.assertEqual(len(self.post.eingereiht), post)

    async def test_46_neuer_wunsch_nach_ablehnung_mit_vorgaenger(self):
        alter, kunde = await self.wunsch()
        offen = self.fehler(await self.anlegen(vorgaenger_id=alter, wunsch_von="2027-03-11T09:00", wunsch_bis="2027-03-11T12:00"), 422, "appointment_invalid")
        self.assertEqual(offen["fields"], {"vorgaenger_id": "invalid"}, "ein Vorgänger muss beendet sein")
        await self.ruf("decline", alter, "p", 1, grund_code="keine_kapazitaet")
        vorher = copy.deepcopy(self.gespeichert(alter))
        for falsch in ({"vorgaenger_id": "gibt-es-nicht"}, {"vorgaenger_id": alter, "email": "otto@example.invalid"}):
            self.assertEqual(self.fehler(await self.anlegen(**falsch), 422, "appointment_invalid")["fields"], {"vorgaenger_id": "invalid"})
        self.assertEqual(self.fehler(await self.anlegen(werkstatt="P2", vorgaenger_id=alter), 422, "appointment_invalid")["fields"], {"vorgaenger_id": "invalid"})
        neu = await self.anlegen(vorgaenger_id=alter)
        self.assertEqual((neu.status_code, neu.json()["vorgaenger_id"], neu.json()["zustand"]), (201, alter, "wunsch"))
        self.assertNotEqual(neu.json()["id"], alter)
        self.assertEqual((self.gespeichert(alter), len(self.speicher.zeilen)), (vorher, 2))


class IdempotenzUndGleichzeitigkeit(Fall):
    async def test_47_confirm_zweimal_mit_demselben_schluessel(self):
        termin_id, _ = await self.wunsch()
        erste = await self.ruf("confirm", termin_id, "p", 1, schluessel="bestaetigung-schluessel-1", termin_am="2027-03-10T10:00")
        zweite = await self.ruf("confirm", termin_id, "p", 1, schluessel="bestaetigung-schluessel-1", termin_am="2027-03-10T10:00")
        self.assertEqual((erste.status_code, zweite.status_code), (200, 200))
        self.assertEqual(zweite.json(), erste.json())
        self.assertEqual((self.gespeichert(termin_id)["version"], self.post.zahl("N3")), (2, 1))
        andere = await self.ruf("confirm", termin_id, "p", 1, schluessel="bestaetigung-schluessel-1", termin_am="2027-03-10T11:00")
        self.fehler(andere, 409, "idempotency_conflict")

    async def test_48_confirm_mit_neuem_schluessel(self):
        termin_id, _ = await self.bestaetigt()
        for version in (1, 2):
            self.fehler(await self.ruf("confirm", termin_id, "p", version, termin_am="2027-03-10T10:00"), 409, "appointment_transition_forbidden")
        self.assertEqual((self.gespeichert(termin_id)["version"], self.post.zahl("N3")), (2, 1))

    async def test_49_veraltete_version(self):
        # Der wörtliche Fall (confirm mit Version 1 bei Version 2) ist nach der Prüfreihenfolge aus Abschnitt 9 ein
        # verbotener Übergang (Testfall 48). Geprüft wird die Regel an einem erlaubten Aufruf mit veralteter Version.
        termin_id, kunde = await self.bestaetigt()
        detail = self.fehler(await self.ruf("cancel", termin_id, kunde, 1), 409, "appointment_version_conflict")
        self.assertEqual((detail["zustand"], detail["version"]), ("bestaetigt", 2))
        self.assertEqual((self.gespeichert(termin_id)["zustand"], self.post.zahl("N6")), ("bestaetigt", 0))

    async def test_50_uebergang_ohne_version(self):
        termin_id, kunde = await self.wunsch()
        self.assertEqual(self.fehler(await self.ruf("cancel", termin_id, kunde, None), 422, "appointment_invalid")["fields"], {"version": "version_required"})
        self.assertEqual(self.fehler(await self.ruf("cancel", termin_id, kunde, "1"), 422, "appointment_invalid")["fields"], {"version": "invalid"})
        self.assertEqual(self.gespeichert(termin_id)["zustand"], "wunsch")

    async def test_51_gleichzeitig_bestaetigen_und_zurueckziehen(self):
        for lauf in range(4):
            termin_id, kunde = await self.wunsch(email="lauf%d@example.invalid" % lauf)
            aufrufe = [self.ruf("confirm", termin_id, "p", 1, termin_am="2027-03-10T10:00", ueberschneidung_bestaetigt=True), self.ruf("cancel", termin_id, kunde, 1)]
            a, b = await asyncio.gather(*(aufrufe if lauf % 2 else reversed(aufrufe)))
            self.assertEqual(sorted((a.status_code, b.status_code)), [200, 409])
            gewinner, verlierer = (a, b) if a.status_code == 200 else (b, a)
            self.assertEqual(verlierer.json()["detail"]["error"], "appointment_version_conflict")
            termin = self.gespeichert(termin_id)
            self.assertEqual((termin["zustand"], termin["version"]), (gewinner.json()["zustand"], 2))
            self.assertEqual((verlierer.json()["detail"]["zustand"], verlierer.json()["detail"]["version"]), (termin["zustand"], 2))
            n3 = len([1 for s in self.post.eingereiht if s.startswith("appointment:%s:N3:" % termin_id)])
            n6 = len([1 for s in self.post.eingereiht if s.startswith("appointment:%s:N6:" % termin_id)])
            self.assertEqual((n3, n6), (1, 0) if termin["zustand"] == "bestaetigt" else (0, 1))

    async def test_52_gleichzeitig_fristablauf_und_bestaetigung(self):
        ergebnisse = set()
        for lauf, folge in enumerate(([timedelta(seconds=1), timedelta(seconds=-1)], [timedelta(seconds=-1), timedelta(seconds=1)])):
            termin_id, kunde = await self.wunsch(email="lauf%d@example.invalid" % lauf)
            frist = A.aus_text(self.gespeichert(termin_id)["antwort_bis"])
            self.uhr.folge = [frist + abstand for abstand in folge]
            lesen, bestaetigen = await asyncio.gather(self.lies(termin_id, kunde), self.ruf("confirm", termin_id, "p", 1, termin_am="2027-03-10T10:00", ueberschneidung_bestaetigt=True))
            termin = self.gespeichert(termin_id)
            n3 = len([1 for s in self.post.eingereiht if s.startswith("appointment:%s:N3:" % termin_id)])
            n7 = len([1 for s in self.post.eingereiht if s.startswith("appointment:%s:N7:" % termin_id)])
            self.assertIn((termin["zustand"], n3, n7), {("bestaetigt", 1, 0), ("verfallen", 0, 1)}, "nie beides")
            self.assertEqual(termin["version"], 2)
            self.assertEqual(bestaetigen.status_code, 200 if termin["zustand"] == "bestaetigt" else 409)
            self.assertEqual(lesen.status_code, 200)
            ergebnisse.add(termin["zustand"])
            self.uhr.folge = []
        self.assertTrue(ergebnisse)

    async def test_53_versand_schlaegt_fehl(self):
        termin_id, _ = await self.wunsch()
        self.post.status = "abgleich_erforderlich"
        erste = await self.ruf("confirm", termin_id, "p", 1, schluessel="bestaetigung-schluessel-1", termin_am="2027-03-10T10:00")
        self.assertEqual((erste.status_code, self.gespeichert(termin_id)["zustand"]), (200, "bestaetigt"))
        self.assertEqual(erste.json()["benachrichtigung"], [{"ereignis": "N3", "empfaenger": "kunde", "status": "abgleich_erforderlich"}])
        vor = len(self.post.eingereiht)
        zweite = await self.ruf("confirm", termin_id, "p", 1, schluessel="bestaetigung-schluessel-1", termin_am="2027-03-10T10:00")
        self.assertEqual((zweite.status_code, len(self.post.eingereiht), self.post.zahl("N3")), (200, vor, 1))
        self.post.wirft = True
        anderer, kunde = None, None
        self.post.wirft = False
        anderer, kunde = await self.wunsch(email="otto@example.invalid")
        self.post.wirft = True
        ausfall = await self.ruf("cancel", anderer, kunde, 1)
        self.assertEqual((ausfall.status_code, self.gespeichert(anderer)["zustand"]), (200, "abgesagt"))
        self.assertEqual(ausfall.json()["benachrichtigung"], [{"ereignis": "N6", "empfaenger": "werkstatt", "status": "nicht_eingereiht"}])


class MandantUndRolle(Fall):
    async def test_54_fremder_betrieb(self):
        termin_id, _ = await self.wunsch()
        vorher = copy.deepcopy(self.gespeichert(termin_id))
        self.fehler(await self.lies(termin_id, "p2"), 404, "appointment_not_found")
        for aktion, eingabe in (("confirm", {"termin_am": "2027-03-10T10:00"}), ("decline", {"grund_code": "sonstiges"}), ("propose", {"vorschlag_am": "2027-03-12T10:00"}),
                                ("accept", {}), ("cancel", {"grund_code": "sonstiges"}), ("complete", {})):
            self.fehler(await self.ruf(aktion, termin_id, "p2", 1, **eingabe), 404, "appointment_not_found")
        self.assertEqual((self.gespeichert(termin_id), self.post.zahl("N3")), (vorher, 0))
        self.konten["sitzung-p2"]["role"] = "customer"
        self.konten["sitzung-p"]["role"] = "customer"
        self.fehler(await self.lies(termin_id, "p"), 404, "appointment_not_found")

    async def test_55_nachweis_eines_anderen_termins(self):
        a, kunde_a = await self.wunsch()
        b, kunde_b = await self.wunsch(email="otto@example.invalid")
        self.fehler(await self.lies(b, kunde_a), 404, "appointment_not_found")
        self.fehler(await self.ruf("cancel", b, kunde_a, 1), 404, "appointment_not_found")
        self.fehler(await self.lies(b, None), 404, "appointment_not_found")
        self.fehler(await self.ruf("cancel", b, None, 1), 404, "appointment_not_found")
        self.fehler(await self.lies(b, {"X-Appointment-Access": "x" * 500}), 404, "appointment_not_found")
        self.assertEqual((await self.lies(b, kunde_b)).status_code, 200)
        self.assertEqual(self.gespeichert(b)["zustand"], "wunsch")

    async def test_56_falscher_nachweis_und_unbekannte_kennung_antworten_gleich(self):
        termin_id, kunde = await self.wunsch()
        falsch = await self.lies(termin_id, {"X-Appointment-Access": "falscher-nachweis"})
        unbekannt = await self.lies("0" * 64, kunde)
        self.assertEqual((falsch.status_code, falsch.json(), dict(falsch.headers)), (unbekannt.status_code, unbekannt.json(), dict(unbekannt.headers)))
        self.assertEqual(falsch.status_code, 404)
        a = await self.ruf("cancel", termin_id, {"X-Appointment-Access": "falscher-nachweis"}, 1)
        b = await self.ruf("cancel", "0" * 64, kunde, 1)
        self.assertEqual((a.status_code, a.json()), (b.status_code, b.json()))

    async def test_57_liste_des_betriebs(self):
        eigener, _ = await self.wunsch()
        await self.wunsch(email="otto@example.invalid")
        fremder = (await self.anlegen(werkstatt="P2")).json()["id"]
        liste = await self.client.get("/api/workshops/P/appointments", headers=self.als("p"))
        self.assertEqual(liste.status_code, 200)
        self.assertEqual(({t["werkstatt_id"] for t in liste.json()["termine"]}, len(liste.json()["termine"])), ({"P"}, 2))
        self.assertNotIn(fremder, [t["id"] for t in liste.json()["termine"]])
        self.assertNotIn("kunde_email", liste.json()["termine"][0])
        self.assertEqual(liste.headers["cache-control"], "no-store")
        self.fehler(await self.client.get("/api/workshops/P/appointments", headers=self.als("p2")), 404, "appointment_not_found")
        self.fehler(await self.client.get("/api/workshops/P/appointments", headers=self.als("kunde")), 404, "appointment_not_found")
        self.fehler(await self.client.get("/api/workshops/P/appointments"), 401, "authentication_required")
        inhaber = await self.client.get("/api/workshops/P/appointments", headers=self.als("inhaber"))
        self.assertEqual((inhaber.status_code, len(inhaber.json()["termine"])), (200, 2))
        await self.ruf("confirm", eigener, "p", 1, termin_am="2027-03-10T10:00")
        gefiltert = await self.client.get("/api/workshops/P/appointments?zustand=bestaetigt&von=2027-03-10T00:00:00Z&bis=2027-03-11T00:00:00Z", headers=self.als("p"))
        self.assertEqual([t["id"] for t in gefiltert.json()["termine"]], [eigener])
        self.fehler(await self.client.get("/api/workshops/P/appointments?zustand=erfunden", headers=self.als("p")), 422, "appointment_invalid")
        self.uhr.jetzt = JETZT + timedelta(days=30)
        spaeter = await self.client.get("/api/workshops/P/appointments", headers=self.als("p"))
        self.assertEqual(sorted(t["zustand"] for t in spaeter.json()["termine"]), ["bestaetigt", "verfallen"], "der Verfall wird auch in der Liste festgestellt")

    async def test_58_wege_des_inhabers(self):
        termin_id, kunde = await self.wunsch()
        await self.anlegen(werkstatt="P2")
        self.fehler(await self.client.get("/api/admin/appointments"), 401, "authentication_required")
        for wer in ("kunde", "p"):
            self.fehler(await self.client.get("/api/admin/appointments", headers=self.als(wer)), 403, "admin_required")
        alle = await self.client.get("/api/admin/appointments", headers=self.als("inhaber"))
        self.assertEqual((alle.status_code, len(alle.json()["termine"])), (200, 2))
        self.assertIn("kunde_email", alle.json()["termine"][0])
        nur_p2 = await self.client.get("/api/admin/appointments?werkstatt_id=P2&zustand=wunsch", headers=self.als("inhaber"))
        self.assertEqual([t["werkstatt_id"] for t in nur_p2.json()["termine"]], ["P2"])
        self.assertEqual((await self.lies(termin_id, "inhaber")).status_code, 200)
        self.assertEqual((await self.ruf("cancel", termin_id, "inhaber", 1, grund_code="betrieblich", grund_text="Beispielgrund")).status_code, 200)
        verlauf = self.gespeichert(termin_id)["verlauf"]
        eingriff = verlauf[-1]
        self.assertEqual((eingriff["nr"], eingriff["ausloeser"], eingriff["grund_code"], eingriff["grund_text"]), ("U5", "inhaber", "betrieblich", "Beispielgrund"))
        self.assertTrue([e for e in verlauf if e.get("art") == "zugriff" and e.get("ausloeser") == "inhaber"], "auch das Lesen des Inhabers steht im Verlauf")
        sicht = (await self.lies(termin_id, kunde)).json()
        self.assertEqual([e["nr"] for e in sicht["verlauf"]], ["U1", "U5"])

    async def test_59_sicht_der_werkstatt(self):
        termin_id, _ = await self.bestaetigt()
        erlaubt = {"id", "nummer", "werkstatt_id", "werkstatt_name", "werkstatt_anschrift", "zustand", "version", "wunsch_von", "wunsch_bis",
                   "zeitzone", "termin_am", "dauer_minuten", "vorschlag_am", "vorschlag_von", "vorschlag_runde", "antwort_bis", "kunde_name",
                   "fahrzeug", "anliegen", "grund_code", "grund_text", "abgesagt_von", "verlauf", "vorgaenger_id", "erstellt_am", "geaendert_am",
                   "erlaubte_aktionen", "benachrichtigung"}
        sicht = (await self.lies(termin_id, "p")).json()
        self.assertEqual(set(sicht), erlaubt)
        self.assertNotIn(WUNSCH["email"], (await self.lies(termin_id, "p")).text)

    async def test_60_sicht_des_kunden(self):
        termin_id, kunde = await self.bestaetigt()
        await self.lies(termin_id, "inhaber")
        antwort = await self.lies(termin_id, kunde)
        sicht = antwort.json()
        for verboten in ("zugriff_kunde", "nutzlast_pruefsumme", "benachrichtigungen", "kunde_user_id", "einwilligung", "zugriff"):
            self.assertNotIn(verboten, sicht)
        self.assertEqual([e["nr"] for e in sicht["verlauf"]], ["U1", "U2"])
        self.assertNotIn("pruefsumme", antwort.text)
        self.assertNotIn(self.gespeichert(termin_id)["zugriff_kunde"], (await self.lies(termin_id, "inhaber")).text)

    async def test_61_felder_im_rumpf_aendern_den_ausloeser_nicht(self):
        termin_id, kunde = await self.wunsch()
        self.fehler(await self.ruf("confirm", termin_id, kunde, 1, termin_am="2027-03-10T10:00", rolle="werkstatt", werkstatt_id="P", ausloeser="werkstatt"),
                    409, "appointment_transition_forbidden")
        self.fehler(await self.ruf("confirm", termin_id, "p2", 1, termin_am="2027-03-10T10:00", werkstatt_id="P2", rolle="inhaber"), 404, "appointment_not_found")
        rumpf = (await self.ruf("cancel", termin_id, kunde, 1, rolle="inhaber", abgesagt_von="werkstatt", werkstatt_id="P2")).json()
        self.assertEqual((rumpf["abgesagt_von"], rumpf["werkstatt_id"]), ("kunde", "P"))
        angelegt = await self.anlegen(email="otto@example.invalid", werkstatt_id="P2", rolle="inhaber", zustand="bestaetigt", kunde_user_id="u-inhaber")
        gespeichert = self.gespeichert(angelegt.json()["id"])
        self.assertEqual((gespeichert["werkstatt_id"], gespeichert["zustand"], gespeichert["kunde_user_id"]), ("P", "wunsch", None))

    @unittest.skip("Testfall 62: Verhalten nach Sperrung des Partners ist Entscheidung E-15 des Inhabers (offen); nicht bestanden, nicht gebaut")
    async def test_62_partner_nach_dem_wunsch_gesperrt(self):
        pass


class ZeitUndUeberschneidung(Fall):
    async def test_63_64_gespeichert_in_utc_angezeigt_in_ortszeit(self):
        rumpf = (await self.anlegen(wunsch_von="2027-03-30T10:00", wunsch_bis="2027-03-30T12:00")).json()
        self.assertEqual((rumpf["wunsch_von"], rumpf["zeitzone"]), ("2027-03-30T08:00:00+00:00", "Europe/Berlin"))
        n1 = next(e for s, e in self.post.eingereiht.items() if ":N1:" in s)
        for teil in ("30.03.2027, 10:00", "Europe/Berlin"):
            self.assertIn(teil, n1["text"])
        self.uhr.jetzt = datetime(2027, 10, 20, 9, 0, tzinfo=UTC)
        winter = (await self.anlegen(email="otto@example.invalid", wunsch_von="2027-11-10T10:00", wunsch_bis="2027-11-10T12:00")).json()
        self.assertEqual(winter["wunsch_von"], "2027-11-10T09:00:00+00:00")

    async def test_65_66_umstellung(self):
        self.assertEqual(self.fehler(await self.anlegen(wunsch_von="2027-03-28T02:30", wunsch_bis="2027-03-28T09:00"), 422, "appointment_invalid")["fields"],
                         {"wunsch_von": "time_not_existent"})
        self.uhr.jetzt = datetime(2027, 10, 20, 9, 0, tzinfo=UTC)
        self.assertEqual(self.fehler(await self.anlegen(wunsch_von="2027-10-31T02:30", wunsch_bis="2027-10-31T09:00"), 422, "appointment_invalid")["fields"],
                         {"wunsch_von": "time_ambiguous"})
        mit_versatz = await self.anlegen(wunsch_von="2027-10-31T02:30+01:00", wunsch_bis="2027-10-31T09:00")
        self.assertEqual((mit_versatz.status_code, mit_versatz.json()["wunsch_von"]), (201, "2027-10-31T01:30:00+00:00"))

    async def test_68_geraet_in_anderer_zeitzone(self):
        ohne = (await self.anlegen()).json()
        mit = (await self.anlegen(email="otto@example.invalid", zeitzone="Asia/Tokyo", geraet_zeitzone="America/New_York", jetzt="2020-01-01T00:00:00Z")).json()
        self.assertEqual((mit["wunsch_von"], mit["wunsch_bis"], mit["zeitzone"], mit["erstellt_am"]), (ohne["wunsch_von"], ohne["wunsch_bis"], "Europe/Berlin", ohne["erstellt_am"]))
        self.assertEqual(self.fehler(await self.anlegen(email="c@example.invalid", wunsch_von="2027-03-10T09:00-05:00"), 422, "appointment_invalid")["fields"], {"wunsch_von": "invalid"})

    async def test_69_alle_gespeicherten_zeitpunkte_in_utc(self):
        termin_id, kunde = await self.verschoben()
        await self.ruf("accept", termin_id, kunde, 2)
        await self.lies(termin_id, "inhaber")
        zweiter, _ = await self.wunsch(email="otto@example.invalid")
        self.uhr.jetzt = JETZT + timedelta(days=30)
        await self.lies(zweiter, "p")
        muster = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$"
        for termin in self.speicher.zeilen.values():
            for feld in ("wunsch_von", "wunsch_bis", "termin_am", "vorschlag_am", "antwort_bis", "erstellt_am", "geaendert_am"):
                if termin[feld] is not None:
                    self.assertRegex(termin[feld], muster, feld)
            for eintrag in termin["verlauf"] + termin["benachrichtigungen"]:
                self.assertRegex(eintrag["zeit"], muster)

    async def test_70_doppelbestaetigung_braucht_ausdrueckliche_bestaetigung(self):
        await self.bestaetigt()
        zweiter, _ = await self.wunsch(email="otto@example.invalid")
        detail = self.fehler(await self.ruf("confirm", zweiter, "p", 1, termin_am="2027-03-10T10:00"), 409, "appointment_overlap")
        self.assertEqual((detail["zustand"], detail["version"], self.gespeichert(zweiter)["zustand"]), ("wunsch", 1, "wunsch"))
        self.assertEqual((await self.ruf("confirm", zweiter, "p", 1, termin_am="2027-03-10T11:00")).status_code, 200, "anderer Beginn")
        dritter, kunde = await self.wunsch(email="c@example.invalid")
        self.assertEqual((await self.ruf("confirm", dritter, "p", 1, termin_am="2027-03-10T10:00", ueberschneidung_bestaetigt=True)).status_code, 200)
        vierter, kunde4 = await self.wunsch(email="d@example.invalid")
        await self.ruf("propose", vierter, "p", 1, vorschlag_am="2027-03-10T19:00")
        fuenfter, _ = await self.wunsch(email="e@example.invalid", wunsch_von="2027-03-10T18:00", wunsch_bis="2027-03-10T20:00")
        await self.ruf("confirm", fuenfter, "p", 1, termin_am="2027-03-10T19:00")
        self.fehler(await self.ruf("accept", vierter, kunde4, 2), 409, "appointment_overlap")
        self.assertEqual((await self.ruf("accept", vierter, kunde4, 2, ueberschneidung_bestaetigt=True)).json()["zustand"], "bestaetigt")

    async def test_71_derselbe_beginn_bei_anderem_betrieb(self):
        await self.bestaetigt()
        anderer = (await self.anlegen(werkstatt="P2")).json()["id"]
        antwort = await self.ruf("confirm", anderer, "p2", 1, termin_am="2027-03-10T10:00")
        self.assertEqual((antwort.status_code, antwort.json()["termin_am"]), (200, "2027-03-10T09:00:00+00:00"))

    async def test_72_abgesagter_termin_blockiert_nicht(self):
        erster, kunde = await self.bestaetigt()
        await self.ruf("cancel", erster, kunde, 2)
        zweiter, _ = await self.wunsch(email="otto@example.invalid")
        self.assertEqual((await self.ruf("confirm", zweiter, "p", 1, termin_am="2027-03-10T10:00")).status_code, 200)


class Nachrichten(Fall):
    async def test_73_keine_nachricht_an_betriebe_ohne_partnerschaft(self):
        self.fehler(await self.anlegen(werkstatt="V"), 409, "workshop_not_partner")
        termin_id, kunde = await self.wunsch()
        self.assertEqual(self.post.zahl("N2", ADRESSE["P"]), 1)
        self.betriebe["P"]["partner"] = False   # Partnerschaft endet nach dem Wunsch
        antwort = await self.ruf("cancel", termin_id, kunde, 1)
        self.assertEqual(antwort.status_code, 200)
        self.assertEqual(antwort.json()["benachrichtigung"], [{"ereignis": "N6", "empfaenger": "werkstatt", "status": "kein_empfaenger"}])
        self.assertEqual((self.post.zahl("N6"), [e["an"] for e in self.post.eingereiht.values()].count(ADRESSE["V"])), (0, 0))
        self.betriebe["P2"]["kontakt_email"] = ""
        ohne_adresse = await self.anlegen(werkstatt="P2")
        self.assertEqual((ohne_adresse.status_code, self.post.zahl("N2", "")), (201, 0))
        n1 = [e for s, e in self.post.eingereiht.items() if s.startswith("appointment:%s:N1:" % ohne_adresse.json()["id"])][0]
        self.assertNotIn("benachrichtigt", n1["text"])

    async def test_74_schalter_fuer_den_versand_an_werkstaetten_aus(self):
        self.werte["TEILEKLAR_APPOINTMENT_MAILS_WORKSHOP"] = ""
        antwort = await self.anlegen()
        self.assertEqual((antwort.status_code, self.post.zahl("N2"), self.post.zahl("N1")), (201, 0, 1))
        n1 = next(iter(self.post.eingereiht.values()))
        for wort in ("benachrichtigt", "informiert"):
            self.assertNotIn(wort, n1["text"] + n1["html"])
        self.assertEqual(sorted((n["ereignis"], n["empfaenger"], n["status"]) for n in antwort.json()["benachrichtigung"]),
                         [("N1", "kunde", "gesendet"), ("N2", "werkstatt", "ausgeschaltet")])
        kunde = {"X-Appointment-Access": antwort.json()["zugriff"]}
        await self.ruf("cancel", antwort.json()["id"], kunde, 1)
        self.assertEqual([e["an"] for e in self.post.eingereiht.values()], [WUNSCH["email"]], "auch N6 geht nicht an die Werkstatt")

    async def test_versand_bleibt_aus_bis_er_eingeschaltet_wird(self):
        self.werte["TEILEKLAR_APPOINTMENT_MAILS"] = ""
        antwort = await self.anlegen()
        self.assertEqual((antwort.status_code, self.post.versuche, self.post.eingereiht), (201, 0, {}))
        self.assertEqual({n["status"] for n in antwort.json()["benachrichtigung"]}, {"ausgeschaltet"})
        self.assertTrue(antwort.json()["zugriff"])

    async def test_n1_sagt_erst_nach_versand_von_n2_dass_die_werkstatt_benachrichtigt_ist(self):
        self.post.status = "wartend"
        await self.anlegen()
        n1 = next(e for s, e in self.post.eingereiht.items() if ":N1:" in s)
        self.assertNotIn("benachrichtigt", n1["text"])


class Speicher(unittest.IsolatedAsyncioTestCase):
    """Der bedingte Schreibvorgang selbst (6.2): Kennung, Betrieb, Zustand und Version müssen passen."""

    @unittest.skipUnless(HTTP_DEPS, "FastAPI/httpx fehlen; Testumgebung mit make test-env bauen")
    async def test_bedingtes_schreiben(self):
        speicher = API.ArbeitsspeicherTermine()
        termin = {"id": "t1", "werkstatt_id": "P", "zustand": "wunsch", "version": 1, "verlauf": [], "benachrichtigungen": []}
        await speicher.lege_an(termin)
        with self.assertRaises(API.SchonVorhanden):
            await speicher.lege_an(termin)
        setze, eintrag = {"zustand": "bestaetigt", "version": 2}, {"nr": "U2"}
        for kennung, betrieb, zustand, version in (("t2", "P", "wunsch", 1), ("t1", "P2", "wunsch", 1), ("t1", "P", "verschoben", 1), ("t1", "P", "wunsch", 2)):
            self.assertFalse(await speicher.schreibe_uebergang(kennung, betrieb, zustand, version, setze, eintrag, []))
        self.assertEqual((await speicher.hole("t1"))["version"], 1)
        self.assertTrue(await speicher.schreibe_uebergang("t1", "P", "wunsch", 1, setze, eintrag, [{"schluessel": "s", "status": "wartend"}]))
        self.assertFalse(await speicher.schreibe_uebergang("t1", "P", "wunsch", 1, setze, eintrag, []))
        gelesen = await speicher.hole("t1")
        self.assertEqual((gelesen["zustand"], gelesen["version"], gelesen["verlauf"], gelesen["benachrichtigungen"][0]["status"]), ("bestaetigt", 2, [eintrag], "wartend"))
        gelesen["zustand"] = "von außen geändert"
        self.assertEqual((await speicher.hole("t1"))["zustand"], "bestaetigt", "der Speicher gibt Kopien heraus")


if __name__ == "__main__":
    unittest.main()
