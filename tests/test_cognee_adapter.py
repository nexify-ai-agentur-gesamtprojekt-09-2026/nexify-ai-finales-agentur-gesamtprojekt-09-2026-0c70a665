"""Cognee-Adapter: geprüft gegen eine Attrappe, ohne Netz nach außen und ohne Schlüssel.

Belegt das Verhalten des Adapters, nicht den Zustand der Instanz. Der echte Transport wird
nur gegen einen Dienst auf der lokalen Schleife geprüft.
"""
import contextlib
import copy
import http.server
import io
import json
import os
import socket
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ops/cognee"))
import cognee_client as cc  # noqa: E402
import geheimnis_filter as gf  # noqa: E402
import aufnahme  # noqa: E402

BASE = "https://brain.nexifyai.cloud"
DATASET = "nexify-agentur--betrieb"
DATASET_ID = "11111111-2222-3333-4444-555555555555"
PFAD = "docs/04-betrieb/x.md"


class Attrappe:
    """Zeichnet Aufrufe auf und antwortet aus einer Liste."""

    def __init__(self, *answers):
        self.answers = list(answers) or [(200, b"{}")]
        self.calls = []

    def __call__(self, method, url, headers, body, timeout):
        self.calls.append({"method": method, "url": url, "headers": dict(headers), "body": body,
                           "timeout": timeout})
        answer = self.answers.pop(0) if len(self.answers) > 1 else self.answers[0]
        if isinstance(answer, Exception):
            raise answer
        return answer


def env(role="aufnahme", **extra):
    base = {"COGNEE_ENABLED": "1", "COGNEE_INGEST_ENABLED": "1", "COGNEE_COGNIFY_ENABLED": "1",
            "COGNEE_BASE_URL": BASE, "COGNEE_TENANT": "nexify-agentur", "COGNEE_ROLE": role,
            "COGNEE_API_KEY": "attrappe"}
    base.update(extra)
    return {k: v for k, v in base.items() if v is not None}


def konfiguration(*, ohne=(), ids=True):
    """Alle Freigaben gesetzt außer ``ohne``; Datensatz-Kennungen eingetragen."""
    config = copy.deepcopy(cc.load_config())
    for key in config["freigaben"]:
        config["freigaben"][key] = key not in ohne
    if ids:
        for number, entry in enumerate(config["mandanten"]["nexify-agentur"]["datensaetze"].values()):
            entry["id"] = DATASET_ID[:-1] + str(number)
    return config


def client(environment, transport, *, config=None, sleep=None):
    return cc.CogneeClient(environment, config=config if config is not None else konfiguration(),
                           transport=transport, sleep=sleep or (lambda _s: None))


def wirkungen(c):
    """Je Wirkung ein Aufruf mit gültigen Eingaben."""
    return {
        "zustand": c.health,
        "datensaetze": c.list_datasets,
        "suchen": lambda: c.search("frage", [DATASET]),
        "antwortsuche": lambda: c.search("frage", [DATASET], search_type="GRAPH_COMPLETION"),
        "aufnehmen": lambda: c.add_document(DATASET, PFAD, b"text"),
        "graph_bauen": lambda: c.cognify([DATASET]),
    }


def rolle_fuer(wirkung):
    return "aufnahme" if wirkung in ("aufnehmen", "graph_bauen") else "lesen-claude"


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
        for entry in config["mandanten"]["nexify-agentur"]["datensaetze"].values():
            self.assertIsNone(entry["id"])

    def test_rollen_und_freigaben_in_konfiguration_und_code_gleich(self):
        config = cc.load_config()
        rollen = config["rollen"]
        self.assertEqual({k: list(v) for k, v in cc.FREIGABEN.items()}, rollen["freigaben_je_wirkung"])
        for name, role in cc.ROLLEN.items():
            self.assertEqual(rollen[name], {"freigabe": role["freigabe"], "wirkungen": list(role["wirkungen"])})
        needed = {key for keys in cc.FREIGABEN.values() for key in keys} | {r["freigabe"] for r in cc.ROLLEN.values()}
        self.assertTrue(needed <= set(config["freigaben"]))
        self.assertEqual(set(config["freigaben"]) - needed, {"leser_website_chat", "kundendaten"})
        self.assertEqual(set(cc.FREIGABEN), {w for r in cc.ROLLEN.values() for w in r["wirkungen"]})

    def test_modellvorgabe_entspricht_der_projektregel(self):
        policy = json.loads((ROOT / "config/llm-policy.json").read_text(encoding="utf-8"))
        vorgabe = cc.load_config()["modelle"]["projektvorgabe"]
        self.assertEqual(vorgabe["id"], policy["model"]["id"])
        self.assertEqual(vorgabe["reasoning"], policy["model"]["reasoning_effort"])

    def test_nur_agenturmandant_und_praefix_je_datensatz(self):
        config = cc.load_config()
        self.assertEqual(list(config["mandanten"]), ["nexify-agentur"])
        self.assertFalse(config["kundenmandanten"]["in_diesem_repository_erlaubt"])
        self.assertEqual(config["instanz"]["erlaubte_hosts"], ["brain.nexifyai.cloud"])
        tenant = config["mandanten"]["nexify-agentur"]
        targets = {rule["datensatz"] for rule in config["quellen"]["aufnehmen"]}
        self.assertTrue(targets <= set(tenant["datensaetze"]))
        for name in tenant["datensaetze"]:
            self.assertTrue(name.startswith(tenant["datensatz_praefix"]))
            self.assertRegex(name, cc.DATASET_NAME)

    def test_grenzen_sind_gesetzt(self):
        limits = cc.load_config()["grenzen"]
        self.assertEqual((limits["zeitlimit_sekunden"], limits["wiederholungen"]), (30, 2))
        self.assertLessEqual(limits["max_bytes_je_datei"], 400000)
        self.assertLessEqual(limits["max_dateien_je_lauf"], 80)
        self.assertLessEqual(limits["treffer_max"], 25)

    def test_konfiguration_und_adapter_ohne_geheimniswert(self):
        for relative in ("config/integrations/cognee.json", "ops/cognee/cognee_client.py",
                         "ops/cognee/geheimnis_filter.py", "ops/cognee/aufnahme.py",
                         "ops/cognee/.env.example", "ops/cognee/README.md",
                         "docs/04-betrieb/cognee-integration-2026-11-14.md"):
            self.assertEqual(cc.find_secrets((ROOT / relative).read_text(encoding="utf-8")), [], relative)

    def test_env_beispiel_nennt_nur_namen(self):
        names = []
        for line in (ROOT / "ops/cognee/.env.example").read_text(encoding="utf-8").splitlines():
            if line and not line.startswith("#"):
                self.assertRegex(line, r"^COGNEE_[A-Z_]+=$")
                names.append(line[:-1])
        self.assertEqual(set(names), set(cc.load_config()["variablen"]) | set(cc.load_config()["schalter"]))


class SchalterTest(unittest.TestCase):
    def test_ohne_variablen_kein_netzaufruf(self):
        transport = Attrappe()
        c = client({}, transport)
        for name, call in wirkungen(c).items():
            with self.assertRaises(cc.Abbruch) as stop:
                call()
            self.assertEqual(stop.exception.status, "aus", name)
        self.assertEqual(transport.calls, [])
        self.assertEqual(c.calls, 0)

    def test_schalter_nur_bei_exakt_eins(self):
        for value in ("", "0", "true", "yes", "on", " 1", "1 ", "11"):
            transport = Attrappe()
            with self.assertRaises(cc.Abbruch) as stop:
                client(env(COGNEE_ENABLED=value), transport).health()
            self.assertEqual(stop.exception.status, "aus")
            self.assertEqual(transport.calls, [], value)

    def test_ohne_schalter_oeffnet_auch_der_echte_transport_keine_verbindung(self):
        original = socket.socket

        def verboten(*_a, **_k):
            raise AssertionError("Netzaufruf trotz ausgeschaltetem Adapter")

        socket.socket = verboten
        try:
            result = aufnahme.send(ROOT, {}, config=konfiguration())
            with self.assertRaises(cc.Abbruch):
                cc.CogneeClient({}, config=konfiguration()).health()
            with self.assertRaises(cc.Abbruch):
                cc.CogneeClient(env("lesen-claude"), config=cc.load_config()).search("frage", [DATASET])
        finally:
            socket.socket = original
        self.assertEqual(result, {"status": "aus", "gesendet": False,
                                  "grund": "COGNEE_ENABLED und COGNEE_INGEST_ENABLED müssen beide 1 sein"})

    def test_aufnahme_und_graphbau_brauchen_je_einen_weiteren_schalter(self):
        transport = Attrappe()
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(COGNEE_INGEST_ENABLED=None), transport).add_document(DATASET, PFAD, b"text")
        self.assertEqual(stop.exception.status, "aus")
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(COGNEE_COGNIFY_ENABLED="0"), transport).cognify([DATASET])
        self.assertEqual(stop.exception.status, "aus")
        self.assertEqual(transport.calls, [])


class FreigabeTest(unittest.TestCase):
    def test_unveraenderte_konfiguration_sendet_nichts_auch_nicht_lesend(self):
        """Befund 1 der Prüfung: Lesen brauchte keine Freigabe."""
        for role in cc.ROLLEN:
            transport = Attrappe()
            c = client(env(role), transport, config=cc.load_config())
            for name, call in wirkungen(c).items():
                with self.assertRaises(cc.Abbruch) as stop:
                    call()
                self.assertIn(stop.exception.status, ("freigabe_fehlt", "rolle_abgelehnt"), (role, name))
            self.assertEqual(transport.calls, [], role)

    def test_jede_einzelne_fehlende_freigabe_sperrt_ihre_wirkung(self):
        for wirkung, keys in cc.FREIGABEN.items():
            role = rolle_fuer(wirkung)
            for key in keys + (cc.ROLLEN[role]["freigabe"],):
                transport = Attrappe((200, b"[]"))
                c = client(env(role), transport, config=konfiguration(ohne=(key,)))
                with self.assertRaises(cc.Abbruch) as stop:
                    wirkungen(c)[wirkung]()
                self.assertEqual(stop.exception.status, "freigabe_fehlt", (wirkung, key))
                self.assertIn(key, stop.exception.grund)
                self.assertEqual(transport.calls, [], (wirkung, key))

    def test_mit_allen_freigaben_wird_genau_einmal_gesendet(self):
        for wirkung in cc.FREIGABEN:
            transport = Attrappe((200, b"[]"))
            result = wirkungen(client(env(rolle_fuer(wirkung)), transport))[wirkung]()
            self.assertEqual((result["status"], len(transport.calls)), ("ok", 1), wirkung)

    def test_graphbau_ohne_kostenfreigabe_und_antwortsuche_ohne_kostenfreigabe(self):
        transport = Attrappe()
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(), transport, config=konfiguration(ohne=("graph_bauen_mit_kostenrahmen",))).cognify([DATASET])
        self.assertEqual(stop.exception.status, "freigabe_fehlt")
        with self.assertRaises(cc.Abbruch) as stop:
            client(env("lesen-claude"), transport, config=konfiguration(ohne=("antwortsuche_mit_kostenrahmen",))) \
                .search("frage", [DATASET], search_type="RAG_COMPLETION")
        self.assertEqual(stop.exception.status, "freigabe_fehlt")
        self.assertEqual(transport.calls, [])
        self.assertEqual(set(cc.SUCHARTEN_MIT_MODELL), {s for s in cc.SUCHARTEN if s.endswith("_COMPLETION")})

    def test_website_chat_und_kundendaten_oeffnen_nichts(self):
        config = cc.load_config()
        config["freigaben"]["leser_website_chat"] = True
        config["freigaben"]["kundendaten"] = True
        for role in list(cc.ROLLEN) + ["lesen-website", "website-chat", ""]:
            transport = Attrappe()
            c = client(env(role), transport, config=config)
            for call in wirkungen(c).values():
                with self.assertRaises(cc.Abbruch):
                    call()
            self.assertEqual(transport.calls, [], role)


class RolleTest(unittest.TestCase):
    def test_leser_schreibt_nicht_und_aufnahme_sucht_nicht(self):
        for role, verboten in (("lesen-claude", ("aufnehmen", "graph_bauen")),
                               ("lesen-hermes", ("aufnehmen", "graph_bauen")),
                               ("aufnahme", ("suchen", "antwortsuche"))):
            transport = Attrappe()
            c = client(env(role), transport)
            for wirkung in verboten:
                with self.assertRaises(cc.Abbruch) as stop:
                    wirkungen(c)[wirkung]()
                self.assertEqual(stop.exception.status, "rolle_abgelehnt", (role, wirkung))
            self.assertEqual(transport.calls, [])

    def test_fehlende_oder_unbekannte_rolle(self):
        for role in (None, "", "admin", "AUFNAHME", "lesen"):
            transport = Attrappe()
            with self.assertRaises(cc.Abbruch) as stop:
                client(env(COGNEE_ROLE=role), transport).health()
            self.assertEqual(stop.exception.status, "konfiguration_fehlt", role)
            self.assertEqual(transport.calls, [])


class AdresseUndSchluesselTest(unittest.TestCase):
    def test_fremde_oder_unsichere_adresse_wird_abgelehnt(self):
        for url in ("http://brain.nexifyai.cloud", "https://brain.nexifyai.cloud.example.org",
                    "https://example.org", "https://nutzer:wort@brain.nexifyai.cloud",
                    "https://brain.nexifyai.cloud:8443", "https://brain.nexifyai.cloud/mcp",
                    "http://179.198.195.91:33019", "https://brain.nexifyai.cloud?x=1",
                    "https://abrain.nexifyai.cloud", "https://x.brain.nexifyai.cloud",
                    "https://nexifyai.cloud", "https://brain.nexifyai.cloud.", "https://brain.nexifyai.cloud:abc",
                    "https://brain.nexifyai.cloud:0", "https://[::1]", "https://brain.nexifyai.cloud#x",
                    "ftp://brain.nexifyai.cloud", "brain.nexifyai.cloud"):
            transport = Attrappe()
            with self.assertRaises(cc.Abbruch) as stop:
                client(env(COGNEE_BASE_URL=url), transport).health()
            self.assertEqual(stop.exception.status, "adresse_abgelehnt", url)
            self.assertEqual(transport.calls, [], url)

    def test_erlaubte_adresse_in_zwei_schreibweisen(self):
        for url in (BASE, BASE + "/", BASE + ":443"):
            transport = Attrappe((200, b"{}"))
            client(env(COGNEE_BASE_URL=url), transport).health()
            self.assertEqual(transport.calls[0]["url"], BASE + "/health")

    def test_fehlende_adresse_oder_schluessel(self):
        for extra in ({"COGNEE_BASE_URL": None}, {"COGNEE_API_KEY": None}, {"COGNEE_API_KEY": "a\nb"},
                      {"COGNEE_API_KEY": "a b"}, {"COGNEE_API_KEY": "schlüssel"},
                      {"COGNEE_AUTH_MODE": "basic"}, {"COGNEE_TENANT": None}):
            transport = Attrappe()
            with self.assertRaises(cc.Abbruch) as stop:
                client(env(**extra), transport).list_datasets()
            self.assertEqual(stop.exception.status, "konfiguration_fehlt", extra)
            self.assertEqual(transport.calls, [])

    def test_schluessel_nur_im_kopf_und_nie_in_meldungen(self):
        key = "attrappe-" + "x" * 20
        transport = Attrappe((401, b"nein"))
        c = client(env(COGNEE_API_KEY=key), transport)
        result = c.list_datasets()
        self.assertEqual(result["status"], "anmeldung_abgelehnt")
        self.assertEqual(transport.calls[0]["headers"]["X-Api-Key"], key)
        self.assertNotIn(key, transport.calls[0]["url"])
        self.assertNotIn(key, json.dumps(result))
        self.assertNotIn(key, repr(c.settings))
        self.assertNotIn(key, str(c.settings))
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(COGNEE_API_KEY=key, COGNEE_TENANT="fremd"), transport).list_datasets()
        self.assertNotIn(key, stop.exception.grund)

    def test_zustand_sendet_keinen_schluessel(self):
        transport = Attrappe((200, b"{}"))
        client(env(), transport).health()
        self.assertNotIn("X-Api-Key", transport.calls[0]["headers"])

    def test_proxy_modus_sendet_keinen_schluessel(self):
        transport = Attrappe((200, b"[]"))
        result = client(env(COGNEE_AUTH_MODE="proxy", COGNEE_API_KEY=None), transport).list_datasets()
        self.assertEqual(result["status"], "ok")
        self.assertNotIn("X-Api-Key", transport.calls[0]["headers"])
        self.assertNotIn("Authorization", transport.calls[0]["headers"])


class MandantTest(unittest.TestCase):
    def test_falscher_mandant_bricht_ab(self):
        for tenant in ("kunde-test", "nexify", "NEXIFY-AGENTUR", "nexify-agentur-2", "*"):
            for role in ("aufnahme", "lesen-claude"):
                transport = Attrappe()
                c = client(env(role, COGNEE_TENANT=tenant), transport)
                for name in ("datensaetze", "suchen" if role != "aufnahme" else "aufnehmen"):
                    with self.assertRaises(cc.Abbruch) as stop:
                        wirkungen(c)[name]()
                    self.assertEqual(stop.exception.status, "mandant_abgelehnt", (tenant, name))
                self.assertEqual(transport.calls, [], tenant)

    def test_fremder_datensatz_bricht_ab(self):
        for dataset in ("kunde-test--akten", "nexify-agentur--unbekannt", "nexify-agentur", "betrieb",
                        "nexify-agentur--betrieb/../x", "", "main_dataset", None, 7):
            transport = Attrappe()
            schreiber = client(env(), transport)
            leser = client(env("lesen-hermes"), transport)
            for call in (lambda: schreiber.add_document(dataset, PFAD, b"text"),
                         lambda: leser.search("frage", [DATASET, dataset]),
                         lambda: schreiber.cognify([dataset])):
                with self.assertRaises(cc.Abbruch) as stop:
                    call()
                self.assertEqual(stop.exception.status, "mandant_abgelehnt", dataset)
            self.assertEqual(transport.calls, [], dataset)

    def test_suche_und_graphbau_ohne_datensatz_brechen_ab(self):
        transport = Attrappe()
        for call in (lambda: client(env("lesen-claude"), transport).search("frage", []),
                     lambda: client(env(), transport).cognify([]),
                     lambda: client(env("lesen-claude"), transport).search("frage", DATASET)):
            with self.assertRaises(cc.Abbruch) as stop:
                call()
            self.assertEqual(stop.exception.status, "mandant_abgelehnt")
        self.assertEqual(transport.calls, [])


class SucheTest(unittest.TestCase):
    def test_suche_sendet_kennungen_der_eigenen_datensaetze(self):
        transport = Attrappe((200, b"[]"))
        config = konfiguration()
        client(env("lesen-claude"), transport, config=config).search("Was gilt für Server?", [DATASET], top_k=3)
        call = transport.calls[0]
        self.assertEqual((call["method"], call["url"]), ("POST", BASE + "/api/v1/search"))
        expected = config["mandanten"]["nexify-agentur"]["datensaetze"][DATASET]["id"]
        self.assertEqual(json.loads(call["body"]), {"searchType": "CHUNKS", "query": "Was gilt für Server?",
                                                    "datasetIds": [expected], "topK": 3})

    def test_ohne_eingetragene_kennung_wird_nicht_gesucht(self):
        for value in (None, "", "nexify-agentur--betrieb", "1111", 5):
            config = konfiguration(ids=False)
            config["mandanten"]["nexify-agentur"]["datensaetze"][DATASET]["id"] = value
            transport = Attrappe()
            with self.assertRaises(cc.Abbruch) as stop:
                client(env("lesen-claude"), transport, config=config).search("frage", [DATASET])
            self.assertEqual(stop.exception.status, "konfiguration_fehlt", value)
            self.assertEqual(transport.calls, [])

    def test_trefferzahl_und_fragenlaenge_sind_begrenzt(self):
        transport = Attrappe((200, b"[]"))
        c = client(env("lesen-claude"), transport)
        for top_k in (0, -1, 26, 10 ** 9, "5", 2.5, True):
            with self.assertRaises(cc.Abbruch) as stop:
                c.search("frage", [DATASET], top_k=top_k)
            self.assertEqual(stop.exception.status, "eingabe_abgelehnt", top_k)
        for query in ("", "   ", "x" * 2001, None, 5):
            with self.assertRaises(cc.Abbruch) as stop:
                c.search(query, [DATASET])
            self.assertEqual(stop.exception.status, "eingabe_abgelehnt")
        with self.assertRaises(cc.Abbruch) as stop:
            c.search("frage", [DATASET], search_type="CYPHER")
        self.assertEqual(stop.exception.status, "eingabe_abgelehnt")
        self.assertEqual(transport.calls, [])
        self.assertEqual(c.search("x " * 1000, [DATASET], top_k=25)["status"], "ok")
        self.assertEqual(json.loads(transport.calls[0]["body"])["topK"], 25)

    def test_frage_mit_geheimnis_oder_steuerzeichen_bricht_ab(self):
        transport = Attrappe()
        c = client(env("lesen-claude"), transport)
        for query in (f"wo steht {geheimnis()}", "frage\x00mit null"):
            with self.assertRaises(cc.Abbruch) as stop:
                c.search(query, [DATASET])
            self.assertEqual(stop.exception.status, "geheimnis_gefunden")
            self.assertNotIn(geheimnis(), stop.exception.grund)
        self.assertEqual(transport.calls, [])

    def test_antwortsuche_wird_nie_wiederholt(self):
        """Befund 10: dreifache Modellkosten bei 503."""
        for search_type in cc.SUCHARTEN_MIT_MODELL:
            for answer in ((503, b""), cc.TransportError("Zeitlimit")):
                transport = Attrappe(answer)
                result = client(env("lesen-claude"), transport).search("frage", [DATASET], search_type=search_type)
                self.assertEqual((result["status"], len(transport.calls), result["ergebnis_unbekannt"]),
                                 ("nicht_erreichbar", 1, True), search_type)


class AufnahmegutTest(unittest.TestCase):
    def ablehnung(self, content, path=PFAD, dataset=DATASET):
        transport = Attrappe()
        with self.assertRaises(cc.Abbruch) as stop:
            client(env(), transport).add_document(dataset, path, content)
        self.assertEqual(transport.calls, [])
        return stop.exception

    def test_geheimnis_muster_bricht_ab_ohne_den_wert_zu_nennen(self):
        secret = geheimnis()
        stop = self.ablehnung(f"Zeile\nToken: {secret}\n".encode())
        self.assertEqual(stop.status, "geheimnis_gefunden")
        self.assertNotIn(secret, stop.grund)

    def test_verschleierte_und_weitere_formen_werden_erkannt(self):
        """Befund 2: Umgehungen des Filters. Der Filter bleibt ein Musterabgleich."""
        secret = geheimnis()
        base64 = "QWxhZGRpbjpPcGVuU2VzYW1lMTIzNDU2Nzg5MEFiQ2RFZkdoSWpLbE1uT3A="
        cases = {
            "umbruch": secret[:20] + "\n" + secret[20:],
            "umbruch mit einrückung": secret[:20] + "\r\n    " + secret[20:],
            "unsichtbares zeichen": secret[:20] + "\u200b" + secret[20:],
            "weiches trennzeichen": secret[:11] + "\u00ad" + secret[11:],
            "sperrschrift": " ".join(secret),
            "base64 umbrochen": "\n".join(base64[i:i + 20] for i in range(0, len(base64), 20)),
            "kennwort": "POSTGRES_" + "PASSWORD=" + "hunter2geheim",
            "kennwortfeld": "pass" + "word = " + "'hunter2geheim'",
            "kleinbuchstaben und ziffern": "z1y2x3w4v5" * 4,
            "hex mit 31 zeichen": "0123456789abcdef0123456789abcde",
            "base64 mit schrägstrich": "Ab3/" * 12,
            "google": "AI" + "za" + "Sy" + "A1b2C3d4" * 4,
            "telegram": "123456789:" + "AAH" + "x1Y2z3" * 6,
            "webhook": "wh" + "sec_" + "Ab3xY9" * 3,
            "basic": "Authorization: Basic " + "QWxhZGRpbjpvcGVuIHNlc2FtZQ==",
            "adresse": "postgres" + "://nutzer:" + "wort" + "@db.example.org/x",
            "volle breite": "".join(chr(ord(c) + 0xFEE0) if c.isalnum() else c for c in secret),
        }
        for name, text in cases.items():
            self.assertTrue(cc.find_secrets("Davor.\n" + text + "\nDanach."), name)
            stop = self.ablehnung(("Davor.\n" + text + "\nDanach.").encode())
            self.assertEqual(stop.status, "geheimnis_gefunden", name)

    def test_utf16_und_steuerzeichen_gelten_nicht_als_text(self):
        for content in (("x " + geheimnis()).encode("utf-16-le"), b"text\x00", b"a\x07b", b"\xff\xfe\x00"):
            self.assertEqual(self.ablehnung(content).status, "quelle_abgelehnt")

    def test_gewoehnlicher_text_loest_keinen_fund_aus(self):
        text = ("Die Wiederherstellung\nSicherung läuft. Basic Authentication nach RFC 7617.\n"
                "COGNEE_API_KEY=\nLLM_API_KEY=${LLM_API_KEY}\nToken: wird vom Inhaber eingetragen.\n"
                "Siehe docs/04-betrieb/cognee-integration-2026-11-14.md und https://brain.nexifyai.cloud/mcp,\n"
                "Commit 6a31225, Port 33019, | a | b | c | d | e | f | g | h | i | j | k | l |\n")
        self.assertEqual(cc.find_secrets(text), [])

    def test_filter_laeuft_linear(self):
        """Befund 7: lange Läufe ohne Leerraum."""
        for text in ("a" * 400000, "a://" * 100000, "Ab3 " * 100000, "abcdefgh\n" * 44444, "a:b@" * 100000):
            started = time.monotonic()
            cc.find_secrets(text)
            self.assertLess(time.monotonic() - started, 10)

    def test_pfad_muss_auf_der_positivliste_stehen(self):
        """Befund 5: direkte Aufrufe mit fremden oder verbogenen Pfaden."""
        for path in ("./evidence/x.md", "docs/../evidence/x.md", "Evidence/x.md", "x/.ENV", "/etc/passwd",
                     "../../kunde/geheim.md", "evidence/x/y.json", ".env", "apps/web/.env.local",
                     "reference/handoff-n2/a.md", "apps/shop-api/shop/x.py", "docs/04-betrieb/x.txt",
                     "docs/04-betrieb/unter/x.md", "x/docs/04-betrieb/x.md", "docs/04-betrieb/", "",
                     "docs\\04-betrieb\\x.md", "docs/04-betrieb/x.md ", "kunde/DECISIONS.md", "README.md",
                     "docs/04-betrieb/ü.md", None, 5):
            self.assertEqual(self.ablehnung(b"text", path=path).status, "quelle_abgelehnt", path)

    def test_pfad_gehoert_in_genau_einen_datensatz(self):
        self.assertEqual(self.ablehnung(b"text", path="DECISIONS.md").status, "quelle_abgelehnt")
        self.assertEqual(self.ablehnung(b"text", dataset="nexify-agentur--regeln").status, "quelle_abgelehnt")
        config = cc.load_config()
        self.assertEqual(cc.dataset_for("DECISIONS.md", config), "nexify-agentur--entscheidungen")
        self.assertEqual(cc.dataset_for(".claude/skills/nexify-graph/SKILL.md", config), "nexify-agentur--regeln")

    def test_sperrliste_gewinnt_gegen_die_positivliste(self):
        config = konfiguration()
        config["quellen"]["nie_aufnehmen"].append("docs/04-betrieb/geheim*.md")
        for path in ("docs/04-betrieb/geheim-notiz.md", "docs/04-betrieb/GEHEIM.md"):
            with self.assertRaises(cc.Abbruch) as stop:
                cc.dataset_for(path, config)
            self.assertEqual(stop.exception.status, "quelle_abgelehnt")
        self.assertEqual(cc.dataset_for("docs/04-betrieb/offen.md", config), DATASET)

    def test_kopf_einschleusung_ueber_den_pfad_ist_nicht_moeglich(self):
        """Befund 6."""
        for path in ('docs/04-betrieb/a.md"\r\nX-Inject: 1', 'docs/04-betrieb/a".md', "docs/04-betrieb/a\n.md",
                     "docs/04-betrieb/a;b.md", "docs/04-betrieb/a b.md"):
            self.assertEqual(self.ablehnung(b"text", path=path).status, "quelle_abgelehnt", path)
        with self.assertRaises(cc.Abbruch):
            cc._multipart("nxabc", {"datasetName": DATASET}, 'a.md"\r\nX-Inject: 1', b"t")
        with self.assertRaises(cc.Abbruch):
            cc._multipart("nxabc", {"datasetName": 'x"\r\nY: 1'}, "a.md", b"t")

    def test_leer_und_zu_gross(self):
        limit = cc.load_config()["grenzen"]["max_bytes_je_datei"]
        for content in (b"", b"a" * (limit + 1), "text", None):
            self.assertEqual(self.ablehnung(content).status, "quelle_abgelehnt")
        config = konfiguration()
        config["grenzen"]["max_bytes_je_datei"] = 0
        transport = Attrappe()
        with self.assertRaises(cc.Abbruch):
            client(env(), transport, config=config).add_document(DATASET, PFAD, b"text")
        self.assertEqual(transport.calls, [])

    def test_aufnahme_sendet_einmal_mit_einem_namen_je_pfad(self):
        transport = Attrappe((200, b'{"inhalt":"Inhalt A"}'))
        c = client(env(), transport)
        first = c.add_document(DATASET, PFAD, b"Inhalt A")
        second = c.add_document(DATASET, PFAD, b"Inhalt B")
        self.assertEqual(first["status"], "ok")
        self.assertEqual(first["dokument"], "docs~04-betrieb~x.md")
        self.assertEqual(first["dokument"], second["dokument"])
        self.assertNotEqual(cc.document_name("a_b/c.md"), cc.document_name("a/b_c.md"))
        self.assertNotIn("daten", first)
        self.assertNotIn("Inhalt A", json.dumps(first))
        call = transport.calls[0]
        self.assertEqual((call["method"], call["url"]), ("POST", BASE + "/api/v1/add"))
        self.assertIn(b'name="datasetName"\r\n\r\n' + DATASET.encode() + b"\r\n", call["body"])
        self.assertIn(b'name="data"; filename="docs~04-betrieb~x.md"\r\n', call["body"])
        self.assertIn(b"\r\n\r\nInhalt A\r\n--", call["body"])
        self.assertEqual(call["body"].count(b"Content-Disposition"), 2)

    def test_graphbau_sendet_namen_und_hintergrundlauf(self):
        transport = Attrappe((200, b"{}"))
        client(env(), transport).cognify([DATASET])
        call = transport.calls[0]
        self.assertEqual((call["method"], call["url"]), ("POST", BASE + "/api/v1/cognify"))
        self.assertEqual(json.loads(call["body"]), {"datasets": [DATASET], "run_in_background": True})


class FehlerbildTest(unittest.TestCase):
    def test_lesen_wird_begrenzt_und_mit_begrenzter_pause_wiederholt(self):
        pausen = []
        transport = Attrappe((503, b""), cc.TransportError("Zeitlimit"), (200, b"[]"))
        result = client(env(), transport, sleep=pausen.append).list_datasets()
        self.assertEqual((result["status"], result["versuche"], pausen), ("ok", 3, [2, 4]))
        transport = Attrappe((503, b""))
        result = client(env(), transport).health()
        self.assertEqual((result["status"], result["versuche"], len(transport.calls)), ("nicht_erreichbar", 3, 3))
        self.assertFalse(result["ergebnis_unbekannt"])

    def test_wiederholung_und_zeitlimit_sind_im_code_gedeckelt(self):
        config = konfiguration()
        config["grenzen"].update({"wiederholungen": 50, "zeitlimit_sekunden": 3000})
        pausen = []
        transport = Attrappe((502, b""))
        result = client(env(), transport, config=config, sleep=pausen.append).health()
        self.assertEqual((result["versuche"], len(transport.calls)), (4, 4))
        self.assertTrue(all(p <= 8 for p in pausen), pausen)
        self.assertEqual(transport.calls[0]["timeout"], 60.0)
        transport = Attrappe((200, b"{}"))
        client(env(), transport).health()
        self.assertEqual(transport.calls[0]["timeout"], 30.0)

    def test_schreiben_wird_nie_wiederholt(self):
        for answer in ((503, b""), (502, b""), (504, b""), cc.TransportError("Zeitlimit")):
            transport = Attrappe(answer)
            c = client(env(), transport)
            result = c.add_document(DATASET, PFAD, b"text")
            self.assertEqual((result["status"], result["ergebnis_unbekannt"]), ("nicht_erreichbar", True))
            self.assertEqual(c.cognify([DATASET])["status"], "nicht_erreichbar")
            self.assertEqual(len(transport.calls), 2)

    def test_statuscodes_werden_benannt_und_nicht_wiederholt(self):
        for code, name in ((401, "anmeldung_abgelehnt"), (403, "recht_fehlt"), (404, "nicht_gefunden"),
                           (409, "konflikt"), (422, "eingabe_abgelehnt"), (500, "fehler"), (302, "fehler")):
            transport = Attrappe((code, b"x"))
            result = client(env("lesen-claude"), transport).search("frage", [DATASET])
            self.assertEqual((result["status"], len(transport.calls)), (name, 1))

    def test_rumpf_einer_fehlerantwort_und_netzfehlertext_bleiben_draussen(self):
        marke = "INTERNER-RUMPF-" + "x" * 10
        for code in (400, 401, 404, 409, 500):
            result = client(env(), Attrappe((code, marke.encode()))).list_datasets()
            self.assertNotIn(marke, json.dumps(result))
            self.assertNotIn("daten", result)
        fehler = cc.TransportError("https://nutzer:wort@intern.example/" + marke)
        self.assertEqual(fehler.art, "netzfehler")
        result = client(env(), Attrappe(fehler)).list_datasets()
        self.assertNotIn(marke, json.dumps(result))
        self.assertEqual(result["fehler"], "netzfehler")

    def test_heutiger_zustand_der_instanz_als_fehlerbild(self):
        """Am 14.11.2026 antworten alle API-Pfade mit 404 als Text."""
        transport = Attrappe((404, b"404 page not found\n"))
        self.assertEqual(client(env(), transport).health()["status"], "nicht_gefunden")

    def test_unlesbare_und_zu_grosse_antwort(self):
        self.assertEqual(client(env(), Attrappe((200, b"<html>"))).list_datasets()["status"], "antwort_unlesbar")
        config = konfiguration()
        config["grenzen"]["max_antwort_bytes"] = 10
        result = client(env(), Attrappe((200, b"[" + b"1," * 20 + b"1]")), config=config).list_datasets()
        self.assertEqual(result["status"], "antwort_zu_gross")
        self.assertNotIn("daten", result)


class _Dienst(http.server.BaseHTTPRequestHandler):
    treffer = []

    def do_GET(self):
        type(self).treffer.append(self.path)
        if self.path == "/umleitung":
            self.send_response(302)
            self.send_header("Location", f"http://127.0.0.1:{self.server.server_address[1]}/ziel")
            self.end_headers()
        elif self.path == "/gross":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"x" * 5000)
        elif self.path == "/tropf":
            self.send_response(200)
            self.end_headers()
            try:
                for _ in range(40):
                    self.wfile.write(b"x")
                    self.wfile.flush()
                    time.sleep(0.1)
            except OSError:
                pass
        elif self.path == "/fehler":
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"nicht da")
        else:
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"{}")

    def log_message(self, *_args):
        pass


class EchterTransportTest(unittest.TestCase):
    """Nur lokale Schleife; prüft Umleitung, Größengrenze und Gesamtfrist des echten Transports."""

    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _Dienst)
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        _Dienst.treffer.clear()
        # Der Proxy der Laufumgebung gilt nicht für die lokale Schleife.
        self._proxy = {k: os.environ.pop(k) for k in list(os.environ) if k.lower() in ("http_proxy", "all_proxy")}
        self.addCleanup(os.environ.update, self._proxy)

    def test_umleitung_wird_nicht_verfolgt(self):
        code, _body = cc.UrllibTransport(1000)("GET", self.base + "/umleitung", {"X-Api-Key": "attrappe"}, None, 5)
        self.assertEqual(code, 302)
        self.assertEqual(_Dienst.treffer, ["/umleitung"])

    def test_antwort_wird_an_der_grenze_abgeschnitten(self):
        code, body = cc.UrllibTransport(1000)("GET", self.base + "/gross", {}, None, 5)
        self.assertEqual((code, len(body)), (200, 1001))

    def test_fehlerstatus_kommt_als_status_zurueck(self):
        self.assertEqual(cc.UrllibTransport(1000)("GET", self.base + "/fehler", {}, None, 5)[0], 404)

    def test_gesamtfrist_bricht_ab(self):
        ticks = iter(range(0, 10 ** 6, 100))
        transport = cc.UrllibTransport(1000, clock=lambda: next(ticks))
        with self.assertRaises(cc.TransportError) as stop:
            transport("GET", self.base + "/gross", {}, None, 5)
        self.assertEqual(stop.exception.art, "Gesamtfrist")

    def test_troepfelnde_antwort_haelt_die_gesamtfrist_nicht_auf(self):
        """Hinweis der automatischen Durchsicht: read() wartete auf den vollen Block."""
        started = time.monotonic()
        with self.assertRaises(cc.TransportError) as stop:
            cc.UrllibTransport(100000)("GET", self.base + "/tropf", {}, None, 0.5)
        self.assertIn(stop.exception.art, ("Gesamtfrist", "Zeitlimit"))
        self.assertLess(time.monotonic() - started, 2.5)

    def test_nicht_erreichbar_ohne_fehlertext(self):
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        with self.assertRaises(cc.TransportError) as stop:
            cc.UrllibTransport(1000)("GET", f"http://127.0.0.1:{port}/", {}, None, 2)
        self.assertEqual(stop.exception.art, "netzfehler")

    def test_client_nutzt_den_echten_transport_mit_grenze_aus_der_konfiguration(self):
        c = cc.CogneeClient(env(), config=konfiguration())
        self.assertIsInstance(c._transport, cc.UrllibTransport)
        self.assertEqual(c._transport.max_bytes, cc.load_config()["grenzen"]["max_antwort_bytes"])


class AufnahmeWerkzeugTest(unittest.TestCase):
    def baum(self, files):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        root = Path(folder.name) / "repo"
        root.mkdir()
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
        for item in plan["dateien"]:
            self.assertEqual(cc.dataset_for(item["pfad"], cc.load_config()), item["datensatz"])
        for item in plan["geheimnis_funde"]:
            for hit in item["funde"]:
                self.assertRegex(hit, r"^Zeile \d+: [^:(]+ \(\d+ Zeichen\)$")
        if blocked:
            transport = Attrappe()
            result = aufnahme.send(ROOT, env(), config=konfiguration(), transport=transport)
            self.assertEqual((result["status"], result["gesendet"]), ("geheimnis_gefunden", False))
            self.assertEqual(transport.calls, [])

    def test_plan_folgt_keiner_verknuepfung(self):
        """Befund 3: Verzeichnis-Verknüpfung aus dem Repository hinaus."""
        root = self.baum({"DECISIONS.md": "D-001 gilt."})
        outside = root.parent / "aussen"
        outside.mkdir()
        (outside / "geheim.md").write_text("fremd", encoding="utf-8")
        (root / "docs").mkdir()
        os.symlink(outside, root / "docs/04-betrieb")
        os.symlink(outside / "geheim.md", root / "PROGRESS.md")
        (root / "skills/innen").mkdir(parents=True)
        (root / "skills/innen/SKILL.md").write_text("ok", encoding="utf-8")
        os.symlink(root / "skills/innen", root / "skills/verweis")
        plan = aufnahme.build_plan(root, cc.load_config())
        self.assertEqual(sorted(i["pfad"] for i in plan["dateien"]), ["DECISIONS.md", "skills/innen/SKILL.md"])
        self.assertEqual({s["pfad"]: s["grund"] for s in plan["ausgelassen"]},
                         {"PROGRESS.md": "verknuepfung_oder_ausserhalb",
                          "docs/04-betrieb/geheim.md": "verknuepfung_oder_ausserhalb",
                          "skills/verweis/SKILL.md": "verknuepfung_oder_ausserhalb"})
        transport = Attrappe((200, b"{}"))
        result = aufnahme.send(root, env(), config=konfiguration(), transport=transport)
        self.assertEqual(result["status"], "ok")
        self.assertFalse([c for c in transport.calls if b"fremd" in c["body"]])

    def test_plan_haelt_groessengrenze_und_sperrliste_ein(self):
        config = konfiguration()
        config["grenzen"]["max_bytes_je_datei"] = 10
        config["quellen"]["nie_aufnehmen"].append("docs/04-betrieb/geheim*.md")
        root = self.baum({"DECISIONS.md": "x" * 11, "PROGRESS.md": "kurz", "AGENTS.md": "",
                          "docs/04-betrieb/geheim-a.md": "a", "docs/04-betrieb/offen.md": "b"})
        plan = aufnahme.build_plan(root, config)
        self.assertEqual(sorted(i["pfad"] for i in plan["dateien"]), ["PROGRESS.md", "docs/04-betrieb/offen.md"])
        reasons = {s["pfad"]: s["grund"] for s in plan["ausgelassen"]}
        self.assertEqual(reasons["DECISIONS.md"], "leer_oder_zu_gross")
        self.assertEqual(reasons["AGENTS.md"], "leer_oder_zu_gross")
        self.assertIn("nie_aufnehmen", reasons["docs/04-betrieb/geheim-a.md"])

    def test_geheimnis_in_einer_datei_stoppt_den_ganzen_lauf(self):
        secret = geheimnis()
        root = self.baum({"DECISIONS.md": "D-001 gilt.", "PROGRESS.md": f"Stand\nSchlüssel {secret}\n"})
        transport = Attrappe()
        result = aufnahme.send(root, env(), config=konfiguration(), transport=transport)
        self.assertEqual(result["status"], "geheimnis_gefunden")
        self.assertFalse(result["gesendet"])
        self.assertEqual([f["pfad"] for f in result["geheimnis_funde"]], ["PROGRESS.md"])
        self.assertNotIn(secret, json.dumps(result))
        self.assertEqual(transport.calls, [])

    def test_senden_ordnet_datensaetze_zu_und_meldet_ohne_inhalt(self):
        root = self.baum({"DECISIONS.md": "D-001 gilt.", "docs/04-betrieb/a.md": "Betrieb.",
                          "docs/04-betrieb/b.txt": "nicht in der Liste", ".env": "A=1",
                          "docs/04-betrieb/tief/c.md": "zu tief"})
        transport = Attrappe((200, b'{"inhalt":"D-001 gilt."}'))
        result = aufnahme.send(root, env(), config=konfiguration(), transport=transport)
        self.assertEqual(result["status"], "ok")
        self.assertEqual({r["pfad"]: r["datensatz"] for r in result["ergebnisse"]},
                         {"DECISIONS.md": "nexify-agentur--entscheidungen",
                          "docs/04-betrieb/a.md": "nexify-agentur--betrieb"})
        self.assertEqual(len(transport.calls), 2)
        self.assertNotIn("D-001 gilt.", json.dumps(result))

    def test_veraltete_fassung_ist_kein_erfolg(self):
        """Befund 17: 409 wurde als Erfolg gewertet."""
        root = self.baum({"DECISIONS.md": "a", "PROGRESS.md": "b"})
        transport = Attrappe((409, b""), (200, b"{}"))
        result = aufnahme.send(root, env(), config=konfiguration(), transport=transport)
        self.assertEqual((result["status"], result["veraltet"]), ("abloesung_noetig", ["DECISIONS.md"]))
        self.assertEqual([r["status"] for r in result["ergebnisse"]], ["fassung_veraltet", "ok"])
        self.assertEqual(len(transport.calls), 2)

    def test_fehler_stoppt_den_lauf_nach_der_ersten_datei(self):
        root = self.baum({"DECISIONS.md": "a", "PROGRESS.md": "b", "AGENTS.md": "c"})
        for answer in ((401, b""), (503, b""), cc.TransportError("Zeitlimit")):
            transport = Attrappe(answer)
            result = aufnahme.send(root, env(), config=konfiguration(), transport=transport)
            self.assertEqual((result["status"], len(transport.calls)), ("abgebrochen", 1))

    def test_ohne_freigabe_oder_mit_leserolle_sendet_das_werkzeug_nichts(self):
        root = self.baum({"DECISIONS.md": "a"})
        transport = Attrappe()
        result = aufnahme.send(root, env(), config=cc.load_config(), transport=transport)
        self.assertEqual((result["status"], result["gesendet"]), ("freigabe_fehlt", False))
        result = aufnahme.send(root, env("lesen-claude"), config=konfiguration(), transport=transport)
        self.assertEqual((result["status"], result["gesendet"]), ("rolle_abgelehnt", False))
        self.assertEqual(transport.calls, [])

    def test_zu_viele_dateien(self):
        root = self.baum({"DECISIONS.md": "a", "PROGRESS.md": "b"})
        for limit in (1, 0):
            config = konfiguration()
            config["grenzen"]["max_dateien_je_lauf"] = limit
            transport = Attrappe()
            result = aufnahme.send(root, env(), config=config, transport=transport)
            self.assertEqual(result["status"], "zu_viele_dateien")
            self.assertEqual(transport.calls, [])

    def test_aufruf_ohne_variablen_meldet_aus(self):
        self.assertEqual(aufnahme.send(ROOT, {})["status"], "aus")
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(aufnahme.main(["aufnahme.py", "unbekannt"], env={}), 2)


if __name__ == "__main__":
    unittest.main()
