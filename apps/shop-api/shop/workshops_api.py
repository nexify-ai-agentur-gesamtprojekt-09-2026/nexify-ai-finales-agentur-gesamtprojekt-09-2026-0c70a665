"""Werkstattsuche over the TKW directory (Verzeichnisbetriebe, never partners) and persisted requests."""
import json
import math
import re
import secrets

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from . import config
from .db import db, now_iso

router = APIRouter(prefix="/api/workshops")
REQUEST_STATUS = "Anfrage gesendet – noch kein Termin"
FIELDS = ("id", "name", "street", "zip", "city", "region", "tel", "web", "hours", "lat", "lon", "market")
EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


def km(a, b, c, d):
    p = math.pi / 180
    h = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


async def import_workshops(database=None):
    d = database if database is not None else db
    if await d.workshops.estimated_document_count():
        return 0
    pack = json.loads(config.WORKSHOPS_FILE.read_text(encoding="utf-8"))
    docs, seen = [], set()
    for market, block in pack.items():
        for shop in block.get("shops", []):
            if shop.get("id") in seen:
                continue
            seen.add(shop["id"])
            doc = {k: shop.get(k) for k in FIELDS if shop.get(k) not in (None, "")}
            doc.update({"_id": shop["id"], "market": market, "city_key": (shop.get("city") or "").casefold(), "directory_entry": True,
                        "source": "prototypen/assets/workshops.json"})
            docs.append(doc)
    if docs:
        await d.workshops.insert_many(docs)
    return len(docs)


def public(doc, distance=None):
    item = {k: doc[k] for k in FIELDS if doc.get(k) not in (None, "")}
    item.update({"kind_label": "Verzeichnisbetrieb", "partner": False})
    if distance is not None:
        item["distance_km"] = round(distance, 1)
    return item


async def locate(term):
    if re.fullmatch(r"\d{4,5}", term):
        for match in ({"zip": term}, {"zip": {"$regex": "^" + term[:3]}}):
            pts = [d async for d in db.workshops.find({**match, "lat": {"$exists": True}}, {"lat": 1, "lon": 1})]
            if pts:
                return sum(p["lat"] for p in pts) / len(pts), sum(p["lon"] for p in pts) / len(pts), "plz" if "zip" in match and match["zip"] == term else "plz_bereich"
        return None
    pts = [d async for d in db.workshops.find({"city_key": term.casefold(), "lat": {"$exists": True}}, {"lat": 1, "lon": 1})]
    if not pts:
        pts = [d async for d in db.workshops.find({"city_key": {"$regex": "^" + re.escape(term.casefold())}, "lat": {"$exists": True}}, {"lat": 1, "lon": 1}).limit(500)]
    if pts:
        return sum(p["lat"] for p in pts) / len(pts), sum(p["lon"] for p in pts) / len(pts), "ort"
    return None


@router.get("/search")
async def search(q: str = Query(..., min_length=2, max_length=80), radius: int = Query(25, ge=5, le=200), limit: int = Query(50, ge=1, le=100)):
    term = q.strip()
    center = await locate(term)
    if not center:
        return {"q": term, "radius_km": radius, "center": None, "total": 0, "results": [], "unlocated": []}
    lat, lon, basis = center
    dlat, dlon = radius / 111.0, radius / (111.0 * max(0.2, math.cos(lat * math.pi / 180)))
    box = {"lat": {"$gte": lat - dlat, "$lte": lat + dlat}, "lon": {"$gte": lon - dlon, "$lte": lon + dlon}}
    hits = sorted([(km(lat, lon, d["lat"], d["lon"]), d) async for d in db.workshops.find(box)], key=lambda x: x[0])
    hits = [(dist, d) for dist, d in hits if dist <= radius]
    key = {"zip": term} if term.isdigit() else {"city_key": term.casefold()}
    unlocated = [public(d) async for d in db.workshops.find({**key, "lat": {"$exists": False}}).limit(20)]
    return {"q": term, "radius_km": radius, "center": {"lat": lat, "lon": lon, "basis": basis}, "total": len(hits),
            "results": [public(d, dist) for dist, d in hits[:limit]], "unlocated": unlocated}


@router.get("/{workshop_id}")
async def detail(workshop_id: str):
    doc = await db.workshops.find_one({"_id": workshop_id})
    if not doc:
        raise HTTPException(404, {"error": "workshop_not_found"})
    return public(doc)


class RequestIn(BaseModel):
    name: str = Field("", max_length=100)
    email: str = Field("", max_length=160)
    phone: str = Field("", max_length=40)
    vehicle: str = Field("", max_length=160)
    message: str = Field("", max_length=2000)
    consent: bool = False


@router.post("/{workshop_id}/requests", status_code=201)
async def create_request(workshop_id: str, body: RequestIn):
    doc = await db.workshops.find_one({"_id": workshop_id})
    if not doc:
        raise HTTPException(404, {"error": "workshop_not_found"})
    errors = {}
    if len(body.name.strip()) < 2:
        errors["name"] = "required"
    if not EMAIL.fullmatch(body.email.strip()):
        errors["email"] = "invalid" if body.email.strip() else "required"
    if len(body.message.strip()) < 10:
        errors["message"] = "too_short" if body.message.strip() else "required"
    if not body.consent:
        errors["consent"] = "required"
    if errors:
        raise HTTPException(422, {"error": "request_invalid", "fields": errors})
    request_id = "WA-" + secrets.token_hex(5).upper()
    await db.workshop_requests.insert_one({"_id": request_id, "workshop_id": workshop_id, "workshop_name": doc.get("name"), **body.model_dump(),
                                           "status": REQUEST_STATUS, "created_at": now_iso()})
    return {"id": request_id, "status": REQUEST_STATUS, "workshop_id": workshop_id}
