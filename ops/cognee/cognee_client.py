#!/usr/bin/env python3
"""Kontrollierter Adapter für die Cognee-Instanz der Agentur (Brain).

Standard ist AUS. Kein Aufruf wird vorbereitet oder gesendet ohne
  1. ``COGNEE_ENABLED=1`` (für Aufnahme und Graphbau je ein weiterer Schalter),
  2. die Freigaben der jeweiligen Wirkung in ``config/integrations/cognee.json``
     (``null`` heißt gesperrt; welche Wirkung welche Freigaben braucht, steht in
     ``FREIGABEN`` unten und gilt für Lesen genauso wie für Schreiben),
  3. eine Rolle (``COGNEE_ROLE``), die diese Wirkung haben darf,
  4. einen erlaubten https-Host, den Mandanten dieser Laufzeit und dessen Datensatz.

Der Adapter löscht nichts, legt keine Mandanten oder Schlüssel an und ruft selbst kein
Modell auf. Nur Standardbibliothek. Ergebnisse sind Wörterbücher mit ``status``; weder
Schlüssel noch Aufnahmegut noch der Rumpf einer Fehlerantwort erscheinen in einer Meldung.
"""
from __future__ import annotations

import fnmatch
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Mapping

import geheimnis_filter

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "config/integrations/cognee.json"

# Antwort eines Transports: (HTTP-Status, Rumpf als Bytes). Netzfehler: TransportError.
Transport = Callable[[str, str, Mapping[str, str], "bytes | None", float], "tuple[int, bytes]"]

DATASET_NAME = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*--[a-z0-9]+(-[a-z0-9]+)*$")
DATASET_ID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
PFAD = re.compile(r"^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$")
DOKUMENTNAME = re.compile(r"^[A-Za-z0-9._~-]{1,200}$")
SUCHARTEN = ("CHUNKS", "SUMMARIES", "RAG_COMPLETION", "GRAPH_COMPLETION", "HYBRID_COMPLETION")
# Sucharten, die auf der Instanz ein Sprachmodell aufrufen: eigene Kostenfreigabe, nie wiederholt.
SUCHARTEN_MIT_MODELL = ("RAG_COMPLETION", "GRAPH_COMPLETION", "HYBRID_COMPLETION")

ROLLEN = {
    "aufnahme": {"wirkungen": ("zustand", "datensaetze", "aufnehmen", "graph_bauen"),
                 "freigabe": "aufnahme_agenturwissen"},
    "lesen-claude": {"wirkungen": ("zustand", "datensaetze", "suchen", "antwortsuche"),
                     "freigabe": "leser_claude_sitzungen"},
    "lesen-hermes": {"wirkungen": ("zustand", "datensaetze", "suchen", "antwortsuche"),
                     "freigabe": "leser_hermes"},
}
_GRUND = ("instanz_wiederhergestellt_und_gesichert",)
_MANDANT = _GRUND + ("mandant_und_dienstschluessel_angelegt",)
# Freigaben je Wirkung, zusätzlich zur Freigabe der Rolle. Jede steht in der Konfiguration auf null.
FREIGABEN = {
    "zustand": _GRUND,
    "datensaetze": _MANDANT,
    "aufnehmen": _MANDANT,
    "graph_bauen": _MANDANT + ("modell_und_embedding_bestaetigt", "graph_bauen_mit_kostenrahmen"),
    # Schon die einfache Suche bettet die Frage auf der Instanz ein (Embedding-Anbieter).
    "suchen": _MANDANT + ("rechteprobe_bestanden", "modell_und_embedding_bestaetigt"),
    "antwortsuche": _MANDANT + ("rechteprobe_bestanden", "modell_und_embedding_bestaetigt",
                                "antwortsuche_mit_kostenrahmen"),
}


class TransportError(Exception):
    """Netzfehler ohne HTTP-Antwort. Trägt nur eine feste Art, keinen Fehlertext."""

    def __init__(self, art: str = "netzfehler"):
        art = art if isinstance(art, str) and re.fullmatch(r"[A-Za-z]{1,40}", art) else "netzfehler"
        super().__init__(art)
        self.art = art


class Abbruch(Exception):
    """Der Adapter verweigert die Wirkung. ``status`` ist maschinenlesbar."""

    def __init__(self, status: str, grund: str):
        super().__init__(grund)
        self.status = status
        self.grund = grund

    def als_ergebnis(self) -> dict:
        return {"status": self.status, "grund": self.grund, "gesendet": False}


def find_secrets(text: str) -> list[str]:
    """Musterabgleich, kein Schutz; siehe ``geheimnis_filter``."""
    return geheimnis_filter.find_secrets(text)


def load_config(path: Path = CONFIG_PATH) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def normalize_path(relative_path) -> str:
    """Nur einfache relative Pfade: keine Wurzel, kein ``..``, kein ``.``, keine Sonderzeichen."""
    if not isinstance(relative_path, str) or len(relative_path) > 300 or not PFAD.match(relative_path):
        raise Abbruch("quelle_abgelehnt", "Pfad hat keine zulässige Form")
    if any(part in (".", "..") for part in relative_path.split("/")):
        raise Abbruch("quelle_abgelehnt", "Pfad hat keine zulässige Form")
    return relative_path


def _glob_match(path: str, pattern: str) -> bool:
    """Abgleich je Pfadteil; ``*`` überschreitet keinen Schrägstrich."""
    parts, wanted = path.split("/"), pattern.split("/")
    return len(parts) == len(wanted) and all(fnmatch.fnmatchcase(p, w) for p, w in zip(parts, wanted))


def excluded(relative_path: str, patterns) -> bool:
    """Sperrliste, ohne Rücksicht auf Groß- und Kleinschreibung, je Pfad, Pfadanfang und Dateiname."""
    pure = relative_path.casefold()
    parts = pure.split("/")
    for pattern in patterns:
        wanted = pattern.casefold()
        if fnmatch.fnmatchcase(pure, wanted) or any(fnmatch.fnmatchcase(part, wanted) for part in parts):
            return True
        if wanted.endswith("/*") and (pure + "/").startswith(wanted[:-1]):
            return True
    return False


def dataset_for(relative_path: str, config: dict) -> str:
    """Datensatz laut Positivliste. Abbruch, wenn der Pfad gesperrt ist oder nicht auf der Liste steht."""
    path = normalize_path(relative_path)
    quellen = config.get("quellen", {})
    if excluded(path, quellen.get("nie_aufnehmen", [])):
        raise Abbruch("quelle_abgelehnt", "Pfad steht auf der Liste nie_aufnehmen")
    for rule in quellen.get("aufnehmen", []):
        if _glob_match(path, rule["muster"]):
            return rule["datensatz"]
    raise Abbruch("quelle_abgelehnt", "Pfad steht nicht auf der Positivliste quellen.aufnehmen")


def document_name(relative_path: str) -> str:
    """Ein Name je Pfad, umkehrbar eindeutig. Eine neue Fassung trägt denselben Namen."""
    name = normalize_path(relative_path).replace("/", "~")
    if not DOKUMENTNAME.match(name):
        raise Abbruch("quelle_abgelehnt", "Dokumentname hat keine zulässige Form")
    return name


@dataclass(frozen=True)
class Settings:
    enabled: bool
    ingest_enabled: bool
    cognify_enabled: bool
    base_url: str
    tenant: str
    role: str
    auth_mode: str
    api_key: str = field(repr=False)

    @classmethod
    def from_env(cls, env: Mapping[str, str]) -> "Settings":
        return cls(
            enabled=env.get("COGNEE_ENABLED", "") == "1",
            ingest_enabled=env.get("COGNEE_INGEST_ENABLED", "") == "1",
            cognify_enabled=env.get("COGNEE_COGNIFY_ENABLED", "") == "1",
            base_url=env.get("COGNEE_BASE_URL", "").strip(),
            tenant=env.get("COGNEE_TENANT", "").strip(),
            role=env.get("COGNEE_ROLE", "").strip(),
            auth_mode=env.get("COGNEE_AUTH_MODE", "api_key").strip() or "api_key",
            api_key=env.get("COGNEE_API_KEY", ""),
        )


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Keine Weiterleitung verfolgen: ein Schlüssel darf den erlaubten Host nicht verlassen."""

    def redirect_request(self, *args, **kwargs):
        return None


class UrllibTransport:
    """Echter Transport mit Gesamtfrist und Größengrenze der Antwort."""

    def __init__(self, max_bytes: int, clock: Callable[[], float] = time.monotonic):
        self.max_bytes = int(max_bytes)
        self._clock = clock

    def __call__(self, method, url, headers, body, timeout):
        deadline = self._clock() + timeout
        request = urllib.request.Request(url, data=body, method=method, headers=dict(headers))
        opener = urllib.request.build_opener(_NoRedirect)
        try:
            try:
                response = opener.open(request, timeout=timeout)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                chunks, size = [], 0
                while size <= self.max_bytes:
                    remaining = deadline - self._clock()
                    if remaining <= 0:
                        raise TransportError("Gesamtfrist")
                    self._limit_socket(response, remaining)
                    # read1 kehrt nach einem Lesevorgang zurück; read würde bei tröpfelnden Daten
                    # bis zum vollen Block warten und die Gesamtfrist nie prüfen.
                    chunk = response.read1(min(65536, self.max_bytes + 1 - size))
                    if not chunk:
                        break
                    chunks.append(chunk)
                    size += len(chunk)
                return response.status, b"".join(chunks)
        except TransportError:
            raise
        except TimeoutError:
            raise TransportError("Zeitlimit") from None
        except (urllib.error.URLError, OSError, ValueError):
            raise TransportError("netzfehler") from None


    @staticmethod
    def _limit_socket(response, seconds: float) -> None:
        """Restzeit auf den Socket legen, soweit er erreichbar ist; sonst gilt das Zeitlimit je Lesevorgang."""
        try:
            response.fp.raw._sock.settimeout(max(seconds, 0.05))
        except (AttributeError, OSError, ValueError):
            pass


class CogneeClient:
    """Alle Prüfungen laufen vor dem ersten Aufruf des Transports."""

    def __init__(self, env: Mapping[str, str], *, config: dict | None = None,
                 transport: Transport | None = None, sleep: Callable[[float], None] = time.sleep):
        self.settings = Settings.from_env(env)
        self.config = config if config is not None else load_config()
        limits = self.config.get("grenzen", {})
        self._max_response = int(limits.get("max_antwort_bytes", 2_000_000))
        self._transport = transport or UrllibTransport(self._max_response)
        self._sleep = sleep
        self.calls = 0

    # ---- Prüfungen (ohne Netz) -------------------------------------------------

    def _authorize(self, wirkung: str) -> None:
        """Schalter, Rolle und Freigaben. Gilt für jede Wirkung, auch für lesende."""
        if not self.settings.enabled:
            raise Abbruch("aus", "COGNEE_ENABLED ist nicht 1; es wird nichts gesendet")
        if wirkung == "aufnehmen" and not self.settings.ingest_enabled:
            raise Abbruch("aus", "COGNEE_INGEST_ENABLED ist nicht 1; es wird nichts aufgenommen")
        if wirkung == "graph_bauen" and not self.settings.cognify_enabled:
            raise Abbruch("aus", "COGNEE_COGNIFY_ENABLED ist nicht 1; der Graph wird nicht gebaut")
        role = ROLLEN.get(self.settings.role)
        if role is None:
            raise Abbruch("konfiguration_fehlt", "COGNEE_ROLE fehlt oder ist unbekannt")
        if wirkung not in role["wirkungen"]:
            raise Abbruch("rolle_abgelehnt", "Die Rolle dieser Laufzeit darf diese Wirkung nicht auslösen")
        freigaben = self.config.get("freigaben", {})
        for key in FREIGABEN[wirkung] + (role["freigabe"],):
            if freigaben.get(key) is not True:
                raise Abbruch("freigabe_fehlt",
                              f"Freigabe '{key}' in config/integrations/cognee.json ist nicht gesetzt")

    def _base(self) -> str:
        url = self.settings.base_url
        if not url:
            raise Abbruch("konfiguration_fehlt", "COGNEE_BASE_URL fehlt")
        try:
            parts = urllib.parse.urlsplit(url)
            port, host = parts.port, parts.hostname
        except ValueError:
            raise Abbruch("adresse_abgelehnt", "COGNEE_BASE_URL ist keine gültige Adresse") from None
        if parts.scheme != "https":
            raise Abbruch("adresse_abgelehnt", "COGNEE_BASE_URL muss https sein")
        if parts.username or parts.password or "@" in parts.netloc:
            raise Abbruch("adresse_abgelehnt", "COGNEE_BASE_URL darf keine Zugangsdaten enthalten")
        allowed = self.config.get("instanz", {}).get("erlaubte_hosts", [])
        if not isinstance(host, str) or not any(host == entry for entry in allowed) or port not in (None, 443):
            raise Abbruch("adresse_abgelehnt", "Host oder Port von COGNEE_BASE_URL ist nicht freigegeben")
        if parts.path.strip("/") or parts.query or parts.fragment:
            raise Abbruch("adresse_abgelehnt", "COGNEE_BASE_URL darf keinen Pfad und keine Abfrage enthalten")
        return f"https://{host}"

    def _tenant(self) -> dict:
        name = self.settings.tenant
        if not name:
            raise Abbruch("konfiguration_fehlt", "COGNEE_TENANT fehlt")
        tenant = self.config.get("mandanten", {}).get(name)
        if tenant is None:
            raise Abbruch("mandant_abgelehnt", "Mandant ist in diesem Repository nicht zugelassen")
        return tenant

    def _dataset(self, dataset) -> str:
        tenant = self._tenant()
        if not isinstance(dataset, str) or not DATASET_NAME.match(dataset):
            raise Abbruch("mandant_abgelehnt", "Datensatzname hat nicht die Form <mandant>--<name>")
        if not dataset.startswith(tenant["datensatz_praefix"]) or dataset not in tenant.get("datensaetze", {}):
            raise Abbruch("mandant_abgelehnt", "Datensatz gehört nicht zum Mandanten dieser Laufzeit")
        return dataset

    def _dataset_id(self, dataset) -> str:
        """Leser sprechen Datensätze über die Kennung an; Namen gelten nur für den Eigentümer."""
        name = self._dataset(dataset)
        value = self._tenant()["datensaetze"][name].get("id")
        if not isinstance(value, str) or not DATASET_ID.match(value):
            raise Abbruch("konfiguration_fehlt", "Kennung des Datensatzes ist in der Konfiguration nicht eingetragen")
        return value

    def _headers(self) -> dict:
        mode = self.settings.auth_mode
        if mode == "proxy":
            return {}
        if mode != "api_key":
            raise Abbruch("konfiguration_fehlt", "COGNEE_AUTH_MODE muss api_key oder proxy sein")
        key = self.settings.api_key
        if not key or key != key.strip() or not key.isascii() or any(ord(c) < 33 for c in key):
            raise Abbruch("konfiguration_fehlt", "COGNEE_API_KEY fehlt oder ist formal ungültig")
        return {"X-Api-Key": key}

    # ---- Senden ----------------------------------------------------------------

    def _send(self, method: str, path: str, *, headers=None, body=None, retry: bool,
              effect: bool = False, credential: bool = True) -> dict:
        """``retry`` nur für lesende Aufrufe ohne Modellkosten; ``effect`` kennzeichnet Wirkung."""
        limits = self.config.get("grenzen", {})
        attempts = 1 + (min(int(limits.get("wiederholungen", 0)), 3) if retry else 0)
        retry_status = set(limits.get("wiederholen_bei_status", []))
        timeout = min(float(limits.get("zeitlimit_sekunden", 30)), 60.0)
        url = self._base() + path
        all_headers = {"Accept": "application/json", **(self._headers() if credential else {}), **(headers or {})}
        last = {"status": "nicht_erreichbar", "http": None}
        for attempt in range(attempts):
            if attempt:
                self._sleep(min(2 ** attempt, 8))
            self.calls += 1
            try:
                code, raw = self._transport(method, url, all_headers, body, timeout)
            except TransportError as error:
                last = {"status": "nicht_erreichbar", "http": None, "fehler": error.art}
                continue
            if code in retry_status:
                last = {"status": "nicht_erreichbar", "http": code}
                continue
            return self._classify(code, raw, attempt + 1)
        last.update({"gesendet": True, "versuche": attempts, "ergebnis_unbekannt": effect})
        return last

    def _classify(self, code, raw: bytes, attempts: int) -> dict:
        result = {"http": code, "gesendet": True, "versuche": attempts}
        if isinstance(code, int) and 200 <= code < 300:
            if len(raw) > self._max_response:
                return {**result, "status": "antwort_zu_gross"}
            try:
                result["daten"] = json.loads(raw.decode("utf-8")) if raw else None
            except (UnicodeDecodeError, json.JSONDecodeError):
                return {**result, "status": "antwort_unlesbar"}
            return {**result, "status": "ok"}
        names = {401: "anmeldung_abgelehnt", 403: "recht_fehlt", 404: "nicht_gefunden",
                 409: "konflikt", 422: "eingabe_abgelehnt"}
        # Der Rumpf einer Fehlerantwort wird nie weitergegeben.
        return {**result, "status": names.get(code, "fehler")}

    # ---- Wirkungen -------------------------------------------------------------

    def health(self) -> dict:
        self._authorize("zustand")
        return self._send("GET", "/health", retry=True, credential=False)

    def list_datasets(self) -> dict:
        self._authorize("datensaetze")
        self._tenant()
        return self._send("GET", "/api/v1/datasets", retry=True)

    def search(self, query: str, datasets: list[str], *, search_type: str | None = None,
               top_k: int | None = None) -> dict:
        limits = self.config.get("grenzen", {})
        search_type = search_type or limits.get("suchart_standard", "CHUNKS")
        if search_type not in SUCHARTEN:
            raise Abbruch("eingabe_abgelehnt", "Suchart ist nicht zugelassen")
        with_model = search_type in SUCHARTEN_MIT_MODELL
        self._authorize("antwortsuche" if with_model else "suchen")
        if not isinstance(query, str) or not query.strip() or len(query) > 2000:
            raise Abbruch("eingabe_abgelehnt", "Frage fehlt oder ist zu lang")
        if not geheimnis_filter.is_plain_text(query) or find_secrets(query):
            raise Abbruch("geheimnis_gefunden", "Die Frage enthält ein Geheimnis-Muster oder Steuerzeichen")
        if not isinstance(datasets, (list, tuple)) or not datasets:
            raise Abbruch("mandant_abgelehnt", "Suche ohne Datensatz ist nicht zugelassen")
        ids = [self._dataset_id(d) for d in datasets]
        wanted = limits.get("treffer_standard", 8) if top_k is None else top_k
        if not isinstance(wanted, int) or isinstance(wanted, bool) or not 1 <= wanted <= int(limits.get("treffer_max", 25)):
            raise Abbruch("eingabe_abgelehnt", "Trefferzahl liegt außerhalb der Grenze")
        body = json.dumps({"searchType": search_type, "query": query, "datasetIds": ids,
                           "topK": wanted}).encode("utf-8")
        # Antwort-Sucharten kosten je Aufruf: nie wiederholen.
        return self._send("POST", "/api/v1/search", headers={"Content-Type": "application/json"},
                          body=body, retry=not with_model, effect=with_model)

    def add_document(self, dataset: str, relative_path: str, content: bytes) -> dict:
        self._authorize("aufnehmen")
        name = self._dataset(dataset)
        if dataset_for(relative_path, self.config) != name:
            raise Abbruch("quelle_abgelehnt", "Pfad gehört laut Positivliste in einen anderen Datensatz")
        limit = int(self.config.get("grenzen", {}).get("max_bytes_je_datei", 0))
        if not isinstance(content, bytes) or not content or not limit or len(content) > limit:
            raise Abbruch("quelle_abgelehnt", "Datei ist leer oder größer als die Grenze")
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise Abbruch("quelle_abgelehnt", "Datei ist kein UTF-8-Text") from None
        if not geheimnis_filter.is_plain_text(text):
            raise Abbruch("quelle_abgelehnt", "Datei enthält Steuerzeichen und gilt nicht als Text")
        hits = find_secrets(text)
        if hits:
            raise Abbruch("geheimnis_gefunden", f"{len(hits)} Geheimnis-Muster im Aufnahmegut; nichts gesendet")
        filename = document_name(relative_path)
        boundary = "nx" + uuid.uuid4().hex
        if boundary.encode() in content:
            raise Abbruch("quelle_abgelehnt", "Trennmarke kommt im Inhalt vor")
        body = _multipart(boundary, {"datasetName": name}, filename, content)
        # Kein erneutes Senden: der Ausgang einer Aufnahme wird gemeldet, nicht geraten.
        result = self._send("POST", "/api/v1/add",
                            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
                            body=body, retry=False, effect=True)
        result.pop("daten", None)
        result.update({"datensatz": name, "dokument": filename})
        return result

    def cognify(self, datasets: list[str]) -> dict:
        self._authorize("graph_bauen")
        if not isinstance(datasets, (list, tuple)) or not datasets:
            raise Abbruch("mandant_abgelehnt", "Graphbau ohne Datensatz ist nicht zugelassen")
        names = [self._dataset(d) for d in datasets]
        # Feldname laut Dokumentation (Fließtext): run_in_background. Ohne dieses Feld läuft der
        # Graphbau blockierend; an /openapi.json der Instanz zu prüfen, bevor die Freigabe gesetzt wird.
        body = json.dumps({"datasets": names, "run_in_background": True}).encode("utf-8")
        # Kein erneutes Senden: ein doppelter Graphbau kostet doppelt.
        return self._send("POST", "/api/v1/cognify", headers={"Content-Type": "application/json"},
                          body=body, retry=False, effect=True)


def _multipart(boundary: str, fields: Mapping[str, str], filename: str, content: bytes) -> bytes:
    if not DOKUMENTNAME.match(filename) or not re.fullmatch(r"[A-Za-z0-9]{1,70}", boundary):
        raise Abbruch("quelle_abgelehnt", "Dokumentname hat keine zulässige Form")
    lines: list[bytes] = []
    for key, value in fields.items():
        if not re.fullmatch(r"[A-Za-z]{1,40}", key) or not re.fullmatch(r"[A-Za-z0-9._-]{1,120}", value):
            raise Abbruch("quelle_abgelehnt", "Formularfeld hat keine zulässige Form")
        lines += [f"--{boundary}".encode(), f'Content-Disposition: form-data; name="{key}"'.encode(),
                  b"", value.encode("ascii")]
    lines += [f"--{boundary}".encode(),
              f'Content-Disposition: form-data; name="data"; filename="{filename}"'.encode(),
              b"Content-Type: text/plain; charset=utf-8", b"", content,
              f"--{boundary}--".encode(), b""]
    return b"\r\n".join(lines)
