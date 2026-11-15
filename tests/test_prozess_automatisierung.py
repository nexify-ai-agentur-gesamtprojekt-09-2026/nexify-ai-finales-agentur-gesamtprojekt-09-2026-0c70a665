"""Vorbereitete Automatisierungen: Schalter, Idempotenz, begrenzte Wiederholung, Fehlerweg, Kostenbremse.

Ohne Netz und ohne Schlüssel. Abrufe und Mailversand laufen über Attrappen; die echte
Konfiguration wird nur gelesen und für die Läufe in einer aktivierten Kopie verwendet.
Belegt das Verhalten des Codes, nicht den Betrieb: Kein Zeitplan ist angelegt.
"""
import contextlib
import copy
import datetime as dt
import io
import json
import os
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ops/automatisierung"))
import anfragen  # noqa: E402
import cli  # noqa: E402
import fristen  # noqa: E402
import kern  # noqa: E402
import tagesbericht  # noqa: E402
import waechter  # noqa: E402
import zustellung  # noqa: E402

KONFIG = kern.lade_konfiguration()
KENNUNGEN = ("tagesbericht", "waechter", "anfragen", "fristen")
MAIL_UMGEBUNG = {
    "NEXIFY_AUTO_MAIL_INTERN": "ein",
    "NEXIFY_AUTO_INTERN_AN": "intern@example.invalid",
    "RESEND_FROM": "NeXify <absender@example.invalid>",
    "RESEND_API_KEY": "platzhalter-kein-schluessel",
}


class Uhr:
    def __init__(self, start="2026-11-16T07:00:00+00:00"):
        self.jetzt = dt.datetime.fromisoformat(start)

    def __call__(self):
        return self.jetzt

    def vor(self, **delta):
        self.jetzt += dt.timedelta(**delta)


class Post:
    """Attrappe für den Mailversand: zeichnet auf, antwortet aus einer Liste."""

    def __init__(self, *antworten):
        self.antworten = list(antworten)
        self.aufrufe = []

    def __call__(self, url, kopf, koerper, zeitlimit):
        self.aufrufe.append({"url": url, "kopf": dict(kopf), "koerper": json.loads(koerper)})
        antwort = self.antworten.pop(0) if self.antworten else 200
        if isinstance(antwort, Exception):
            raise antwort
        return antwort, b"{}"


def aktiv(*kennungen, mail=False):
    """Kopie der echten Konfiguration mit eingeschalteten Automatisierungen und zugehöriger Umgebung."""
    konfig = copy.deepcopy(KONFIG)
    umgebung = {}
    for eintrag in konfig["automatisierungen"]:
        if eintrag["id"] in kennungen:
            eintrag["aktiv"] = True
            umgebung[eintrag["schalter"]] = "ein"
    if mail:
        konfig["zustellung"]["resend_intern"]["aktiv"] = True
        umgebung.update(MAIL_UMGEBUNG)
    return konfig, umgebung


class Basis(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.ordner = Path(self.tmp.name) / "zustand"
        self.uhr = Uhr()
        self.zustand = kern.Zustand(self.ordner, uhr=self.uhr)
        self.addCleanup(self.zustand.schliessen)

    def dateien(self, kennung):
        ordner = self.ordner / "ausgang" / kennung
        return sorted(ordner.glob("*.md")) if ordner.exists() else []

    def protokoll(self):
        pfad = self.ordner / "protokoll.jsonl"
        return [json.loads(z) for z in pfad.read_text(encoding="utf-8").splitlines()] if pfad.exists() else []


class AuslieferungszustandTests(unittest.TestCase):
    """Was im Repository liegt, ist ausgeschaltet."""

    def test_alle_automatisierungen_und_der_mailkanal_stehen_auf_aus(self):
        self.assertEqual(KONFIG["zustand"], "vorbereitet_ausgeschaltet")
        self.assertEqual(tuple(a["id"] for a in KONFIG["automatisierungen"]), KENNUNGEN)
        for eintrag in KONFIG["automatisierungen"]:
            self.assertIs(eintrag["aktiv"], False, eintrag["id"])
        self.assertIs(KONFIG["zustellung"]["resend_intern"]["aktiv"], False)
        self.assertIs(KONFIG["llm"]["aufrufe_erlaubt"], False)
        self.assertFalse(kern.llm_erlaubt(KONFIG))

    def test_modellbindung_ist_exakt_und_ohne_ersatz(self):
        self.assertEqual(KONFIG["llm"]["modell"], "deepseek/deepseek-v4.1-flash-1017")
        self.assertEqual(KONFIG["llm"]["reasoning"], "high")
        self.assertEqual(KONFIG["llm"]["ersatzmodelle"], [])
        for abweichung in ({"modell": "anderes/modell"}, {"reasoning": "low"}, {"ersatzmodelle": ["x"]}):
            konfig = copy.deepcopy(KONFIG)
            konfig["llm"].update(abweichung)
            with tempfile.TemporaryDirectory() as tmp:
                pfad = Path(tmp) / "k.json"
                pfad.write_text(json.dumps(konfig), encoding="utf-8")
                with self.assertRaises(kern.Konfigurationsfehler):
                    kern.lade_konfiguration(pfad)

    def test_kein_modul_ruft_ein_modell_auf(self):
        for datei in sorted((ROOT / "ops/automatisierung").glob("*.py")):
            text = datei.read_text(encoding="utf-8")
            for spur in ("openrouter", "chat/completions", "api.openai", "anthropic"):
                self.assertNotIn(spur, text.lower(), f"{datei.name}: {spur}")

    def test_konfiguration_enthaelt_keine_werte_von_zugaengen(self):
        text = (ROOT / "config/prozess-automatisierung.json").read_text(encoding="utf-8")
        self.assertIsNone(re.search(r"[A-Za-z0-9]{32,}", text), "lange Zeichenfolge ohne Trenner")
        self.assertIsNone(re.search(r"[^\s\"@]+@[^\s\"@]+\.[a-z]{2,}", text), "Mailadresse")

    def test_fehlende_oder_unsinnige_grenze_schaltet_die_automatisierung_ab_nicht_den_schutz(self):
        for wert in (None, 0, -1, True, "3", 1.5, 100000):
            konfig = copy.deepcopy(KONFIG)
            konfig["automatisierungen"][0]["grenzen"]["max_versuche"] = wert
            with tempfile.TemporaryDirectory() as tmp:
                pfad = Path(tmp) / "k.json"
                pfad.write_text(json.dumps(konfig), encoding="utf-8")
                with self.assertRaises(kern.Konfigurationsfehler, msg=repr(wert)):
                    kern.lade_konfiguration(pfad)

    def test_definitionen_legen_keinen_zeitplan_an(self):
        ordner = ROOT / "ops/automatisierung/definitionen"
        daten = json.loads((ordner / "geplante-aufgaben.json").read_text(encoding="utf-8"))
        self.assertEqual(daten["zustand"], "nicht_angelegt")
        self.assertEqual({a["automatisierung"] for a in daten["aufgaben"]}, set(KENNUNGEN))
        for aufgabe in daten["aufgaben"]:
            self.assertIs(aufgabe["angelegt"], False)
            self.assertIn("python3 ops/automatisierung/cli.py lauf " + aufgabe["automatisierung"], aufgabe["auftragstext"])
        # Nichts davon liegt dort, wo es von selbst liefe.
        self.assertEqual([p.name for p in (ROOT / ".github/workflows").glob("*automatisierung*")], [])
        self.assertFalse(any("crons" in json.loads(p.read_text(encoding="utf-8")) for p in (ROOT / "vercel.json", ROOT / "apps/web/vercel.json")))


class SchalterAusTests(Basis):
    """Schalter aus = keine Wirkung: kein Abruf, keine Mail, keine Datei, kein Zustandsordner."""

    def laeufe(self, konfig, umgebung, post):
        verboten = mock.Mock(side_effect=AssertionError("darf bei ausgeschaltetem Lauf nicht aufgerufen werden"))
        return {
            "tagesbericht": tagesbericht.lauf(konfig, self.zustand, umgebung=umgebung, git_merges=verboten, transport=post),
            "waechter": waechter.lauf(konfig, self.zustand, umgebung=umgebung, abruf=verboten, transport=post),
            "anfragen": anfragen.lauf(konfig, self.zustand, umgebung=umgebung, transport=post,
                                      ereignisse=[{"ereignis": "anfrage.eingegangen", "anfrage_id": "A-100", "art": "kontakt",
                                                   "eingegangen": "2026-11-02T09:00:00+00:00"}]),
            "fristen": fristen.lauf(konfig, self.zustand, umgebung=umgebung, transport=post, register_pfad=Path("/nicht/vorhanden")),
        }

    def pruefe_keine_wirkung(self, ergebnisse, post):
        for kennung, ergebnis in ergebnisse.items():
            self.assertEqual(ergebnis["status"], "aus", kennung)
            self.assertEqual(ergebnis["wirkungen"], 0, kennung)
        self.assertEqual(post.aufrufe, [])
        self.assertFalse(self.ordner.exists(), "ein ausgeschalteter Lauf darf keinen Zustandsordner anlegen")

    def test_auslieferungszustand_wirkt_nicht_auch_wenn_alle_variablen_gesetzt_sind(self):
        post = Post()
        umgebung = {a["schalter"]: "ein" for a in KONFIG["automatisierungen"]} | MAIL_UMGEBUNG
        self.pruefe_keine_wirkung(self.laeufe(KONFIG, umgebung, post), post)

    def test_aktiv_in_der_konfiguration_ohne_variable_wirkt_nicht(self):
        post = Post()
        konfig, _ = aktiv(*KENNUNGEN, mail=True)
        self.pruefe_keine_wirkung(self.laeufe(konfig, dict(MAIL_UMGEBUNG), post), post)

    def test_nur_der_genaue_wert_ein_schaltet(self):
        konfig, _ = aktiv("waechter")
        for wert in ("", "1", "true", "EIN", "on", "ja", " aus "):
            self.assertFalse(kern.ist_ein(konfig, "waechter", {"NEXIFY_AUTO_WAECHTER": wert}), repr(wert))
        self.assertTrue(kern.ist_ein(konfig, "waechter", {"NEXIFY_AUTO_WAECHTER": "ein"}))

    def test_notaus_schlaegt_jeden_schalter(self):
        post = Post()
        konfig, umgebung = aktiv(*KENNUNGEN, mail=True)
        umgebung["NEXIFY_AUTO_NOTAUS"] = "1"
        self.pruefe_keine_wirkung(self.laeufe(konfig, umgebung, post), post)

    def test_befehlszeile_endet_bei_aus_ohne_wirkung_mit_exit_0(self):
        with mock.patch.dict(os.environ, {"NEXIFY_AUTO_ZUSTAND": str(self.ordner)}, clear=False):
            for kennung in KENNUNGEN:
                ausgabe = io.StringIO()
                with contextlib.redirect_stdout(ausgabe):
                    code = cli.main(["lauf", kennung])
                self.assertEqual(code, 0)
                self.assertEqual(json.loads(ausgabe.getvalue())["status"], "aus")
        self.assertFalse(self.ordner.exists())

    def test_status_liest_nur(self):
        auskunft = cli.status(KONFIG, {})
        self.assertFalse(any(a["ein"] for a in auskunft["automatisierungen"]))
        self.assertFalse(auskunft["llm_aufrufe_erlaubt"])
        self.assertFalse(self.ordner.exists())


class KernTests(Basis):
    def test_doppelter_schluessel_fuehrt_zu_genau_einer_wirkung(self):
        zaehler = []
        for _ in range(3):
            ergebnis = self.zustand.einmal("x", "k1", lambda: zaehler.append(1), max_versuche=3, max_je_tag=5)
        self.assertEqual(len(zaehler), 1)
        self.assertEqual(ergebnis["ergebnis"], kern.DOPPELT)

    def test_zweite_verbindung_auf_denselben_ordner_sieht_die_erledigte_wirkung(self):
        zaehler = []
        self.zustand.einmal("x", "k1", lambda: zaehler.append(1), max_versuche=3, max_je_tag=5)
        zweiter = kern.Zustand(self.ordner, uhr=self.uhr)
        self.addCleanup(zweiter.schliessen)
        self.assertEqual(zweiter.einmal("x", "k1", lambda: zaehler.append(1), max_versuche=3, max_je_tag=5)["ergebnis"], kern.DOPPELT)
        self.assertEqual(len(zaehler), 1)

    def test_wiederholung_ist_begrenzt_und_endet_im_fehlerweg(self):
        versuche, pausen = [], []

        def scheitert():
            versuche.append(1)
            raise RuntimeError("Dienst antwortet nicht")

        ergebnis = self.zustand.einmal("x", "k2", scheitert, max_versuche=3, max_je_tag=5, pause_s=2.0, schlaf=pausen.append)
        self.assertEqual(ergebnis["ergebnis"], kern.ENDGUELTIG)
        self.assertEqual(len(versuche), 3)
        self.assertEqual(pausen, [2.0, 4.0])
        # Ein weiterer Lauf versucht es nicht erneut.
        self.assertEqual(self.zustand.einmal("x", "k2", scheitert, max_versuche=3, max_je_tag=5)["ergebnis"], kern.ENDGUELTIG)
        self.assertEqual(len(versuche), 3)
        fehler = self.zustand.offene_fehler()
        self.assertEqual(len(fehler), 1)
        self.assertEqual((fehler[0]["automatisierung"], fehler[0]["versuche"]), ("x", 3))
        self.assertIn("Dienst antwortet nicht", fehler[0]["grund"])

    def test_erfolg_nach_fehlversuch_zaehlt_als_eine_wirkung(self):
        folge = [RuntimeError("kurz weg"), "ok"]

        def wirkung():
            wert = folge.pop(0)
            if isinstance(wert, Exception):
                raise wert
            return wert

        ergebnis = self.zustand.einmal("x", "k3", wirkung, max_versuche=3, max_je_tag=5)
        self.assertEqual((ergebnis["ergebnis"], ergebnis["versuche"], ergebnis["wert"]), (kern.ERLEDIGT, 2, "ok"))
        self.assertEqual(self.zustand.offene_fehler(), [])

    def test_kostenbremse_begrenzt_wirkungen_je_tag_und_gilt_am_folgetag_neu(self):
        zaehler = []
        ergebnisse = [self.zustand.einmal("x", f"k{i}", lambda: zaehler.append(1), max_versuche=1, max_je_tag=2)["ergebnis"] for i in range(4)]
        self.assertEqual(ergebnisse, [kern.ERLEDIGT, kern.ERLEDIGT, kern.GEBREMST, kern.GEBREMST])
        self.uhr.vor(days=1)
        self.assertEqual(self.zustand.einmal("x", "k9", lambda: zaehler.append(1), max_versuche=1, max_je_tag=2)["ergebnis"], kern.ERLEDIGT)
        self.assertEqual(len(zaehler), 3)

    def test_abgebrochener_lauf_sperrt_kurz_und_zaehlt_danach_als_versuch(self):
        with self.assertRaises(KeyboardInterrupt):
            self.zustand.einmal("x", "k4", mock.Mock(side_effect=KeyboardInterrupt()), max_versuche=2, max_je_tag=5)
        zaehler = []
        self.assertEqual(self.zustand.einmal("x", "k4", lambda: zaehler.append(1), max_versuche=2, max_je_tag=5)["ergebnis"], kern.BELEGT)
        self.uhr.vor(minutes=20)
        self.assertEqual(self.zustand.einmal("x", "k4", lambda: zaehler.append(1), max_versuche=2, max_je_tag=5)["ergebnis"], kern.ERLEDIGT)
        self.assertEqual((len(zaehler), self.zustand.status("x", "k4")["versuche"]), (1, 2))

    def test_abgebrochene_laeufe_schoepfen_die_versuche_aus(self):
        for _ in range(2):
            with self.assertRaises(KeyboardInterrupt):
                self.zustand.einmal("x", "k5", mock.Mock(side_effect=KeyboardInterrupt()), max_versuche=2, max_je_tag=5)
            self.uhr.vor(minutes=20)
        zaehler = []
        self.assertEqual(self.zustand.einmal("x", "k5", lambda: zaehler.append(1), max_versuche=2, max_je_tag=5)["ergebnis"], kern.ENDGUELTIG)
        self.assertEqual(zaehler, [])
        self.assertEqual(len(self.zustand.offene_fehler()), 1)

    def test_vorlage_ohne_wert_fuer_einen_platzhalter_ist_ein_fehler(self):
        with self.assertRaises(zustellung.Zustellfehler):
            zustellung.vorlage("alarm.md", ZIEL="x")


class ZustellungTests(Basis):
    def test_mailkanal_braucht_konfiguration_schalter_und_alle_drei_variablen(self):
        konfig, umgebung = aktiv("waechter", mail=True)
        self.assertTrue(zustellung.kanal_bereit(konfig, "resend_intern", umgebung)["bereit"])
        for fehlt in MAIL_UMGEBUNG:
            teil = {k: v for k, v in umgebung.items() if k != fehlt}
            self.assertFalse(zustellung.kanal_bereit(konfig, "resend_intern", teil)["bereit"], fehlt)
        self.assertFalse(zustellung.kanal_bereit(KONFIG, "resend_intern", umgebung)["bereit"])

    def test_mehrere_oder_ungueltige_empfaenger_werden_abgelehnt(self):
        konfig, umgebung = aktiv("waechter", mail=True)
        for wert in ("a@example.invalid, b@example.invalid", "a@example.invalid;b@example.invalid", "kein-at", "x y@example.invalid"):
            self.assertFalse(zustellung.kanal_bereit(konfig, "resend_intern", umgebung | {"NEXIFY_AUTO_INTERN_AN": wert})["bereit"], wert)

    def test_mail_geht_nur_an_die_interne_adresse_und_der_schluessel_bleibt_aus_protokoll_und_dateien(self):
        konfig, umgebung = aktiv("waechter", mail=True)
        post = Post()
        ergebnis = zustellung.zustellen(konfig, self.zustand, "waechter", "s1", "Betreff", "Text", umgebung=umgebung, transport=post)
        self.assertEqual(ergebnis["resend_intern"]["ergebnis"], kern.ERLEDIGT)
        self.assertEqual(len(post.aufrufe), 1)
        aufruf = post.aufrufe[0]
        self.assertEqual(aufruf["url"], "https://api.resend.com/emails")
        self.assertEqual(aufruf["koerper"]["to"], ["intern@example.invalid"])
        self.assertEqual(aufruf["kopf"]["Idempotency-Key"], "nexify-auto-s1")
        self.zustand.schliessen()
        for datei in self.ordner.rglob("*"):
            if datei.is_file():
                self.assertNotIn(b"platzhalter-kein-schluessel", datei.read_bytes(), datei.name)
                self.assertNotIn(b"intern@example.invalid", datei.read_bytes(), datei.name)

    def test_doppelte_zustellung_sendet_eine_mail_und_schreibt_eine_datei(self):
        konfig, umgebung = aktiv("waechter", mail=True)
        post = Post()
        for _ in range(3):
            zustellung.zustellen(konfig, self.zustand, "waechter", "s2", "Betreff", "Text", umgebung=umgebung, transport=post)
        self.assertEqual(len(post.aufrufe), 1)
        self.assertEqual(len(self.dateien("waechter")), 1)

    def test_mailfehler_wird_begrenzt_wiederholt_laesst_die_datei_bestehen_und_landet_im_fehlerweg(self):
        konfig, umgebung = aktiv("waechter", mail=True)
        post = Post(500, 500, 500, 200)
        ergebnis = zustellung.zustellen(konfig, self.zustand, "waechter", "s3", "Betreff", "Text", umgebung=umgebung, transport=post, schlaf=lambda _s: None)
        self.assertEqual(ergebnis["datei"]["ergebnis"], kern.ERLEDIGT)
        self.assertEqual(ergebnis["resend_intern"]["ergebnis"], kern.ENDGUELTIG)
        self.assertEqual(len(post.aufrufe), 3)
        self.assertEqual(len(self.dateien("waechter")), 1)
        fehler = self.zustand.offene_fehler()
        self.assertEqual(len(fehler), 1)
        self.assertIn("500", fehler[0]["grund"])
        # Kein vierter Versuch in einem späteren Lauf.
        zustellung.zustellen(konfig, self.zustand, "waechter", "s3", "Betreff", "Text", umgebung=umgebung, transport=post)
        self.assertEqual(len(post.aufrufe), 3)

    def test_tagesgrenze_des_versandkontos_gilt_ueber_alle_automatisierungen(self):
        konfig, umgebung = aktiv("waechter", "anfragen", mail=True)
        konfig["zustellung"]["resend_intern"]["max_mails_je_tag"] = 2
        post = Post()
        for i, kennung in enumerate(("waechter", "anfragen", "waechter", "anfragen")):
            zustellung.zustellen(konfig, self.zustand, kennung, f"m{i}", "Betreff", "Text", umgebung=umgebung, transport=post)
        self.assertEqual(len(post.aufrufe), 2)

    def test_mail_einer_automatisierung_verbraucht_nicht_die_einzelgrenze_einer_anderen(self):
        konfig, umgebung = aktiv("fristen", "tagesbericht", mail=True)
        post = Post()
        zustellung.zustellen(konfig, self.zustand, "fristen", "f1", "Frist", "Text", umgebung=umgebung, transport=post)
        ergebnis = zustellung.zustellen(konfig, self.zustand, "tagesbericht", "t1", "Bericht", "Text", umgebung=umgebung, transport=post)
        self.assertEqual(ergebnis["resend_intern"]["ergebnis"], kern.ERLEDIGT, "Grenze 1 des Tagesberichts zählt nur Tagesberichte")
        zweiter = zustellung.zustellen(konfig, self.zustand, "tagesbericht", "t2", "Bericht", "Text", umgebung=umgebung, transport=post)
        self.assertEqual(zweiter["resend_intern"]["ergebnis"], kern.GEBREMST)
        self.assertEqual(len(post.aufrufe), 2)


class WaechterTests(Basis):
    def antworten(self, **abweichend):
        ziele = kern.automatisierung(KONFIG, "waechter")["ziele"]
        nach_url = {z["url"]: abweichend.get(z["id"].replace("-", "_"), 200) for z in ziele}

        def abruf(url, _zeitlimit):
            wert = nach_url[url]
            if isinstance(wert, Exception):
                raise wert
            return wert

        return abruf

    def test_ein_alarm_je_stoerung_und_eine_entwarnung(self):
        konfig, umgebung = aktiv("waechter", mail=True)
        post = Post()
        gestoert = self.antworten(nexifyai_de_start=502)
        lauf = lambda abruf: waechter.lauf(konfig, self.zustand, umgebung=umgebung, abruf=abruf, transport=post)  # noqa: E731
        self.assertEqual(lauf(gestoert)["wirkungen"], 0, "ein einzelner Fehlversuch ist nur ein Verdacht")
        self.assertEqual(lauf(gestoert)["wirkungen"], 1)
        for _ in range(5):
            self.uhr.vor(hours=1)
            self.assertEqual(lauf(gestoert)["wirkungen"], 0, "dieselbe Störung meldet nicht erneut")
        self.assertEqual(len(post.aufrufe), 1)
        self.assertIn("Störung", post.aufrufe[0]["koerper"]["subject"])
        self.uhr.vor(hours=1)
        self.assertEqual(lauf(self.antworten())["wirkungen"], 1)
        self.assertIn("Entwarnung", post.aufrufe[1]["koerper"]["subject"])
        self.assertEqual(lauf(self.antworten())["wirkungen"], 0)
        self.assertEqual(len(post.aufrufe), 2)
        self.assertEqual(len(self.dateien("waechter")), 2)

    def test_netzfehler_gilt_als_keine_antwort_und_bricht_den_lauf_nicht_ab(self):
        konfig, umgebung = aktiv("waechter")
        abruf = self.antworten(nexifyai_cloud_start=TimeoutError("zu langsam"))
        waechter.lauf(konfig, self.zustand, umgebung=umgebung, abruf=abruf)
        ergebnis = waechter.lauf(konfig, self.zustand, umgebung=umgebung, abruf=abruf)
        lage = {z["id"]: z for z in ergebnis["lage"]}
        self.assertEqual((lage["nexifyai-cloud-start"]["zustand"], lage["nexifyai-cloud-start"]["status"]), ("gestoert", 0))
        self.assertEqual(lage["nexifyai-de-start"]["zustand"], "ok")
        self.assertEqual(ergebnis["wirkungen"], 1)

    def test_bekannter_befund_erscheint_in_der_lage_und_loest_keinen_alarm_aus(self):
        konfig, umgebung = aktiv("waechter", mail=True)
        post = Post()
        abruf = self.antworten(shop_dienst_anfragen=503)
        for _ in range(3):
            ergebnis = waechter.lauf(konfig, self.zustand, umgebung=umgebung, abruf=abruf, transport=post)
        self.assertEqual(post.aufrufe, [])
        self.assertEqual(self.dateien("waechter"), [])
        self.assertEqual({z["id"]: z["zustand"] for z in ergebnis["lage"]}["shop-dienst-anfragen"], "gestoert")

    def test_nur_https_ziele(self):
        konfig, umgebung = aktiv("waechter")
        kern.automatisierung(konfig, "waechter")["ziele"][0]["url"] = "http://nexifyai.de/"
        with self.assertRaises(kern.Konfigurationsfehler):
            waechter.lauf(konfig, self.zustand, umgebung=umgebung, abruf=self.antworten())

    def test_alarmflut_wird_von_der_kostenbremse_begrenzt(self):
        konfig, umgebung = aktiv("waechter")
        eintrag = kern.automatisierung(konfig, "waechter")
        eintrag["grenzen"]["max_wirkungen_je_tag"] = 2
        eintrag["ziele"] = [{"id": f"z{i}", "url": f"https://example.invalid/{i}", "erwartet": [200]} for i in range(6)]
        abruf = lambda _url, _zeitlimit: 500  # noqa: E731
        waechter.lauf(konfig, self.zustand, umgebung=umgebung, abruf=abruf)
        waechter.lauf(konfig, self.zustand, umgebung=umgebung, abruf=abruf)
        self.assertEqual(len(self.dateien("waechter")), 2)
        self.assertEqual(sum(1 for p in self.protokoll() if p["ereignis"] == kern.GEBREMST), 4)


class AnfragenTests(Basis):
    EINGANG = {"ereignis": "anfrage.eingegangen", "anfrage_id": "A-100", "art": "kontakt", "eingegangen": "2026-11-12T09:00:00+00:00"}

    def test_doppeltes_ereignis_legt_einen_vorgang_an_und_erinnert_einmal_je_stufe(self):
        konfig, umgebung = aktiv("anfragen", mail=True)
        post = Post()
        lauf = lambda ereignisse=None: anfragen.lauf(konfig, self.zustand, ereignisse=ereignisse, umgebung=umgebung, transport=post)  # noqa: E731
        erster = lauf([self.EINGANG, dict(self.EINGANG)])   # Montag 16.11., Eingang Donnerstag 12.11. = 2 Werktage
        self.assertEqual((erster["neu"], erster["offen"], erster["wirkungen"]), (1, 1, 1))
        zweiter = lauf([dict(self.EINGANG)])
        self.assertEqual((zweiter["neu"], zweiter["offen"]), (0, 1))
        self.assertEqual(len(post.aufrufe), 1, "Stufe 1 nur einmal")
        self.uhr.vor(days=1)   # Dienstag: 3 Werktage, Stufe 3
        lauf()
        lauf()
        self.assertEqual(len(post.aufrufe), 2)
        self.uhr.vor(days=7)
        lauf()
        self.assertEqual(len(post.aufrufe), 2, "nach der letzten Stufe keine weitere Erinnerung")

    def test_beantwortete_anfrage_erinnert_nicht_mehr(self):
        konfig, umgebung = aktiv("anfragen")
        anfragen.lauf(konfig, self.zustand, ereignisse=[self.EINGANG], umgebung=umgebung)
        self.uhr.vor(days=1)
        ergebnis = anfragen.lauf(konfig, self.zustand, ereignisse=[{"ereignis": "anfrage.beantwortet", "anfrage_id": "A-100"}], umgebung=umgebung)
        self.assertEqual((ergebnis["offen"], ergebnis["wirkungen"], ergebnis["ueberfaellig"]), (0, 0, []))
        self.assertEqual(len(self.dateien("anfragen")), 1)

    def test_wochenende_zaehlt_nicht_als_werktag(self):
        freitag = dt.datetime.fromisoformat("2026-11-13T16:00:00+00:00")
        self.assertEqual(anfragen.werktage_zwischen(freitag, dt.datetime.fromisoformat("2026-11-15T23:00:00+00:00")), 0)
        self.assertEqual(anfragen.werktage_zwischen(freitag, dt.datetime.fromisoformat("2026-11-16T08:00:00+00:00")), 1)

    def test_personenbezogene_oder_fehlerhafte_ereignisse_werden_abgelehnt_und_nirgends_gespeichert(self):
        konfig, umgebung = aktiv("anfragen")
        schlecht = [
            dict(self.EINGANG, anfrage_id="A-200", email="kundin@example.invalid"),
            dict(self.EINGANG, anfrage_id="A-201", name="Erika Beispiel"),
            dict(self.EINGANG, anfrage_id="A-202", art="unbekannt"),
            dict(self.EINGANG, anfrage_id="A-203", eingegangen="gestern"),
            dict(self.EINGANG, anfrage_id="A-204", eingegangen="2026-11-12T09:00:00"),
            dict(self.EINGANG, anfrage_id="kundin@example.invalid"),
            {"ereignis": "anfrage.geloescht", "anfrage_id": "A-205"},
            "kein objekt",
        ]
        ergebnis = anfragen.lauf(konfig, self.zustand, ereignisse=schlecht, umgebung=umgebung)
        self.assertEqual((ergebnis["neu"], ergebnis["abgelehnt"], ergebnis["wirkungen"]), (0, len(schlecht), 0))
        self.zustand.schliessen()
        for datei in self.ordner.rglob("*"):
            if datei.is_file():
                inhalt = datei.read_bytes()
                self.assertNotIn(b"example.invalid", inhalt, datei.name)
                self.assertNotIn(b"Erika", inhalt, datei.name)

    def test_erinnerung_nennt_weder_namen_noch_adresse(self):
        konfig, umgebung = aktiv("anfragen")
        anfragen.lauf(konfig, self.zustand, ereignisse=[self.EINGANG], umgebung=umgebung)
        text = self.dateien("anfragen")[0].read_text(encoding="utf-8")
        self.assertIn("A-100", text)
        self.assertNotIn("@", text)
        self.assertNotIn("{{", text)


class FristenTests(Basis):
    def register(self, *zugaenge):
        pfad = Path(self.tmp.name) / "register.json"
        pfad.write_text(json.dumps({"loesungen": [{"id": "dienst", "zugaenge": list(zugaenge)}]}), encoding="utf-8")
        return pfad

    def test_termin_meldet_je_stufe_einmal(self):
        konfig, umgebung = aktiv("fristen")
        kern.automatisierung(konfig, "fristen")["termine"] = [{"id": "sicherung", "titel": "Sicherung läuft ab", "faellig": "2026-11-20", "quelle": "Test"}]
        leer = self.register()
        lauf = lambda: fristen.lauf(konfig, self.zustand, umgebung=umgebung, register_pfad=leer)["wirkungen"]  # noqa: E731
        self.uhr.jetzt = dt.datetime.fromisoformat("2026-11-10T07:00:00+00:00")
        self.assertEqual(lauf(), 0, "außerhalb der Vorwarnung")
        self.uhr.jetzt = dt.datetime.fromisoformat("2026-11-14T07:00:00+00:00")
        self.assertEqual((lauf(), lauf()), (1, 1))
        self.assertEqual(len(self.dateien("fristen")), 1, "Vorwarnung einmal")
        self.uhr.jetzt = dt.datetime.fromisoformat("2026-11-20T07:00:00+00:00")
        lauf(), lauf()
        self.assertEqual(len(self.dateien("fristen")), 2, "fällig einmal")
        self.uhr.jetzt = dt.datetime.fromisoformat("2026-11-24T07:00:00+00:00")
        lauf()
        self.uhr.vor(days=1)
        lauf()
        self.assertEqual(len(self.dateien("fristen")), 3, "überfällig einmal je Kalenderwoche")
        self.uhr.vor(days=7)
        lauf()
        self.assertEqual(len(self.dateien("fristen")), 4)

    def test_zugaenge_einmal_je_woche_und_nur_mit_bezeichnung(self):
        konfig, umgebung = aktiv("fristen")
        pfad = self.register(
            {"bezeichnung": "Schlüssel A", "offengelegt": True, "erneuerung_faellig": True},
            {"bezeichnung": "Schlüssel B", "offengelegt": False, "erneuerung_faellig": False},
        )
        for _ in range(3):
            ergebnis = fristen.lauf(konfig, self.zustand, umgebung=umgebung, register_pfad=pfad)
        self.assertEqual(ergebnis["zugaenge_faellig"], 1)
        dateien = self.dateien("fristen")
        self.assertEqual(len(dateien), 1)
        text = dateien[0].read_text(encoding="utf-8")
        self.assertIn("dienst: Schlüssel A", text)
        self.assertNotIn("Schlüssel B", text)

    def test_ungueltiger_termin_wird_abgelehnt_statt_geraten(self):
        konfig, umgebung = aktiv("fristen")
        kern.automatisierung(konfig, "fristen")["termine"] = [
            {"id": "x", "faellig": "bald"}, {"faellig": "2026-11-16"}, "text", {"id": "y", "faellig": "2026-02-30"},
            {"id": "gut", "titel": "Gültiger Termin danach", "faellig": "2026-11-16"},
        ]
        ergebnis = fristen.lauf(konfig, self.zustand, umgebung=umgebung, register_pfad=self.register())
        self.assertEqual(sum(1 for p in self.protokoll() if p["ereignis"] == "termin_abgelehnt"), 4)
        # Ein ungültiger Eintrag hält die folgenden nicht auf.
        self.assertEqual((ergebnis["wirkungen"], [t["id"] for t in ergebnis["termine"]]), (1, ["gut"]))

    def test_echtes_register_ist_lesbar_und_nennt_keine_werte(self):
        zugaenge = fristen.faellige_zugaenge()
        self.assertTrue(all(set(z) == {"loesung", "bezeichnung", "offengelegt"} for z in zugaenge))


class TagesberichtTests(Basis):
    def lauf(self, konfig, umgebung, post=None, merges=("abc1234 test: Eintrag (#1)",)):
        aufrufe = []

        def git(_repo):
            aufrufe.append(1)
            return None if merges is None else list(merges)

        ergebnis = tagesbericht.lauf(konfig, self.zustand, umgebung=umgebung, git_merges=git, transport=post or Post(),
                                     register_pfad=ROOT / "config/loesungsregister.json")
        return ergebnis, aufrufe

    def test_ein_bericht_je_tag_auch_bei_mehreren_ausloesern(self):
        konfig, umgebung = aktiv("tagesbericht", mail=True)
        post = Post()
        erster, _ = self.lauf(konfig, umgebung, post)
        self.assertEqual(erster["wirkungen"], 2)
        for _ in range(3):
            self.uhr.vor(hours=2)
            ergebnis, aufrufe = self.lauf(konfig, umgebung, post)
            self.assertEqual((ergebnis["wirkungen"], aufrufe), (0, []), "zweiter Auslöser erhebt nicht einmal neu")
        self.assertEqual((len(post.aufrufe), len(self.dateien("tagesbericht"))), (1, 1))
        self.uhr.vor(days=1)
        self.lauf(konfig, umgebung, post)
        self.assertEqual((len(post.aufrufe), len(self.dateien("tagesbericht"))), (2, 2))

    def test_tageswechsel_richtet_sich_nach_europe_amsterdam(self):
        konfig, umgebung = aktiv("tagesbericht")
        self.uhr.jetzt = dt.datetime.fromisoformat("2026-11-16T22:30:00+00:00")   # 23:30 Ortszeit
        self.assertEqual(self.lauf(konfig, umgebung)[0]["tag"], "2026-11-16")
        self.uhr.vor(hours=1)                                                      # 00:30 Ortszeit, noch 16.11. UTC
        ergebnis, _ = self.lauf(konfig, umgebung)
        self.assertEqual((ergebnis["tag"], ergebnis["wirkungen"]), ("2026-11-17", 1))

    def test_fehlende_quellen_stehen_als_nicht_erhoben_im_bericht(self):
        konfig, umgebung = aktiv("tagesbericht")
        bericht = self.lauf(konfig, umgebung, merges=None)[0]["bericht"]
        self.assertEqual(bericht.count("nicht erhoben"), 5)   # Git, PR-Liste, Wächter, Anfragen, Kosten
        self.assertNotIn("0 offen", bericht)

    def test_bericht_nimmt_lage_und_fehler_der_anderen_automatisierungen_auf(self):
        konfig, umgebung = aktiv(*KENNUNGEN)
        waechter.lauf(konfig, self.zustand, umgebung=umgebung, abruf=lambda url, _z: 500 if url.endswith("/kontakt") else 200)
        waechter.lauf(konfig, self.zustand, umgebung=umgebung, abruf=lambda url, _z: 500 if url.endswith("/kontakt") else 200)
        anfragen.lauf(konfig, self.zustand, ereignisse=[AnfragenTests.EINGANG], umgebung=umgebung)
        self.zustand.einmal("anfragen", "kaputt", mock.Mock(side_effect=RuntimeError("Testfehler")), max_versuche=1, max_je_tag=99)
        bericht = self.lauf(konfig, umgebung)[0]["bericht"]
        self.assertIn("nexifyai-de-kontakt: gestoert, Status 500", bericht)
        self.assertIn("offen: 1, über der Antwortfrist: 1", bericht)
        self.assertIn("anfragen: RuntimeError: Testfehler (1 Versuche)", bericht)
        self.assertIn("- tagesbericht: EIN", bericht)
        self.assertLessEqual(len(bericht.splitlines()), kern.automatisierung(konfig, "tagesbericht")["grenzen"]["max_zeilen"])

    def test_bericht_wird_auf_die_zeilengrenze_gekuerzt(self):
        konfig, umgebung = aktiv("tagesbericht")
        kern.automatisierung(konfig, "tagesbericht")["grenzen"]["max_zeilen"] = 12
        bericht = self.lauf(konfig, umgebung, merges=[f"c{i} eintrag" for i in range(40)])[0]["bericht"]
        self.assertEqual(len(bericht.splitlines()), 12)
        self.assertIn("gekürzt", bericht.splitlines()[-1])


class ProbelaufTests(Basis):
    """Der Probelauf des Inhabers: schreibt nur in den genannten Ordner, sendet nichts, ruft nichts ab."""

    def test_probelaeufe_mit_den_beispieldaten(self):
        beispiele = ROOT / "ops/automatisierung/beispiele"
        eingaben = {"waechter": "waechter-antworten.json", "anfragen": "anfragen-ereignisse.json", "fristen": None, "tagesbericht": "tagesbericht-merges.json"}
        umgebung = {a["schalter"]: "ein" for a in KONFIG["automatisierungen"]} | MAIL_UMGEBUNG
        netz = mock.Mock(side_effect=AssertionError("Probelauf darf kein Netz benutzen"))
        with mock.patch.dict(os.environ, umgebung, clear=False), mock.patch("urllib.request.urlopen", netz):
            for kennung in ("waechter", "waechter", "anfragen", "fristen", "tagesbericht"):
                argumente = ["probe", kennung, "--ausgabe", str(self.ordner)]
                if eingaben[kennung]:
                    argumente += ["--eingabe", str(beispiele / eingaben[kennung])]
                ausgabe = io.StringIO()
                with contextlib.redirect_stdout(ausgabe):
                    self.assertEqual(cli.main(argumente), 0, kennung)
        netz.assert_not_called()
        # Die Ausgabe des Tagesberichts trägt den Bericht selbst, nicht nur einen Dateipfad.
        self.assertIn("--- Bericht ---", ausgabe.getvalue())
        self.assertIn("## 1. Merges auf main", ausgabe.getvalue())
        self.assertEqual(len(self.dateien("waechter")), 1)
        self.assertEqual(len(self.dateien("anfragen")), 1)
        bericht = self.dateien("tagesbericht")[0].read_text(encoding="utf-8")
        self.assertIn("nexifyai-de-kontakt: gestoert", bericht)
        self.assertIn("TEST-0001 (kontakt)", bericht)
        self.assertNotIn("TEST-0002", bericht)


if __name__ == "__main__":
    unittest.main()
