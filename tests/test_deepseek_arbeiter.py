"""Delegationsarbeiter gegen einen nachgebauten Router (lokaler Test-Server).

Kein Netz nach außen, kein echter Schlüssel, kein Modellaufruf. Der Server
antwortet im OpenAI-Format und merkt sich, was er bekommen hat.
"""
import copy
import importlib.util
import io
import json
import tempfile
import threading
import unittest
from contextlib import redirect_stderr, redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("deepseek_arbeiter", ROOT / "tools/deepseek_arbeiter.py")
arbeiter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(arbeiter)

POLICY = "deepseek/deepseek-v4.1-flash-1017"
WEG1 = "openrouter/deepseek/deepseek-v4.1-flash-1017"
SCHLUESSEL = "test-schluessel-nicht-echt"
AUFTRAG = "---\naufgabe: probe-zusammenfassung\ndatenklasse: oeffentlich\nart: zusammenfassung\n---\nFasse zusammen: Der Himmel ist blau.\n"


def antwort(modell=POLICY, text="Der Himmel ist blau.", usage=True, **mehr):
    daten = {"id": "x", "model": modell, "choices": [{"message": {"role": "assistant", "content": text}, "finish_reason": "stop"}]}
    if usage:
        daten["usage"] = {"prompt_tokens": 40, "completion_tokens": 60, "total_tokens": 100, "cost": 0.0002}
    daten.update(mehr)
    return 200, daten


class Router:
    """Antwort je Router-Modellname; zeichnet Anfragen auf."""

    def __init__(self, verhalten):
        self.verhalten, self.anfragen = verhalten, []
        aussen = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                rumpf = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                aussen.anfragen.append({"pfad": self.path, "auth": self.headers.get("Authorization"), "rumpf": rumpf})
                status, daten = aussen.verhalten[rumpf["model"]]
                if status == 307:
                    self.send_response(307)
                    self.send_header("Location", "/dashboard")
                    self.end_headers()
                    return
                roh = json.dumps(daten).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(roh)))
                self.end_headers()
                self.wfile.write(roh)

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}/v1"

    def stop(self):
        self.server.shutdown()
        self.server.server_close()


class Basis(unittest.TestCase):
    def setUp(self):
        self.konfig = copy.deepcopy(arbeiter.lade_konfig())
        self.konfig["router"]["erlaubte_hosts"] = ["127.0.0.1"]
        self.konfig["wege"][1]["router_modellname"] = "ds/test-direkt"
        self.ordner = tempfile.TemporaryDirectory()
        self.addCleanup(self.ordner.cleanup)
        self.zustand = arbeiter.Zustand(Path(self.ordner.name))

    def router(self, verhalten):
        router = Router(verhalten)
        self.addCleanup(router.stop)
        return router

    def umgebung(self, router):
        return {"DEEPSEEK_ARBEITER": "ein", "ROUTER_URL": router.url, "ROUTER_KEY": SCHLUESSEL}

    def lauf(self, router, auftrag=AUFTRAG, **mehr):
        return arbeiter.ausfuehren(auftrag, konfig=self.konfig, environ=self.umgebung(router), zustand=self.zustand, **mehr)

    def protokoll(self):
        datei = Path(self.ordner.name) / "protokoll.jsonl"
        return [json.loads(z) for z in datei.read_text(encoding="utf-8").splitlines()] if datei.exists() else []

    def abbruch(self, router, auftrag=AUFTRAG):
        with self.assertRaises(arbeiter.Abbruch) as gefangen:
            self.lauf(router, auftrag)
        return gefangen.exception


class Wege(Basis):
    def test_openrouter_antwortet_weg_eins_wird_protokolliert(self):
        router = self.router({WEG1: antwort(provider="DeepInfra")})
        ergebnis = self.lauf(router)
        self.assertEqual((ergebnis["weg"], ergebnis["modell"], ergebnis["umleitung_nach"]), ("router-openrouter", POLICY, []))
        self.assertEqual(len(router.anfragen), 1)
        gesendet = router.anfragen[0]
        self.assertEqual(gesendet["pfad"], "/v1/chat/completions")
        self.assertEqual(gesendet["auth"], "Bearer " + SCHLUESSEL)
        self.assertEqual(gesendet["rumpf"]["reasoning"], {"effort": "high"})
        self.assertIs(gesendet["rumpf"]["stream"], False)
        eintrag, = self.protokoll()
        self.assertEqual((eintrag["weg"], eintrag["ergebnis"], eintrag["modell_laut_antwort"]), ("router-openrouter", "ok", POLICY))
        self.assertEqual(eintrag["token"]["gesamt"], 100)
        self.assertEqual(eintrag["kosten_usd"], "0.0002")
        self.assertEqual(eintrag["anbieter_laut_antwort"], "DeepInfra")
        self.assertEqual(self.zustand.verbrauch(), {"aufrufe": 1, "betrag_usd": "0.0002", "token": 100})

    def test_openrouter_faellt_aus_weg_zwei_wird_protokolliert(self):
        for status in (503, 429):
            with self.subTest(status):
                self.setUp()
                router = self.router({WEG1: (status, {"error": "x"}),
                                      "ds/test-direkt": antwort("DeepSeek-V4.1-Flash-1017")})
                ergebnis = self.lauf(router)
                self.assertEqual(ergebnis["weg"], "router-deepseek-direkt")
                self.assertEqual(ergebnis["umleitung_nach"], ["router-openrouter"])
                erster, zweiter = self.protokoll()
                self.assertEqual((erster["weg"], erster["ergebnis"], erster["http_status"]), ("router-openrouter", "weg_gescheitert", status))
                self.assertEqual((zweiter["weg"], zweiter["ergebnis"], zweiter["umleitung_nach"]),
                                 ("router-deepseek-direkt", "ok", ["router-openrouter"]))
                self.assertIn("umleitung nach gescheitertem weg: router-openrouter", arbeiter.ausgabe_text(ergebnis))

    def test_fehler_im_rumpf_ohne_antwort_gilt_als_gescheiterter_weg(self):
        router = self.router({WEG1: (200, {"error": {"message": "x"}}), "ds/test-direkt": antwort()})
        self.assertEqual(self.lauf(router)["weg"], "router-deepseek-direkt")

    def test_ohne_eingetragenen_zweiten_weg_kein_rueckfall(self):
        self.konfig["wege"][1]["router_modellname"] = None
        router = self.router({WEG1: (503, {})})
        self.assertEqual(self.abbruch(router).grund, "alle_wege_gescheitert")
        self.assertEqual(len(router.anfragen), 1)

    def test_unklarer_ausgang_loest_keinen_zweiten_aufruf_aus(self):
        for status in (500, 502, 504, 307):
            with self.subTest(status):
                self.setUp()
                router = self.router({WEG1: (status, {}), "ds/test-direkt": antwort()})
                abbruch = self.abbruch(router)
                self.assertEqual((abbruch.grund, abbruch.exit_code), ("unklarer_ausgang", 6))
                self.assertEqual(len(router.anfragen), 1)
                # Die Reserve bleibt gebucht: ein unklarer Ausgang ist nicht kostenlos.
                self.assertGreater(self.zustand.verbrauch()["token"], 0)

    def test_abgelehnter_schluessel_bricht_ab(self):
        router = self.router({WEG1: (401, {}), "ds/test-direkt": antwort()})
        self.assertEqual(self.abbruch(router).grund, "schluessel_abgelehnt")
        self.assertEqual(len(router.anfragen), 1)


class Modellbindung(Basis):
    def test_anderes_modell_in_der_antwort_bricht_ab_ohne_rueckfall(self):
        for modell in ("deepseek/deepseek-v4.1-flash", "openrouter/deepseek-v4.1-flash", "deepseek-flash",
                       "deepseek/deepseek-v4.1-flash-1018", "deepseek/deepseek-v4-pro", "openai/gpt-x",
                       "deepseek/deepseek-v4.1-flash-1017:free", None, 7):
            with self.subTest(modell):
                self.setUp()
                router = self.router({WEG1: antwort(modell), "ds/test-direkt": antwort()})
                abbruch = self.abbruch(router)
                self.assertEqual((abbruch.grund, abbruch.exit_code), ("anderes_modell_in_antwort", 5))
                self.assertEqual(len(router.anfragen), 1)
                self.assertEqual(self.protokoll()[-1]["ergebnis"], "anderes_modell_in_antwort")

    def test_datierter_stand_mit_anbieterpraefix_wird_angenommen(self):
        for modell in (POLICY, "openrouter/" + POLICY, "DeepSeek-V4.1-Flash-1017"):
            with self.subTest(modell):
                self.setUp()
                self.assertEqual(self.lauf(self.router({WEG1: antwort(modell)}))["modell"], modell)

    def test_konfiguration_folgt_der_modellregel(self):
        policy = json.loads((ROOT / "config/llm-policy.json").read_text(encoding="utf-8"))
        konfig = json.loads((ROOT / "config/deepseek-delegation.json").read_text(encoding="utf-8"))
        self.assertEqual(konfig["modell"], {"id": policy["model"]["id"], "reasoning_effort": "high"})
        self.assertEqual(policy["provider_route_target_2026_11_10"]["provider_order"], ["OpenRouter", "DeepSeek_API"])
        self.assertEqual([w["id"] for w in konfig["wege"]], ["router-openrouter", "router-deepseek-direkt"])
        for aenderung in (lambda k: k["modell"].update(id="deepseek/deepseek-v4.1-flash"),
                          lambda k: k["modell"].update(reasoning_effort="medium"),
                          lambda k: k["wege"].reverse(),
                          lambda k: k["limits"].update(tageslimit_betrag_usd="5.01"),
                          lambda k: k["limits"].update(max_ausgabe_token=10 ** 6),
                          lambda k: k["router"].update(praefix="Token")):
            kopie = copy.deepcopy(konfig)
            aenderung(kopie)
            with self.assertRaises(arbeiter.Abbruch):
                arbeiter.pruefe_konfig(kopie, policy)

    def test_auslieferungszustand_deckel_und_zweiter_weg_aus(self):
        konfig = arbeiter.lade_konfig()
        self.assertIsNone(konfig["wege"][1]["router_modellname"])
        self.assertEqual(konfig["limits"]["tageslimit_betrag_usd"], "5.00")
        # Das Token-Limit greift vor dem Betrag: auch im teuersten Preisfenster unter einem US-Dollar am Tag.
        self.assertLessEqual(konfig["limits"]["tageslimit_token"] * 1.20 / 1_000_000, 1.0)
        self.assertEqual(konfig["limits"]["versuche_je_weg"], 1)
        self.assertEqual(konfig["router"]["erlaubte_hosts"], ["ai-router.nexifyai.cloud"])


class Limits(Basis):
    def test_tageslimit_token_bricht_vor_dem_aufruf_ab(self):
        self.konfig["limits"]["tageslimit_token"] = 4400
        router = self.router({WEG1: antwort()})
        self.lauf(router)  # bucht 100 Token
        self.konfig["limits"]["tageslimit_token"] = 4200
        abbruch = self.abbruch(router)
        self.assertEqual((abbruch.grund, abbruch.exit_code), ("tageslimit_token_erreicht", 4))
        self.assertEqual(len(router.anfragen), 1)

    def test_tageslimit_aufrufe_und_betrag(self):
        router = self.router({WEG1: antwort()})
        self.konfig["limits"]["tageslimit_aufrufe"] = 1
        self.lauf(router)
        self.assertEqual(self.abbruch(router).grund, "tageslimit_aufrufe_erreicht")
        self.konfig["limits"].update(tageslimit_aufrufe=40, tageslimit_betrag_usd="0.0002")
        self.assertEqual(self.abbruch(router).grund, "tageslimit_betrag_erreicht")
        self.assertEqual(len(router.anfragen), 1)

    def test_auftragslimit_und_groesse(self):
        router = self.router({WEG1: antwort()})
        self.konfig["limits"]["max_auftrag_token"] = 4000
        self.assertEqual(self.abbruch(router).grund, "auftragslimit_token_ueberschritten")
        self.konfig["limits"]["max_auftrag_bytes"] = 20
        self.assertEqual(self.abbruch(router).grund, "auftrag_zu_gross")
        self.assertEqual(router.anfragen, [])

    def test_fehlende_verbrauchsmeldung_laesst_die_reserve_stehen(self):
        router = self.router({WEG1: antwort(usage=False)})
        self.lauf(router)
        self.assertGreaterEqual(self.zustand.verbrauch()["token"], 4000)

    def test_unlesbarer_verbrauchsstand_ist_kein_nullstand(self):
        self.zustand._tagesdatei().write_text("kaputt", encoding="utf-8")
        router = self.router({WEG1: antwort()})
        self.assertEqual(self.abbruch(router).grund, "verbrauchsstand_unlesbar")
        self.assertEqual(router.anfragen, [])


class Eingangsfilter(Basis):
    def kopf(self, inhalt, datenklasse="oeffentlich", art="entwurf"):
        return f"---\naufgabe: probe\ndatenklasse: {datenklasse}\nart: {art}\n---\n{inhalt}\n"

    def test_geheimnis_im_auftrag_wird_abgewiesen(self):
        router = self.router({})
        faelle = ("Nutze sk-" + "a" * 24, "ROUTER_KEY=" + "b" * 20, "passwort: " + "geheim1234",
                  "Authorization: Bearer " + "c" * 30, "-----BEGIN PRIVATE KEY-----", "https://nutzer:" + "pw123456" + "@host.example/")
        for inhalt in faelle:
            with self.subTest(inhalt[:12]):
                abbruch = self.abbruch(router, self.kopf(inhalt))
                self.assertEqual((abbruch.grund, abbruch.exit_code), ("geheimnis_im_auftrag", 2))
                self.assertNotIn(inhalt.split()[-1], abbruch.hinweis)
        self.assertEqual(router.anfragen, [])
        self.assertEqual(self.protokoll(), [])

    def test_platzhalter_sind_kein_geheimnis(self):
        arbeiter.pruefe_eingang("api_key: ${ROUTER_KEY}\nToken: <hier eintragen>\nDer Schlüssel liegt im Geheimnisspeicher.")

    def test_kundendaten_und_personenbezug_werden_abgewiesen(self):
        router = self.router({})
        for inhalt, grund in (("[KUNDENDATEN] Liste", "kundendaten_im_auftrag"), ("Tag kunde:stk prüfen", "kundendaten_im_auftrag"),
                              ("Streng vertraulich: Angebot", "kundendaten_im_auftrag"), ("Vertragsinhalt Abschnitt 3", "kundendaten_im_auftrag"),
                              ("Schreibe an max.mustermann@firma.de", "personenbezug_im_auftrag"),
                              ("IBAN DE89 3704 0044 0532 0130 00", "personenbezug_im_auftrag"),
                              ("Ruf +49 221 1234567 an", "personenbezug_im_auftrag")):
            with self.subTest(inhalt):
                self.assertEqual(self.abbruch(router, self.kopf(inhalt)).grund, grund)
        arbeiter.pruefe_eingang("Beispieladresse kontakt@example.com ist erlaubt.")
        self.assertEqual(router.anfragen, [])

    def test_datenklasse_art_und_kopf_sind_pflicht(self):
        router = self.router({})
        self.assertEqual(self.abbruch(router, self.kopf("x", datenklasse="kundendaten")).grund, "datenklasse_nicht_delegierbar")
        self.assertEqual(self.abbruch(router, self.kopf("x", datenklasse="personenbezogen")).grund, "datenklasse_nicht_delegierbar")
        self.assertEqual(self.abbruch(router, self.kopf("x", art="vertrag")).grund, "art_nicht_delegierbar")
        self.assertEqual(self.abbruch(router, "Nur Text ohne Kopf").grund, "auftrag_ohne_kopf")
        self.assertEqual(router.anfragen, [])

    def test_rechts_und_preistexte_tragen_den_entwurfsvermerk(self):
        router = self.router({WEG1: antwort()})
        text = arbeiter.ausgabe_text(self.lauf(router, self.kopf("Entwirf einen Hinweistext.", art="rechtstext-entwurf")))
        self.assertIn("ENTWURF", text)
        self.assertIn("Ungeprüfte Ausgabe", text)


class Einrichtung(Basis):
    def test_ohne_schluessel_nicht_eingerichtet(self):
        router = self.router({})
        for umgebung, fehlt in (({}, ["DEEPSEEK_ARBEITER=ein", "ROUTER_URL", "ROUTER_KEY"]),
                                ({"DEEPSEEK_ARBEITER": "ein", "ROUTER_URL": router.url}, ["ROUTER_KEY"]),
                                ({"ROUTER_URL": router.url, "ROUTER_KEY": SCHLUESSEL}, ["DEEPSEEK_ARBEITER=ein"]),
                                ({"DEEPSEEK_ARBEITER": "1", "ROUTER_URL": router.url, "ROUTER_KEY": SCHLUESSEL}, ["DEEPSEEK_ARBEITER=ein"])):
            with self.assertRaises(arbeiter.Abbruch) as gefangen:
                arbeiter.ausfuehren(AUFTRAG, konfig=self.konfig, environ=umgebung, zustand=self.zustand)
            self.assertEqual((gefangen.exception.grund, gefangen.exception.exit_code), ("nicht_eingerichtet", 3))
            self.assertEqual(gefangen.exception.hinweis, "fehlt: " + ", ".join(fehlt))
        self.assertEqual(router.anfragen, [])

    def test_befehl_ohne_umgebung_meldet_nicht_eingerichtet_und_schreibt_nichts(self):
        with tempfile.TemporaryDirectory() as ordner:
            auftrag, ziel = Path(ordner) / "a.md", Path(ordner) / "e.md"
            auftrag.write_text(AUFTRAG, encoding="utf-8")
            fehler = io.StringIO()
            with redirect_stderr(fehler), redirect_stdout(io.StringIO()):
                code = arbeiter.main(["--aufgabe", str(auftrag), "--ausgabe", str(ziel)], environ={})
            self.assertEqual(code, 3)
            self.assertEqual(json.loads(fehler.getvalue())["ergebnis"], "nicht_eingerichtet")
            self.assertFalse(ziel.exists())
            aus = io.StringIO()
            with redirect_stdout(aus):
                self.assertEqual(arbeiter.main(["--status"], environ={}), 0)
            self.assertIs(json.loads(aus.getvalue())["eingerichtet"], False)

    def test_schluessel_geht_nur_an_eingetragene_hosts_und_nie_ins_protokoll(self):
        router = self.router({WEG1: antwort()})
        for adresse in ("https://fremd.example/v1", "http://ai-router.nexifyai.cloud/v1", router.url + "/andere/route",
                        f"http://nutzer:pw@127.0.0.1:{router.server.server_address[1]}/v1"):
            with self.subTest(adresse.split("@")[-1]):
                with self.assertRaises(arbeiter.Abbruch) as gefangen:
                    arbeiter.ausfuehren(AUFTRAG, konfig=self.konfig | {"router": {**self.konfig["router"], "erlaubte_hosts": ["127.0.0.1", "ai-router.nexifyai.cloud"]}},
                                        environ={"DEEPSEEK_ARBEITER": "ein", "ROUTER_URL": adresse, "ROUTER_KEY": SCHLUESSEL}, zustand=self.zustand)
                self.assertEqual(gefangen.exception.exit_code, 3)
        self.assertEqual(router.anfragen, [])
        self.lauf(router)
        # Der Wert der Variable geht unverändert in die Kopfzeile; ein Platzhalter genügt, wenn der Proxy ihn ersetzt.
        self.assertEqual(router.anfragen[-1]["auth"], "Bearer " + SCHLUESSEL)
        roh = (Path(self.ordner.name) / "protokoll.jsonl").read_text(encoding="utf-8")
        self.assertNotIn(SCHLUESSEL, roh)
        self.assertNotIn("Himmel", roh)
        self.assertEqual(arbeiter.endpunkt("https://ai-router.nexifyai.cloud", arbeiter.lade_konfig()),
                         "https://ai-router.nexifyai.cloud/v1/chat/completions")

    def test_befehl_schreibt_ergebnis_und_ueberschreibt_nichts(self):
        router = self.router({WEG1: antwort()})
        original = arbeiter.lade_konfig
        arbeiter.lade_konfig = lambda: self.konfig
        self.addCleanup(setattr, arbeiter, "lade_konfig", original)
        with tempfile.TemporaryDirectory() as ordner:
            auftrag, ziel = Path(ordner) / "a.md", Path(ordner) / "e.md"
            auftrag.write_text(AUFTRAG, encoding="utf-8")
            umgebung = {**self.umgebung(router), "DEEPSEEK_ARBEITER_ZUSTAND": str(Path(ordner) / "zustand")}
            aus = io.StringIO()
            with redirect_stdout(aus):
                self.assertEqual(arbeiter.main(["--aufgabe", str(auftrag), "--ausgabe", str(ziel)], environ=umgebung), 0)
            self.assertEqual(json.loads(aus.getvalue())["weg"], "router-openrouter")
            self.assertIn("Der Himmel ist blau.", ziel.read_text(encoding="utf-8"))
            with redirect_stderr(io.StringIO()):
                self.assertEqual(arbeiter.main(["--aufgabe", str(auftrag), "--ausgabe", str(ziel)], environ=umgebung), 2)
            self.assertEqual(len(router.anfragen), 1)


class Haertung(Basis):
    def test_troepfelnde_antwort_wird_am_gesamtzeitlimit_abgebrochen(self):
        import socket, time
        horcher = socket.socket()
        horcher.bind(("127.0.0.1", 0))
        horcher.listen(1)
        self.addCleanup(horcher.close)

        def bedienen():
            verbindung, _ = horcher.accept()
            verbindung.recv(65536)
            verbindung.sendall(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 4000\r\n\r\n")
            try:
                for _ in range(40):
                    verbindung.sendall(b" ")
                    time.sleep(0.25)
            except OSError:
                pass
            verbindung.close()

        threading.Thread(target=bedienen, daemon=True).start()
        beginn = time.monotonic()
        ergebnis = arbeiter.sende(f"http://127.0.0.1:{horcher.getsockname()[1]}/v1/chat/completions", SCHLUESSEL, {}, 1, 10000)
        self.assertEqual(ergebnis[0], "unklar")
        self.assertLess(time.monotonic() - beginn, 3)

    def test_waehrend_des_aufrufs_entstandene_zieldatei_bleibt_unberuehrt(self):
        original, senden = arbeiter.lade_konfig, arbeiter.sende
        arbeiter.lade_konfig = lambda: self.konfig
        self.addCleanup(setattr, arbeiter, "lade_konfig", original)
        self.addCleanup(setattr, arbeiter, "sende", senden)
        with tempfile.TemporaryDirectory() as ordner:
            auftrag, ziel = Path(ordner) / "a.md", Path(ordner) / "e.md"
            auftrag.write_text(AUFTRAG, encoding="utf-8")

            def sende_und_stoere(*args):
                ziel.write_text("fremde Arbeit", encoding="utf-8")
                return "antwort", 200, antwort()[1]

            arbeiter.sende = sende_und_stoere
            umgebung = {"DEEPSEEK_ARBEITER": "ein", "ROUTER_URL": "http://127.0.0.1:9/v1", "ROUTER_KEY": SCHLUESSEL,
                        "DEEPSEEK_ARBEITER_ZUSTAND": str(Path(ordner) / "zustand")}
            aus = io.StringIO()
            with redirect_stdout(aus):
                self.assertEqual(arbeiter.main(["--aufgabe", str(auftrag), "--ausgabe", str(ziel)], environ=umgebung), 0)
            self.assertEqual(ziel.read_text(encoding="utf-8"), "fremde Arbeit")
            bericht = json.loads(aus.getvalue())
            self.assertNotEqual(bericht["ausgabe"], str(ziel))
            self.assertIn("Der Himmel ist blau.", Path(bericht["ausgabe"]).read_text(encoding="utf-8"))
            self.assertTrue(bericht["hinweis"])


if __name__ == "__main__":
    unittest.main()
