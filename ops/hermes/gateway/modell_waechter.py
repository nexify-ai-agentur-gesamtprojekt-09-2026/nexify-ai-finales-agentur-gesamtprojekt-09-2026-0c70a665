#!/usr/bin/env python3
"""NeXify · Modell-Wächter: kleine Zwischenstation zwischen Hermes und dem Modellanbieter.

ENTWURF, nicht eingespielt und nicht freigegeben. Zweck: Die Vorgabe aus
config/llm-policy.json (exakt ein Modell, exakt eine Reasoning-Stufe, kein Ersatz)
wird an der Leitung erzwungen, unabhängig davon, was Oberfläche, Zeitplan oder Profil
anfordern. Eine Anfrage mit anderem Modell, anderer Reasoning-Stufe oder einer
Ausweichliste wird abgelehnt und nicht umgeschrieben (llm-policy:
unsupported_capability = deny_instead_of_substituting_a_model). Fehlt die
Reasoning-Angabe, wird die vorgeschriebene Stufe eingesetzt: Hermes sendet das Feld
nur an OpenRouter-Adressen (ops/hermes/README.md, „Nicht belegt“), und eine fehlende
Angabe ist keine Wahl des Aufrufers.

Der Anbieter-Schlüssel liegt nur in der Umgebung dieses Dienstes (WAECHTER_UPSTREAM_KEY),
nicht in Hermes. Hermes bekommt einen eigenen Zugangswert (WAECHTER_CLIENT_TOKEN), der
ausschließlich hier gilt. Nur Standardbibliothek, keine Abhängigkeiten.

Start (Beispiel, Werte in einer Datei mit Rechten 600 außerhalb der in den Container
eingehängten Ordner):
    WAECHTER_UPSTREAM_KEY=… WAECHTER_CLIENT_TOKEN=… \
      python3 modell_waechter.py --policy /pfad/config/llm-policy.json --port 8791
"""
from __future__ import annotations

import argparse
import hmac
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_BODY = 8 * 1024 * 1024
CHAT_PATHS = {"/v1/chat/completions", "/api/v1/chat/completions", "/chat/completions"}
MODEL_PATHS = {"/v1/models", "/api/v1/models", "/models"}
ERLAUBTE_UPSTREAM_HOSTS = {"openrouter.ai"}
# Felder, mit denen ein Aufrufer ein anderes Modell oder einen Ausweichweg verlangen könnte.
AUSWEICH_FELDER = ("models", "route", "fallbacks", "fallback_models")


class Ablehnung(Exception):
    def __init__(self, code: str, meldung: str, status: int = 422):
        super().__init__(meldung)
        self.code, self.meldung, self.status = code, meldung, status


def lade_policy(pfad: str) -> tuple[str, str]:
    with open(pfad, encoding="utf-8") as datei:
        daten = json.load(datei)
    modell = daten["model"]
    if daten["routing"]["silent_model_fallback"] or daten["routing"]["silent_reasoning_downgrade"]:
        raise SystemExit("llm-policy erlaubt stillen Ersatz; der Wächter startet so nicht.")
    return modell["id"], modell["reasoning_effort"]


def pruefe_anfrage(koerper: dict, modell: str, stufe: str) -> dict:
    """Gibt die weiterzuleitende Anfrage zurück oder wirft Ablehnung. Ändert das Modell nie."""
    if not isinstance(koerper, dict):
        raise Ablehnung("bad_request", "Anfrage ist kein JSON-Objekt.", 400)
    if koerper.get("model") != modell:
        raise Ablehnung("model_policy", f"Nur das Modell {modell} ist zulässig; verlangt wurde {koerper.get('model')!r}.")
    for feld in AUSWEICH_FELDER:
        if koerper.get(feld):
            raise Ablehnung("model_policy", f"Das Feld {feld!r} verlangt einen Ausweichweg; das ist nicht zulässig.")
    reasoning = koerper.get("reasoning")
    kurz = koerper.get("reasoning_effort")
    if kurz is not None and kurz != stufe:
        raise Ablehnung("reasoning_policy", f"Nur Reasoning {stufe!r} ist zulässig; verlangt wurde {kurz!r}.")
    if reasoning is None:
        reasoning = {"effort": stufe}
    elif not isinstance(reasoning, dict) or reasoning.get("effort") != stufe or reasoning.get("enabled") is False \
            or "max_tokens" in reasoning:
        raise Ablehnung("reasoning_policy", f"Nur Reasoning {stufe!r} ist zulässig; verlangt wurde {reasoning!r}.")
    anbieter = koerper.get("provider")
    if anbieter is None:
        anbieter = {}
    if not isinstance(anbieter, dict) or anbieter.get("allow_fallbacks") is True or anbieter.get("require_parameters") is False:
        raise Ablehnung("model_policy", "Die Anbieter-Angaben lockern die Vorgabe (Ausweichanbieter oder fehlende Parameterpflicht).")
    weiter = dict(koerper)
    weiter.pop("reasoning_effort", None)
    weiter["reasoning"] = reasoning
    weiter["provider"] = {**anbieter, "require_parameters": True}
    return weiter


def modell_passt(genannt, modell: str) -> bool:
    return isinstance(genannt, str) and (genannt == modell or genannt.startswith(modell + ":"))


def baue_handler(modell: str, stufe: str, upstream: str, upstream_key: str, client_token: str, protokoll):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        server_version = "nexify-modell-waechter"

        def log_message(self, *_):  # eigenes Protokoll, ohne Inhalte
            return

        def _json(self, status: int, daten: dict) -> None:
            roh = json.dumps(daten, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(roh)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(roh)
            self.close_connection = True

        def _fehler(self, status: int, code: str, meldung: str, verlangt=None) -> None:
            protokoll({"zeit": int(time.time()), "urteil": "abgelehnt", "code": code, "verlangt": verlangt})
            self._json(status, {"error": {"code": code, "type": "nexify_model_policy", "message": meldung}})

        def _berechtigt(self) -> bool:
            kopf = self.headers.get("Authorization", "")
            return kopf.startswith("Bearer ") and hmac.compare_digest(kopf[7:].encode(), client_token.encode())

        def do_GET(self):  # noqa: N802
            pfad = urllib.parse.urlsplit(self.path).path
            if pfad == "/health":
                return self._json(200, {"status": "ok", "model": modell, "reasoning_effort": stufe})
            if pfad in MODEL_PATHS:
                if not self._berechtigt():
                    return self._fehler(401, "unauthorized", "Zugangswert fehlt oder ist falsch.")
                return self._json(200, {"object": "list", "data": [{"id": modell, "object": "model"}]})
            return self._fehler(404, "not_found", "Diesen Pfad gibt es hier nicht.")

        def do_POST(self):  # noqa: N802
            pfad = urllib.parse.urlsplit(self.path).path
            if pfad not in CHAT_PATHS:
                return self._fehler(404, "not_found", "Nur Chat-Anfragen werden weitergeleitet.")
            if not self._berechtigt():
                return self._fehler(401, "unauthorized", "Zugangswert fehlt oder ist falsch.")
            try:
                laenge = int(self.headers.get("Content-Length", ""))
            except ValueError:
                return self._fehler(411, "bad_request", "Content-Length fehlt.")
            if laenge < 0 or laenge > MAX_BODY:
                return self._fehler(413, "bad_request", "Anfrage zu groß.")
            try:
                koerper = json.loads(self.rfile.read(laenge))
                weiter = pruefe_anfrage(koerper, modell, stufe)
            except json.JSONDecodeError:
                return self._fehler(400, "bad_request", "Anfrage ist kein gültiges JSON.")
            except Ablehnung as nein:
                verlangt = koerper.get("model") if isinstance(koerper, dict) else None
                return self._fehler(nein.status, nein.code, nein.meldung, verlangt)
            self._weiterleiten(weiter)

        def _weiterleiten(self, weiter: dict) -> None:
            anfrage = urllib.request.Request(
                upstream, data=json.dumps(weiter).encode("utf-8"), method="POST",
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {upstream_key}"})
            try:
                antwort = _OEFFNER.open(anfrage, timeout=600)
            except urllib.error.HTTPError as fehler:
                roh = fehler.read(65536)
                protokoll({"zeit": int(time.time()), "urteil": "anbieterfehler", "status": fehler.code})
                self.send_response(fehler.code)
                self.send_header("Content-Type", fehler.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(roh)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(roh)
                self.close_connection = True
                return
            except (urllib.error.URLError, OSError):
                return self._fehler(502, "upstream_unreachable", "Der Anbieter ist nicht erreichbar. Es wird kein anderer versucht.")
            with antwort:
                typ = antwort.headers.get("Content-Type", "")
                if "text/event-stream" in typ:
                    return self._strom(antwort, typ)
                roh = antwort.read()
                try:
                    genannt = json.loads(roh).get("model")
                except (json.JSONDecodeError, AttributeError):
                    genannt = None
                if not modell_passt(genannt, modell):
                    return self._fehler(502, "model_policy", f"Die Antwort nennt das Modell {genannt!r} statt {modell}; sie wird nicht ausgeliefert.")
                protokoll({"zeit": int(time.time()), "urteil": "weitergeleitet", "modell": genannt, "reasoning": stufe})
                self.send_response(200)
                self.send_header("Content-Type", typ or "application/json")
                self.send_header("Content-Length", str(len(roh)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(roh)
                self.close_connection = True

        def _strom(self, antwort, typ: str) -> None:
            """Hält den Strom zurück, bis ein Datenblock das Modell der Vorgabe nennt."""
            puffer: list[bytes] = []
            bestaetigt = False
            for zeile in antwort:
                puffer.append(zeile)
                if zeile.startswith(b"data:") and b"[DONE]" not in zeile:
                    try:
                        genannt = json.loads(zeile[5:].strip()).get("model")
                    except (json.JSONDecodeError, AttributeError):
                        continue
                    if genannt is None:
                        continue
                    if not modell_passt(genannt, modell):
                        return self._fehler(502, "model_policy", f"Der Strom nennt das Modell {genannt!r} statt {modell}; er wird nicht ausgeliefert.")
                    bestaetigt = True
                    break
                if sum(len(t) for t in puffer) > 262144:
                    break
            if not bestaetigt:
                return self._fehler(502, "model_policy", "Der Strom nennt kein Modell; er wird nicht ausgeliefert.")
            protokoll({"zeit": int(time.time()), "urteil": "weitergeleitet", "modell": modell, "reasoning": stufe, "strom": True})
            self.send_response(200)
            self.send_header("Content-Type", typ)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Connection", "close")
            self.end_headers()
            self.close_connection = True
            try:
                for teil in puffer:
                    self.wfile.write(teil)
                self.wfile.flush()
                for zeile in antwort:
                    self.wfile.write(zeile)
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                return

    return Handler


class _KeineWeiterleitung(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_a, **_k):
        return None


_OEFFNER = urllib.request.build_opener(_KeineWeiterleitung)


def pruefe_upstream(adresse: str, test: bool) -> str:
    teile = urllib.parse.urlsplit(adresse)
    if test and teile.scheme == "http" and teile.hostname in ("127.0.0.1", "localhost"):
        return adresse
    if teile.scheme != "https" or teile.hostname not in ERLAUBTE_UPSTREAM_HOSTS or teile.query or teile.username:
        raise SystemExit(f"Upstream {adresse!r} ist nicht zulässig (nur https, Hosts: {sorted(ERLAUBTE_UPSTREAM_HOSTS)}).")
    return adresse


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--policy", required=True)
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=8791)
    p.add_argument("--upstream", default="https://openrouter.ai/api/v1/chat/completions")
    p.add_argument("--test-upstream-erlauben", action="store_true", help="nur für Tests: http://127.0.0.1 als Upstream")
    a = p.parse_args(argv)
    if a.host not in ("127.0.0.1", "::1", "localhost"):
        raise SystemExit("Der Wächter bindet nur an die lokale Schleife.")
    modell, stufe = lade_policy(a.policy)
    upstream = pruefe_upstream(a.upstream, a.test_upstream_erlauben)
    key, token = os.environ.get("WAECHTER_UPSTREAM_KEY", ""), os.environ.get("WAECHTER_CLIENT_TOKEN", "")
    if not key or len(token) < 24 or key == token:
        raise SystemExit("WAECHTER_UPSTREAM_KEY fehlt, oder WAECHTER_CLIENT_TOKEN ist kürzer als 24 Zeichen oder gleich dem Schlüssel.")

    def protokoll(eintrag: dict) -> None:
        print(json.dumps(eintrag, ensure_ascii=False), file=sys.stderr, flush=True)

    server = ThreadingHTTPServer((a.host, a.port), baue_handler(modell, stufe, upstream, key, token, protokoll))
    print(json.dumps({"lauscht": f"{a.host}:{server.server_address[1]}", "modell": modell, "reasoning": stufe}), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
