#!/usr/bin/env python3
"""Native visitor workspace. No model, mail or external calendar is impersonated; real Resend mail,
ElevenLabs read-aloud and the separate ChatGPT test option run only when explicitly enabled."""
from __future__ import annotations
import argparse
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import secrets
import sqlite3
import time
from urllib.parse import urlsplit, unquote, parse_qs
import uuid
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "apps/web"
AMSTERDAM = ZoneInfo("Europe/Amsterdam")


def capabilities(features=None):
    """Implemented operations. Provider flags are true only for an explicitly configured adapter;
    they describe availability, never a delivery or answer quality claim."""
    return {"quote_pdf": True, "pending_outbox": True, "booking_request": True, "marketing_template": True,
            "email_delivery": bool(features and features.mail), "local_planning": True, "external_calendar": False, "model_chat": False,
            "speech_readout": bool(features and features.speech), "chatgpt_option": bool(features and features.chatgpt)}


def integrations():
    """Load the sibling provider module both as script and via importlib in tests."""
    import importlib.util
    import sys
    name = "nexify_gateway_integrations"
    if name not in sys.modules:
        spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name("integrations.py"))
        module = importlib.util.module_from_spec(spec)
        sys.modules[name] = module
        spec.loader.exec_module(module)
    return sys.modules[name]


class Rejected(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def strict_json(raw):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("duplicate")
            result[key] = value
        return result
    def constant(_):
        raise ValueError("nonfinite")
    value = json.loads(raw, object_pairs_hook=unique, parse_constant=constant)
    if not isinstance(value, dict):
        raise ValueError("object required")
    for key, item in value.items():
        key.encode("utf-8")
        if isinstance(item, str):
            item.encode("utf-8")
        elif not (item is None or type(item) in {bool, int}):
            raise ValueError("flat typed input required")
    return value


def text(body, key, limit=3000, required=True):
    value = body.get(key, "")
    if not isinstance(value, str) or len(value) > limit or any(ord(c) < 32 and c not in "\n\t" for c in value):
        raise Rejected(422, "invalid_" + key)
    value = value.strip()
    if required and not value:
        raise Rejected(422, "missing_" + key)
    return value


def make_pdf(quote):
    """Small real PDF, fixed font and bounded text; never embeds markup or JavaScript."""
    import textwrap
    rows = ["NeXify AI - Angebotsentwurf", "ENTWURF - NICHT VERBINDLICH", "", quote["title"], "", "Leistungsumfang / Ihr Vorhaben"]
    for paragraph in quote["details"].splitlines():
        rows.extend(textwrap.wrap(paragraph, width=88) or [""])
    rows += ["", "Nicht enthalten: noch gemeinsam abzugrenzen.", "Zeitrahmen und Abhaengigkeiten: noch nicht vereinbart.",
             "Preise, Steuern, finaler Umfang und Anbieterangaben: zur Freigabe.",
             "Keine zahlungspflichtige Annahme. Dieser Entwurf ist keine Rechnung.", "Referenz: " + quote["id"]]
    # Quote input is limited to 3000 chars; paginate rather than silently truncate.
    pages = [rows[i:i + 44] for i in range(0, len(rows), 44)]
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>", b"", b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]
    page_refs = []
    for group in pages:
        page_id, stream_id = len(objects) + 1, len(objects) + 2
        page_refs.append(f"{page_id} 0 R")
        content = "BT /F1 11 Tf 50 790 Td 16 TL\n"
        for row in group:
            escaped = row.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            content += "(" + escaped + ") Tj T*\n"
        content += "ET"
        stream = content.encode("cp1252", "replace")
        objects.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents {stream_id} 0 R >>".encode())
        objects.append(b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream")
    objects[1] = ("<< /Type /Pages /Kids [" + " ".join(page_refs) + "] /Count " + str(len(pages)) + " >>").encode()
    output, offsets = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"), [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(output)); output.extend(f"{number} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = len(output)
    output.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode())
    output.extend(f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return bytes(output)


class Store:
    def __init__(self, path, mail_policy=None):
        self.path = str(path)
        self.mail_policy = mail_policy
        self.page_contexts = {page["path"]: {"page_id": page["id"], "path": page["path"]} for page in public_pages()}
        Path(path).parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with self.connect() as db:
            db.executescript("""
              PRAGMA journal_mode=WAL;
              CREATE TABLE IF NOT EXISTS visitors(id TEXT PRIMARY KEY,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
              CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,owner TEXT NOT NULL,role TEXT NOT NULL,body TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS objects(id TEXT PRIMARY KEY,owner TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS receipts(owner TEXT,operation TEXT,key TEXT,payload_hash TEXT,response TEXT,PRIMARY KEY(owner,operation,key));
              CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,owner TEXT NOT NULL,quote_id TEXT NOT NULL,email TEXT NOT NULL,state TEXT NOT NULL,UNIQUE(owner,quote_id,email));
              CREATE TABLE IF NOT EXISTS slots(id TEXT PRIMARY KEY,starts TEXT NOT NULL UNIQUE,source TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,owner TEXT NOT NULL,slot_id TEXT NOT NULL UNIQUE,state TEXT NOT NULL,payload TEXT NOT NULL);
            """ + integrations().MAIL_SCHEMA)
        Path(path).chmod(0o600)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=5)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def visitor(self, raw=None):
        if raw:
            with self.connect() as db:
                row = db.execute("SELECT * FROM visitors WHERE id=? AND expires>?", (digest(raw), int(time.time()))).fetchone()
            if row is None:
                raise Rejected(401, "session_invalid")
            return dict(row), None
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        row = {"id": digest(token), "csrf": csrf, "expires": int(time.time()) + 86400}
        with self.connect() as db:
            db.execute("INSERT INTO visitors VALUES (?,?,?)", tuple(row.values()))
        return row, token

    def object(self, owner, identifier, kind):
        with self.connect() as db:
            row = db.execute("SELECT payload FROM objects WHERE id=? AND owner=? AND kind=?", (identifier, owner, kind)).fetchone()
        if row is None:
            raise Rejected(404, "not_found")
        return json.loads(row[0])

    def action(self, owner, operation, key, body):
        if not re.fullmatch(r"[A-Za-z0-9_-]{8,100}", key or ""):
            raise Rejected(422, "idempotency_key_required")
        schemas = {"quote": {"title", "details", "locale"}, "booking": {"slot_id", "name", "email", "locale"},
                   "marketing": {"goal", "audience", "locale"}, "chat": {"message", "locale", "page_path"}}
        allowed = {"email", "confirmed", "locale"} if operation.startswith("send:") else schemas.get(operation)
        if allowed is None:
            raise Rejected(404, "not_found")
        if set(body) - allowed or body.get("locale", "de") not in {"de", "nl", "fr"}:
            raise Rejected(422, "unexpected_field_or_locale")
        context = None
        if operation == "chat" and "page_path" in body:
            page_path = text(body, "page_path", 240)
            canonical = page_path.rstrip("/") or "/"
            # Match a curated public path directly: no URLs, query/fragment,
            # percent decoding or arbitrary client-provided page metadata.
            context = self.page_contexts.get(canonical)
            if context is None or not page_path.startswith("/") or page_path.startswith("//"):
                raise Rejected(422, "invalid_page_context")
            body = {**body, "page_path": context["path"]}
        payload_hash = digest(json.dumps(body, sort_keys=True, ensure_ascii=False, separators=(",", ":")))
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            receipt = db.execute("SELECT payload_hash,response FROM receipts WHERE owner=? AND operation=? AND key=?", (owner, operation, key)).fetchone()
            if receipt:
                if receipt[0] != payload_hash:
                    raise Rejected(409, "idempotency_conflict")
                return json.loads(receipt[1])
            identifier = uuid.uuid4().hex
            if operation == "quote":
                result = {"id": identifier, "title": text(body, "title", 160), "details": text(body, "details"),
                          "state": "draft_price_review_required", "download_url": f"/api/quotes/{identifier}/pdf"}
                db.execute("INSERT INTO objects VALUES (?,?,?,?)", (identifier, owner, "quote", json.dumps(result)))
            elif operation.startswith("send:"):
                quote_id = operation[5:]
                if db.execute("SELECT 1 FROM objects WHERE id=? AND owner=? AND kind='quote'", (quote_id, owner)).fetchone() is None:
                    raise Rejected(404, "not_found")
                email = text(body, "email", 254)
                if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or body.get("confirmed") is not True:
                    raise Rejected(422, "explicit_recipient_confirmation_required")
                db.execute("INSERT OR IGNORE INTO outbox VALUES (?,?,?,?,?)", (identifier, owner, quote_id, email, "pending_provider"))
                row = db.execute("SELECT id,state FROM outbox WHERE owner=? AND quote_id=? AND email=?", (owner, quote_id, email)).fetchone()
                result = {"id": row[0], "state": row[1], "sent": False, "recipient": email}
                if self.mail_policy is not None:
                    quote = json.loads(db.execute("SELECT payload FROM objects WHERE id=? AND owner=? AND kind='quote'", (quote_id, owner)).fetchone()[0])
                    locale = body.get("locale", "de")
                    result["delivery"] = self.mail_policy.enqueue(db, "customer_quote", owner, quote_id, email, locale, {})
                    self.mail_policy.enqueue(db, "internal_quote", owner, quote_id, self.mail_policy.internal_to, "de",
                                             {"title": quote["title"], "details": quote["details"], "recipient": email})
            elif operation == "booking":
                slot = text(body, "slot_id", 100)
                row = db.execute("SELECT starts FROM slots WHERE id=?", (slot,)).fetchone()
                if row is None or datetime.fromisoformat(row[0]) <= datetime.now(timezone.utc):
                    raise Rejected(409, "slot_unavailable")
                details = {"name": text(body, "name", 100), "email": text(body, "email", 254)}
                if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", details["email"]):
                    raise Rejected(422, "invalid_email")
                result = {"id": identifier, "slot_id": slot, "starts": row[0], "state": "requested_local_planning", "confirmed": False}
                try:
                    db.execute("INSERT INTO bookings VALUES (?,?,?,?,?)", (identifier, owner, slot, result["state"], json.dumps(details)))
                except sqlite3.IntegrityError:
                    raise Rejected(409, "slot_unavailable") from None
                if self.mail_policy is not None:
                    locale = body.get("locale", "de")
                    result["delivery"] = self.mail_policy.enqueue(db, "customer_booking", owner, identifier, details["email"], locale,
                                                                  {"name": details["name"], "starts": row[0]})
                    self.mail_policy.enqueue(db, "internal_booking", owner, identifier, self.mail_policy.internal_to, "de",
                                             {**details, "starts": row[0]})
            elif operation == "marketing":
                goal = text(body, "goal", 800)
                audience = text(body, "audience", 500)
                templates = {
                    "de": ["Ziel: ", "Zielgruppe: ",
                           "Kernbotschaft: Bedarf und konkreten nächsten Schritt klar benennen.",
                           "Maßnahmen: bestehende Inhalte prüfen, einen passenden Kanal auswählen, einen Entwurf erstellen.",
                           "Prüfung: Aussagen belegen, Datenschutz und Rechte prüfen, vor Veröffentlichung freigeben.",
                           "Messung: qualifizierte Anfragen und vereinbarte nächste Schritte erfassen."],
                    "nl": ["Doel: ", "Doelgroep: ",
                           "Kernboodschap: benoem de behoefte en de concrete volgende stap duidelijk.",
                           "Acties: controleer bestaande inhoud, kies een passend kanaal en maak een concept.",
                           "Controle: onderbouw uitspraken, controleer privacy en rechten en laat goedkeuren vóór publicatie.",
                           "Meting: leg relevante aanvragen en afgesproken vervolgstappen vast."],
                    "fr": ["Objectif : ", "Public cible : ",
                           "Message clé : préciser le besoin et la prochaine étape concrète.",
                           "Actions : vérifier les contenus existants, choisir un canal adapté et préparer un brouillon.",
                           "Contrôle : étayer les affirmations, vérifier la confidentialité et les droits, puis faire approuver avant publication.",
                           "Mesure : suivre les demandes qualifiées et les prochaines étapes convenues."]}
                lines = templates[body.get("locale", "de")]
                result = {"id": identifier, "state": "structured_draft", "goal": goal, "audience": audience,
                          "draft": [lines[0] + goal, lines[1] + audience, *lines[2:]],
                          "published": False, "model_generated": False}
                db.execute("INSERT INTO objects VALUES (?,?,?,?)", (identifier, owner, "marketing", json.dumps(result)))
                if self.mail_policy is not None:
                    self.mail_policy.enqueue(db, "internal_marketing", owner, identifier, self.mail_policy.internal_to, "de",
                                             {"goal": goal, "audience": audience})
            elif operation == "chat":
                message = text(body, "message", 3000)
                normalized = message.casefold()
                intent = "quote" if any(x in normalized for x in ("angebot", "offert", "devis", "pdf")) else "booking" if any(x in normalized for x in ("termin", "afspraak", "rendez", "meeting")) else "marketing" if any(x in normalized for x in ("marketing", "content", "kampagn", "campagn")) else "choose"
                replies = {"quote": "Beschreiben Sie Ihr Vorhaben. Hier erstellen wir einen Angebotsentwurf und ein PDF.",
                           "booking": "Wählen Sie einen Terminvorschlag. Die Anfrage wird gespeichert; die persönliche Bestätigung steht anschließend noch aus.",
                           "marketing": "Legen wir Ziel und Zielgruppe fest. Daraus entsteht ein strukturierter Marketing-Entwurf.",
                           "choose": "Womit möchten Sie starten: Angebot besprechen, einen Termin anfragen oder Marketing planen?"}
                result = {"intent": intent, "message": replies[intent], "mode": "structured_assistant", "context": context}
                db.execute("INSERT INTO messages(owner,role,body) VALUES (?,?,?)", (owner, "user", message))
                db.execute("INSERT INTO messages(owner,role,body) VALUES (?,?,?)", (owner, "assistant", json.dumps(result)))
            else:
                raise Rejected(404, "not_found")
            db.execute("INSERT INTO receipts VALUES (?,?,?,?,?)", (owner, operation, key, payload_hash, json.dumps(result)))
            return result

    def seed_planning_slots(self):
        """Explicit preview-only proposals, not asserted operator/calendar availability."""
        now = datetime.now(AMSTERDAM)
        with self.connect() as db:
            for offset in range(1, 9):
                day = now + timedelta(days=offset)
                if day.weekday() >= 5:
                    continue
                for hour in (10, 14):
                    start = day.replace(hour=hour, minute=0, second=0, microsecond=0).isoformat()
                    db.execute("INSERT OR IGNORE INTO slots VALUES (?,?,?)", (digest(start)[:24], start, "local_planning_proposal"))


def public_pages():
    site_map = json.loads((ROOT / "config/site-map.json").read_text())
    allowlist = set(site_map.get("public_allowlist", []))
    return [{"id": page["id"], "path": page["path"], "title": page["title"]["de"],
             "purpose": page["summary"]["de"], "site_context": page["site_context"]}
            for page in site_map["pages"]
            if page["id"] in allowlist and page["access"]["visibility"] == "public" and not page["access"]["auth_required"]]


def build_server(store, host="127.0.0.1", port=3003, web_origin=None, shop=None, features=None, public_origin=None):
    if shop is not None and getattr(shop, "cart", None) is not None and shop.cart.store is not store:
        raise ValueError("shop and visitor must use the same scoped Store")
    import importlib.util as _ilu
    _pspec = _ilu.spec_from_file_location("nx_partner", Path(__file__).with_name("partner.py"))
    _pmod = _ilu.module_from_spec(_pspec); _pspec.loader.exec_module(_pmod)
    PartnerReception, PartnerError = _pmod.PartnerReception, _pmod.PartnerError
    partner = PartnerReception(store.connect)
    pages = public_pages()
    allowed_pages = {page["path"] for page in pages}
    public_host = None
    if public_origin is not None:
        parts = urlsplit(public_origin)
        # Explicit TLS origin only (reverse proxy in front); never derived from request headers.
        if parts.scheme != "https" or not parts.hostname or parts.port or parts.path or parts.query or parts.fragment or parts.username:
            raise ValueError("public_origin_must_be_plain_https_origin")
        public_host = parts.hostname
    secure = "; Secure" if public_host else ""
    class Handler(BaseHTTPRequestHandler):
        server_version = "NeXifyLocal/1"
        def setup(self):
            super().setup()
            self.connection.settimeout(10)
        def log_message(self, *_):
            pass

        def respond(self, status, payload, content_type="application/json; charset=utf-8", cookie=None, disposition=None, cart_cookie=None):
            raw = json.dumps(payload, ensure_ascii=False).encode() if isinstance(payload, (dict, list)) else payload
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "same-origin")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
            if cookie:
                self.send_header("Set-Cookie", f"nx_visit={cookie}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400{secure}")
            if cart_cookie:
                self.send_header("Set-Cookie", cart_cookie)
            if disposition:
                self.send_header("Content-Disposition", disposition)
            self.end_headers()
            self.wfile.write(raw)

        def check_host(self):
            if self.headers.get("Host") not in {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}", public_host}:
                raise Rejected(403, "host_not_allowed")
            if self.headers.get("Authorization") is not None:
                raise Rejected(401, "unsupported_credentials")

        def visitor(self, create=False):
            cookie = SimpleCookie()
            try:
                cookie.load(self.headers.get("Cookie", ""))
            except Exception:
                raise Rejected(401, "session_invalid") from None
            token = cookie.get("nx_visit")
            if not token and not create:
                raise Rejected(401, "session_required")
            return store.visitor(token.value if token else None)

        def shop_target(self):
            if shop is None:
                raise Rejected(503, "catalog_not_configured")
            if getattr(shop, "cart", None) is None:
                raise Rejected(403, "catalog_read_only")
            cookie = SimpleCookie()
            try:
                cookie.load(self.headers.get("Cookie", ""))
            except Exception:
                raise Rejected(401, "cart_capability_invalid") from None
            token = cookie.get("nx_cart")
            if token is None:
                raise Rejected(404, "cart_not_found")
            if re.fullmatch(r"[a-f0-9]{32}\.[a-f0-9]{64}", token.value) is None:
                raise Rejected(401, "cart_capability_invalid")
            return token.value.split(".")

        def shop_error(self, error):
            # Cart adapters expose only a typed status/code, never keys or payloads.
            from_errors = getattr(error, "status", None), getattr(error, "code", None)
            if (type(from_errors[0]) is int and from_errors[0] in {401, 404, 409, 410, 422}
                    and isinstance(from_errors[1], str)):
                return self.respond(from_errors[0], {"error": from_errors[1]})
            if isinstance(error, sqlite3.OperationalError):
                return self.respond(503, {"error": "storage_unavailable"})
            return self.respond(500, {"error": "internal_shop_error"})

        def do_GET(self):
            try:
                self.check_host()
                path = unquote(urlsplit(self.path).path)
                if path == "/api/shop/catalog":
                    if shop is None:
                        return self.respond(503, {"error": "catalog_not_configured", "available": False})
                    query = parse_qs(urlsplit(self.path).query, keep_blank_values=True)
                    if set(query) - {"q", "category", "locale"} or any(len(values) != 1 for values in query.values()):
                        raise Rejected(422, "invalid_catalog_query")
                    try:
                        result = shop.catalog(query=query.get("q", [""])[0], category=query.get("category", [""])[0], locale=query.get("locale", ["de"])[0])
                    except Exception as error:
                        return self.shop_error(error)
                    return self.respond(200, result)
                if path in {"/api/shop/cart", "/api/shop/cart/checkout-draft"}:
                    visitor, _ = self.visitor()
                    identifier, capability = self.shop_target()
                    try:
                        result = (shop.cart.read if path == "/api/shop/cart" else shop.cart.read_checkout)(visitor["id"], identifier, capability)
                    except Exception as error:
                        return self.shop_error(error)
                    return self.respond(200, result)
                if path == "/api/session":
                    visitor, cookie = self.visitor(create=True)
                    with store.connect() as db:
                        history = [dict(row) for row in db.execute("SELECT role,body FROM messages WHERE owner=? ORDER BY id DESC LIMIT 100", (visitor["id"],))][::-1]
                        quotes = [json.loads(row[0]) for row in db.execute("SELECT payload FROM objects WHERE owner=? AND kind='quote' ORDER BY rowid DESC LIMIT 20", (visitor["id"],))][::-1]
                    return self.respond(200, {"csrf": visitor["csrf"], "history": history, "workspace": {"quotes": quotes}, "capabilities": capabilities(features)}, cookie=cookie)
                if path == "/api/capabilities":
                    return self.respond(200, {"mode": "local_development", "capabilities": capabilities(features)})
                if path == "/api/deliveries":
                    visitor, _ = self.visitor()
                    with store.connect() as db:
                        rows = [dict(row) for row in db.execute("SELECT kind,ref,recipient,state,updated FROM mail_jobs WHERE owner=? AND audience='customer' ORDER BY created DESC LIMIT 20", (visitor["id"],))]
                    return self.respond(200, {"deliveries": rows, "meaning": "provider_accepted is not a delivery or read confirmation"})
                if path == "/api/partner/requests/mine":
                    visitor, _ = self.visitor()
                    with store.connect() as db:
                        rows = [dict(row) for row in db.execute("SELECT id,tenant,status,created FROM partner_requests WHERE submitter=? ORDER BY created DESC LIMIT 50", (visitor["id"],))]
                    return self.respond(200, {"requests": rows, "meaning": "submitter storage readback only; not a receipt, delivery or approval"})
                if path == "/api/partner/requests":
                    self.visitor()
                    # Reception needs an authenticated partner/staff role + tenant from the
                    # protected portal auth (Clerk); this public gateway has no such identity.
                    raise Rejected(403, "recipient_auth_required")
                match = re.fullmatch(r"/api/speech/([A-Za-z]{4,20})", path)
                if match:
                    self.visitor()
                    if features is None or features.speech is None:
                        raise Rejected(503, "speech_not_configured")
                    query = parse_qs(urlsplit(self.path).query)
                    locale = query.get("locale", ["de"])[0]
                    pages_allowed = getattr(features, "provider_pages", None)
                    if pages_allowed is not None and query.get("page", [""])[0] not in pages_allowed:
                        raise Rejected(403, "provider_option_not_enabled_on_page")
                    try:
                        audio = features.speech.audio(match[1], locale)
                    except integrations().ProviderError as error:
                        raise Rejected(503, error.code) from None
                    if audio is None:
                        raise Rejected(404, "speech_text_not_allowed")
                    return self.respond(200, audio, "audio/mpeg")
                if path == "/api/pages":
                    return self.respond(200, pages)
                if path == "/api/slots":
                    self.visitor()
                    with store.connect() as db:
                        slots = [dict(row) for row in db.execute("SELECT id,starts,source FROM slots WHERE id NOT IN (SELECT slot_id FROM bookings) ORDER BY starts LIMIT 30") if datetime.fromisoformat(row["starts"]) > datetime.now(timezone.utc)]
                    return self.respond(200, {"slots": slots, "timezone": "Europe/Amsterdam", "binding": "local_planning_only"})
                match = re.fullmatch(r"/api/quotes/([a-f0-9]{32})/pdf", path)
                if match:
                    visitor, _ = self.visitor()
                    quote = store.object(visitor["id"], match[1], "quote")
                    return self.respond(200, make_pdf(quote), "application/pdf", disposition='attachment; filename="NeXify-Angebotsentwurf.pdf"')
                assets = {"/app.js": (WEB / "app.js", "text/javascript; charset=utf-8"), "/app.css": (WEB / "app.css", "text/css; charset=utf-8"),
                          "/tokens.css": (ROOT / "packages/tokens/tokens.css", "text/css; charset=utf-8"),
                          "/portrait.png": (ROOT / "prototypen/assets/nexify-ai/pascal-16x9.png", "image/png"),
                          "/signet.svg": (ROOT / "prototypen/assets/nexify-ai/nexify-ai-signet.svg", "image/svg+xml"),
                          "/i18n.json": (WEB / "i18n.json", "application/json; charset=utf-8")}
                if path in assets and assets[path][0].is_file():
                    file, mime = assets[path]
                    return self.respond(200, file.read_bytes(), mime)
                if path in allowed_pages and (WEB / "index.html").is_file():
                    return self.respond(200, (WEB / "index.html").read_bytes(), "text/html; charset=utf-8")
                raise Rejected(404, "not_found")
            except Rejected as error:
                self.respond(error.status, {"error": error.code})

        def do_POST(self):
            try:
                self.check_host()
                expected = {"http://" + self.headers["Host"]}
                if web_origin:
                    expected.add(web_origin)
                if public_origin:
                    expected.add(public_origin)
                if self.headers.get("Origin") not in expected:
                    raise Rejected(403, "origin_mismatch")
                visitor, _ = self.visitor()
                supplied_csrf = self.headers.get("X-CSRF-Token", "")
                if not supplied_csrf.isascii() or not hmac.compare_digest(supplied_csrf, visitor["csrf"]):
                    raise Rejected(403, "csrf_mismatch")
                if self.headers.get("Content-Type", "").split(";", 1)[0] != "application/json":
                    raise Rejected(415, "json_required")
                try:
                    size = int(self.headers.get("Content-Length", "0"))
                    if not 0 < size <= 16384:
                        raise ValueError()
                    body = strict_json(self.rfile.read(size))
                except (ValueError, UnicodeError, RecursionError):
                    raise Rejected(422, "invalid_body") from None
                path = urlsplit(self.path).path
                if path.startswith("/api/shop/"):
                    if shop is None:
                        raise Rejected(503, "catalog_not_configured")
                    if getattr(shop, "cart", None) is None:
                        raise Rejected(403, "catalog_read_only")
                    key = self.headers.get("Idempotency-Key")
                    try:
                        if path == "/api/shop/cart":
                            created = shop.cart.create(visitor["id"], key, body)
                            token = created["cart"]["id"] + "." + created["guest_capability"]
                            cookie = f"nx_cart={token}; HttpOnly; SameSite=Lax; Path=/api/shop; Max-Age={shop.cart.lifetime}"
                            return self.respond(200, created["cart"], cart_cookie=cookie)
                        if path not in {"/api/shop/cart/items", "/api/shop/cart/checkout-draft"}:
                            raise Rejected(404, "not_found")
                        identifier, capability = self.shop_target()
                        if self.headers.get("X-Cart-Id") != identifier:
                            raise Rejected(409, "cart_target_mismatch")
                        version = self.headers.get("If-Match")
                        if path.endswith("/items"):
                            result = shop.cart.change(visitor["id"], identifier, capability, key, version, body)
                        else:
                            if body:
                                raise Rejected(422, "unexpected_field")
                            result = shop.cart.prepare_checkout(visitor["id"], identifier, capability, key, version)
                    except Rejected:
                        raise
                    except Exception as error:
                        return self.shop_error(error)
                    return self.respond(200, result)
                if path == "/api/assistant/chatgpt":
                    if features is None or features.chatgpt is None:
                        raise Rejected(503, "chatgpt_option_not_configured")
                    if set(body) - {"message", "locale", "page_path"} or body.get("locale", "de") not in {"de", "nl", "fr"}:
                        raise Rejected(422, "unexpected_field_or_locale")
                    pages_allowed = getattr(features, "provider_pages", None)
                    if pages_allowed is not None and body.get("page_path") not in pages_allowed:
                        raise Rejected(403, "provider_option_not_enabled_on_page")
                    message = text(body, "message", 1000)
                    try:
                        return self.respond(200, features.chatgpt.reply(store, visitor["id"], message, body.get("locale", "de")))
                    except integrations().ProviderError as error:
                        status = 429 if error.code.endswith(("_limit_reached", "_cap_reached")) else 502
                        raise Rejected(status, error.code) from None
                if path == "/api/partner/requests":
                    try:
                        result = partner.submit(visitor["id"], body.get("tenant"), {k: v for k, v in body.items() if k != "tenant"})
                    except PartnerError as error:
                        raise Rejected(error.status, error.code) from None
                    return self.respond(200, result)
                mapping = {"/api/chat": "chat", "/api/quotes": "quote", "/api/bookings": "booking", "/api/marketing": "marketing"}
                operation = mapping.get(path)
                match = re.fullmatch(r"/api/quotes/([a-f0-9]{32})/send", path)
                if match:
                    operation = "send:" + match[1]
                if operation is None:
                    raise Rejected(404, "not_found")
                result = store.action(visitor["id"], operation, self.headers.get("Idempotency-Key"), body)
                self.respond(200, result)
            except Rejected as error:
                self.respond(error.status, {"error": error.code})
            except sqlite3.OperationalError:
                self.respond(503, {"error": "storage_unavailable"})
    return ThreadingHTTPServer((host, port), Handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--port", type=int, default=3003)
    parser.add_argument("--seed-local-planning-proposals", action="store_true")
    parser.add_argument("--web-origin", default="http://127.0.0.1:3004")
    parser.add_argument("--catalog-snapshot", type=Path)
    parser.add_argument("--catalog-tenant")
    parser.add_argument("--catalog-project")
    parser.add_argument("--catalog-store")
    parser.add_argument("--catalog-max-bytes", type=int)
    parser.add_argument("--catalog-max-rows", type=int)
    parser.add_argument("--catalog-max-text", type=int)
    parser.add_argument("--catalog-max-price-minor", type=int)
    parser.add_argument("--public-origin", help="explicit https origin of a TLS reverse proxy (preview only); sets Secure cookies")
    parser.add_argument("--enable-mail", action="store_true", help="real Resend delivery: RESEND_API_KEY, RESEND_FROM[_ADDRESS], MAIL_INTERNAL_TO")
    parser.add_argument("--enable-speech", action="store_true", help="ElevenLabs read-aloud of fixed assistant texts: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID")
    parser.add_argument("--enable-chatgpt-option", action="store_true", help="separately selectable ChatGPT test option: OPENAI_API_KEY or EMERGENT_LLM_KEY")
    args = parser.parse_args()
    shop = None
    if args.catalog_snapshot is not None:
        from catalog import ReadOnlyCatalog, load_snapshot
        raw, manifest = load_snapshot(args.catalog_snapshot, maximum_bytes=args.catalog_max_bytes)
        shop = ReadOnlyCatalog(raw, tenant=args.catalog_tenant, project=args.catalog_project,
             store_id=args.catalog_store, observed_at=manifest.get("observed_at"),
             max_bytes=args.catalog_max_bytes, max_rows=args.catalog_max_rows,
             max_text=args.catalog_max_text, max_price_minor=args.catalog_max_price_minor)
    import os
    from types import SimpleNamespace
    tools = integrations()
    env = os.environ
    # PROVIDER_PAGES limits paid read-aloud/ChatGPT to listed public paths (cost-bounded rollout).
    provider_pages = {item.strip() for item in env.get("PROVIDER_PAGES", "").split(",") if item.strip()} or None
    features = SimpleNamespace(mail=None, speech=None, chatgpt=None, provider_pages=provider_pages)
    dispatcher = None
    if args.enable_mail:
        sender = tools.sender_from_env(env)
        if sender is None or not env.get("RESEND_API_KEY"):
            raise SystemExit("Mail requested but RESEND_API_KEY or an allowed sender address is missing")
        features.mail = tools.MailPolicy(env.get("MAIL_INTERNAL_TO", "mail@nexifyai.cloud"), daily_cap=int(env.get("MAIL_DAILY_CAP", "40")))
    store = Store(args.database, mail_policy=features.mail)
    if features.mail is not None:
        dispatcher = tools.MailDispatcher(store, tools.ResendTransport(env["RESEND_API_KEY"], tools.sender_from_env(env), env.get("MAIL_REPLY_TO", "mail@nexifyai.cloud")))
        dispatcher.start()
    if args.enable_speech:
        features.speech = tools.SpeechService(env.get("ELEVENLABS_API_KEY"), env.get("ELEVENLABS_VOICE_ID"), Path(args.database).parent / "speech-cache",
                                              model_id=env.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2"), daily_cap=int(env.get("SPEECH_DAILY_CAP", "30")))
    if args.enable_chatgpt_option:
        model = env.get("CHATGPT_OPTION_MODEL", "gpt-5.4")
        complete, route = tools.chatgpt_backend_from_env(env, model)
        if complete is None:
            raise SystemExit("ChatGPT option requested but no usable OPENAI_API_KEY or EMERGENT_LLM_KEY route is configured")
        features.chatgpt = tools.ChatGPTOption(complete, model, route, per_visitor=int(env.get("CHATGPT_VISITOR_LIMIT", "10")),
                                               daily_cap=int(env.get("CHATGPT_DAILY_CAP", "200")))
    if args.seed_local_planning_proposals:
        store.seed_planning_slots()
    origin = urlsplit(args.web_origin)
    if origin.scheme != "http" or origin.hostname not in {"127.0.0.1", "localhost"} or origin.path or origin.query or origin.fragment or origin.username:
        raise SystemExit("Only an explicit local web origin is supported by this development gateway")
    server = build_server(store, port=args.port, web_origin=args.web_origin, shop=shop, features=features, public_origin=args.public_origin)
    print(f"Native visitor workspace listening on loopback port {server.server_port}; mail/model/external calendar not connected", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
