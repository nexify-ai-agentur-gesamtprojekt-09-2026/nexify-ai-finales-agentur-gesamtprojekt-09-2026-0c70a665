"""Cognee-Adapter: geprüft gegen eine Attrappe, ohne Netz und ohne Schlüssel.

Belegt das Verhalten des Adapters, nicht den Zustand der Instanz.
"""
import copy
import importlib.util
import json
import socket
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ops/cognee"))
import cognee_client as cc  # noqa: E402
import aufnahme  # noqa: E402

BASE = "https://brain.nexifyai.cloud"
DATASET = "nexify-agentur--betrieb"


class Attrappe:
    """Zeichnet Aufrufe auf und antwortet aus einer Liste."""

    def __init__(self, *answers):
        self.answers = list(answers) or [(200, b"{}")]
        self.calls = []

    def __call__(self, method, url, headers, body, timeout):
        self.calls.append({"method": method, "url": url, "headers": dict(headers), "body": body})
        answer = self.answers.pop(0) if len(self.answers) > 1 else self.answers[0]
        if isinstance(answer, Exception):
            raise answer
        return answer


def env(**extra):
    base = {"COGNEE_ENABLED": "1", "COGNEE_INGEST_ENABLED": "1", "COGNEE_BASE_URL": BASE,
            "COGNEE_TENANT": "nexify-agentur", "COGNEE_API_KEY": "attrappe"}
    base.update(extra)
    return {k: v for k, v in base.items() if v is not None}


def freigegeben(*keys):
    config = copy.deepcopy(cc.load_config())
    for key in keys:
        config["freigaben"][key] = True
    return config


def client(environment, transport, *keys, config=None):
    return cc.CogneeClient(environment, config=config or freigegeben(*keys), transport=transport,
                           sleep=lambda _s: None)


def geheimnis():
    """Zur Laufzeit zusammengesetzt, damit die Testdatei selbst kein Muster trägt."""
    return "gh" + "p_" + "Ab3" * 12


class KonfigurationTest(unittest.TestCase):
    def test_alle_freigaben_stehen_auf_null(self):
        config = cc.load_config()
        self.assertEqual(config["status"], "gebaut_hinter_schalter_standardmaessig_aus")
        self.assertTrue(config["freigaben"])
        for key, value in config["freigaben"].items():
            self.assertIsNone(value, key)
        self.assertIsNone(config["modelle"]["inhaberentscheidung_llm"])
        self.assertIsNone(config["modelle"]["inhaberentscheidung_embedding"])

    def test_modellvorgabe_entspricht_der_projektregel(self):
        policy = json.loads((ROOT / "config/llm-policy.json").read_text(encoding="utf-8"))
        vorgabe = cc.load_config()["modelle"]["projektvorgabe"]
        self.assertEqual(vorgabe["id"], policy["model"]["id"])
        self.assertEqual(vorgabe["reasoning"], policy["model"]["reasoning_effort"])

    def test_nur_agenturmandant_und_praefix_je_datensatz(self):
        config = cc.load_config()
        self.assertEqual(list(config["mandanten"]), ["nexify-agentur"])
        self.assertFalse(config["kundenmandanten"]["in_diesem_repository_erlaubt"])
        tenant = config["mandanten"]["nexify-agentur"]
        targets = {rule["datensatz"] for rule in config["quellen"]["aufnehmen"]}
        self.assertTrue(targets <= set(tenant["datensaetze"]))
        for name in tenant["datensaetze"]:
            self.assertTrue(name.startswith(tenant["datensatz_praefix"]))
            self.assertRegex(name, cc.DATASET_NAME)

    def test_konfiguration_und_adapter_ohne_geheimniswert(self):
        for relative in ("config/integrations/cognee.json", "ops/cognee/cognee_client.py",
                         "ops/cognee/aufnahme.py", "ops/cognee/.env.example", "ops/cognee/README.md",
                         "docs/04-betrieb/cognee-integration-2026-11-14.md"):
            self.assertEqual(cc.find_secrets((ROOT / relative).read_text(encoding="utf-8")), [], relative)

    def test_env_beispiel_nennt_nur_namen(self):
        for line in (ROOT / "ops/cognee/.env.example").read_text(encoding="utf-8").splitlines():
            if line and not line.startswith("#"):
                self.assertRegex(line, r"^COGNEE_[A-Z_]+=$")


class SchalterTest(unittest.TestCase):
    def test_ohne_variablen_kein_netzaufruf(self):
        transport = Attrappe()
        c = client({}, transport, "aufnahme_agenturwissen", "modell_und_embedding_bestaetigt",
                   "graph_bauen_mit_kostenrahmen")
        for call in (c.health, c.list_datasets, lambda: c.search("frage", [DATASET]),
                     lambda: c.add_document(DATASET, "docs/04-betrieb/x.md", b"text"),
                     lambda: c.cognify([DATASET])):
            with self.assertRaises(cc.Abbruch) as stop:
                call()
            self.assertEqual(stop.exception.status, "aus")
        self.assertEqual(transport.calls, [])
        self.assertEqual(c.calls, 0)

    def test_schalter_nur_bei_exakt_eins(self):
        for value in ("", "0", "true", "yes", "on", " 1", "1 "):
            transport = Attrappe()
            with self.assertRaises(cc.Abbruch):
                client(env(COGNEE_ENABLED=value), transport).health()
            self.assertEqual(transport.calls, [], value)

    def test_ohne_schalter_oeffnet_auch_der_echte_transport_keine_verbindung(self):
        original = socket.socket

        def verboten(*_a, **_k):
            raise AssertionError("Netzaufruf trotz ausgeschaltetem Adapter")

        socket.socket = verboten
        try:
            result = aufnahme.send(ROOT, {}, config=freigegeben("aufnahme_agenturwissen"))
            with self.assertRaises(cc.Abbruch):
                cc.CogneeClient({}, config=cc.load_config()).health()
        finally:
            socket.socket = original
        self.assertEqual(result, {"status": "aus", "gesendet": False,
                                  "grund": "COGNEE_ENABLED und COGNEE_INGEST_ENABLED müssen beide 1 sein"})

    def test_aufnahme_braucht_zweiten_schalter_und_freigabe(self):
        transport = Attrappe()
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(COGNEE_INGEST_ENABLED=None), transport, "aufnahme_agenturwissen") \
                .add_document(DATASET, "docs/04-betrieb/x.md", b"text")
        self.assertEqual(stop.exception.status, "aus")
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(), transport).add_document(DATASET, "docs/04-betrieb/x.md", b"text")
        self.assertEqual(stop.exception.status, "freigabe_fehlt")
        self.assertEqual(transport.calls, [])

    def test_graphbau_braucht_dritten_schalter_und_zwei_freigaben(self):
        transport = Attrappe()
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(), transport, "modell_und_embedding_bestaetigt", "graph_bauen_mit_kostenrahmen") \
                .cognify([DATASET])
        self.assertEqual(stop.exception.status, "aus")
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(COGNEE_COGNIFY_ENABLED="1"), transport, "graph_bauen_mit_kostenrahmen").cognify([DATASET])
        self.assertEqual(stop.exception.status, "freigabe_fehlt")
        self.assertEqual(transport.calls, [])

    def test_suche_mit_modell_braucht_modellfreigabe(self):
        transport = Attrappe()
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(), transport).search("frage", [DATASET], search_type="GRAPH_COMPLETION")
        self.assertEqual(stop.exception.status, "freigabe_fehlt")
        self.assertEqual(transport.calls, [])


class AdresseUndSchluesselTest(unittest.TestCase):
    def test_fremde_oder_unsichere_adresse_wird_abgelehnt(self):
        for url in ("http://brain.nexifyai.cloud", "https://brain.nexifyai.cloud.example.org",
                    "https://example.org", "https://nutzer:wort@brain.nexifyai.cloud",
                    "https://brain.nexifyai.cloud:8443", "https://brain.nexifyai.cloud/mcp",
                    "http://179.198.195.91:33019", "https://brain.nexifyai.cloud?x=1"):
            transport = Attrappe()
            with self.assertRaises(cc.Abbruch) as stop:
                client(env(COGNEE_BASE_URL=url), transport).health()
            self.assertEqual(stop.exception.status, "adresse_abgelehnt", url)
            self.assertEqual(transport.calls, [], url)

    def test_fehlende_adresse_oder_schluessel(self):
        for extra in ({"COGNEE_BASE_URL": None}, {"COGNEE_API_KEY": None}, {"COGNEE_API_KEY": "a\nb"},
                      {"COGNEE_AUTH_MODE": "basic"}, {"COGNEE_TENANT": None}):
            transport = Attrappe()
            with self.assertRaises(cc.Abbruch) as stop:
                client(env(**extra), transport).list_datasets()
            self.assertEqual(stop.exception.status, "konfiguration_fehlt", extra)
            self.assertEqual(transport.calls, [])

    def test_schluessel_nur_im_kopf_und_nie_in_meldungen(self):
        key = "attrappe-" + "x" * 20
        transport = Attrappe((401, b"nein"))
        result = client(env(COGNEE_API_KEY=key), transport).list_datasets()
        self.assertEqual(result["status"], "anmeldung_abgelehnt")
        self.assertEqual(transport.calls[0]["headers"]["X-Api-Key"], key)
        self.assertNotIn(key, transport.calls[0]["url"])
        self.assertNotIn(key, json.dumps(result))
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(COGNEE_API_KEY=key, COGNEE_TENANT="fremd"), transport).list_datasets()
        self.assertNotIn(key, stop.exception.grund)

    def test_proxy_modus_sendet_keinen_schluessel(self):
        transport = Attrappe((200, b"[]"))
        result = client(env(COGNEE_AUTH_MODE="proxy", COGNEE_API_KEY=None), transport).list_datasets()
        self.assertEqual(result["status"], "ok")
        self.assertNotIn("X-Api-Key", transport.calls[0]["headers"])
        self.assertNotIn("Authorization", transport.calls[0]["headers"])


class MandantTest(unittest.TestCase):
    def test_falscher_mandant_bricht_ab(self):
        for tenant in ("kunde-test", "nexify", "NEXIFY-AGENTUR", "nexify-agentur-2", "*"):
            transport = Attrappe()
            c = client(env(COGNEE_TENANT=tenant), transport, "aufnahme_agenturwissen")
            for call in (c.list_datasets, lambda: c.search("frage", [DATASET]),
                         lambda: c.add_document(DATASET, "docs/04-betrieb/x.md", b"text")):
                with self.assertRaises(cc.Abbruch) as stop:
                    call()
                self.assertIn(stop.exception.status, ("mandant_abgelehnt", "konfiguration_fehlt"), tenant)
            self.assertEqual(transport.calls, [], tenant)

    def test_fremder_datensatz_bricht_ab(self):
        for dataset in ("kunde-test--akten", "nexify-agentur--unbekannt", "nexify-agentur", "betrieb",
                        "nexify-agentur--betrieb/../x", "", "main_dataset"):
            transport = Attrappe()
            c = client(env(COGNEE_COGNIFY_ENABLED="1"), transport, "aufnahme_agenturwissen",
                       "modell_und_embedding_bestaetigt", "graph_bauen_mit_kostenrahmen")
            for call in (lambda: c.add_document(dataset, "docs/04-betrieb/x.md", b"text"),
                         lambda: c.search("frage", [DATASET, dataset]),
                         lambda: c.cognify([dataset])):
                with self.assertRaises(cc.Abbruch) as stop:
                    call()
                self.assertEqual(stop.exception.status, "mandant_abgelehnt", dataset)
            self.assertEqual(transport.calls, [], dataset)

    def test_suche_ohne_datensatz_bricht_ab(self):
        transport = Attrappe()
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(), transport).search("frage", [])
        self.assertEqual(stop.exception.status, "mandant_abgelehnt")
        self.assertEqual(transport.calls, [])


class AufnahmegutTest(unittest.TestCase):
    def test_geheimnis_muster_bricht_ab_ohne_den_wert_zu_nennen(self):
        secret = geheimnis()
        transport = Attrappe()
        c = client(env(), transport, "aufnahme_agenturwissen")
        with self.assertRaises(cc.Abbruch) as stop:
            c.add_document(DATASET, "docs/04-betrieb/x.md", f"Zeile\nToken: {secret}\n".encode())
        self.assertEqual(stop.exception.status, "geheimnis_gefunden")
        self.assertNotIn(secret, stop.exception.grund)
        with self.assertRaises(cc.Abbruch) as stop:
            c.search(f"wo steht {secret}", [DATASET])
        self.assertEqual(stop.exception.status, "geheimnis_gefunden")
        self.assertEqual(transport.calls, [])

    def test_gesperrte_pfade_binaer_leer_und_zu_gross(self):
        transport = Attrappe()
        c = client(env(), transport, "aufnahme_agenturwissen")
        limit = c.config["grenzen"]["max_bytes_je_datei"]
        for path, content in ((".env", b"A=1"), ("apps/web/.env.local", b"A=1"), ("evidence/x/y.json", b"{}"),
                              ("reference/handoff-n2/a.md", b"a"), ("apps/shop-api/shop/x.py", b"a"),
                              ("docs/04-betrieb/x.md", b""), ("docs/04-betrieb/x.md", b"\xff\xfe\x00"),
                              ("docs/04-betrieb/x.md", b"a" * (limit + 1))):
            with self.assertRaises(cc.Abbruch) as stop:
                c.add_document(DATASET, path, content)
            self.assertEqual(stop.exception.status, "quelle_abgelehnt", path)
        self.assertEqual(transport.calls, [])

    def test_aufnahme_sendet_einmal_mit_stabilem_namen(self):
        transport = Attrappe((200, b'{"status":"ok"}'))
        c = client(env(), transport, "aufnahme_agenturwissen")
        first = c.add_document(DATASET, "docs/04-betrieb/x.md", b"Inhalt A")
        second = c.add_document(DATASET, "docs/04-betrieb/x.md", b"Inhalt A")
        third = c.add_document(DATASET, "docs/04-betrieb/x.md", b"Inhalt B")
        self.assertEqual(first["status"], "ok")
        self.assertEqual(first["dokument"], second["dokument"])
        self.assertNotEqual(first["dokument"], third["dokument"])
        self.assertRegex(first["dokument"], r"^docs_04-betrieb_x@[0-9a-f]{12}\.md$")
        call = transport.calls[0]
        self.assertEqual((call["method"], call["url"]), ("POST", BASE + "/api/v1/add"))
        self.assertIn(b'name="datasetName"\r\n\r\n' + DATASET.encode(), call["body"])
        self.assertIn(b'filename="' + first["dokument"].encode() + b'"', call["body"])
        self.assertIn(b"Inhalt A", call["body"])


class FehlerbildTest(unittest.TestCase):
    def test_lesen_wird_begrenzt_wiederholt(self):
        transport = Attrappe((503, b""), cc.TransportError("TimeoutError"), (200, b"[]"))
        result = client(env(), transport).list_datasets()
        self.assertEqual((result["status"], result["versuche"]), ("ok", 3))
        transport = Attrappe((503, b""))
        result = client(env(), transport).health()
        self.assertEqual((result["status"], result["versuche"], len(transport.calls)), ("nicht_erreichbar", 3, 3))
        self.assertFalse(result["ergebnis_unbekannt"])

    def test_schreiben_wird_nie_wiederholt(self):
        for answer in ((503, b""), cc.TransportError("TimeoutError")):
            transport = Attrappe(answer)
            c = client(env(COGNEE_COGNIFY_ENABLED="1"), transport, "aufnahme_agenturwissen",
                       "modell_und_embedding_bestaetigt", "graph_bauen_mit_kostenrahmen")
            result = c.add_document(DATASET, "docs/04-betrieb/x.md", b"text")
            self.assertEqual((result["status"], result["ergebnis_unbekannt"]), ("nicht_erreichbar", True))
            self.assertEqual(c.cognify([DATASET])["status"], "nicht_erreichbar")
            self.assertEqual(len(transport.calls), 2)

    def test_statuscodes_werden_benannt_und_nicht_wiederholt(self):
        for code, name in ((401, "anmeldung_abgelehnt"), (403, "recht_fehlt"), (404, "nicht_gefunden"),
                           (409, "konflikt"), (422, "eingabe_abgelehnt"), (500, "fehler")):
            transport = Attrappe((code, b"x"))
            result = client(env(), transport).search("frage", [DATASET])
            self.assertEqual((result["status"], len(transport.calls)), (name, 1))

    def test_heutiger_zustand_der_instanz_als_fehlerbild(self):
        """Am 14.11.2026 antworten alle API-Pfade mit 404 als Text."""
        transport = Attrappe((404, b"404 page not found\n"))
        self.assertEqual(client(env(), transport).health()["status"], "nicht_gefunden")

    def test_unlesbare_antwort(self):
        transport = Attrappe((200, b"<html>"))
        self.assertEqual(client(env(), transport).list_datasets()["status"], "antwort_unlesbar")

    def test_suche_sendet_nur_eigene_datensaetze(self):
        transport = Attrappe((200, b"[]"))
        client(env(), transport).search("Was gilt für Server?", [DATASET], top_k=3)
        body = json.loads(transport.calls[0]["body"])
        self.assertEqual(body, {"searchType": "CHUNKS", "query": "Was gilt für Server?",
                                "datasets": [DATASET], "topK": 3})


class AufnahmeWerkzeugTest(unittest.TestCase):
    def baum(self, files):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        root = Path(folder.name)
        for relative, content in files.items():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        return root

    def test_plan_des_repositorys_ohne_netz_und_fund_sperrt(self):
        """Der Plan des echten Repositorys: Dateien mit Fund stehen nie unter den Sendedateien."""
        plan = aufnahme.build_plan(ROOT, cc.load_config())
        self.assertIn(plan["status"], ("plan", "geheimnis_gefunden"))
        self.assertEqual(plan["status"] == "geheimnis_gefunden", bool(plan["geheimnis_funde"]))
        paths = {item["pfad"] for item in plan["dateien"]}
        blocked = {item["pfad"] for item in plan["geheimnis_funde"]}
        self.assertFalse(paths & blocked)
        self.assertIn("DECISIONS.md", paths | blocked)
        self.assertIn("config/loesungsregister.json", paths)
        self.assertFalse([p for p in paths | blocked if p.startswith(("evidence/", "reference/", "apps/"))])
        for item in plan["geheimnis_funde"]:
            for hit in item["funde"]:
                self.assertRegex(hit, r"^Zeile \d+: [^:]+ \(\d+ Zeichen\)$")
        if blocked:
            transport = Attrappe()
            result = aufnahme.send(ROOT, env(), config=freigegeben("aufnahme_agenturwissen"), transport=transport)
            self.assertEqual((result["status"], result["gesendet"]), ("geheimnis_gefunden", False))
            self.assertEqual(transport.calls, [])

    def test_geheimnis_in_einer_datei_stoppt_den_ganzen_lauf(self):
        secret = geheimnis()
        root = self.baum({"DECISIONS.md": "D-001 gilt.", "PROGRESS.md": f"Stand\nSchlüssel {secret}\n"})
        transport = Attrappe()
        result = aufnahme.send(root, env(), config=freigegeben("aufnahme_agenturwissen"), transport=transport)
        self.assertEqual(result["status"], "geheimnis_gefunden")
        self.assertFalse(result["gesendet"])
        self.assertEqual([f["pfad"] for f in result["geheimnis_funde"]], ["PROGRESS.md"])
        self.assertNotIn(secret, json.dumps(result))
        self.assertEqual(transport.calls, [])

    def test_senden_ordnet_datensaetze_zu_und_meldet_ohne_inhalt(self):
        root = self.baum({"DECISIONS.md": "D-001 gilt.", "docs/04-betrieb/a.md": "Betrieb.",
                          "docs/04-betrieb/b.txt": "nicht in der Liste", ".env": "A=1"})
        transport = Attrappe((200, b'{"inhalt":"D-001 gilt."}'))
        result = aufnahme.send(root, env(), config=freigegeben("aufnahme_agenturwissen"), transport=transport)
        self.assertEqual(result["status"], "ok")
        self.assertEqual({r["pfad"]: r["datensatz"] for r in result["ergebnisse"]},
                         {"DECISIONS.md": "nexify-agentur--entscheidungen",
                          "docs/04-betrieb/a.md": "nexify-agentur--betrieb"})
        self.assertEqual(len(transport.calls), 2)
        self.assertNotIn("D-001 gilt.", json.dumps(result))

    def test_fehler_stoppt_den_lauf_nach_der_ersten_datei(self):
        root = self.baum({"DECISIONS.md": "a", "PROGRESS.md": "b", "AGENTS.md": "c"})
        transport = Attrappe((401, b""))
        result = aufnahme.send(root, env(), config=freigegeben("aufnahme_agenturwissen"), transport=transport)
        self.assertEqual((result["status"], len(transport.calls)), ("abgebrochen", 1))

    def test_ohne_freigabe_sendet_das_werkzeug_nichts(self):
        root = self.baum({"DECISIONS.md": "a"})
        transport = Attrappe()
        result = aufnahme.send(root, env(), config=cc.load_config(), transport=transport)
        self.assertEqual((result["status"], result["gesendet"]), ("freigabe_fehlt", False))
        self.assertEqual(transport.calls, [])

    def test_zu_viele_dateien(self):
        config = freigegeben("aufnahme_agenturwissen")
        config["grenzen"]["max_dateien_je_lauf"] = 1
        root = self.baum({"DECISIONS.md": "a", "PROGRESS.md": "b"})
        transport = Attrappe()
        result = aufnahme.send(root, env(), config=config, transport=transport)
        self.assertEqual(result["status"], "zu_viele_dateien")
        self.assertEqual(transport.calls, [])

    def test_aufruf_ohne_variablen_meldet_aus(self):
        spec = importlib.util.spec_from_file_location("aufnahme_cli", ROOT / "ops/cognee/aufnahme.py")
        self.assertIsNotNone(spec)
        self.assertEqual(aufnahme.send(ROOT, {})["status"], "aus")


if __name__ == "__main__":
    unittest.main()
