"""Authenticated workspace: onboarding (private/business), dashboard, projects/tasks, documents, offers (versioned),
API keys (secret shown once), team roles. Every call is bound server-side to a workspace membership."""
import base64
import hashlib
import secrets
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from shop.db import db
from .common import EMAIL, clean, new_id, now_iso, require_user

router = APIRouter(prefix="/api/workspace")
ROLES = ("owner", "admin", "member", "reviewer")
TASK_STATES = ("documented", "configured", "dispatched", "running", "verified")
OFFER_STATES = ("entwurf", "freigegeben", "versendet", "angenommen", "abgelehnt")
MAX_DOC = 5 * 1024 * 1024


async def ensure_indexes():
    await db.workspaces.create_index("workspace_id", unique=True)
    await db.workspaces.create_index("members.user_id")
    await db.workspaces.create_index("members.email")
    await db.projects.create_index([("workspace_id", 1), ("created_at", -1)])
    await db.tasks.create_index([("project_id", 1), ("dedupe", 1)], unique=True)
    await db.documents.create_index("workspace_id")
    await db.offers.create_index("workspace_id")
    await db.api_keys.create_index("key_hash", unique=True)


async def member(request: Request, workspace_id: str, roles=ROLES):
    user = await require_user(request)
    ws = await db.workspaces.find_one({"workspace_id": workspace_id})
    m = ws and next((m for m in ws["members"] if m.get("user_id") == user["user_id"] or (m.get("email") == user["email"] and m.get("status") == "aktiv")), None)
    if not m:
        raise HTTPException(403, {"error": "workspace_forbidden", "message": "Kein Zugriff auf diesen Arbeitsbereich."})
    if m["role"] not in roles:
        raise HTTPException(403, {"error": "role_forbidden", "message": "Ihre Rolle erlaubt diese Aktion nicht."})
    return user, ws, m


def ws_public(ws, user_id=None):
    me = next((m for m in ws["members"] if m.get("user_id") == user_id), None)
    return {"workspace_id": ws["workspace_id"], "kind": ws["kind"], "name": ws["name"], "created_at": ws["created_at"],
            "trial_started_at": ws.get("trial_started_at"), "my_role": me and me["role"], "member_count": len(ws["members"])}


# ---------- onboarding ----------
@router.get("/me")
async def me(request: Request):
    user = await require_user(request)
    # Accept pending invitations addressed to this verified e-mail.
    await db.workspaces.update_many({"members": {"$elemMatch": {"email": user["email"], "status": "eingeladen"}}},
                                    {"$set": {"members.$.user_id": user["user_id"], "members.$.status": "aktiv", "members.$.joined_at": now_iso()}})
    rows = [ws_public(w, user["user_id"]) async for w in db.workspaces.find({"members.user_id": user["user_id"]}).sort("created_at", 1)]
    return {"user": {k: user.get(k) for k in ("user_id", "email", "name", "role")}, "workspaces": rows}


class WorkspaceIn(BaseModel):
    kind: str = Field(pattern="^(private|business)$")
    name: str = Field(min_length=2, max_length=80)


@router.post("", status_code=201)
async def create_workspace(body: WorkspaceIn, request: Request):
    user = await require_user(request)
    if body.kind == "private" and await db.workspaces.find_one({"kind": "private", "owner_id": user["user_id"]}):
        raise HTTPException(409, {"error": "private_exists", "message": "Sie haben bereits einen persönlichen Arbeitsbereich."})
    ws = {"workspace_id": new_id("ws"), "kind": body.kind, "name": body.name.strip(), "owner_id": user["user_id"], "created_at": now_iso(),
          "members": [{"user_id": user["user_id"], "email": user["email"], "name": user.get("name", ""), "role": "owner", "status": "aktiv", "joined_at": now_iso()}]}
    await db.workspaces.insert_one(ws)
    return ws_public(ws, user["user_id"])


@router.post("/{workspace_id}/trial")
async def start_trial(workspace_id: str, request: Request):
    user, ws, _ = await member(request, workspace_id, ("owner",))
    if ws.get("trial_started_at"):
        raise HTTPException(409, {"error": "trial_used", "message": "Der einmalige 24-Stunden-Test wurde bereits gestartet."})
    await db.workspaces.update_one({"workspace_id": workspace_id}, {"$set": {"trial_started_at": now_iso()}})
    return {"trial_started_at": now_iso(), "note": "Test ohne Modellguthaben und ohne automatische Abbuchung."}


# ---------- dashboard ----------
@router.get("/{workspace_id}/dashboard")
async def dashboard(workspace_id: str, request: Request):
    user, ws, m = await member(request, workspace_id)
    open_tasks = await db.tasks.count_documents({"workspace_id": workspace_id, "status": {"$ne": "verified"}})
    usage = [u async for u in db.ai_usage.aggregate([{"$match": {"workspace_id": workspace_id}}, {"$group": {"_id": None, "in": {"$sum": "$est_input_tokens"}, "out": {"$sum": "$est_output_tokens"}, "n": {"$sum": 1}}}])]
    recent = [clean(p) async for p in db.projects.find({"workspace_id": workspace_id}).sort("created_at", -1).limit(5)]
    convs = [clean(c) async for c in db.ai_conversations.find({"workspace_id": workspace_id, "user_id": user["user_id"]}).sort("updated_at", -1).limit(5)]
    return {"workspace": ws_public(ws, user["user_id"]), "projects": await db.projects.count_documents({"workspace_id": workspace_id}),
            "open_tasks": open_tasks, "documents": await db.documents.count_documents({"workspace_id": workspace_id}),
            "offers": await db.offers.count_documents({"workspace_id": workspace_id}), "recent_projects": recent, "recent_conversations": convs,
            "usage": {"period": "seit Anlage des Arbeitsbereichs", "requests": usage[0]["n"] if usage else 0,
                      "est_input_tokens": usage[0]["in"] if usage else 0, "est_output_tokens": usage[0]["out"] if usage else 0,
                      "basis": "Schätzung aus Zeichenanzahl (≈ 4 Zeichen je Token), kein abgerechneter Istverbrauch"}}


# ---------- projects & tasks ----------
class ProjectIn(BaseModel):
    title: str = Field(min_length=2, max_length=140)
    goal: str = Field("", max_length=2000)
    scope: str = Field("", max_length=4000)
    owner: str = Field("", max_length=100)
    due: str = Field("", max_length=20)
    acceptance: str = Field("", max_length=2000)


@router.get("/{workspace_id}/projects")
async def projects(workspace_id: str, request: Request):
    await member(request, workspace_id)
    items = []
    async for p in db.projects.find({"workspace_id": workspace_id}).sort("created_at", -1):
        p = clean(p)
        p["tasks"] = [clean(t) async for t in db.tasks.find({"project_id": p["project_id"]}).sort("created_at", 1)]
        items.append(p)
    return {"items": items}


@router.post("/{workspace_id}/projects", status_code=201)
async def create_project(workspace_id: str, body: ProjectIn, request: Request):
    user, _, _ = await member(request, workspace_id, ("owner", "admin", "member"))
    doc = {"project_id": new_id("prj"), "workspace_id": workspace_id, **body.model_dump(), "status": "aktiv", "created_by": user["user_id"], "created_at": now_iso()}
    await db.projects.insert_one(doc)
    return {**clean(doc), "tasks": []}


@router.delete("/{workspace_id}/projects/{project_id}")
async def delete_project(workspace_id: str, project_id: str, request: Request):
    await member(request, workspace_id, ("owner", "admin"))
    res = await db.projects.delete_one({"workspace_id": workspace_id, "project_id": project_id})
    await db.tasks.delete_many({"project_id": project_id, "workspace_id": workspace_id})
    return {"deleted": res.deleted_count}


class TaskIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    owner: str = Field("", max_length=100)
    due: str = Field("", max_length=20)


@router.post("/{workspace_id}/projects/{project_id}/tasks", status_code=201)
async def create_task(workspace_id: str, project_id: str, body: TaskIn, request: Request):
    user, _, _ = await member(request, workspace_id, ("owner", "admin", "member"))
    if not await db.projects.find_one({"workspace_id": workspace_id, "project_id": project_id}):
        raise HTTPException(404, {"error": "project_not_found"})
    dedupe = hashlib.sha256(body.title.strip().casefold().encode()).hexdigest()[:24]
    existing = await db.tasks.find_one({"project_id": project_id, "dedupe": dedupe})
    if existing:
        raise HTTPException(409, {"error": "task_duplicate", "message": "Diese Aufgabe existiert in diesem Projekt bereits."})
    doc = {"task_id": new_id("tsk"), "project_id": project_id, "workspace_id": workspace_id, "title": body.title.strip(), "owner": body.owner, "due": body.due,
           "status": "documented", "dedupe": dedupe, "history": [{"status": "documented", "at": now_iso(), "by": user["email"]}], "created_at": now_iso()}
    await db.tasks.insert_one(doc)
    return clean(doc)


class TaskStatusIn(BaseModel):
    status: str


@router.post("/{workspace_id}/tasks/{task_id}/status")
async def task_status(workspace_id: str, task_id: str, body: TaskStatusIn, request: Request):
    user, _, m = await member(request, workspace_id, ("owner", "admin", "member", "reviewer"))
    if body.status not in TASK_STATES:
        raise HTTPException(422, {"error": "status_invalid"})
    if body.status == "verified" and m["role"] not in ("owner", "admin", "reviewer"):
        raise HTTPException(403, {"error": "verify_forbidden", "message": "Nur Prüfer, Admin oder Owner dürfen als geprüft markieren."})
    res = await db.tasks.find_one_and_update({"workspace_id": workspace_id, "task_id": task_id},
                                             {"$set": {"status": body.status}, "$push": {"history": {"status": body.status, "at": now_iso(), "by": user["email"]}}}, return_document=True)
    if not res:
        raise HTTPException(404, {"error": "task_not_found"})
    return clean(res)


# ---------- documents ----------
@router.get("/{workspace_id}/documents")
async def documents(workspace_id: str, request: Request):
    await member(request, workspace_id)
    return {"items": [clean(d) async for d in db.documents.find({"workspace_id": workspace_id}, {"content_b64": 0, "text": 0}).sort("created_at", -1)]}


@router.post("/{workspace_id}/documents", status_code=201)
async def upload(workspace_id: str, request: Request, file: UploadFile = File(...), purpose: str = Form(""), visibility: str = Form("team")):
    user, ws, _ = await member(request, workspace_id, ("owner", "admin", "member"))
    data = await file.read(MAX_DOC + 1)
    if len(data) > MAX_DOC:
        raise HTTPException(413, {"error": "file_too_large", "message": "Maximal 5 MB je Datei."})
    name = (file.filename or "datei")[:160]
    is_text = name.lower().endswith((".txt", ".md", ".csv", ".json"))
    text = data.decode("utf-8", "ignore")[:60000] if is_text else None
    doc = {"document_id": new_id("doc"), "workspace_id": workspace_id, "name": name, "content_type": file.content_type or "application/octet-stream",
           "size": len(data), "sha256": hashlib.sha256(data).hexdigest(), "owner": user["email"], "purpose": purpose[:200],
           "visibility": "privat" if visibility == "private" or ws["kind"] == "private" else "team", "version": 1,
           "state": "als_kontext_nutzbar" if is_text else "hochgeladen", "content_b64": base64.b64encode(data).decode(), "text": text, "created_at": now_iso()}
    prev = await db.documents.find_one({"workspace_id": workspace_id, "name": name}, sort=[("version", -1)])
    if prev:
        doc["version"] = prev["version"] + 1
    await db.documents.insert_one(doc)
    doc.pop("content_b64"); doc.pop("text")
    return clean(doc)


@router.get("/{workspace_id}/documents/{document_id}/download")
async def download(workspace_id: str, document_id: str, request: Request):
    await member(request, workspace_id)
    d = await db.documents.find_one({"workspace_id": workspace_id, "document_id": document_id})
    if not d:
        raise HTTPException(404, {"error": "document_not_found"})
    return Response(base64.b64decode(d["content_b64"]), media_type=d["content_type"], headers={"Content-Disposition": 'attachment; filename="%s"' % d["name"].replace('"', "")})


@router.delete("/{workspace_id}/documents/{document_id}")
async def delete_document(workspace_id: str, document_id: str, request: Request):
    await member(request, workspace_id, ("owner", "admin", "member"))
    return {"deleted": (await db.documents.delete_one({"workspace_id": workspace_id, "document_id": document_id})).deleted_count}


# ---------- offers (versioned) ----------
class Position(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    kind: str = Field("einmalig", pattern="^(einmalig|laufend|verbrauch|fremdkosten)$")
    quantity: float = Field(1, ge=0, le=100000)
    unit: str = Field("Pauschale", max_length=30)
    unit_price_cents: int | None = Field(None, ge=0, le=10**10)


class OfferIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    customer: str = Field("", max_length=160)
    briefing_number: str = Field("", max_length=40)
    positions: list[Position] = Field(default_factory=list, max_length=60)
    tax_percent: float | None = Field(None, ge=0, le=30)
    note: str = Field("", max_length=2000)


def totals(version):
    sums, open_items = {}, 0
    for p in version["positions"]:
        if p.get("unit_price_cents") is None:
            open_items += 1
            continue
        line = int((Decimal(str(p["quantity"])) * p["unit_price_cents"]).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        sums[p["kind"]] = sums.get(p["kind"], 0) + line
    net = sum(sums.values())
    tax = None if version.get("tax_percent") is None else int((Decimal(net) * Decimal(str(version["tax_percent"])) / 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return {"by_kind_cents": sums, "net_cents": net, "tax_cents": tax, "gross_cents": None if tax is None else net + tax,
            "open_positions": open_items, "complete": open_items == 0 and tax is not None}


def offer_public(o):
    o = clean(o)
    for v in o["versions"]:
        v["totals"] = totals(v)
    return o


@router.get("/{workspace_id}/offers")
async def offers(workspace_id: str, request: Request):
    await member(request, workspace_id)
    return {"items": [offer_public(o) async for o in db.offers.find({"workspace_id": workspace_id}).sort("created_at", -1)]}


@router.post("/{workspace_id}/offers", status_code=201)
async def create_offer(workspace_id: str, body: OfferIn, request: Request):
    user, _, _ = await member(request, workspace_id, ("owner", "admin", "member"))
    data = body.model_dump()
    version = {"version": 1, "positions": data.pop("positions"), "tax_percent": data.pop("tax_percent"), "created_at": now_iso(), "created_by": user["email"]}
    doc = {"offer_id": new_id("off"), "workspace_id": workspace_id, **data, "status": "entwurf", "versions": [version], "created_at": now_iso(),
           "history": [{"status": "entwurf", "at": now_iso(), "by": user["email"]}]}
    await db.offers.insert_one(doc)
    return offer_public(doc)


@router.post("/{workspace_id}/offers/{offer_id}/versions", status_code=201)
async def new_version(workspace_id: str, offer_id: str, body: OfferIn, request: Request):
    user, _, _ = await member(request, workspace_id, ("owner", "admin", "member"))
    o = await db.offers.find_one({"workspace_id": workspace_id, "offer_id": offer_id})
    if not o:
        raise HTTPException(404, {"error": "offer_not_found"})
    if o["status"] in ("versendet", "angenommen"):
        raise HTTPException(409, {"error": "offer_locked", "message": "Versendete oder angenommene Angebote werden nicht verändert."})
    data = body.model_dump()
    version = {"version": len(o["versions"]) + 1, "positions": data["positions"], "tax_percent": data["tax_percent"], "created_at": now_iso(), "created_by": user["email"]}
    o = await db.offers.find_one_and_update({"offer_id": offer_id}, {"$push": {"versions": version}, "$set": {"title": data["title"], "customer": data["customer"], "note": data["note"], "status": "entwurf"}}, return_document=True)
    return offer_public(o)


class OfferStatusIn(BaseModel):
    status: str


@router.post("/{workspace_id}/offers/{offer_id}/status")
async def offer_status(workspace_id: str, offer_id: str, body: OfferStatusIn, request: Request):
    user, _, _ = await member(request, workspace_id, ("owner", "admin"))
    if body.status not in OFFER_STATES:
        raise HTTPException(422, {"error": "status_invalid"})
    o = await db.offers.find_one({"workspace_id": workspace_id, "offer_id": offer_id})
    if not o:
        raise HTTPException(404, {"error": "offer_not_found"})
    order = {"entwurf": 0, "freigegeben": 1, "versendet": 2, "angenommen": 3, "abgelehnt": 3}
    if order[body.status] != order[o["status"]] + 1 and not (body.status == "entwurf" and o["status"] == "freigegeben"):
        raise HTTPException(409, {"error": "transition_invalid", "message": "Schritte: Entwurf → Freigegeben → Versendet → Angenommen/Abgelehnt."})
    if body.status == "freigegeben" and not totals(o["versions"][-1])["complete"]:
        raise HTTPException(409, {"error": "offer_incomplete", "message": "Freigabe erst, wenn alle Preise und die Steuer festgelegt sind."})
    o = await db.offers.find_one_and_update({"offer_id": offer_id}, {"$set": {"status": body.status, "frozen_version": len(o["versions"]) if body.status != "entwurf" else None},
                                                                       "$push": {"history": {"status": body.status, "at": now_iso(), "by": user["email"]}}}, return_document=True)
    return offer_public(o)


# ---------- API keys & budgets ----------
class KeyIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    scopes: list[str] = Field(default_factory=lambda: ["chat:read"], max_length=6)
    cost_center: str = Field("", max_length=60)
    budget_cents: int | None = Field(None, ge=0, le=10**9)


SCOPES = ("chat:read", "chat:write", "projects:read", "projects:write", "documents:read")


@router.get("/{workspace_id}/api-keys")
async def keys(workspace_id: str, request: Request):
    await member(request, workspace_id, ("owner", "admin"))
    return {"items": [clean(k) async for k in db.api_keys.find({"workspace_id": workspace_id}, {"key_hash": 0}).sort("created_at", -1)], "scopes": SCOPES}


@router.post("/{workspace_id}/api-keys", status_code=201)
async def create_key(workspace_id: str, body: KeyIn, request: Request):
    user, _, _ = await member(request, workspace_id, ("owner", "admin"))
    if any(s not in SCOPES for s in body.scopes) or not body.scopes:
        raise HTTPException(422, {"error": "scope_invalid"})
    secret = "nxk_test_" + secrets.token_urlsafe(30)
    doc = {"key_id": new_id("key"), "workspace_id": workspace_id, "name": body.name, "prefix": secret[:14], "key_hash": hashlib.sha256(secret.encode()).hexdigest(),
           "scopes": body.scopes, "cost_center": body.cost_center, "budget_cents": body.budget_cents, "reserved_cents": 0, "used_cents": 0,
           "mode": "test", "last_used_at": None, "revoked_at": None, "created_by": user["email"], "created_at": now_iso()}
    await db.api_keys.insert_one(doc)
    out = clean(doc); out.pop("key_hash")
    return {**out, "secret": secret, "secret_notice": "Dieser Schlüssel wird nur jetzt angezeigt."}


@router.post("/{workspace_id}/api-keys/{key_id}/revoke")
async def revoke_key(workspace_id: str, key_id: str, request: Request):
    await member(request, workspace_id, ("owner", "admin"))
    res = await db.api_keys.find_one_and_update({"workspace_id": workspace_id, "key_id": key_id, "revoked_at": None}, {"$set": {"revoked_at": now_iso()}}, {"key_hash": 0}, return_document=True)
    if not res:
        raise HTTPException(404, {"error": "key_not_found_or_revoked"})
    return clean(res)


# ---------- team ----------
class InviteIn(BaseModel):
    email: str = Field(max_length=160)
    role: str = Field("member")


@router.get("/{workspace_id}/team")
async def team(workspace_id: str, request: Request):
    _, ws, m = await member(request, workspace_id)
    return {"members": ws["members"], "my_role": m["role"], "kind": ws["kind"], "audit": [clean(a) async for a in db.team_audit.find({"workspace_id": workspace_id}).sort("at", -1).limit(30)]}


async def audit(workspace_id, actor, action, target):
    await db.team_audit.insert_one({"workspace_id": workspace_id, "actor": actor, "action": action, "target": target, "at": now_iso()})


@router.post("/{workspace_id}/team", status_code=201)
async def invite(workspace_id: str, body: InviteIn, request: Request):
    user, ws, _ = await member(request, workspace_id, ("owner", "admin"))
    if ws["kind"] != "business":
        raise HTTPException(409, {"error": "private_workspace", "message": "Einladungen gibt es nur in Business-Arbeitsbereichen."})
    email = body.email.strip().lower()
    if not EMAIL.fullmatch(email) or body.role not in ("admin", "member", "reviewer"):
        raise HTTPException(422, {"error": "invite_invalid"})
    if any(m["email"] == email for m in ws["members"]):
        raise HTTPException(409, {"error": "already_member"})
    await db.workspaces.update_one({"workspace_id": workspace_id}, {"$push": {"members": {"user_id": None, "email": email, "name": "", "role": body.role, "status": "eingeladen", "invited_at": now_iso(), "invited_by": user["email"]}}})
    await audit(workspace_id, user["email"], "eingeladen (%s)" % body.role, email)
    return {"ok": True, "note": "Die Person erhält Zugriff, sobald sie sich mit dieser E-Mail-Adresse anmeldet."}


class RoleIn(BaseModel):
    role: str


@router.post("/{workspace_id}/team/{email}/role")
async def change_role(workspace_id: str, email: str, body: RoleIn, request: Request):
    user, ws, me_ = await member(request, workspace_id, ("owner", "admin"))
    if body.role not in ROLES:
        raise HTTPException(422, {"error": "role_invalid"})
    target = next((m for m in ws["members"] if m["email"] == email.lower()), None)
    if not target:
        raise HTTPException(404, {"error": "member_not_found"})
    owners = [m for m in ws["members"] if m["role"] == "owner"]
    if (body.role == "owner" or target["role"] == "owner") and me_["role"] != "owner":
        raise HTTPException(403, {"error": "owner_only"})
    if target["role"] == "owner" and body.role != "owner" and len(owners) == 1:
        raise HTTPException(409, {"error": "last_owner", "message": "Der letzte Owner kann nicht herabgestuft werden."})
    await db.workspaces.update_one({"workspace_id": workspace_id, "members.email": target["email"]}, {"$set": {"members.$.role": body.role}})
    await audit(workspace_id, user["email"], "Rolle → %s" % body.role, target["email"])
    return {"ok": True}


@router.delete("/{workspace_id}/team/{email}")
async def remove_member(workspace_id: str, email: str, request: Request):
    user, ws, me_ = await member(request, workspace_id, ("owner", "admin"))
    target = next((m for m in ws["members"] if m["email"] == email.lower()), None)
    if not target:
        raise HTTPException(404, {"error": "member_not_found"})
    if target["role"] == "owner":
        raise HTTPException(409, {"error": "owner_protected", "message": "Owner können nicht entfernt werden. Zuerst Rolle übertragen."})
    if target["email"] == user["email"]:
        raise HTTPException(409, {"error": "self_removal", "message": "Sie können sich nicht selbst entfernen."})
    await db.workspaces.update_one({"workspace_id": workspace_id}, {"$pull": {"members": {"email": target["email"]}}})
    await audit(workspace_id, user["email"], "entfernt", target["email"])
    return {"ok": True}
