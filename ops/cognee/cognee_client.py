#!/usr/bin/env python3
"""Kontrollierter Adapter für die Cognee-Instanz der Agentur (Brain).

Standard ist AUS: Ohne ``COGNEE_ENABLED=1`` wird kein Netzaufruf vorbereitet oder
gesendet. Jede Wirkung braucht zusätzlich eine gesetzte Freigabe in
``config/integrations/cognee.json`` (``null`` heißt gesperrt), einen erlaubten
https-Host und einen freigegebenen Mandanten. Der Adapter löscht nichts, legt keine
Mandanten oder Schlüssel an und ruft selbst kein Modell auf.

Nur Standardbibliothek. Ergebnisse sind Wörterbücher mit ``status``; ein Schlüssel
oder Aufnahmegut erscheint nie in einer Meldung.
"""
from __future__ import annotations

import fnmatch
import hashlib
import importlib.util
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Mapping

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "config/integrations/cognee.json"

# Antwort eines Transports: (HTTP-Status, Rumpf als Bytes). Netzfehler: TransportError.
Transport = Callable[[str, str, Mapping[str, str], "bytes | None", float], "tuple[int, bytes]"]

DATASET_NAME = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*--[a-z0-9]+(-[a-z0-9]+)*$")
SUCHARTEN = ("CHUNKS", "SUMMARIES", "RAG_COMPLETION", "GRAPH_COMPLETION", "HYBRID_COMPLETION")
# Sucharten, die auf der Instanz ein Modell aufrufen; brauchen die Freigabe für Modellkosten.
SUCHARTEN_MIT_MODELL = ("RAG_COMPLETION", "GRAPH_COMPLETION", "HYBRID_COMPLETION")


class TransportError(Exception):
    """Netzfehler ohne HTTP-Antwort (Zeitüberschreitung, Verbindung abgelehnt)."""


class Abbruch(Exception):
    """Der Adapter verweigert die Wirkung. ``status`` ist maschinenlesbar."""

    def __init__(self, status: str, grund: str):
        super().__init__(grund)
        self.status = status
        self.grund = grund

    def als_ergebnis(self) -> dict:
        return {"status": self.status, "grund": self.grund, "gesendet": False}


def _secret_scanner():
    """Dieselben Muster wie das Lösungsregister; keine zweite Musterliste."""
    spec = importlib.util.spec_from_file_location(
        "check_loesungsregister", ROOT / "tools/check_loesungsregister.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.find_secrets


_FIND_SECRETS = None


def find_secrets(text: str) -> list[str]:
    """Funde als Beschreibung ohne Wert (Art, Zeile, Länge)."""
    global _FIND_SECRETS
    if _FIND_SECRETS is None:
        _FIND_SECRETS = _secret_scanner()
    return _FIND_SECRETS(text)


def load_config(path: Path = CONFIG_PATH) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def document_name(relative_path: str, content: bytes) -> str:
    """Stabiler Name je Inhalt: gleicher Inhalt ergibt denselben Namen."""
    digest = hashlib.sha256(content).hexdigest()[:12]
    pure = relative_path.replace("\\", "/").strip("/")
    suffix = Path(pure).suffix
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", pure[: len(pure) - len(suffix)])
    return f"{stem}@{digest}{suffix or '.txt'}"


def excluded(relative_path: str, patterns) -> bool:
    pure = relative_path.replace("\\", "/")
    name = pure.rsplit("/", 1)[-1]
    return any(fnmatch.fnmatch(pure, p) or fnmatch.fnmatch(name, p) for p in patterns)


@dataclass(frozen=True)
class Settings:
    enabled: bool
    ingest_enabled: bool
    cognify_enabled: bool
    base_url: str
    tenant: str
    auth_mode: str
    api_key: str

    @classmethod
    def from_env(cls, env: Mapping[str, str]) -> "Settings":
        return cls(
            enabled=env.get("COGNEE_ENABLED", "") == "1",
            ingest_enabled=env.get("COGNEE_INGEST_ENABLED", "") == "1",
            cognify_enabled=env.get("COGNEE_COGNIFY_ENABLED", "") == "1",
            base_url=env.get("COGNEE_BASE_URL", "").strip(),
            tenant=env.get("COGNEE_TENANT", "").strip(),
            auth_mode=env.get("COGNEE_AUTH_MODE", "api_key").strip() or "api_key",
            api_key=env.get("COGNEE_API_KEY", ""),
        )


def _urllib_transport(method, url, headers, body, timeout):
    request = urllib.request.Request(url, data=body, method=method, headers=dict(headers))
    try:
        # Keine Weiterleitungen verfolgen: ein Schlüssel darf den erlaubten Host nicht verlassen.
        opener = urllib.request.build_opener(_NoRedirect)
        with opener.open(request, timeout=timeout) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        raise TransportError(type(error).__name__) from None


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class CogneeClient:
    """Alle Prüfungen laufen vor dem ersten Aufruf des Transports."""

    def __init__(self, env: Mapping[str, str], *, config: dict | None = None,
                 transport: Transport | None = None, sleep: Callable[[float], None] = time.sleep):
        self.settings = Settings.from_env(env)
        self.config = config if config is not None else load_config()
        self._transport = transport or _urllib_transport
        self._sleep = sleep
        self.calls = 0

    # ---- Prüfungen (ohne Netz) -------------------------------------------------

    def _require_enabled(self) -> None:
        if not self.settings.enabled:
            raise Abbruch("aus", "COGNEE_ENABLED ist nicht 1; es wird nichts gesendet")

    def _require_release(self, key: str) -> None:
        if self.config.get("freigaben", {}).get(key) is not True:
            raise Abbruch("freigabe_fehlt", f"Freigabe '{key}' in config/integrations/cognee.json ist nicht gesetzt")

    def _base(self) -> str:
        url = self.settings.base_url
        if not url:
            raise Abbruch("konfiguration_fehlt", "COGNEE_BASE_URL fehlt")
        parts = urllib.parse.urlsplit(url)
        instanz = self.config.get("instanz", {})
        if parts.scheme != "https":
            raise Abbruch("adresse_abgelehnt", "COGNEE_BASE_URL muss https sein")
        if parts.username or parts.password or "@" in parts.netloc:
            raise Abbruch("adresse_abgelehnt", "COGNEE_BASE_URL darf keine Zugangsdaten enthalten")
        if parts.hostname not in instanz.get("erlaubte_hosts", []) or parts.port not in (None, 443):
            raise Abbruch("adresse_abgelehnt", "Host oder Port von COGNEE_BASE_URL ist nicht freigegeben")
        if parts.path.strip("/") or parts.query or parts.fragment:
            raise Abbruch("adresse_abgelehnt", "COGNEE_BASE_URL darf keinen Pfad und keine Abfrage enthalten")
        return f"https://{parts.hostname}"

    def _tenant(self) -> dict:
        name = self.settings.tenant
        if not name:
            raise Abbruch("konfiguration_fehlt", "COGNEE_TENANT fehlt")
        tenant = self.config.get("mandanten", {}).get(name)
        if tenant is None:
            raise Abbruch("mandant_abgelehnt", "Mandant ist in diesem Repository nicht zugelassen")
        return tenant

    def _dataset(self, dataset: str) -> str:
        tenant = self._tenant()
        if not isinstance(dataset, str) or not DATASET_NAME.match(dataset):
            raise Abbruch("mandant_abgelehnt", "Datensatzname hat nicht die Form <mandant>--<name>")
        if not dataset.startswith(tenant["datensatz_praefix"]) or dataset not in tenant.get("datensaetze", {}):
            raise Abbruch("mandant_abgelehnt", "Datensatz gehört nicht zum Mandanten dieser Laufzeit")
        return dataset

    def _headers(self) -> dict:
        mode = self.settings.auth_mode
        if mode == "proxy":
            return {}
        if mode != "api_key":
            raise Abbruch("konfiguration_fehlt", "COGNEE_AUTH_MODE muss api_key oder proxy sein")
        key = self.settings.api_key
        if not key or key != key.strip() or any(c in key for c in "\r\n"):
            raise Abbruch("konfiguration_fehlt", "COGNEE_API_KEY fehlt oder ist formal ungültig")
        return {"X-Api-Key": key}

    # ---- Senden ----------------------------------------------------------------

    def _send(self, method: str, path: str, *, headers=None, body=None, retry: bool,
              effect: bool = False) -> dict:
        """``retry`` nur für lesende Aufrufe; ``effect`` kennzeichnet schreibende Wirkung."""
        limits = self.config.get("grenzen", {})
        attempts = 1 + (int(limits.get("wiederholungen", 0)) if retry else 0)
        retry_status = set(limits.get("wiederholen_bei_status", []))
        timeout = float(limits.get("zeitlimit_sekunden", 30))
        url = self._base() + path
        all_headers = {"Accept": "application/json", **self._headers(), **(headers or {})}
        last = {"status": "nicht_erreichbar", "http": None}
        for attempt in range(attempts):
            if attempt:
                self._sleep(min(2 ** attempt, 8))
            self.calls += 1
            try:
                code, raw = self._transport(method, url, all_headers, body, timeout)
            except TransportError as error:
                last = {"status": "nicht_erreichbar", "http": None, "fehler": str(error)}
                continue
            if code in retry_status:
                last = {"status": "nicht_erreichbar", "http": code}
                continue
            return self._classify(code, raw, attempt + 1)
        last.update({"gesendet": True, "versuche": attempts, "ergebnis_unbekannt": effect})
        return last

    @staticmethod
    def _classify(code: int, raw: bytes, attempts: int) -> dict:
        result = {"http": code, "gesendet": True, "versuche": attempts}
        if 200 <= code < 300:
            try:
                result["daten"] = json.loads(raw.decode("utf-8")) if raw else None
            except (UnicodeDecodeError, json.JSONDecodeError):
                return {**result, "status": "antwort_unlesbar"}
            return {**result, "status": "ok"}
        names = {401: "anmeldung_abgelehnt", 403: "recht_fehlt", 404: "nicht_gefunden",
                 409: "konflikt", 422: "eingabe_abgelehnt"}
        return {**result, "status": names.get(code, "fehler")}

    # ---- Wirkungen -------------------------------------------------------------

    def health(self) -> dict:
        self._require_enabled()
        return self._send("GET", "/health", retry=True)

    def list_datasets(self) -> dict:
        self._require_enabled()
        self._tenant()
        return self._send("GET", "/api/v1/datasets", retry=True)

    def search(self, query: str, datasets: list[str], *, search_type: str | None = None,
               top_k: int | None = None) -> dict:
        self._require_enabled()
        limits = self.config.get("grenzen", {})
        search_type = search_type or limits.get("suchart_standard", "CHUNKS")
        if search_type not in SUCHARTEN:
            raise Abbruch("eingabe_abgelehnt", "Suchart ist nicht zugelassen")
        if search_type in SUCHARTEN_MIT_MODELL:
            self._require_release("modell_und_embedding_bestaetigt")
        if not isinstance(query, str) or not query.strip() or len(query) > 2000:
            raise Abbruch("eingabe_abgelehnt", "Frage fehlt oder ist zu lang")
        if find_secrets(query):
            raise Abbruch("geheimnis_gefunden", "Die Frage enthält ein Geheimnis-Muster")
        if not datasets:
            raise Abbruch("mandant_abgelehnt", "Suche ohne Datensatz ist nicht zugelassen")
        names = [self._dataset(d) for d in datasets]
        body = json.dumps({"searchType": search_type, "query": query, "datasets": names,
                           "topK": int(top_k or limits.get("treffer_standard", 8))}).encode("utf-8")
        return self._send("POST", "/api/v1/search", headers={"Content-Type": "application/json"},
                          body=body, retry=True)

    def add_document(self, dataset: str, relative_path: str, content: bytes) -> dict:
        self._require_enabled()
        if not self.settings.ingest_enabled:
            raise Abbruch("aus", "COGNEE_INGEST_ENABLED ist nicht 1; es wird nichts aufgenommen")
        tenant = self._tenant()
        self._require_release(tenant["freigabe_schluessel"])
        name = self._dataset(dataset)
        quellen = self.config.get("quellen", {})
        if excluded(relative_path, quellen.get("nie_aufnehmen", [])):
            raise Abbruch("quelle_abgelehnt", "Pfad steht auf der Liste nie_aufnehmen")
        limit = int(self.config.get("grenzen", {}).get("max_bytes_je_datei", 0))
        if not content or (limit and len(content) > limit):
            raise Abbruch("quelle_abgelehnt", "Datei ist leer oder größer als die Grenze")
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise Abbruch("quelle_abgelehnt", "Datei ist kein UTF-8-Text") from None
        hits = find_secrets(text)
        if hits:
            raise Abbruch("geheimnis_gefunden", f"{len(hits)} Geheimnis-Muster im Aufnahmegut; nichts gesendet")
        filename = document_name(relative_path, content)
        boundary = "nx" + uuid.uuid4().hex
        body = _multipart(boundary, {"datasetName": name}, filename, content)
        result = self._send("POST", "/api/v1/add",
                            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
                            body=body, retry=False, effect=True)
        result.update({"datensatz": name, "dokument": filename})
        return result

    def cognify(self, datasets: list[str]) -> dict:
        self._require_enabled()
        if not self.settings.cognify_enabled:
            raise Abbruch("aus", "COGNEE_COGNIFY_ENABLED ist nicht 1; der Graph wird nicht gebaut")
        self._require_release("modell_und_embedding_bestaetigt")
        self._require_release("graph_bauen_mit_kostenrahmen")
        names = [self._dataset(d) for d in datasets]
        if not names:
            raise Abbruch("mandant_abgelehnt", "Graphbau ohne Datensatz ist nicht zugelassen")
        body = json.dumps({"datasets": names, "runInBackground": True}).encode("utf-8")
        # Kein erneutes Senden: ein doppelter Graphbau kostet doppelt.
        return self._send("POST", "/api/v1/cognify", headers={"Content-Type": "application/json"},
                          body=body, retry=False, effect=True)


def _multipart(boundary: str, fields: Mapping[str, str], filename: str, content: bytes) -> bytes:
    lines: list[bytes] = []
    for key, value in fields.items():
        lines += [f"--{boundary}".encode(), f'Content-Disposition: form-data; name="{key}"'.encode(),
                  b"", value.encode("utf-8")]
    lines += [f"--{boundary}".encode(),
              f'Content-Disposition: form-data; name="data"; filename="{filename}"'.encode(),
              b"Content-Type: text/plain; charset=utf-8", b"", content,
              f"--{boundary}--".encode(), b""]
    return b"\r\n".join(lines)
