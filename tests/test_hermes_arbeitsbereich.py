"""Prüft die Dateien für die Hermes-Oberfläche und den Entwurf des Modell-Wächters.

Offline: kein Server der Agentur, kein Anbieter, kein Schlüssel, kein Modellaufruf. Der
Anbieter ist eine Attrappe auf 127.0.0.1. Grüne Tests sind keine Laufzeitabnahme.
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEBUI = ROOT / "ops/hermes/webui"
SKRIPT = WEBUI / "bereitstellen.sh"
POLICY = json.loads((ROOT / "config/llm-policy.json").read_text(encoding="utf-8"))
MODELL = POLICY["model"]["id"]
STUFE = POLICY["model"]["reasoning_effort"]


def _lade(name: str, pfad: Path):
    spec = importlib.util.spec_from_file_location(name, pfad)
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


waechter = _lade("modell_waechter", ROOT / "ops/hermes/gateway/modell_waechter.py")
gestaltung = _lade("pruefe_gestaltung", WEBUI / "pruefe-gestaltung.py")


def _lauf(*argumente: str) -> subprocess.CompletedProcess:
    return subprocess.run(["bash", str(SKRIPT), *argumente], capture_output=True, text=True, timeout=60)


class Bereitstellen(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.ziel = Path(self.tmp.name) / "ext"

    def tearDown(self):
        self.tmp.cleanup()

    def _pruefsummen(self) -> subprocess.CompletedProcess:
        return subprocess.run(["sha256sum", "-c", "MANIFEST.sha256"], cwd=self.ziel, capture_output=True, text=True)

    def test_trockenlauf_schreibt_nichts(self):
        ergebnis = _lauf("--ziel", str(self.ziel))
        self.assertEqual(ergebnis.returncode, 0, ergebnis.stderr)
        self.assertFalse(self.ziel.exists())

    def test_manifest_pruefung_besteht_und_nennt_sich_nicht_selbst(self):
        self.assertEqual(_lauf("--ziel", str(self.ziel), "--anwenden").returncode, 0)
        pruefung = self._pruefsummen()
        self.assertEqual(pruefung.returncode, 0, pruefung.stdout + pruefung.stderr)
        manifest = (self.ziel / "MANIFEST.sha256").read_text()
        self.assertNotIn("MANIFEST.sha256", manifest)
        self.assertEqual(len(manifest.strip().splitlines()), 10)

    def test_ordner_bleibt_derselbe_und_zweiter_lauf_aendert_nichts(self):
        _lauf("--ziel", str(self.ziel), "--anwenden")
        knoten = self.ziel.stat().st_ino
        zweiter = _lauf("--ziel", str(self.ziel), "--anwenden")
        self.assertIn("Nichts zu tun", zweiter.stdout)
        self.assertEqual(list(self.ziel.parent.glob("ext.vorher-*")), [])
        (self.ziel / "nexify-graphite.css").write_text("/* verstellt */")
        dritter = _lauf("--ziel", str(self.ziel), "--anwenden")
        self.assertEqual(dritter.returncode, 0, dritter.stderr)
        # Ein eingehängter Ordner sieht nur dann den neuen Stand, wenn es derselbe Ordner bleibt.
        self.assertEqual(self.ziel.stat().st_ino, knoten)
        self.assertEqual(self._pruefsummen().returncode, 0)
        self.assertEqual(len(list(self.ziel.parent.glob("ext.vorher-*"))), 1)

    def test_rueckweg_stellt_den_gesicherten_stand_her(self):
        _lauf("--ziel", str(self.ziel), "--anwenden")
        (self.ziel / "nexify-graphite.css").write_text("/* alter Stand */")
        _lauf("--ziel", str(self.ziel), "--anwenden")
        sicherung = next(self.ziel.parent.glob("ext.vorher-*"))
        knoten = self.ziel.stat().st_ino
        zurueck = _lauf("--zurueck", str(sicherung), "--ziel", str(self.ziel), "--anwenden")
        self.assertEqual(zurueck.returncode, 0, zurueck.stderr)
        self.assertEqual((self.ziel / "nexify-graphite.css").read_text(), "/* alter Stand */")
        self.assertEqual(self.ziel.stat().st_ino, knoten)
        self.assertFalse((self.ziel / "SICHERUNG.sha256").exists())

    def test_sperre_verhindert_zweiten_lauf_und_es_bleibt_kein_rest(self):
        sperre = Path(str(self.ziel) + ".sperre")
        sperre.mkdir(parents=True)
        blockiert = _lauf("--ziel", str(self.ziel), "--anwenden")
        self.assertNotEqual(blockiert.returncode, 0)
        self.assertIn("anderer Lauf", blockiert.stderr)
        sperre.rmdir()
        self.assertEqual(_lauf("--ziel", str(self.ziel), "--anwenden").returncode, 0)
        reste = [p.name for p in self.ziel.parent.iterdir() if p.name != "ext"]
        self.assertEqual(reste, [])
        self.assertEqual([p for p in self.ziel.rglob("*.neu-*")], [])


class Gestaltung(unittest.TestCase):
    def test_werte_und_pflichtregeln(self):
        self.assertEqual(gestaltung.pruefe(), [])

    def test_umgebungsvorlage_bindet_nicht_vor_der_absicherung(self):
        aktiv = [z.split("=")[0] for z in (WEBUI / "webui.env.example").read_text(encoding="utf-8").splitlines()
                 if z and not z.startswith("#")]
        self.assertEqual(sorted(aktiv), ["HERMES_WEBUI_BOT_NAME", "HERMES_WEBUI_EXTENSION_DIR", "HERMES_WEBUI_EXTENSION_MANIFEST"])


class _Anbieter(BaseHTTPRequestHandler):
    antwortmodell = MODELL
    gesehen: list = []

    def log_message(self, *_):
        return

    def do_POST(self):  # noqa: N802
        koerper = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        type(self).gesehen.append((self.headers.get("Authorization"), koerper))
        if koerper.get("stream"):
            roh = (f'data: {{"model": "{type(self).antwortmodell}", "choices": []}}\n\n' "data: [DONE]\n\n").encode()
            typ = "text/event-stream"
        else:
            roh = json.dumps({"model": type(self).antwortmodell, "choices": []}).encode()
            typ = "application/json"
        self.send_response(200)
        self.send_header("Content-Type", typ)
        self.send_header("Content-Length", str(len(roh)))
        self.end_headers()
        self.wfile.write(roh)


class ModellWaechter(unittest.TestCase):
    TOKEN = "t" * 32
    KEY = "attrappe-kein-echter-schluessel"

    @classmethod
    def setUpClass(cls):
        cls.anbieter = ThreadingHTTPServer(("127.0.0.1", 0), _Anbieter)
        threading.Thread(target=cls.anbieter.serve_forever, daemon=True).start()
        upstream = f"http://127.0.0.1:{cls.anbieter.server_address[1]}/api/v1/chat/completions"
        cls.protokoll: list = []
        handler = waechter.baue_handler(MODELL, STUFE, waechter.pruefe_upstream(upstream, True), cls.KEY, cls.TOKEN, cls.protokoll.append)
        cls.dienst = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=cls.dienst.serve_forever, daemon=True).start()
        cls.basis = f"http://127.0.0.1:{cls.dienst.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        for server in (cls.dienst, cls.anbieter):
            server.shutdown()
            server.server_close()

    def setUp(self):
        _Anbieter.gesehen = []
        _Anbieter.antwortmodell = MODELL

    def _sende(self, koerper: dict, token: str | None = None):
        anfrage = urllib.request.Request(self.basis + "/v1/chat/completions", data=json.dumps(koerper).encode(), method="POST",
                                         headers={"Content-Type": "application/json", "Authorization": f"Bearer {token or self.TOKEN}"})
        oeffner = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        try:
            with oeffner.open(anfrage, timeout=10) as antwort:
                return antwort.status, antwort.read()
        except urllib.error.HTTPError as fehler:
            return fehler.code, fehler.read()

    def test_vorgabe_wird_weitergeleitet_und_reasoning_eingesetzt(self):
        status, _ = self._sende({"model": MODELL, "messages": []})
        self.assertEqual(status, 200)
        kopf, gesendet = _Anbieter.gesehen[0]
        self.assertEqual(kopf, f"Bearer {self.KEY}")
        self.assertEqual(gesendet["model"], MODELL)
        self.assertEqual(gesendet["reasoning"], {"effort": STUFE})
        self.assertIs(gesendet["provider"]["require_parameters"], True)

    def test_anderes_modell_wird_abgelehnt_und_erreicht_den_anbieter_nicht(self):
        for modell in ("openai/gpt-5.4-mini", MODELL.replace("-1017", ""), MODELL + ":free", None):
            status, roh = self._sende({"model": modell, "messages": []})
            self.assertEqual(status, 422, modell)
            self.assertEqual(json.loads(roh)["error"]["code"], "model_policy")
        self.assertEqual(_Anbieter.gesehen, [])

    def test_andere_reasoning_stufe_wird_abgelehnt(self):
        for zusatz in ({"reasoning": {"effort": "low"}}, {"reasoning": {"enabled": False}}, {"reasoning_effort": "medium"},
                       {"reasoning": {"effort": STUFE, "max_tokens": 10}}, {"reasoning": "high"}):
            status, roh = self._sende({"model": MODELL, "messages": [], **zusatz})
            self.assertEqual(status, 422, zusatz)
            self.assertEqual(json.loads(roh)["error"]["code"], "reasoning_policy")
        self.assertEqual(_Anbieter.gesehen, [])

    def test_ausweichwege_werden_abgelehnt(self):
        for zusatz in ({"models": [MODELL, "openai/gpt-5.4-mini"]}, {"route": "fallback"},
                       {"provider": {"allow_fallbacks": True}}, {"provider": {"require_parameters": False}}):
            status, _ = self._sende({"model": MODELL, "messages": [], **zusatz})
            self.assertEqual(status, 422, zusatz)
        self.assertEqual(_Anbieter.gesehen, [])

    def test_presets_und_unbekannte_felder_werden_abgelehnt(self):
        # Ein beim Anbieter hinterlegtes Preset kann eine eigene Ausweichliste tragen.
        for zusatz, code in (({"preset": "irgendeins"}, "model_policy"), ({"plugins": [{"id": "web"}]}, "model_policy"),
                             ({"transforms": ["middle-out"]}, "model_policy"), ({"models": []}, "model_policy"),
                             ({"unbekanntes_feld": 1}, "field_policy"), ({"provider": {"sort": "price"}}, "field_policy")):
            status, roh = self._sende({"model": MODELL, "messages": [], **zusatz})
            self.assertEqual(status, 422, zusatz)
            self.assertEqual(json.loads(roh)["error"]["code"], code, zusatz)
        status, roh = self._sende({"model": "@preset/irgendeins", "messages": []})
        self.assertEqual(status, 422)
        self.assertEqual(_Anbieter.gesehen, [])

    def test_uebliche_felder_gehen_durch(self):
        status, _ = self._sende({"model": MODELL, "messages": [], "temperature": 0.2, "max_tokens": 50, "tools": [],
                                 "tool_choice": "auto", "stream_options": {"include_usage": True}, "provider": {"order": ["x"]}})
        self.assertEqual(status, 200)
        self.assertNotIn("preset", _Anbieter.gesehen[0][1])

    def test_antwort_mit_anderem_modell_wird_nicht_ausgeliefert(self):
        _Anbieter.antwortmodell = "openai/gpt-5.4-mini"
        for strom in (False, True):
            status, roh = self._sende({"model": MODELL, "messages": [], "stream": strom})
            self.assertEqual(status, 502)
            self.assertEqual(json.loads(roh)["error"]["code"], "model_policy")

    def test_strom_wird_nach_bestaetigung_durchgereicht(self):
        status, roh = self._sende({"model": MODELL, "messages": [], "stream": True})
        self.assertEqual(status, 200)
        self.assertIn(b"[DONE]", roh)

    def test_ohne_zugangswert_keine_weiterleitung(self):
        status, _ = self._sende({"model": MODELL, "messages": []}, token="falsch" * 6)
        self.assertEqual(status, 401)
        self.assertEqual(_Anbieter.gesehen, [])

    def test_protokoll_enthaelt_keine_inhalte_und_keinen_schluessel(self):
        self._sende({"model": MODELL, "messages": [{"role": "user", "content": "geheimer Auftragstext"}]})
        text = json.dumps(self.protokoll, ensure_ascii=False)
        self.assertNotIn("geheimer Auftragstext", text)
        self.assertNotIn(self.KEY, text)
        self.assertNotIn(self.TOKEN, text)

    def test_upstream_nur_https_openrouter(self):
        self.assertTrue(waechter.pruefe_upstream("https://openrouter.ai/api/v1/chat/completions", False))
        for adresse in ("http://openrouter.ai/api/v1/chat/completions", "https://example.org/v1/chat/completions",
                        "http://127.0.0.1:1/x", "https://user@openrouter.ai/api/v1/chat/completions"):
            with self.assertRaises(SystemExit):
                waechter.pruefe_upstream(adresse, False)

    def test_policy_wird_aus_der_datei_gelesen(self):
        self.assertEqual(waechter.lade_policy(str(ROOT / "config/llm-policy.json")), (MODELL, STUFE))


if __name__ == "__main__":
    unittest.main()
