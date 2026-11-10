"""Real provider adapters for the visitor gateway: Resend mail, ElevenLabs speech
and the separately selectable ChatGPT test option.

Everything here is disabled unless the gateway is explicitly started with the
matching option and server-side configuration. Standard library only.
Provider acceptance is recorded as ``provider_accepted``; it is not a delivery,
read or reply confirmation. Callers never supply recipients for internal mail,
subjects or markup; all mail bodies are fixed server-side templates.
"""
from __future__ import annotations

import asyncio
from datetime import datetime
from html import escape
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import threading
import time
import urllib.error
import urllib.request
import uuid
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
AMSTERDAM = ZoneInfo("Europe/Amsterdam")
DAY = 86400
EMAIL = re.compile(r"[^\s@<>\"',;]+@[^\s@<>\"',;]+\.[^\s@<>\"',;]+")
IDEMPOTENCY_WINDOW = 23 * 3600  # Resend keeps idempotency keys for 24 hours.
CHATGPT_LABEL = "ChatGPT (OpenAI) · Testoption, nicht das NeXify-Standardmodell"


class ProviderError(Exception):
    def __init__(self, code, retryable=False, unknown=False):
        super().__init__(code)
        self.code, self.retryable, self.unknown = code, retryable, unknown


def request(method, url, headers, body=None, timeout=20, opener=urllib.request.urlopen):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode()
    fields = {"User-Agent": "NeXifyGateway/1", **headers}
    if data is not None:
        fields["Content-Type"] = "application/json"
    try:
        with opener(urllib.request.Request(url, data=data, method=method, headers=fields), timeout=timeout) as reply:
            return reply.status, reply.read(4 * 1024 * 1024 + 1), reply.headers.get("Content-Type", "")
    except urllib.error.HTTPError as error:
        error.read(2048)
        raise ProviderError(f"provider_http_{error.code}", retryable=error.code == 429 or error.code >= 500) from None
    except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError, OSError):
        # The request may have reached the provider: callers must retry with the same key.
        raise ProviderError("provider_unreachable", retryable=True, unknown=True) from None


# ---------------------------------------------------------------- Resend mail

def sender_from_env(env):
    """Display name from RESEND_FROM, address from RESEND_FROM_ADDRESS (or RESEND_FROM if it is an address).
    Only domains listed in RESEND_ALLOWED_DOMAINS (default nexifyai.cloud) may send: other verified
    domains of the same Resend account belong to separate customer projects."""
    raw = (env.get("RESEND_FROM") or "").strip()
    address = (env.get("RESEND_FROM_ADDRESS") or "").strip()
    name = raw
    match = re.fullmatch(r"(.*)<([^<>]+)>", raw, re.S)
    if match:
        name, address = match[1].strip().strip('"'), address or match[2].strip()
    elif EMAIL.fullmatch(raw):
        name, address = "NeXify AI", address or raw
    allowed = {part.strip().lower() for part in (env.get("RESEND_ALLOWED_DOMAINS") or "nexifyai.cloud").split(",") if part.strip()}
    if not EMAIL.fullmatch(address) or address.rsplit("@", 1)[1].lower() not in allowed:
        return None
    name = re.sub(r"[\r\n\"<>\\]", "", name)[:80].strip() or "NeXify AI"
    return f'"{name}" <{address}>'


class ResendTransport:
    endpoint = "https://api.resend.com/emails"

    def __init__(self, api_key, sender, reply_to=None, opener=urllib.request.urlopen):
        if not api_key or not sender:
            raise ValueError("resend_not_configured")
        self.api_key, self.sender, self.reply_to, self.opener = api_key, sender, reply_to, opener

    def send(self, recipient, subject, html_body, text_body, idempotency_key):
        payload = {"from": self.sender, "to": [recipient], "subject": subject, "html": html_body, "text": text_body}
        if self.reply_to:
            payload["reply_to"] = self.reply_to
        _, raw, _ = request("POST", self.endpoint, {"Authorization": f"Bearer {self.api_key}", "Idempotency-Key": idempotency_key},
                            payload, opener=self.opener)
        try:
            identifier = json.loads(raw).get("id")
        except (ValueError, AttributeError):
            identifier = None
        if not isinstance(identifier, str) or not identifier:
            raise ProviderError("provider_response_without_id", retryable=True, unknown=True)
        return identifier


CUSTOMER_TEXT = {
    "de": {"quote_subject": "Ihr Angebotsentwurf bei NeXify AI · Referenz {ref}",
           "quote_body": ["Guten Tag,", "Sie haben auf nexifyai.cloud einen Angebotsentwurf erstellt und den Versand dieser Bestätigung an diese Adresse ausdrücklich bestätigt.",
                          "Der Entwurf ist unverbindlich. Umfang und Preis prüfen wir persönlich; erst danach erhalten Sie ein freigegebenes Angebot.",
                          "Referenz: {ref}", "Falls Sie diese Anfrage nicht gestellt haben, können Sie diese Nachricht ignorieren."],
           "booking_subject": "Ihre Terminanfrage bei NeXify AI · {when}",
           "booking_body": ["Guten Tag {name},", "Ihre Terminanfrage für {when} (Europe/Amsterdam) ist eingegangen.",
                            "Der Termin ist noch nicht bestätigt. Wir melden uns persönlich mit einer Bestätigung oder einem Alternativvorschlag.",
                            "Referenz: {ref}", "Falls Sie diese Anfrage nicht gestellt haben, können Sie diese Nachricht ignorieren."],
           "footer": "NeXify AI · Chat it. Automate it. · Antworten auf diese E-Mail erreichen mail@nexifyai.cloud. Wir fragen niemals per E-Mail nach Passwörtern oder Zahlungsdaten."},
    "nl": {"quote_subject": "Uw offerteconcept bij NeXify AI · referentie {ref}",
           "quote_body": ["Goedendag,", "U heeft op nexifyai.cloud een offerteconcept gemaakt en de verzending van deze bevestiging naar dit adres uitdrukkelijk bevestigd.",
                          "Het concept is vrijblijvend. Omvang en prijs controleren wij persoonlijk; pas daarna ontvangt u een goedgekeurde offerte.",
                          "Referentie: {ref}", "Heeft u deze aanvraag niet gedaan, dan kunt u dit bericht negeren."],
           "booking_subject": "Uw afspraakaanvraag bij NeXify AI · {when}",
           "booking_body": ["Goedendag {name},", "Uw afspraakaanvraag voor {when} (Europe/Amsterdam) is ontvangen.",
                            "De afspraak is nog niet bevestigd. Wij nemen persoonlijk contact op met een bevestiging of een alternatief.",
                            "Referentie: {ref}", "Heeft u deze aanvraag niet gedaan, dan kunt u dit bericht negeren."],
           "footer": "NeXify AI · Chat it. Automate it. · Antwoorden op deze e-mail komen bij mail@nexifyai.cloud. Wij vragen nooit per e-mail om wachtwoorden of betaalgegevens."},
    "fr": {"quote_subject": "Votre projet de devis chez NeXify AI · référence {ref}",
           "quote_body": ["Bonjour,", "Vous avez créé un projet de devis sur nexifyai.cloud et confirmé expressément l’envoi de cette confirmation à cette adresse.",
                          "Ce projet est sans engagement. Nous vérifions personnellement le périmètre et le prix ; vous recevrez ensuite un devis approuvé.",
                          "Référence : {ref}", "Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message."],
           "booking_subject": "Votre demande de rendez-vous chez NeXify AI · {when}",
           "booking_body": ["Bonjour {name},", "Votre demande de rendez-vous pour le {when} (Europe/Amsterdam) a bien été reçue.",
                            "Le rendez-vous n’est pas encore confirmé. Nous revenons vers vous personnellement avec une confirmation ou une alternative.",
                            "Référence : {ref}", "Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message."],
           "footer": "NeXify AI · Chat it. Automate it. · Les réponses à cet e-mail arrivent à mail@nexifyai.cloud. Nous ne demandons jamais de mot de passe ni de données de paiement par e-mail."},
}
INTERNAL_TITLES = {"internal_quote": "Neue Angebotsanfrage mit Versandbestätigung", "internal_booking": "Neue Terminanfrage",
                   "internal_marketing": "Neues Marketing-Briefing"}
INTERNAL_FIELDS = {"internal_quote": (("Titel", "title"), ("Vorhaben", "details"), ("Bestätigte Empfängeradresse", "recipient"), ("Referenz", "ref")),
                   "internal_booking": (("Name", "name"), ("E-Mail", "email"), ("Terminwunsch (Europe/Amsterdam)", "when"), ("Referenz", "ref")),
                   "internal_marketing": (("Ziel", "goal"), ("Zielgruppe", "audience"), ("Referenz", "ref"))}


def _when(iso, locale):
    moment = datetime.fromisoformat(iso).astimezone(AMSTERDAM)
    return moment.strftime("%d.%m.%Y %H:%M") if locale != "fr" else moment.strftime("%d/%m/%Y %H:%M")


def _document(paragraphs, footer):
    cells = "".join(f'<p style="margin:0 0 14px;white-space:pre-wrap">{escape(item)}</p>' for item in paragraphs)
    return ('<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px;'
            'font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111111;background:#ffffff">'
            f'{cells}<p style="margin:24px 0 0;font-size:12px;color:#555555">{escape(footer)}</p></td></tr></table>')


def render(kind, locale, data):
    """Return (subject, html, text) from fixed templates; interpolated values are escaped."""
    ref = str(data.get("ref", ""))[:8].upper()
    if kind in ("customer_quote", "customer_booking"):
        copy = CUSTOMER_TEXT.get(locale, CUSTOMER_TEXT["de"])
        values = {"ref": ref, "when": _when(data["starts"], locale) if kind == "customer_booking" else "",
                  "name": str(data.get("name", ""))[:100]}
        prefix = "quote" if kind == "customer_quote" else "booking"
        subject = copy[prefix + "_subject"].format(**values)
        paragraphs = [line.format(**values) for line in copy[prefix + "_body"]]
        return subject, _document(paragraphs, copy["footer"]), "\n\n".join(paragraphs + [copy["footer"]])
    if kind in INTERNAL_TITLES:
        values = {**data, "ref": data.get("ref", "")}
        if "starts" in data:
            values["when"] = _when(data["starts"], "de")
        paragraphs = [INTERNAL_TITLES[kind]] + [f"{label}: {str(values.get(field, ''))[:3000]}" for label, field in INTERNAL_FIELDS[kind]]
        footer = "Automatische interne Benachrichtigung des NeXify-Arbeitsbereichs. Nicht an Kunden weiterleiten, ohne Inhalte zu prüfen."
        subject = f"[NeXify] {INTERNAL_TITLES[kind]} · {ref}"
        return subject, _document(paragraphs, footer), "\n\n".join(paragraphs + [footer])
    raise ValueError("unknown_mail_kind")


class MailPolicy:
    """Enqueue rules inside the caller's database transaction."""

    def __init__(self, internal_to, daily_cap=40, per_recipient=3, per_visitor=5):
        if not EMAIL.fullmatch(internal_to or ""):
            raise ValueError("internal_recipient_invalid")
        self.internal_to, self.daily_cap, self.per_recipient, self.per_visitor = internal_to, daily_cap, per_recipient, per_visitor

    def enqueue(self, db, kind, owner, ref, recipient, locale, data, now=None):
        now = time.time() if now is None else now
        audience = "customer" if kind.startswith("customer_") else "internal"
        since = now - DAY
        state = "queued"
        if db.execute("SELECT COUNT(*) FROM mail_jobs WHERE created>? AND state!='blocked_limit'", (since,)).fetchone()[0] >= self.daily_cap:
            state = "blocked_limit"
        elif audience == "customer" and (
                db.execute("SELECT COUNT(*) FROM mail_jobs WHERE audience='customer' AND lower(recipient)=lower(?) AND created>? AND state!='blocked_limit'", (recipient, since)).fetchone()[0] >= self.per_recipient
                or db.execute("SELECT COUNT(*) FROM mail_jobs WHERE audience='customer' AND owner=? AND created>? AND state!='blocked_limit'", (owner, since)).fetchone()[0] >= self.per_visitor):
            state = "blocked_limit"
        db.execute("INSERT OR IGNORE INTO mail_jobs(id,kind,owner,ref,recipient,audience,locale,payload,state,attempts,next_attempt,created,updated) VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?)",
                   (uuid.uuid4().hex, kind, owner, ref, recipient, audience, locale, json.dumps({**data, "ref": ref}, ensure_ascii=False), state, now, now, now))
        return db.execute("SELECT state FROM mail_jobs WHERE kind=? AND ref=? AND recipient=?", (kind, ref, recipient)).fetchone()[0]


MAIL_SCHEMA = """
CREATE TABLE IF NOT EXISTS mail_jobs(id TEXT PRIMARY KEY,kind TEXT NOT NULL,owner TEXT NOT NULL,ref TEXT NOT NULL,recipient TEXT NOT NULL,
  audience TEXT NOT NULL,locale TEXT NOT NULL,payload TEXT NOT NULL,state TEXT NOT NULL,attempts INTEGER NOT NULL,provider_id TEXT,
  last_error TEXT,next_attempt REAL NOT NULL,lease_until REAL,created REAL NOT NULL,updated REAL NOT NULL,UNIQUE(kind,ref,recipient));
CREATE TABLE IF NOT EXISTS chatgpt_messages(id INTEGER PRIMARY KEY,owner TEXT NOT NULL,role TEXT NOT NULL,body TEXT NOT NULL,created REAL NOT NULL);
"""


class MailDispatcher:
    """Single-claim dispatcher with lease, provider idempotency and explicit unknown outcomes."""

    def __init__(self, store, transport, lease=60, max_attempts=6, clock=time.time):
        self.store, self.transport, self.lease, self.max_attempts, self.clock = store, transport, lease, max_attempts, clock
        self._stop = threading.Event()

    def _claim(self):
        now = self.clock()
        with self.store.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            # A lapsed lease means the previous attempt may have reached the provider.
            for row in db.execute("SELECT id,created FROM mail_jobs WHERE state='dispatching' AND lease_until<?", (now,)).fetchall():
                state = "retry_wait" if row["created"] + IDEMPOTENCY_WINDOW > now else "unknown_outcome_review"
                db.execute("UPDATE mail_jobs SET state=?,last_error='lease_expired_unknown_outcome',lease_until=NULL,updated=? WHERE id=?", (state, now, row["id"]))
            row = db.execute("SELECT * FROM mail_jobs WHERE state IN ('queued','retry_wait') AND next_attempt<=? ORDER BY created LIMIT 1", (now,)).fetchone()
            if row is None:
                return None
            if row["created"] + IDEMPOTENCY_WINDOW <= now:
                db.execute("UPDATE mail_jobs SET state='unknown_outcome_review',updated=? WHERE id=?", (now, row["id"]))
                return None
            db.execute("UPDATE mail_jobs SET state='dispatching',attempts=attempts+1,lease_until=?,updated=? WHERE id=?", (now + self.lease, now, row["id"]))
            return dict(row, attempts=row["attempts"] + 1)

    def _finish(self, job, state, provider_id=None, error=None, delay=0):
        now = self.clock()
        with self.store.connect() as db:
            db.execute("UPDATE mail_jobs SET state=?,provider_id=COALESCE(?,provider_id),last_error=?,lease_until=NULL,next_attempt=?,updated=? WHERE id=? AND state='dispatching'",
                       (state, provider_id, error, now + delay, now, job["id"]))
            if state == "sent" and job["kind"] == "customer_quote":
                db.execute("UPDATE outbox SET state='provider_accepted' WHERE owner=? AND quote_id=? AND email=?", (job["owner"], job["ref"], job["recipient"]))

    def run_once(self):
        job = self._claim()
        if job is None:
            return False
        subject, html_body, text_body = render(job["kind"], job["locale"], json.loads(job["payload"]))
        try:
            provider_id = self.transport.send(job["recipient"], subject, html_body, text_body, "nx-mail-" + job["id"])
        except ProviderError as error:
            if error.retryable and job["attempts"] < self.max_attempts:
                self._finish(job, "retry_wait", error=error.code, delay=min(300, 5 * 2 ** job["attempts"]))
            else:
                self._finish(job, "unknown_outcome_review" if error.unknown else "failed_permanent", error=error.code)
            return True
        self._finish(job, "sent", provider_id=provider_id)
        return True

    def start(self, interval=3.0):
        def loop():
            while not self._stop.is_set():
                try:
                    while self.run_once():
                        pass
                except Exception:  # keep the gateway alive; the job stays leased and is retried safely
                    pass
                self._stop.wait(interval)
        thread = threading.Thread(target=loop, name="mail-dispatcher", daemon=True)
        thread.start()
        return thread

    def stop(self):
        self._stop.set()


# ---------------------------------------------------------------- ElevenLabs speech

SPEECH_KEYS = ("welcome", "choose", "quoteReply", "bookingReply", "marketingReply")


def speech_texts(source=ROOT / "config/assistant-interface-copy.json"):
    """Validate the canonical UI JSON, then project only the existing 15 TTS texts.

    English UI copy does not grant English speech access. Invalid/missing copy
    fails explicitly; source formatting, escaping and TS syntax are irrelevant.
    """
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("duplicate_copy_key")
            result[key] = value
        return result
    try:
        data = json.loads(Path(source).read_text(encoding="utf-8"), object_pairs_hook=unique)
    except OSError:
        raise ProviderError("speech_copy_unavailable") from None
    except (ValueError, UnicodeError, RecursionError):
        raise ProviderError("speech_copy_invalid") from None
    locales = {"de", "nl", "fr", "en"}
    if not isinstance(data, dict) or set(data) != locales:
        raise ProviderError("speech_copy_invalid")
    fields = set(data["de"]) if isinstance(data["de"], dict) else set()
    if not fields or not set(SPEECH_KEYS) <= fields:
        raise ProviderError("speech_copy_invalid")
    for copy in data.values():
        if (not isinstance(copy, dict) or set(copy) != fields
                or any(not isinstance(text, str) or not text.strip() for text in copy.values())):
            raise ProviderError("speech_copy_invalid")
    return {(key, locale): data[locale][key]
            for locale in ("de", "nl", "fr") for key in SPEECH_KEYS}


class SpeechService:
    endpoint = "https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128"

    def __init__(self, api_key, voice_id, cache_dir, model_id="eleven_multilingual_v2", daily_cap=30, texts=None, opener=urllib.request.urlopen):
        if not api_key or not re.fullmatch(r"[A-Za-z0-9]{10,40}", voice_id or ""):
            raise ValueError("speech_not_configured")
        self.api_key, self.voice_id, self.model_id, self.daily_cap, self.opener = api_key, voice_id, model_id, daily_cap, opener
        self.cache = Path(cache_dir)
        self.cache.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.texts = speech_texts() if texts is None else texts
        self._lock = threading.Lock()
        self._calls = []

    def synthesize(self, text):
        _, raw, content_type = request("POST", self.endpoint.format(voice=self.voice_id), {"xi-api-key": self.api_key, "Accept": "audio/mpeg"},
                                       {"text": text, "model_id": self.model_id}, timeout=30, opener=self.opener)
        if not content_type.startswith("audio/") or not 256 < len(raw) <= 4 * 1024 * 1024:
            raise ProviderError("speech_response_invalid")
        return raw

    def audio(self, key, locale):
        text = self.texts.get((key, locale))
        if text is None:
            return None
        name = hashlib.sha256(f"{self.voice_id}|{self.model_id}|{text}".encode()).hexdigest() + ".mp3"
        target = self.cache / name
        with self._lock:
            if target.is_file():
                return target.read_bytes()
            now = time.time()
            self._calls = [stamp for stamp in self._calls if stamp > now - DAY]
            if len(self._calls) >= self.daily_cap:
                raise ProviderError("speech_daily_cap_reached")
            self._calls.append(now)
            audio = self.synthesize(text)
            partial = target.with_suffix(".part")
            partial.write_bytes(audio)
            os.replace(partial, target)
            return audio


# ---------------------------------------------------------------- ChatGPT test option

def chatgpt_system(locale):
    language = {"de": "Deutsch", "nl": "Niederländisch", "fr": "Französisch"}.get(locale, "Deutsch")
    return ("Du bist eine ausdrücklich vom Besucher ausgewählte ChatGPT-Testoption im Arbeitsbereich von NeXify AI. "
            "Du bist nicht das NeXify-Standardmodell und sprichst nicht verbindlich für NeXify AI. "
            f"Antworte knapp, sachlich und freundlich auf {language}. Nenne keine Preise, Rabatte, Termine, Fristen oder Zusagen "
            "und gib keine Rechtsberatung. Für Angebote, Termine und Marketing verweise auf die Entwurfswerkzeuge im Chat oder auf mail@nexifyai.cloud.")


def openai_backend(api_key, model, opener=urllib.request.urlopen):
    def complete(messages):
        _, raw, _ = request("POST", "https://api.openai.com/v1/chat/completions", {"Authorization": f"Bearer {api_key}"},
                            {"model": model, "messages": messages, "max_completion_tokens": 700}, timeout=45, opener=opener)
        try:
            return json.loads(raw)["choices"][0]["message"]["content"].strip()
        except (ValueError, KeyError, IndexError, AttributeError):
            raise ProviderError("chatgpt_response_invalid") from None
    return complete


def emergent_backend(api_key, model):
    """Emergent universal key route (only available where the emergentintegrations package is installed)."""
    from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage  # optional dependency

    def complete(messages):
        system = messages[0]["content"]
        history = "\n".join(f"{'Besucher' if item['role'] == 'user' else 'Assistent'}: {item['content']}" for item in messages[1:-1])
        prompt = (f"Bisheriger Verlauf:\n{history}\n\nNeue Nachricht: " if history else "") + messages[-1]["content"]

        async def run():
            chat = LlmChat(api_key=api_key, session_id="nx-chatgpt-" + uuid.uuid4().hex, system_message=system).with_model("openai", model)
            parts = []
            async for event in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(event, TextDelta):
                    parts.append(event.content)
                elif isinstance(event, StreamDone):
                    break
            return "".join(parts).strip()
        try:
            result = asyncio.run(run())
        except Exception:
            raise ProviderError("chatgpt_provider_error", retryable=True) from None
        if not result:
            raise ProviderError("chatgpt_response_invalid")
        return result
    return complete


def chatgpt_backend_from_env(env, model):
    key = env.get("OPENAI_API_KEY", "")
    if re.fullmatch(r"sk-[A-Za-z0-9_\-]{20,}", key):
        return openai_backend(key, model), "openai_direct"
    emergent = env.get("EMERGENT_LLM_KEY", "")
    if emergent:
        try:
            return emergent_backend(emergent, model), "emergent_universal_key"
        except ImportError:
            return None, None
    return None, None


class ChatGPTOption:
    def __init__(self, complete, model, route, per_visitor=10, daily_cap=200, clock=time.time):
        self.complete, self.model, self.route, self.per_visitor, self.daily_cap, self.clock = complete, model, route, per_visitor, daily_cap, clock

    def reply(self, store, owner, message, locale, key, payload_hash):
        # The direct-provider legacy option is not the 9router target. This
        # receipt only prevents duplicate dispatch; it is not a money budget,
        # a tenant boundary or an authorization to activate this path.
        now = self.clock()
        with store.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            receipt = db.execute("SELECT payload_hash,response FROM receipts WHERE owner=? AND operation=? AND key=?",
                                 (owner, "provider_chatgpt", key)).fetchone()
            if receipt:
                if receipt["payload_hash"] != payload_hash:
                    raise ProviderError("idempotency_conflict")
                if receipt["response"] is None:
                    raise ProviderError("chatgpt_request_pending_or_unknown", unknown=True)
                try:
                    saved = json.loads(receipt["response"])
                    if (not isinstance(saved, dict) or set(saved) != {"message_id", "message_sha256", "model", "route"}
                            or type(saved["message_id"]) is not int or not isinstance(saved["model"], str)
                            or not isinstance(saved["route"], str) or not isinstance(saved["message_sha256"], str)
                            or not re.fullmatch(r"[a-f0-9]{64}", saved["message_sha256"])):
                        raise ValueError("invalid receipt")
                except (ValueError, TypeError, json.JSONDecodeError):
                    raise ProviderError("chatgpt_request_pending_or_unknown", unknown=True) from None
                answer = db.execute("SELECT body FROM chatgpt_messages WHERE id=? AND owner=? AND role='assistant'",
                                    (saved["message_id"], owner)).fetchone()
                if answer is None or hashlib.sha256(answer["body"].encode()).hexdigest() != saved["message_sha256"]:
                    raise ProviderError("chatgpt_request_pending_or_unknown", unknown=True)
                return {"text": answer["body"], "label": CHATGPT_LABEL, "model": saved["model"],
                        "route": saved["route"], "ai_generated": True}
            if db.execute("SELECT COUNT(*) FROM chatgpt_messages WHERE role='user' AND created>?", (now - DAY,)).fetchone()[0] >= self.daily_cap:
                raise ProviderError("chatgpt_daily_cap_reached")
            if db.execute("SELECT COUNT(*) FROM chatgpt_messages WHERE role='user' AND owner=? AND created>?", (owner, now - DAY)).fetchone()[0] >= self.per_visitor:
                raise ProviderError("chatgpt_visitor_limit_reached")
            history = [dict(row) for row in db.execute("SELECT role,body FROM chatgpt_messages WHERE owner=? ORDER BY id DESC LIMIT 6", (owner,))][::-1]
            # NULL is a durable in-flight/unknown marker: after a crash or
            # provider exception a retry must never dispatch blindly again.
            db.execute("INSERT INTO receipts(owner,operation,key,payload_hash,response) VALUES (?,?,?,?,NULL)",
                       (owner, "provider_chatgpt", key, payload_hash))
            db.execute("INSERT INTO chatgpt_messages(owner,role,body,created) VALUES (?,?,?,?)", (owner, "user", message, now))
        messages = [{"role": "system", "content": chatgpt_system(locale)}]
        messages += [{"role": "user" if item["role"] == "user" else "assistant", "content": item["body"]} for item in history]
        messages.append({"role": "user", "content": message})
        answer = self.complete(messages)[:4000]
        result = {"text": answer, "label": CHATGPT_LABEL, "model": self.model, "route": self.route, "ai_generated": True}
        with store.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            cursor = db.execute("INSERT INTO chatgpt_messages(owner,role,body,created) VALUES (?,?,?,?)", (owner, "assistant", answer, self.clock()))
            # The receipt references the owner-bound existing message, rather
            # than retaining a second copy of customer-facing model text.
            saved = {"message_id": cursor.lastrowid, "message_sha256": hashlib.sha256(answer.encode()).hexdigest(),
                     "model": self.model, "route": self.route}
            db.execute("UPDATE receipts SET response=? WHERE owner=? AND operation=? AND key=? AND payload_hash=? AND response IS NULL",
                       (json.dumps(saved, ensure_ascii=False), owner, "provider_chatgpt", key, payload_hash))
        return result
