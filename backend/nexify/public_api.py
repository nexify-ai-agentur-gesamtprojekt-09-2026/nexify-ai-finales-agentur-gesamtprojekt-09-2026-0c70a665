"""Public read models: skills catalogue, connections, service status."""
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from shop import config
from shop.db import db

router = APIRouter(prefix="/api/public")
SKILLS = json.loads((Path(__file__).resolve().parents[1] / "data" / "skills.json").read_text(encoding="utf-8"))
STATUS_LABEL = {"quelle": "Verfügbar als Quelle", "adaptiert": "Adaptiert", "installiert": "Installiert", "freigegeben": "Freigegeben", "ausfuehrbar": "Ausführbar"}

CONNECTIONS = [
    {"id": "google", "name": "Google-Konto (Anmeldung)", "area": "Identität", "binding": "aktiv", "scope": "Name und E-Mail zur Anmeldung", "note": "Nur Anmeldung. Kein Zugriff auf Gmail, Kalender oder Drive."},
    {"id": "claude", "name": "KI-Modell (Claude über NeXify-Router)", "area": "KI", "binding": "aktiv", "scope": "Chat-Eingaben des angemeldeten Nutzers", "note": "Antworten werden als KI gekennzeichnet; keine Werkzeugaktionen ohne Freigabe."},
    {"id": "revolut", "name": "Revolut Merchant", "area": "Zahlung (TEILEKLAR)", "binding": "konfiguration", "scope": "Bestellbetrag, Bestellnummer, E-Mail", "note": "Bezahlseite von Revolut; Status wird serverseitig zurückgelesen."},
    {"id": "bigbuy", "name": "BigBuy Katalog", "area": "Sortiment (TEILEKLAR)", "binding": "konfiguration", "scope": "Lesender Katalogimport", "note": "Produkte, Bilder und gemeldeter Bestand aus dem Lieferantenkatalog."},
    {"id": "resend", "name": "E-Mail-Versand", "area": "Kommunikation", "binding": "konfiguration", "scope": "Transaktionsmails", "note": "Bestätigungen werden nur versendet, wenn der Versand eingerichtet ist."},
    {"id": "gmail", "name": "Gmail / Kalender", "area": "Persönliche Verbindungen", "binding": "nicht_angebunden", "scope": "–", "note": "Nicht angebunden. Würde eine eigene, ausdrückliche Zustimmung je Nutzer erfordern."},
    {"id": "mcp", "name": "Eigene MCP-/API-Server", "area": "Business", "binding": "nicht_angebunden", "scope": "–", "note": "Anbindung erst nach geprüfter Anfrage-Verarbeitung-Antwort-Kette."},
]


@router.get("/skills")
async def skills(q: str = Query("", max_length=80), category: str = "", status: str = ""):
    term = q.strip().lower()
    rows = [s for s in SKILLS if (not term or term in s["name"].lower() or term in s["purpose"].lower()) and (not category or s["category"] == category) and (not status or s["status"] == status)]
    cats = sorted({s["category"] for s in SKILLS})
    counts = {k: sum(1 for s in SKILLS if s["status"] == k) for k in STATUS_LABEL}
    return {"items": [{**s, "status_label": STATUS_LABEL[s["status"]]} for s in rows], "total": len(rows), "all": len(SKILLS), "categories": cats, "status_counts": counts}


@router.get("/skills/{skill_id}")
async def skill(skill_id: str):
    for s in SKILLS:
        if s["id"] == skill_id:
            return {**s, "status_label": STATUS_LABEL[s["status"]], "permissions": "Keine eigenen Rechte. Ausführung nur im Auftrag eines berechtigten Nutzers mit freigegebenen Werkzeugen.",
                    "costs": "Modell- und Werkzeugkosten entstehen erst bei Ausführung und werden dem Projekt zugeordnet.", "external_effects": "Keine ohne gesonderte Freigabe."}
    raise HTTPException(404, {"error": "skill_not_found"})


@router.get("/connections")
async def connections():
    items = []
    for c in CONNECTIONS:
        c = dict(c)
        if c["id"] == "revolut":
            c["binding"] = "aktiv" if config.revolut_key() else "nicht_konfiguriert"
        if c["id"] == "bigbuy":
            c["binding"] = "aktiv" if await db.products.count_documents({"active": True}) else "nicht_konfiguriert"
        if c["id"] == "resend":
            from shop import mailer
            c["binding"] = "aktiv" if mailer.setting("RESEND_API_KEY") else "nicht_konfiguriert"
        items.append(c)
    return {"items": items}


@router.get("/status")
async def service_status():
    from datetime import datetime, timezone
    checked = datetime.now(timezone.utc).isoformat()
    try:
        await db.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    products = await db.products.count_documents({"active": True}) if db_ok else 0
    last = await db.imports.find_one({"status": "done"}, sort=[("finished_at", -1)]) if db_ok else None
    return {"checked_at": checked, "areas": [
        {"id": "web", "name": "Website & Anfragen", "state": "betrieb" if db_ok else "stoerung", "note": "Anfragen werden gespeichert und erhalten eine Vorgangskennung."},
        {"id": "workspace", "name": "Arbeitsbereich & KI-Chat", "state": "betrieb" if db_ok else "stoerung", "note": "KI-Antworten abhängig vom verfügbaren Modellguthaben."},
        {"id": "shop", "name": "TEILEKLAR Katalog", "state": "betrieb" if products else "eingeschraenkt", "note": "%d Artikel aktiv%s." % (products, ", letzter Import " + last["finished_at"][:10] if last else ", noch kein Katalogimport")},
        {"id": "payment", "name": "TEILEKLAR Zahlung (Revolut)", "state": "betrieb" if config.revolut_key() else "eingeschraenkt", "note": "Modus: %s" % config.revolut_mode()},
    ]}
