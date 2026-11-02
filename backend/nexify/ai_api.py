"""Real AI (Claude via Emergent key): workspace chat (persisted, SSE) and TEILEKLAR parts advisor (catalog-grounded, SSE)."""
import json
import os
import re
import secrets

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

from shop import pricing
from shop.catalog_api import present
from shop.db import db
from .common import clean, new_id, now_iso
from .workspace_api import member

router = APIRouter(prefix="/api/ai")
MODEL = ("anthropic", "claude-sonnet-5-5")
AI_NOTICE = "Sie interagieren mit einem KI-System. Antworten können Fehler enthalten. Prüfen Sie wichtige Angaben."
MODES = {
    "frage": "Beantworte die Frage knapp und verständlich.",
    "quellen": "Arbeite ausschließlich mit den unten bereitgestellten Dokumenten des Arbeitsbereichs. Nenne zu jeder Aussage das Dokument in eckigen Klammern. Wenn die Dokumente die Frage nicht beantworten, sage das deutlich.",
    "auftrag": "Der Nutzer beschreibt einen Arbeitsauftrag. Erstelle einen klaren Plan mit Schritten, benötigten Eingaben und den Stellen, an denen eine menschliche Freigabe nötig ist. Führe selbst keine Aktionen aus und behaupte keine Ausführung.",
}
BASE = ("Du bist NeX, der Assistent im NeXify Arbeitsbereich (NeXify AI, Agentur von Pascal Courbois). Antworte auf Deutsch, sachlich und freundlich. "
        "Erfinde keine Preise, Referenzen, Integrationen oder Zusagen. Du hast keinen Zugriff auf externe Systeme, E-Mails oder Kalender. "
        "Wenn etwas eine verbindliche Entscheidung erfordert, verweise auf Pascal bzw. ein Angebot. Nutze kurze Absätze und Listen.")


def sse(obj):
    return "data: " + json.dumps(obj, ensure_ascii=False) + "\n\n"


def key():
    k = os.environ.get("EMERGENT_LLM_KEY")
    if not k:
        raise HTTPException(503, {"error": "ai_not_configured"})
    return k


async def stream_reply(system, prompt, on_done):
    chat = LlmChat(api_key=key(), session_id=new_id("llm"), system_message=system).with_model(*MODEL)
    text = ""
    try:
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta):
                text += ev.content
                yield sse({"type": "delta", "text": ev.content})
            elif isinstance(ev, StreamDone):
                break
    except Exception as error:  # provider/budget failure stays visible, never a fake answer
        msg = str(error)
        code = "ai_budget_exhausted" if "budget" in msg.lower() else "ai_provider_error"
        yield sse({"type": "error", "error": code, "message": "Die KI ist gerade nicht erreichbar%s. Ihre Nachricht ist gespeichert; bitte später erneut senden." % (" (Modellguthaben erschöpft)" if code == "ai_budget_exhausted" else "")})
        await on_done(text, code)
        return
    await on_done(text, None)
    yield sse({"type": "done"})


# ---------- workspace chat ----------
class ChatIn(BaseModel):
    workspace_id: str = Field(max_length=40)
    conversation_id: str | None = Field(None, max_length=40)
    mode: str = Field("frage", pattern="^(frage|quellen|auftrag)$")
    message: str = Field(min_length=1, max_length=8000)


@router.get("/conversations")
async def conversations(workspace_id: str, request: Request):
    user, _, _ = await member(request, workspace_id)
    return {"items": [clean(c) async for c in db.ai_conversations.find({"workspace_id": workspace_id, "user_id": user["user_id"]}).sort("updated_at", -1).limit(50)], "notice": AI_NOTICE}


@router.get("/conversations/{conversation_id}")
async def conversation(conversation_id: str, workspace_id: str, request: Request):
    user, _, _ = await member(request, workspace_id)
    conv = await db.ai_conversations.find_one({"conversation_id": conversation_id, "workspace_id": workspace_id, "user_id": user["user_id"]})
    if not conv:
        raise HTTPException(404, {"error": "conversation_not_found"})
    msgs = [clean(m) async for m in db.ai_messages.find({"conversation_id": conversation_id}).sort("created_at", 1)]
    return {"conversation": clean(conv), "messages": msgs}


@router.post("/chat")
async def chat(body: ChatIn, request: Request):
    user, ws, _ = await member(request, body.workspace_id)
    conv = None
    if body.conversation_id:
        conv = await db.ai_conversations.find_one({"conversation_id": body.conversation_id, "workspace_id": body.workspace_id, "user_id": user["user_id"]})
        if not conv:
            raise HTTPException(404, {"error": "conversation_not_found"})
    if not conv:
        conv = {"conversation_id": new_id("conv"), "workspace_id": body.workspace_id, "user_id": user["user_id"], "title": body.message.strip()[:70],
                "mode": body.mode, "created_at": now_iso(), "updated_at": now_iso()}
        await db.ai_conversations.insert_one(conv)
    history = [m async for m in db.ai_messages.find({"conversation_id": conv["conversation_id"], "error": None}).sort("created_at", -1).limit(16)][::-1]
    await db.ai_messages.insert_one({"message_id": new_id("msg"), "conversation_id": conv["conversation_id"], "role": "user", "mode": body.mode, "text": body.message, "error": None, "created_at": now_iso()})
    sources, used = "", []
    if body.mode == "quellen":
        async for d in db.documents.find({"workspace_id": body.workspace_id, "text": {"$ne": None}}, {"name": 1, "text": 1}).limit(6):
            sources += "\n\n### Dokument: %s\n%s" % (d["name"], (d.get("text") or "")[:9000])
            used.append(d["name"])
        if not used:
            sources = "\n\n(Keine als Kontext nutzbaren Textdokumente im Arbeitsbereich vorhanden.)"
    transcript = "\n".join(("Nutzer: " if m["role"] == "user" else "NeX: ") + m["text"] for m in history)
    system = BASE + "\nArbeitsbereich: %s (%s).\nModus: %s%s" % (ws["name"], "Business" if ws["kind"] == "business" else "Privat", MODES[body.mode], sources)
    prompt = (("Bisheriger Verlauf:\n" + transcript + "\n\n") if transcript else "") + "Aktuelle Nachricht:\n" + body.message

    async def done(text, error):
        await db.ai_messages.insert_one({"message_id": new_id("msg"), "conversation_id": conv["conversation_id"], "role": "assistant", "mode": body.mode,
                                         "text": text, "sources": used, "error": error, "created_at": now_iso()})
        await db.ai_conversations.update_one({"conversation_id": conv["conversation_id"]}, {"$set": {"updated_at": now_iso()}})
        await db.ai_usage.insert_one({"workspace_id": body.workspace_id, "user_id": user["user_id"], "model": "/".join(MODEL), "est_input_tokens": (len(system) + len(prompt)) // 4,
                                      "est_output_tokens": len(text) // 4, "error": error, "at": now_iso()})

    async def gen():
        yield sse({"type": "meta", "conversation_id": conv["conversation_id"], "sources": used, "notice": AI_NOTICE, "model": MODEL[1]})
        async for chunk in stream_reply(system, prompt, done):
            yield chunk
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------- TEILEKLAR parts advisor (public) ----------
class AdvisorIn(BaseModel):
    session_id: str | None = Field(None, max_length=40)
    message: str = Field(min_length=1, max_length=2000)
    vehicle: str = Field("", max_length=160)


TK_SYSTEM = ("Du bist der TEILEKLAR Teileberater (KI). TEILEKLAR ist ein eigenständiger Onlineshop für Auto- und Motorradteile und Zubehör mit Werkstattsuche. "
             "Antworte auf Deutsch, kurz und hilfreich. Empfiehl ausschließlich Artikel aus der bereitgestellten Katalogliste und nenne sie mit Namen. "
             "Behaupte NIE eine Passung für ein bestimmtes Fahrzeug – die Passung ist im Katalog nicht geprüft; empfiehl bei Unsicherheit die Teileanfrage oder eine Werkstatt. "
             "Erfinde keine Preise, Lieferzeiten oder Bestände. Keine Rechts- oder Sicherheitszusagen.")


@router.post("/advisor")
async def advisor(body: AdvisorIn):
    sid = body.session_id if body.session_id and re.fullmatch(r"[A-Za-z0-9_]{6,40}", body.session_id) else "tka_" + secrets.token_hex(8)
    if await db.tk_advisor.count_documents({"session_id": sid}) > 60:
        raise HTTPException(429, {"error": "advisor_limit", "message": "Bitte nutzen Sie für weitere Fragen die Teileanfrage."})
    words = [w for w in re.findall(r"[A-Za-zÄÖÜäöüß0-9-]{4,}", body.message)][:6]
    query = {"active": True}
    if words:
        query["$or"] = [{"name": {"$regex": re.escape(w), "$options": "i"}} for w in words]
    settings = await pricing.settings(db)
    hits = [present(p, settings) async for p in db.products.find(query).sort("stock", -1).limit(8)]
    catalog = "\n".join("- %s (Artikel-ID %s, Bestand %s)" % (h["name"], h["id"], h["stock"] if h["stock"] is not None else "unbekannt") for h in hits) or "(Keine passenden Artikel im aktuellen Katalog gefunden.)"
    history = [m async for m in db.tk_advisor.find({"session_id": sid, "error": None}).sort("created_at", -1).limit(10)][::-1]
    transcript = "\n".join(("Kunde: " if m["role"] == "user" else "Berater: ") + m["text"] for m in history)
    await db.tk_advisor.insert_one({"session_id": sid, "role": "user", "text": body.message, "error": None, "created_at": now_iso()})
    system = TK_SYSTEM + "\n\nKatalogtreffer:\n" + catalog
    prompt = (("Verlauf:\n" + transcript + "\n\n") if transcript else "") + ("Fahrzeug laut Kunde: %s\n" % body.vehicle if body.vehicle else "") + "Frage: " + body.message

    async def done(text, error):
        await db.tk_advisor.insert_one({"session_id": sid, "role": "assistant", "text": text, "error": error, "created_at": now_iso()})

    async def gen():
        yield sse({"type": "meta", "session_id": sid, "notice": AI_NOTICE, "products": hits[:4]})
        async for chunk in stream_reply(system, prompt, done):
            yield chunk
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------- NeXify public orientation chat (AIFly ORACLE) ----------
NX_PAGES = [
    ("/leistungen", "Leistungsübersicht"), ("/leistungen/marke", "Marke & Positionierung"),
    ("/leistungen/websites", "Websites & Landingpages"), ("/leistungen/automatisierung", "Automatisierung"),
    ("/leistungen/ki-agenten", "KI & Agenten"), ("/leistungen/marketing", "Marketing & Kampagnen"),
    ("/leistungen/seo", "SEO & Sichtbarkeit"), ("/care", "Betreuung · Care"),
    ("/produkte", "Produktübersicht"), ("/produkte/nex2fly", "NeX2fly Suite"), ("/produkte/one", "NeX Agentic AI"),
    ("/produkte/oracle", "AIFly ORACLE"), ("/produkte/api", "NeXify API"), ("/teileklar", "TEILEKLAR Shop"),
    ("/preise", "Pakete, Preise & Optionen"), ("/projektbriefing", "Projektbriefing"), ("/kontakt", "Kontakt"),
]
NX_SYSTEM = ("Du bist AIFly ORACLE, die Orientierungs-Beratung auf der Website von NeXify AI (Agentur von Pascal Courbois). "
             "Du hilfst Besuchern, den passenden Einstieg zu finden: Marke, Websites, Automatisierung, KI-Agenten, Marketing, SEO, Produkte oder den TEILEKLAR-Shop. "
             "Antworte auf Deutsch, kurz, freundlich und konkret. Erfinde keine Preise, Referenzen oder Zusagen. "
             "Empfiehl am Ende 1-2 passende Seiten ausschließlich aus der bereitgestellten Liste und nenne sie exakt mit ihrem Titel in eckigen Klammern, z. B. [Websites & Landingpages]. "
             "Für verbindliche Entscheidungen verweise auf das Projektbriefing oder den Kontakt zu Pascal.")


class OrientationIn(BaseModel):
    session_id: str | None = Field(None, max_length=40)
    message: str = Field(min_length=1, max_length=2000)
    page_path: str = Field("", max_length=160)


@router.post("/orientation")
async def orientation(body: OrientationIn):
    sid = body.session_id if body.session_id and re.fullmatch(r"[A-Za-z0-9_]{6,40}", body.session_id) else "nxo_" + secrets.token_hex(8)
    if await db.nx_orientation.count_documents({"session_id": sid}) > 60:
        raise HTTPException(429, {"error": "orientation_limit", "message": "Bitte nutzen Sie für weitere Fragen das Projektbriefing oder den Kontakt."})
    pages = [{"path": p, "title": t} for p, t in NX_PAGES]
    page_list = "\n".join("- [%s] → %s" % (t, p) for p, t in NX_PAGES)
    history = [m async for m in db.nx_orientation.find({"session_id": sid, "error": None}).sort("created_at", -1).limit(10)][::-1]
    transcript = "\n".join(("Besucher: " if m["role"] == "user" else "ORACLE: ") + m["text"] for m in history)
    await db.nx_orientation.insert_one({"session_id": sid, "role": "user", "text": body.message, "error": None, "created_at": now_iso()})
    system = NX_SYSTEM + "\n\nVerfügbare Seiten:\n" + page_list + ("\n\nAktuelle Seite des Besuchers: " + body.page_path if body.page_path else "")
    prompt = (("Bisheriger Verlauf:\n" + transcript + "\n\n") if transcript else "") + "Frage des Besuchers:\n" + body.message

    async def done(text, error):
        await db.nx_orientation.insert_one({"session_id": sid, "role": "assistant", "text": text, "error": error, "created_at": now_iso()})

    async def gen():
        yield sse({"type": "meta", "session_id": sid, "notice": AI_NOTICE, "pages": pages})
        async for chunk in stream_reply(system, prompt, done):
            yield chunk
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
