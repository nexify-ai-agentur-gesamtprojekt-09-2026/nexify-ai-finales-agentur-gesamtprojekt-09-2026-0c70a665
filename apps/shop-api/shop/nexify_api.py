"""NeXify AI agency runtime: AIFly ORACLE chat (SSE), customer portal (tenant-isolated) and operator dashboard.

Tenant rule: every portal document carries tenant_id == user_id of the customer account. Portal endpoints only ever
filter by the session's own user_id; operator endpoints require role=admin. No external message, payment or binding
offer is triggered automatically – offers become binding only after the customer's explicit decision.
"""
import hashlib
import json
import os
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse, Response, StreamingResponse
from pydantic import BaseModel, Field
from pymongo import ReturnDocument

from . import mailer
from .db import db, now_iso

router = APIRouter()
YEAR = datetime.now(timezone.utc).year
DAY_RATE = 449
STAGES = ["lead", "qualifizierung", "discovery", "loesung", "angebot", "freigabe", "vertrag", "onboarding", "lieferung", "abnahme", "support", "bindung", "archiv"]
PLANS = {"test": ("Test", 0), "starter": ("Starter", 49), "pro": ("Pro", 149), "business": ("Business", 399), "enterprise": ("Enterprise", None)}
CHAT_DAILY_LIMIT = int(os.environ.get("ORACLE_DAILY_LIMIT", "60"))

ORACLE_PROMPT = """Du bist AIFly ORACLE, der KI-Begleiter von NeXify AI (Claim: „Chat it. Automate it.“).
NeXify AI ist eine B2B-Agentur aus Venlo (NL) für Deutschland, Österreich und die Niederlande. Inhaber und persönlicher Ansprechpartner: Pascal Courbois.
Abrechnung: fester Tagessatz 449 € netto je Projekttag. Externe Kosten (Hosting, Software, KI-Nutzung, Medien-/Werbebudget) werden separat ausgewiesen.
Sechs Leistungsbereiche: 1) Strategische Beratung (Analyse, digitale Strategie, Prozess- und KI-Strategie), 2) Digitale Marken- und Weblösungen (Branding, Designsysteme, Websites, Landingpages, Portale),
3) KI-Agenten und Automatisierung (individuelle Agenten, Workflows, Toolintegration, Wissenssysteme), 4) Software- und Plattformentwicklung (Webanwendungen, APIs, Portale, Datenintegration),
5) Marketing und Vertrieb (Positionierung, Content, SEO, Kampagnen, Lead-Prozesse, CRM), 6) Managed Operations (Wartung, Betrieb, Monitoring, Weiterentwicklung).
Produkte: NeX2fly Suite (Arbeitsplattform mit Kunden-/Partnerportal; Tarifentwurf, noch NICHT freigegeben: Test 0 €, Starter 49 €, Pro 149 €, Business 399 €, Enterprise individuell),
NeX Agentic AIFly (ausführender Agent: setzt um, erledigt, automatisiert – nur mit Freigaben), Skills & MCP (Integrationen), TEILEKLAR.shop (eigenständige Shopmarke für Fahrzeugteile mit Werkstattsuche).
Zusammenarbeit: Vorhaben beschreiben → Umfang festlegen → Umsetzen & übergeben → Weiterentwickeln. Erst das Vorhaben, dann die Technik.
Regeln: Antworte auf Deutsch (oder in der Sprache des Nutzers), mit „Sie“, ruhig, souverän, konkret, kurze klare Sätze, höchstens ca. 120 Wörter.
Erfinde keine Referenzen, Kundennamen, Zahlen, Garantien, Termine oder Funktionen. Gib keine verbindlichen Preise oder Angebote ab – nur den Tagessatz und den Hinweis, dass Pascal den Umfang persönlich kalkuliert.
Sage ehrlich, wenn etwas noch nicht verfügbar ist oder du es nicht weißt. Frage nach Ziel, Alltag und vorhandenen Systemen, um das Vorhaben einzuordnen.
Schließe, wenn passend, mit einem konkreten nächsten Schritt: Projektanfrage über /kontakt oder Registrierung im Kundenportal unter /registrieren. Keine Rechtsberatung."""


# ---------- helpers ----------
async def current_user(request: Request):
    from .accounts_api import session_user
    return await session_user(request)


async def need_user(request: Request):
    user = await current_user(request)
    if not user:
        raise HTTPException(401, {"error": "authentication_required"})
    return user


async def need_admin(request: Request):
    user = await need_user(request)
    if user.get("role") != "admin":
        raise HTTPException(403, {"error": "admin_required"})
    return user


def clean(doc):
    if not doc:
        return doc
    doc = {k: v for k, v in doc.items() if k not in ("_id", "hash", "password_hash")}
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


async def next_number(kind, fmt):
    counter = await db.counters.find_one_and_update({"_id": "%s-%d" % (kind, YEAR)}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER)
    return fmt % (YEAR, counter["seq"])


async def audit(actor, action, target, detail=""):
    await db.audit.insert_one({"id": uuid.uuid4().hex, "at": now_iso(), "actor": actor.get("email", "system") if isinstance(actor, dict) else actor,
                               "action": action, "target": target, "detail": str(detail)[:400]})


async def ensure_nexify_indexes():
    for name, keys in (("projects", "tenant_id"), ("offers", "tenant_id"), ("invoices", "tenant_id"), ("documents", "tenant_id"),
                       ("tickets", "tenant_id"), ("api_keys", "tenant_id"), ("oracle_messages", "session_id")):
        await db[name].create_index(keys)
    await db.api_keys.create_index("hash", unique=True)
    await db.invoices.create_index("number", unique=True)


# ---------- AIFly ORACLE ----------
def providers():
    llm = bool(os.environ.get("EMERGENT_LLM_KEY"))
    nine = all(os.environ.get(k) for k in ("NINEROUTER_BASE_URL", "NINEROUTER_API_KEY", "NINEROUTER_MODEL"))
    return [
        {"id": "anthropic", "label": "Claude", "model": os.environ.get("ORACLE_ANTHROPIC_MODEL", "claude-sonnet-5-5"), "available": llm},
        {"id": "openai", "label": "GPT", "model": os.environ.get("ORACLE_OPENAI_MODEL", "gpt-5.6-terra"), "available": llm},
        {"id": "ninerouter", "label": "9router", "model": os.environ.get("NINEROUTER_MODEL", ""), "available": nine},
    ]


class ChatIn(BaseModel):
    session_id: str = Field("", max_length=64)
    message: str = Field(min_length=1, max_length=2000)
    provider: str = Field("", max_length=20)
    page: str = Field("", max_length=120)


@router.get("/api/oracle/providers")
async def oracle_providers():
    default = os.environ.get("ORACLE_DEFAULT_PROVIDER", "anthropic")
    return {"default": default, "providers": providers()}


@router.get("/api/oracle/history/{session_id}")
async def oracle_history(session_id: str):
    items = await db.oracle_messages.find({"session_id": session_id[:64]}, {"_id": 0}).sort("at", 1).to_list(200)
    return {"session_id": session_id, "messages": items}


async def _stream_ninerouter(history, message):
    base = os.environ["NINEROUTER_BASE_URL"].rstrip("/")
    payload = {"model": os.environ["NINEROUTER_MODEL"], "stream": True,
               "messages": [{"role": "system", "content": ORACLE_PROMPT}] + history + [{"role": "user", "content": message}]}
    async with httpx.AsyncClient(timeout=90) as client:
        async with client.stream("POST", base + "/chat/completions", json=payload, headers={"Authorization": "Bearer " + os.environ["NINEROUTER_API_KEY"]}) as r:
            if r.status_code >= 400:
                raise RuntimeError("ninerouter_%d" % r.status_code)
            async for line in r.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    delta = json.loads(data)["choices"][0].get("delta", {}).get("content")
                except (ValueError, KeyError, IndexError):
                    delta = None
                if delta:
                    yield delta


async def _stream_emergent(provider, model, history, message, session_id):
    from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage
    context = "\n".join("%s: %s" % ("Nutzer" if m["role"] == "user" else "Oracle", m["content"]) for m in history[-12:])
    prompt = ORACLE_PROMPT + ("\n\nBisheriger Gesprächsverlauf:\n" + context if context else "")
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=session_id + "-" + uuid.uuid4().hex[:6], system_message=prompt).with_model(provider, model)
    async for event in chat.stream_message(UserMessage(text=message)):
        if isinstance(event, TextDelta):
            yield event.content
        elif isinstance(event, StreamDone):
            break


@router.post("/api/oracle/chat")
async def oracle_chat(body: ChatIn, request: Request):
    user = await current_user(request)
    session_id = body.session_id if body.session_id and body.session_id.replace("-", "").isalnum() else uuid.uuid4().hex
    since = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    if await db.oracle_messages.count_documents({"session_id": session_id, "role": "user", "at": {"$gte": since}}) >= CHAT_DAILY_LIMIT:
        raise HTTPException(429, {"error": "rate_limited", "message": "Das Tageslimit für diesen Chat ist erreicht. Schreiben Sie uns gern über das Kontaktformular."})
    available = {p["id"]: p for p in providers() if p["available"]}
    wanted = body.provider or os.environ.get("ORACLE_DEFAULT_PROVIDER", "anthropic")
    chosen = available.get(wanted) or available.get("anthropic") or available.get("openai") or next(iter(available.values()), None)
    if not chosen:
        raise HTTPException(503, {"error": "oracle_unavailable", "message": "Oracle ist gerade nicht erreichbar."})
    history = [{"role": m["role"], "content": m["content"]} for m in await db.oracle_messages.find({"session_id": session_id}, {"_id": 0}).sort("at", 1).to_list(40)]
    base = {"session_id": session_id, "user_id": user["user_id"] if user else None, "page": body.page}
    await db.oracle_messages.insert_one({**base, "role": "user", "content": body.message.strip(), "at": now_iso()})

    async def events():
        yield "event: meta\ndata: %s\n\n" % json.dumps({"session_id": session_id, "provider": chosen["id"], "model": chosen["model"]})
        text, started = "", time.time()
        try:
            gen = _stream_ninerouter(history, body.message) if chosen["id"] == "ninerouter" else _stream_emergent(chosen["id"], chosen["model"], history, body.message, session_id)
            async for chunk in gen:
                text += chunk
                yield "data: %s\n\n" % json.dumps({"delta": chunk})
        except Exception as exc:  # provider failure is reported honestly, never as an answer
            yield "event: error\ndata: %s\n\n" % json.dumps({"message": "Oracle konnte gerade nicht antworten. Bitte versuchen Sie es erneut.", "code": type(exc).__name__})
        if text:
            await db.oracle_messages.insert_one({**base, "role": "assistant", "content": text, "provider": chosen["id"], "model": chosen["model"],
                                                 "ms": int((time.time() - started) * 1000), "at": now_iso()})
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------- Customer portal ----------
async def mine(collection, user, sort="created_at"):
    return [clean(d) for d in await db[collection].find({"tenant_id": user["user_id"]}).sort(sort, -1).to_list(200)]


@router.get("/api/portal/overview")
async def portal_overview(request: Request):
    user = await need_user(request)
    tid = user["user_id"]
    projects = await mine("projects", user, "updated_at")
    offers_open = await db.offers.count_documents({"tenant_id": tid, "status": "sent"})
    invoices_open = await db.invoices.count_documents({"tenant_id": tid, "status": {"$in": ["open", "overdue"]}})
    tickets_open = await db.tickets.count_documents({"tenant_id": tid, "status": {"$ne": "closed"}})
    reqs = await db.requests.count_documents({"$or": [{"user_id": tid}, {"email": user["email"]}]})
    sub = clean(await db.subscriptions.find_one({"tenant_id": tid}))
    next_steps = [s for p in projects for s in p.get("next_steps", [])][:6]
    return {"user": clean(user), "projects": projects[:5], "counts": {"offers_open": offers_open, "invoices_open": invoices_open, "tickets_open": tickets_open, "requests": reqs,
            "projects": len(projects)}, "next_steps": next_steps, "subscription": sub}


@router.get("/api/portal/requests")
async def portal_requests(request: Request):
    user = await need_user(request)
    items = await db.requests.find({"$or": [{"user_id": user["user_id"]}, {"email": user["email"]}]}, {"_id": 0, "payload_hash": 0}).sort("created_at", -1).to_list(100)
    return {"items": items}


@router.get("/api/portal/offers")
async def portal_offers(request: Request):
    return {"items": await mine("offers", await need_user(request))}


class DecisionIn(BaseModel):
    decision: str = Field(pattern="^(accept|decline)$")
    note: str = Field("", max_length=1000)


@router.post("/api/portal/offers/{offer_id}/decision")
async def portal_offer_decision(offer_id: str, body: DecisionIn, request: Request):
    user = await need_user(request)
    offer = await db.offers.find_one({"offer_id": offer_id, "tenant_id": user["user_id"]})
    if not offer:
        raise HTTPException(404, {"error": "not_found"})
    if offer["status"] != "sent":
        raise HTTPException(409, {"error": "already_decided", "status": offer["status"]})
    status = "accepted" if body.decision == "accept" else "declined"
    await db.offers.update_one({"offer_id": offer_id}, {"$set": {"status": status, "decided_at": now_iso(), "decision_note": body.note}})
    await audit(user, "offer_" + status, offer["number"], body.note)
    to = mailer.setting("MAIL_INTERNAL_TO")
    if to:
        await mailer.enqueue("offer-decision:" + offer_id, to, "Angebot %s %s" % (offer["number"], "angenommen" if status == "accepted" else "abgelehnt"),
                             "<p>%s hat das Angebot <b>%s</b> (%s) %s.</p><p>%s</p>" % (user["email"], offer["number"], offer["title"], "angenommen" if status == "accepted" else "abgelehnt", body.note),
                             "%s: %s %s" % (user["email"], offer["number"], status))
    return clean(await db.offers.find_one({"offer_id": offer_id}))


@router.get("/api/portal/projects")
async def portal_projects(request: Request):
    return {"items": await mine("projects", await need_user(request), "updated_at")}


@router.get("/api/portal/documents")
async def portal_documents(request: Request):
    items = await mine("documents", await need_user(request))
    for d in items:
        d.pop("content", None)
    return {"items": items}


@router.get("/api/portal/documents/{doc_id}/download")
async def portal_document_download(doc_id: str, request: Request):
    user = await need_user(request)
    doc = await db.documents.find_one({"doc_id": doc_id, "tenant_id": user["user_id"]})
    if not doc:
        raise HTTPException(404, {"error": "not_found"})
    name = "%s-v%s.txt" % (doc["title"].replace(" ", "-")[:60], doc.get("version", 1))
    return PlainTextResponse(doc.get("content", ""), headers={"Content-Disposition": 'attachment; filename="%s"' % name})


@router.get("/api/portal/invoices")
async def portal_invoices(request: Request):
    return {"items": await mine("invoices", await need_user(request))}


def invoice_html(inv, customer):
    rows = "".join("<tr><td>%s</td><td style='text-align:right'>%s</td><td style='text-align:right'>%.2f €</td></tr>" % (i["label"], i.get("days", ""), i["amount"]) for i in inv["items"])
    return """<!doctype html><html lang="de"><meta charset="utf-8"><title>%s</title><body style="font-family:Inter,Arial,sans-serif;max-width:760px;margin:40px auto;color:#111">
<h1 style="font-size:22px">Rechnung %s</h1><p>NeXify AI · Graaf van Loonstraat 1E · 5921 JA Venlo · Niederlande<br>BTW NL865786276B01 · KvK 90483944</p>
<p><b>Empfänger:</b> %s<br>%s</p><p>Rechnungsdatum: %s · Fällig: %s</p>
<table style="width:100%%;border-collapse:collapse" border="1" cellpadding="8"><tr><th style="text-align:left">Leistung</th><th>Tage</th><th>Betrag netto</th></tr>%s</table>
<p style="text-align:right">Netto: %.2f € · USt. %s %%: %.2f € · <b>Gesamt: %.2f €</b></p><p>Status: %s</p></body></html>""" % (
        inv["number"], inv["number"], customer.get("company") or customer.get("name", ""), customer.get("email", ""), inv["created_at"][:10], inv.get("due", "")[:10], rows,
        inv["amount_net"], inv["vat_percent"], inv["vat"], inv["total"], {"open": "offen", "paid": "bezahlt", "overdue": "überfällig"}.get(inv["status"], inv["status"]))


@router.get("/api/portal/invoices/{invoice_id}/download")
async def portal_invoice_download(invoice_id: str, request: Request):
    user = await need_user(request)
    q = {"invoice_id": invoice_id} if user.get("role") == "admin" else {"invoice_id": invoice_id, "tenant_id": user["user_id"]}
    inv = await db.invoices.find_one(q)
    if not inv:
        raise HTTPException(404, {"error": "not_found"})
    customer = await db.users.find_one({"user_id": inv["tenant_id"]}, {"_id": 0, "password_hash": 0}) or {}
    return Response(invoice_html(inv, customer), media_type="text/html", headers={"Content-Disposition": 'attachment; filename="%s.html"' % inv["number"]})


class TicketIn(BaseModel):
    subject: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=5, max_length=4000)
    priority: str = Field("normal", pattern="^(niedrig|normal|hoch)$")


class MessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


@router.get("/api/portal/tickets")
async def portal_tickets(request: Request):
    return {"items": await mine("tickets", await need_user(request), "updated_at")}


@router.post("/api/portal/tickets", status_code=201)
async def portal_ticket_create(body: TicketIn, request: Request):
    user = await need_user(request)
    number = await next_number("ticket", "TK-%d-%04d")
    doc = {"ticket_id": uuid.uuid4().hex, "number": number, "tenant_id": user["user_id"], "subject": body.subject.strip(), "priority": body.priority, "status": "open",
           "messages": [{"from": "customer", "author": user.get("name") or user["email"], "text": body.message.strip(), "at": now_iso()}], "created_at": now_iso(), "updated_at": now_iso()}
    await db.tickets.insert_one(doc)
    to = mailer.setting("MAIL_INTERNAL_TO")
    if to:
        await mailer.enqueue("ticket:" + doc["ticket_id"], to, "Supportticket %s: %s" % (number, doc["subject"]), "<p>%s</p><p>%s</p>" % (user["email"], body.message), body.message, reply_to=user["email"])
    return clean(doc)


@router.post("/api/portal/tickets/{ticket_id}/messages")
async def portal_ticket_message(ticket_id: str, body: MessageIn, request: Request):
    user = await need_user(request)
    q = {"ticket_id": ticket_id, "tenant_id": user["user_id"]}
    if not await db.tickets.find_one(q, {"_id": 1}):
        raise HTTPException(404, {"error": "not_found"})
    await db.tickets.update_one(q, {"$push": {"messages": {"from": "customer", "author": user.get("name") or user["email"], "text": body.message.strip(), "at": now_iso()}},
                                    "$set": {"status": "open", "updated_at": now_iso()}})
    return clean(await db.tickets.find_one(q))


class KeyIn(BaseModel):
    label: str = Field(min_length=2, max_length=60)


@router.get("/api/portal/api-keys")
async def portal_keys(request: Request):
    return {"items": await mine("api_keys", await need_user(request))}


@router.post("/api/portal/api-keys", status_code=201)
async def portal_key_create(body: KeyIn, request: Request):
    user = await need_user(request)
    if await db.api_keys.count_documents({"tenant_id": user["user_id"], "revoked_at": None}) >= 5:
        raise HTTPException(409, {"error": "key_limit", "message": "Maximal fünf aktive Schlüssel."})
    raw = "nxf_" + secrets.token_urlsafe(30)
    doc = {"key_id": uuid.uuid4().hex, "tenant_id": user["user_id"], "label": body.label.strip(), "prefix": raw[:10], "hash": hashlib.sha256(raw.encode()).hexdigest(),
           "created_at": now_iso(), "revoked_at": None, "last_used_at": None, "calls": 0}
    await db.api_keys.insert_one(doc)
    await audit(user, "api_key_created", doc["prefix"])
    return {**clean(doc), "secret": raw}


@router.delete("/api/portal/api-keys/{key_id}")
async def portal_key_revoke(key_id: str, request: Request):
    user = await need_user(request)
    res = await db.api_keys.update_one({"key_id": key_id, "tenant_id": user["user_id"], "revoked_at": None}, {"$set": {"revoked_at": now_iso()}})
    if not res.matched_count:
        raise HTTPException(404, {"error": "not_found"})
    await audit(user, "api_key_revoked", key_id)
    return {"ok": True}


@router.get("/api/v1/whoami")
async def api_whoami(request: Request):
    """Minimal authenticated API endpoint for customer keys (Bearer nxf_…)."""
    header = request.headers.get("authorization", "")
    raw = header[7:] if header.lower().startswith("bearer ") else ""
    key = await db.api_keys.find_one({"hash": hashlib.sha256(raw.encode()).hexdigest(), "revoked_at": None}) if raw.startswith("nxf_") else None
    if not key:
        raise HTTPException(401, {"error": "invalid_api_key"})
    await db.api_keys.update_one({"key_id": key["key_id"]}, {"$set": {"last_used_at": now_iso()}, "$inc": {"calls": 1}})
    return {"tenant_id": key["tenant_id"], "key": key["prefix"], "label": key["label"]}


class AgentIn(BaseModel):
    name: str = Field(min_length=2, max_length=40)
    tone: str = Field("sachlich", max_length=40)
    instructions: str = Field("", max_length=3000)
    tools: list[str] = Field(default_factory=list, max_length=12)
    approval_required: bool = True


@router.get("/api/portal/agent")
async def portal_agent(request: Request):
    user = await need_user(request)
    doc = await db.agent_configs.find_one({"tenant_id": user["user_id"]})
    return clean(doc) or {"tenant_id": user["user_id"], "name": "Mein NeX", "tone": "sachlich", "instructions": "", "tools": [], "approval_required": True, "status": "nicht eingerichtet"}


@router.put("/api/portal/agent")
async def portal_agent_save(body: AgentIn, request: Request):
    user = await need_user(request)
    data = {**body.model_dump(), "tenant_id": user["user_id"], "status": "konfiguriert – Aktivierung nach Freigabe", "updated_at": now_iso()}
    await db.agent_configs.update_one({"tenant_id": user["user_id"]}, {"$set": data}, upsert=True)
    await audit(user, "agent_config_saved", body.name)
    return data


class PlanIn(BaseModel):
    plan: str = Field(pattern="^(test|starter|pro|business|enterprise)$")
    action: str = Field("change", pattern="^(change|cancel)$")


@router.get("/api/portal/subscription")
async def portal_subscription(request: Request):
    user = await need_user(request)
    sub = clean(await db.subscriptions.find_one({"tenant_id": user["user_id"]}))
    usage = {"oracle_messages": await db.oracle_messages.count_documents({"user_id": user["user_id"], "role": "user"}),
             "api_calls": sum(k.get("calls", 0) for k in await db.api_keys.find({"tenant_id": user["user_id"]}).to_list(20))}
    return {"subscription": sub, "usage": usage, "plans": [{"id": k, "label": v[0], "price": v[1]} for k, v in PLANS.items()], "draft": True}


@router.put("/api/portal/subscription")
async def portal_subscription_save(body: PlanIn, request: Request):
    user = await need_user(request)
    label, price = PLANS[body.plan]
    status = "kuendigung_angefragt" if body.action == "cancel" else ("aktiv" if body.plan == "test" else "angefragt")
    data = {"tenant_id": user["user_id"], "plan": body.plan, "label": label, "price": price, "status": status, "updated_at": now_iso()}
    await db.subscriptions.update_one({"tenant_id": user["user_id"]}, {"$set": data, "$setOnInsert": {"created_at": now_iso()}}, upsert=True)
    await audit(user, "subscription_" + body.action, body.plan)
    return data


class ProfileIn(BaseModel):
    name: str = Field("", max_length=100)
    company: str = Field("", max_length=120)
    phone: str = Field("", max_length=40)
    vat_id: str = Field("", max_length=30)
    address: str = Field("", max_length=300)


@router.get("/api/portal/profile")
async def portal_profile(request: Request):
    user = await need_user(request)
    team = [clean(m) for m in await db.team_members.find({"tenant_id": user["user_id"]}).to_list(50)]
    privacy = [clean(p) for p in await db.privacy_requests.find({"tenant_id": user["user_id"]}).sort("created_at", -1).to_list(20)]
    return {"user": clean(user), "team": team, "privacy_requests": privacy}


@router.put("/api/portal/profile")
async def portal_profile_save(body: ProfileIn, request: Request):
    user = await need_user(request)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {**body.model_dump(), "updated_at": now_iso()}})
    return clean(await db.users.find_one({"user_id": user["user_id"]}, {"password_hash": 0}))


class TeamIn(BaseModel):
    email: str = Field(min_length=5, max_length=160)
    role: str = Field("mitarbeit", pattern="^(mitarbeit|freigabe|lesen)$")


@router.post("/api/portal/team", status_code=201)
async def portal_team_add(body: TeamIn, request: Request):
    user = await need_user(request)
    doc = {"member_id": uuid.uuid4().hex, "tenant_id": user["user_id"], "email": body.email.strip().lower(), "role": body.role, "status": "eingeladen", "created_at": now_iso()}
    await db.team_members.insert_one(doc)
    return clean(doc)


@router.delete("/api/portal/team/{member_id}")
async def portal_team_remove(member_id: str, request: Request):
    user = await need_user(request)
    await db.team_members.delete_one({"member_id": member_id, "tenant_id": user["user_id"]})
    return {"ok": True}


class PrivacyIn(BaseModel):
    kind: str = Field(pattern="^(auskunft|loeschung|berichtigung)$")
    note: str = Field("", max_length=1000)


@router.post("/api/portal/privacy-request", status_code=201)
async def portal_privacy(body: PrivacyIn, request: Request):
    user = await need_user(request)
    doc = {"privacy_id": uuid.uuid4().hex, "tenant_id": user["user_id"], "email": user["email"], "kind": body.kind, "note": body.note, "status": "eingegangen", "created_at": now_iso()}
    await db.privacy_requests.insert_one(doc)
    await audit(user, "privacy_request", body.kind)
    return clean(doc)


# ---------- Operator dashboard ----------
@router.get("/api/operator/overview")
async def operator_overview(request: Request):
    await need_admin(request)
    started = time.time()
    await db.command("ping")
    mongo_ms = int((time.time() - started) * 1000)
    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    pipeline = {s: await db.requests.count_documents({"stage": s}) for s in STAGES}
    pipeline["lead"] += await db.requests.count_documents({"stage": {"$exists": False}})
    outbox = {s: await db.mail_outbox.count_documents({"status": s}) for s in ("sent", "pending", "failed", "not_configured")}
    checks = [
        {"name": "Datenbank", "state": "ok", "detail": "Ping %d ms" % mongo_ms},
        {"name": "Oracle-Modellzugang", "state": "ok" if os.environ.get("EMERGENT_LLM_KEY") else "blocked", "detail": ", ".join(p["label"] for p in providers() if p["available"]) or "kein Zugang"},
        {"name": "9router", "state": "ok" if providers()[2]["available"] else "not_configured", "detail": "Endpunkt, Schlüssel und Modell" + ("" if providers()[2]["available"] else " fehlen")},
        {"name": "Maildienst (Resend)", "state": "ok" if os.environ.get("RESEND_API_KEY") else "not_configured", "detail": "%d gesendet · %d offen · %d fehlgeschlagen" % (outbox["sent"], outbox["pending"], outbox["failed"])},
        {"name": "BigBuy-Katalog", "state": "ok" if await db.products.count_documents({"active": True}) else "blocked", "detail": "%d aktive Produkte" % await db.products.count_documents({"active": True})},
        {"name": "Zahlungsdienst (Revolut)", "state": "ok" if any(os.environ.get(k) for k in ("REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION", "REVOLUT_MERCHANT_SECRET_KEY_SANDBOX")) else "not_configured", "detail": "Shop-Checkout"},
        {"name": "Täglicher 08:00-Bericht", "state": "not_run", "detail": "Scheduler und Zustellung nicht nachgewiesen"},
    ]
    return {
        "counts": {"requests_7d": await db.requests.count_documents({"created_at": {"$gte": since}}), "requests": await db.requests.estimated_document_count(),
                   "customers": await db.users.count_documents({"role": "customer"}), "projects": await db.projects.count_documents({"status": {"$ne": "abgeschlossen"}}),
                   "offers_open": await db.offers.count_documents({"status": "sent"}), "invoices_open": await db.invoices.count_documents({"status": {"$in": ["open", "overdue"]}}),
                   "tickets_open": await db.tickets.count_documents({"status": {"$ne": "closed"}}), "oracle_sessions": len(await db.oracle_messages.distinct("session_id")),
                   "orders": await db.orders.estimated_document_count()},
        "revenue": {"invoiced": round(sum(i["total"] for i in await db.invoices.find({}, {"total": 1}).to_list(2000)), 2),
                    "paid": round(sum(i["total"] for i in await db.invoices.find({"status": "paid"}, {"total": 1}).to_list(2000)), 2)},
        "pipeline": pipeline, "checks": checks,
        "approvals": [clean(o) for o in await db.offers.find({"status": "accepted", "invoiced": {"$ne": True}}).to_list(20)],
        "audit": [clean(a) for a in await db.audit.find().sort("at", -1).to_list(12)],
        "generated_at": now_iso(),
    }


class OperatorRequest(BaseModel):
    model_config = {"extra": "allow"}
    id: str
    number: str
    stage: str = "lead"


class OperatorRequests(BaseModel):
    items: list[OperatorRequest]
    stages: list[str]


def request_response(doc):
    if not doc:
        raise HTTPException(404, {"error": "not_found"})
    data = clean(doc)
    data.pop("payload_hash", None)
    return OperatorRequest(**{**data, "id": str(doc["_id"])})


@router.get("/api/operator/requests", response_model=OperatorRequests)
async def operator_requests(request: Request):
    await need_admin(request)
    docs = await db.requests.find({}, {"payload_hash": 0}).sort("created_at", -1).to_list(300)
    return OperatorRequests(items=[request_response(doc) for doc in docs], stages=STAGES)


class StageIn(BaseModel):
    stage: str = Field(pattern="^(" + "|".join(STAGES) + ")$")
    note: str = Field("", max_length=1000)


@router.patch("/api/operator/requests/{number}", response_model=OperatorRequest)
async def operator_request_stage(number: str, body: StageIn, request: Request):
    admin = await need_admin(request)
    update = {"$set": {"stage": body.stage, "updated_at": now_iso()}}
    if body.note:
        update["$push"] = {"notes": {"text": body.note, "at": now_iso(), "by": admin["email"]}}
    res = await db.requests.update_one({"number": number}, update)
    if not res.matched_count:
        raise HTTPException(404, {"error": "not_found"})
    await audit(admin, "request_stage", number, body.stage)
    updated = await db.requests.find_one({"number": number}, {"payload_hash": 0})
    return request_response(updated)


@router.get("/api/operator/customers")
async def operator_customers(request: Request):
    await need_admin(request)
    users = [clean(u) for u in await db.users.find({"role": "customer"}, {"password_hash": 0}).sort("created_at", -1).to_list(500)]
    for u in users:
        u["projects"] = await db.projects.count_documents({"tenant_id": u["user_id"]})
    return {"items": users}


async def tenant_or_404(tenant_id):
    user = await db.users.find_one({"user_id": tenant_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(404, {"error": "tenant_not_found"})
    return user


class PackageIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    owner: str = Field("Pascal Courbois", max_length=80)
    status: str = Field("geplant", max_length=30)


class ProjectIn(BaseModel):
    tenant_id: str
    title: str = Field(min_length=2, max_length=160)
    summary: str = Field("", max_length=2000)
    phase: str = Field("discovery", max_length=40)
    deadline: str = Field("", max_length=20)
    next_steps: list[str] = Field(default_factory=list)
    packages: list[PackageIn] = Field(default_factory=list)


class ProjectPatch(BaseModel):
    status: str | None = Field(None, max_length=30)
    phase: str | None = Field(None, max_length=40)
    next_steps: list[str] | None = None
    package_id: str | None = None
    package_status: str | None = Field(None, max_length=30)
    package_evidence: str | None = Field(None, max_length=500)
    add_package: PackageIn | None = None


@router.get("/api/operator/projects")
async def operator_projects(request: Request):
    await need_admin(request)
    return {"items": [clean(p) for p in await db.projects.find().sort("updated_at", -1).to_list(300)]}


@router.post("/api/operator/projects", status_code=201)
async def operator_project_create(body: ProjectIn, request: Request):
    admin = await need_admin(request)
    tenant = await tenant_or_404(body.tenant_id)
    doc = {"project_id": uuid.uuid4().hex, "tenant_id": body.tenant_id, "customer": tenant.get("company") or tenant["email"], "title": body.title, "summary": body.summary,
           "phase": body.phase, "status": "aktiv", "deadline": body.deadline, "next_steps": body.next_steps, "created_at": now_iso(), "updated_at": now_iso(),
           "packages": [{"id": uuid.uuid4().hex[:10], **p.model_dump(), "evidence": ""} for p in body.packages]}
    await db.projects.insert_one(doc)
    await audit(admin, "project_created", body.title)
    return clean(doc)


@router.patch("/api/operator/projects/{project_id}")
async def operator_project_patch(project_id: str, body: ProjectPatch, request: Request):
    admin = await need_admin(request)
    project = await db.projects.find_one({"project_id": project_id})
    if not project:
        raise HTTPException(404, {"error": "not_found"})
    sets = {"updated_at": now_iso()}
    for field in ("status", "phase", "next_steps"):
        if getattr(body, field) is not None:
            sets[field] = getattr(body, field)
    packages = project.get("packages", [])
    if body.package_id:
        for p in packages:
            if p["id"] == body.package_id:
                if body.package_status:
                    p["status"] = body.package_status
                if body.package_evidence is not None:
                    p["evidence"] = body.package_evidence
        sets["packages"] = packages
    if body.add_package:
        packages.append({"id": uuid.uuid4().hex[:10], **body.add_package.model_dump(), "evidence": ""})
        sets["packages"] = packages
    await db.projects.update_one({"project_id": project_id}, {"$set": sets})
    await audit(admin, "project_updated", project["title"], json.dumps({k: v for k, v in sets.items() if k != "packages"}, ensure_ascii=False))
    return clean(await db.projects.find_one({"project_id": project_id}))


class ItemIn(BaseModel):
    label: str = Field(min_length=2, max_length=200)
    days: float = Field(0, ge=0, le=500)
    amount: float | None = Field(None, ge=0)


class OfferIn(BaseModel):
    tenant_id: str
    title: str = Field(min_length=2, max_length=160)
    intro: str = Field("", max_length=3000)
    items: list[ItemIn] = Field(min_length=1)
    valid_days: int = Field(30, ge=1, le=120)


def priced(items):
    out = []
    for i in items:
        amount = i.amount if i.amount is not None else round(i.days * DAY_RATE, 2)
        out.append({"label": i.label, "days": i.days, "amount": round(amount, 2)})
    return out


@router.get("/api/operator/offers")
async def operator_offers(request: Request):
    await need_admin(request)
    return {"items": [clean(o) for o in await db.offers.find().sort("created_at", -1).to_list(300)]}


@router.post("/api/operator/offers", status_code=201)
async def operator_offer_create(body: OfferIn, request: Request):
    admin = await need_admin(request)
    tenant = await tenant_or_404(body.tenant_id)
    items = priced(body.items)
    doc = {"offer_id": uuid.uuid4().hex, "number": await next_number("offer", "ANG-%d-%04d"), "tenant_id": body.tenant_id, "customer": tenant.get("company") or tenant["email"],
           "title": body.title, "intro": body.intro, "items": items, "total_net": round(sum(i["amount"] for i in items), 2), "day_rate": DAY_RATE, "status": "sent",
           "valid_until": (datetime.now(timezone.utc) + timedelta(days=body.valid_days)).isoformat(), "created_at": now_iso()}
    await db.offers.insert_one(doc)
    await audit(admin, "offer_released", doc["number"], "Freigabe durch Inhaber beim Versand ins Portal")
    return clean(doc)


class InvoiceIn(BaseModel):
    tenant_id: str | None = None
    offer_id: str | None = None
    items: list[ItemIn] = Field(default_factory=list)
    due_days: int = Field(14, ge=1, le=90)
    vat_percent: float = Field(19, ge=0, le=30)


@router.get("/api/operator/invoices")
async def operator_invoices(request: Request):
    await need_admin(request)
    return {"items": [clean(i) for i in await db.invoices.find().sort("created_at", -1).to_list(500)]}


@router.post("/api/operator/invoices", status_code=201)
async def operator_invoice_create(body: InvoiceIn, request: Request):
    admin = await need_admin(request)
    offer = None
    if body.offer_id:
        offer = await db.offers.find_one({"offer_id": body.offer_id, "status": "accepted"})
        if not offer:
            raise HTTPException(409, {"error": "offer_not_accepted"})
    tenant_id = offer["tenant_id"] if offer else body.tenant_id
    await tenant_or_404(tenant_id or "")
    items = offer["items"] if offer else priced(body.items)
    if not items:
        raise HTTPException(422, {"error": "items_required"})
    net = round(sum(i["amount"] for i in items), 2)
    vat = round(net * body.vat_percent / 100, 2)
    doc = {"invoice_id": uuid.uuid4().hex, "number": await next_number("invoice", "NEXIFY-%d-%05d"), "tenant_id": tenant_id, "offer_id": body.offer_id, "items": items,
           "amount_net": net, "vat_percent": body.vat_percent, "vat": vat, "total": round(net + vat, 2), "status": "open",
           "due": (datetime.now(timezone.utc) + timedelta(days=body.due_days)).isoformat(), "created_at": now_iso()}
    await db.invoices.insert_one(doc)
    if offer:
        await db.offers.update_one({"offer_id": offer["offer_id"]}, {"$set": {"invoiced": True}})
    await audit(admin, "invoice_created", doc["number"], "%.2f €" % doc["total"])
    return clean(doc)


class InvoicePatch(BaseModel):
    status: str = Field(pattern="^(open|paid|overdue|storniert)$")


@router.patch("/api/operator/invoices/{invoice_id}")
async def operator_invoice_patch(invoice_id: str, body: InvoicePatch, request: Request):
    admin = await need_admin(request)
    res = await db.invoices.update_one({"invoice_id": invoice_id}, {"$set": {"status": body.status, "paid_at": now_iso() if body.status == "paid" else None}})
    if not res.matched_count:
        raise HTTPException(404, {"error": "not_found"})
    await audit(admin, "invoice_status", invoice_id, body.status)
    return clean(await db.invoices.find_one({"invoice_id": invoice_id}))


class DocumentIn(BaseModel):
    tenant_id: str
    title: str = Field(min_length=2, max_length=160)
    kind: str = Field("dokument", pattern="^(vertrag|leistungsbeschreibung|dokument|protokoll)$")
    content: str = Field(min_length=1, max_length=50000)
    status: str = Field("zur_freigabe", pattern="^(entwurf|zur_freigabe|freigegeben|signiert)$")


@router.post("/api/operator/documents", status_code=201)
async def operator_document_create(body: DocumentIn, request: Request):
    admin = await need_admin(request)
    await tenant_or_404(body.tenant_id)
    previous = await db.documents.count_documents({"tenant_id": body.tenant_id, "title": body.title})
    doc = {"doc_id": uuid.uuid4().hex, **body.model_dump(), "version": previous + 1, "created_at": now_iso()}
    await db.documents.insert_one(doc)
    await audit(admin, "document_created", body.title, "v%d" % doc["version"])
    doc.pop("content")
    return clean(doc)


@router.get("/api/operator/tickets")
async def operator_tickets(request: Request):
    await need_admin(request)
    return {"items": [clean(t) for t in await db.tickets.find().sort("updated_at", -1).to_list(300)]}


class ReplyIn(BaseModel):
    message: str = Field("", max_length=4000)
    status: str | None = Field(None, pattern="^(open|answered|closed)$")


@router.post("/api/operator/tickets/{ticket_id}")
async def operator_ticket_reply(ticket_id: str, body: ReplyIn, request: Request):
    admin = await need_admin(request)
    ticket = await db.tickets.find_one({"ticket_id": ticket_id})
    if not ticket:
        raise HTTPException(404, {"error": "not_found"})
    update = {"$set": {"updated_at": now_iso(), "status": body.status or ("answered" if body.message else ticket["status"])}}
    if body.message.strip():
        update["$push"] = {"messages": {"from": "nexify", "author": "NeXify · " + (admin.get("name") or "Team"), "text": body.message.strip(), "at": now_iso()}}
    await db.tickets.update_one({"ticket_id": ticket_id}, update)
    await audit(admin, "ticket_reply", ticket["number"], body.status or "")
    return clean(await db.tickets.find_one({"ticket_id": ticket_id}))


@router.get("/api/operator/oracle")
async def operator_oracle(request: Request):
    await need_admin(request)
    sessions = await db.oracle_messages.aggregate([
        {"$sort": {"at": 1}},
        {"$group": {"_id": "$session_id", "count": {"$sum": 1}, "first": {"$first": "$content"}, "last_at": {"$last": "$at"}, "provider": {"$last": "$provider"}, "page": {"$first": "$page"}}},
        {"$sort": {"last_at": -1}}, {"$limit": 50}]).to_list(50)
    return {"sessions": [{"session_id": s["_id"], "messages": s["count"], "first": s["first"][:160], "last_at": s["last_at"], "provider": s.get("provider"), "page": s.get("page")} for s in sessions],
            "providers": providers()}


@router.get("/api/operator/audit")
async def operator_audit(request: Request):
    await need_admin(request)
    return {"items": [clean(a) for a in await db.audit.find().sort("at", -1).to_list(300)]}
