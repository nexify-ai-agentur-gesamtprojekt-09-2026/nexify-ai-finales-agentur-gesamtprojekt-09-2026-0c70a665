"""Partner application of a workshop: technique only, no business terms.

Behind the switch TEILEKLAR_PARTNER_APPLICATIONS (exactly "on"); off, every route answers 404.

What is configuration and not code (shop/partner_policy.json): the partner kinds and their definitions,
the status values and allowed transitions, the review criteria and the pilot limit. The shipped file is
a working draft and carries `freigabe_inhaber: false`: an application can be received and reviewed, but
none can be released until the owner has released the policy. No price, fee, deadline or cost statement
exists in this module or its configuration.

Records are never deleted. A finished application can be archived and restored. The review log (who,
when, decision, reason) is internal and leaves the service only on operator routes.
"""
import hashlib
import hmac
import json
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Protocol

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from . import auth, mail_templates_teileklar, mailer
from .db import db, now_iso

router = APIRouter()
SWITCH = "TEILEKLAR_PARTNER_APPLICATIONS"
POLICY_FILE = Path(__file__).resolve().parent / "partner_policy.json"
EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
IDEMPOTENCY = re.compile(r"[A-Za-z0-9_-]{16,128}")
NUMBER = re.compile(r"TKP-\d{8}-[0-9A-F]{12}")
HOURLY_LIMIT = 5
RESULTS = ("erfuellt", "nicht_erfuellt", "nicht_anwendbar")
PUBLIC_FIELDS = ("number", "status", "company", "created_at", "updated_at")
_policy = None  # parsed once; tests replace it


def enabled(env=None):
    return (os.environ if env is None else env).get(SWITCH) == "on"


def require_enabled():
    if not enabled():
        raise HTTPException(404, {"error": "not_found"})


def validate_policy(data):
    """A configuration that is incomplete or contradicts itself is unusable, not silently repaired."""
    flow, kinds = data["partnerantrag"], {k["id"]: k for k in data["partnerstufen"]}
    states = flow["statuswerte"]
    if len(set(states)) != len(states) or flow["startzustand"] not in states or flow["freigabezustand"] not in states:
        raise ValueError("partner_policy_states")
    if set(flow["uebergaenge"]) != set(states) or any(set(targets) - set(states) for targets in flow["uebergaenge"].values()):
        raise ValueError("partner_policy_transitions")
    if (set(flow["durch_antragsteller"]) | set(flow["begruendung_pflicht"]) | set(flow["archivierbar"])) - set(states):
        raise ValueError("partner_policy_states")
    if any(flow["uebergaenge"][state] for state in flow["archivierbar"]) or flow["uebergaenge"][flow["freigabezustand"]]:
        raise ValueError("partner_policy_terminal")
    # Every status needs its neutral wording; a status without a reviewed text cannot be introduced by configuration alone.
    if set(states) - set(mail_templates_teileklar.APPLICATION_TEXT):
        raise ValueError("partner_policy_texts")
    if not isinstance(data["freigabe_inhaber"], bool) or not isinstance(data["pilot"]["direktpartner_max"], int) or data["pilot"]["direktpartner_max"] < 0:
        raise ValueError("partner_policy_release")
    if not kinds or any(not isinstance(kind.get("durch_antrag_erreichbar"), bool) for kind in kinds.values()):
        raise ValueError("partner_policy_kinds")
    criteria = [c["id"] for c in data["freischaltkriterien"]]
    if not criteria or len(set(criteria)) != len(criteria):
        raise ValueError("partner_policy_criteria")
    return data


def policy():
    global _policy
    if _policy is None:
        try:
            _policy = validate_policy(json.loads(POLICY_FILE.read_text(encoding="utf-8")))
        except Exception:
            # No default is invented: without a readable, consistent policy the feature is unavailable.
            raise HTTPException(503, {"error": "partner_policy_unavailable"}) from None
    return _policy


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


class PartnerNotifier(Protocol):
    """Port for the notices of a status change. Returns the delivery status as text."""
    async def applicant(self, application: dict, note: str) -> str: ...
    async def operator(self, application: dict) -> str: ...


class OutboxPartnerNotifier:
    """Existing delivery path (outbox + Resend) under the shop's TEILEKLAR sender."""

    async def applicant(self, application, note):
        subject, html, text = mail_templates_teileklar.application_status(application, note)
        key = "partner_application:%s:%d:%s" % (application["_id"], len(application.get("review_log", [])), application["status"])
        outbox = await mailer.enqueue(key, application["email"], subject, html, text, reply_to=mailer.setting("MAIL_INTERNAL_TO"))
        return (outbox or {}).get("status") or "not_configured"

    async def operator(self, application):
        subject, html, text = mail_templates_teileklar.internal_application(application)
        outbox = await mailer.enqueue("partner_application:internal:" + application["_id"], mailer.setting("MAIL_INTERNAL_TO"), subject, html, text,
                                      reply_to=application["email"])
        return (outbox or {}).get("status") or "not_configured"


notifier: PartnerNotifier = OutboxPartnerNotifier()  # tests replace this with a stand-in


async def announce(application, note=""):
    """A failed notice never undoes a stored decision; its status is kept with the record."""
    try:
        status = await notifier.applicant(application, note)
    except Exception:
        status = "unbekannt"
    await db.partner_applications.update_one({"_id": application["_id"]}, {"$set": {"notification_status": status}})
    return status


def public_view(application):
    view = {key: application.get(key) for key in PUBLIC_FIELDS}
    view["status_label"] = mail_templates_teileklar.APPLICATION_LABEL[application["status"]]
    view["message"] = mail_templates_teileklar.APPLICATION_TEXT[application["status"]]
    return view


def operator_view(application):
    view = {k: v for k, v in application.items() if k not in ("_id", "access_token_hash", "open_key", "payload_hash")}
    view["id"] = application["_id"]
    view["allowed_transitions"] = policy()["partnerantrag"]["uebergaenge"][application["status"]]
    return view


def criteria_state(application):
    """Latest recorded result per criterion."""
    return {entry["criterion"]: entry["result"] for entry in application.get("review_log", []) if entry.get("action") == "criterion"}


def missing_criteria(application):
    recorded, missing = criteria_state(application), []
    for criterion in policy()["freischaltkriterien"]:
        result = recorded.get(criterion["id"])
        if result != "erfuellt" and not (result == "nicht_anwendbar" and criterion.get("nicht_anwendbar_zulaessig")):
            missing.append(criterion["id"])
    return missing


def log_entry(actor, action, **fields):
    return {"at": now_iso(), "actor": actor, "action": action, **{k: v for k, v in fields.items() if v not in (None, "")}}


# ---------- applicant ----------
class ApplicationIn(BaseModel):
    company: str = Field("", max_length=120)
    contact_name: str = Field("", max_length=100)
    email: str = Field("", max_length=160)
    phone: str = Field("", max_length=40)
    message: str = Field("", max_length=4000)
    claimed_workshop_id: str = Field("", max_length=80)
    herkunft: str = Field("", max_length=40)
    consent: bool = False


@router.post("/api/partner-applications", status_code=201)
async def submit(body: ApplicationIn, idempotency_key: str | None = Header(default=None)):
    require_enabled()
    rules, email, errors = policy(), body.email.strip().lower(), {}
    if len(body.company.strip()) < 2:
        errors["company"] = "required"
    if len(body.contact_name.strip()) < 2:
        errors["contact_name"] = "required"
    if not EMAIL.fullmatch(email):
        errors["email"] = "invalid" if email else "required"
    if body.herkunft and body.herkunft not in rules["herkunft"]:
        errors["herkunft"] = "invalid"
    if not body.consent:
        errors["consent"] = "required"
    claimed = body.claimed_workshop_id.strip()
    if claimed and not await db.workshops.find_one({"_id": claimed}, {"_id": 1}):
        errors["claimed_workshop_id"] = "unknown"
    if errors:
        raise HTTPException(422, {"error": "application_invalid", "fields": errors})
    if not isinstance(idempotency_key, str) or not IDEMPOTENCY.fullmatch(idempotency_key):
        raise HTTPException(400, {"error": "idempotency_key_required"})
    payload = {"company": body.company.strip(), "contact_name": body.contact_name.strip(), "email": email, "phone": body.phone.strip(),
               "message": body.message.strip(), "claimed_workshop_id": claimed, "herkunft": body.herkunft, "consent": True}
    payload_hash = digest(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":")))
    application_id = "partner_application:" + digest(idempotency_key)

    def replay(existing):
        if existing.get("payload_hash") != payload_hash:
            raise HTTPException(409, {"error": "idempotency_conflict"})
        # The access token exists only in the first answer; it is stored as a digest and cannot be shown again.
        return {**public_view(existing), "access_token": None}

    existing = await db.partner_applications.find_one({"_id": application_id})
    if existing:
        return replay(existing)
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    if await db.partner_applications.count_documents({"email": email, "created_at": {"$gte": since}}) >= HOURLY_LIMIT:
        raise HTTPException(429, {"error": "rate_limited", "message": "Zu viele Anträge. Bitte versuchen Sie es später erneut."})
    open_key = "open:" + digest(email)
    if await db.partner_applications.find_one({"open_key": open_key}, {"_id": 1}):
        raise HTTPException(409, {"error": "application_already_open", "message": "Für diese E-Mail-Adresse ist bereits ein Antrag in Bearbeitung."})
    token, stamp = secrets.token_urlsafe(32), now_iso()
    start = rules["partnerantrag"]["startzustand"]
    application = {"_id": application_id, **payload, "payload_hash": payload_hash, "brand": "teileklar",
                   "number": "TKP-%s-%s" % (datetime.now(timezone.utc).strftime("%Y%m%d"), application_id.split(":", 1)[1][:12].upper()),
                   "status": start, "open_key": open_key, "access_token_hash": digest(token), "workshop_id": None, "partner_kind": None,
                   "archived_at": None, "created_at": stamp, "updated_at": stamp,
                   "review_log": [log_entry("antragsteller", "status", to=start)]}
    try:
        await db.partner_applications.insert_one(application)
    except DuplicateKeyError:
        existing = await db.partner_applications.find_one({"_id": application_id})
        if existing:
            return replay(existing)
        raise HTTPException(409, {"error": "application_already_open", "message": "Für diese E-Mail-Adresse ist bereits ein Antrag in Bearbeitung."}) from None
    await announce(application)
    try:
        await notifier.operator(application)
    except Exception:
        pass
    return {**public_view(application), "access_token": token}


async def own_application(number, token):
    """Number plus access token. Unknown number and wrong token are indistinguishable."""
    application = await db.partner_applications.find_one({"number": number}) if NUMBER.fullmatch(number or "") else None
    if not application or not isinstance(token, str) or not hmac.compare_digest(application["access_token_hash"], digest(token)):
        raise HTTPException(404, {"error": "not_found"})
    return application


@router.get("/api/partner-applications/{number}")
async def own_status(number: str, x_application_token: str | None = Header(default=None)):
    require_enabled()
    return public_view(await own_application(number, x_application_token))


@router.post("/api/partner-applications/{number}/withdraw")
async def withdraw(number: str, x_application_token: str | None = Header(default=None)):
    require_enabled()
    application = await own_application(number, x_application_token)
    return public_view(await change_status(application, "zurueckgezogen", actor="antragsteller", by_applicant=True))


# ---------- operator ----------
async def change_status(application, target, *, actor, reason="", note="", by_applicant=False):
    rules = policy()
    flow, current = rules["partnerantrag"], application["status"]
    if target not in flow["uebergaenge"].get(current, []) or (by_applicant and target not in flow["durch_antragsteller"]):
        raise HTTPException(409, {"error": "transition_not_allowed", "from": current, "to": target})
    if not by_applicant and target in flow["begruendung_pflicht"] and len(reason.strip()) < 3:
        raise HTTPException(422, {"error": "reason_required", "fields": {"reason": "required"}})
    update = {"status": target, "updated_at": now_iso()}
    release = target == flow["freigabezustand"]
    if release:
        update["partner_kind"] = await release_checks(application, rules)
    if not flow["uebergaenge"][target]:
        update["open_key"] = "closed:" + application["_id"]  # frees the address for a later, new application
    entry = log_entry(actor, "status", to=target, reason=reason.strip(), **{"from": current})
    # The current status is part of the condition: two concurrent decisions cannot both apply.
    result = await db.partner_applications.update_one({"_id": application["_id"], "status": current}, {"$set": update, "$push": {"review_log": entry}})
    if not result.matched_count:
        raise HTTPException(409, {"error": "application_changed"})
    updated = await db.partner_applications.find_one({"_id": application["_id"]})
    if release:
        await db.workshops.update_one({"_id": updated["workshop_id"]}, {"$set": {"partner_kind": updated["partner_kind"], "partner_application": updated["number"],
                                                                               "partner_since": updated["updated_at"]}})
    await announce(updated, note.strip())
    return await db.partner_applications.find_one({"_id": application["_id"]})


async def release_checks(application, rules):
    """Every condition of a release, checked together so the operator sees all that is open."""
    kind = next((k["id"] for k in rules["partnerstufen"] if k["durch_antrag_erreichbar"]), None)
    open_points = []
    if not rules["freigabe_inhaber"] or not kind:
        open_points.append("partner_policy_not_released")
    if not application.get("workshop_id"):
        open_points.append("workshop_assignment_required")
    open_points += ["criterion:" + name for name in missing_criteria(application)]
    # Not transactional: with several operators deciding at the same moment the limit can be passed by one.
    if kind and await db.partner_applications.count_documents({"status": rules["partnerantrag"]["freigabezustand"], "partner_kind": kind}) >= rules["pilot"]["direktpartner_max"]:
        open_points.append("pilot_limit_reached")
    if open_points:
        raise HTTPException(409, {"error": "release_not_possible", "open": open_points})
    return kind


async def by_number(number):
    application = await db.partner_applications.find_one({"number": number}) if NUMBER.fullmatch(number or "") else None
    if not application:
        raise HTTPException(404, {"error": "not_found"})
    return application


@router.get("/api/admin/partner-applications")
async def list_applications(status: str = "", archived: bool = False, ident=Depends(auth.require_admin)):
    require_enabled()
    query = {"archived_at": {"$ne": None}} if archived else {"archived_at": None}
    if status:
        if status not in policy()["partnerantrag"]["statuswerte"]:
            raise HTTPException(422, {"error": "status_invalid"})
        query["status"] = status
    rows = await db.partner_applications.find(query).sort("created_at", -1).to_list(200)
    return {"items": [operator_view(row) for row in rows], "statuses": policy()["partnerantrag"]["statuswerte"]}


@router.get("/api/admin/partner-applications/policy")
async def read_policy(ident=Depends(auth.require_admin)):
    require_enabled()
    rules = policy()
    released = await db.partner_applications.count_documents({"status": rules["partnerantrag"]["freigabezustand"]})
    return {"policy": rules, "released_applications": released, "release_possible": bool(rules["freigabe_inhaber"])}


@router.get("/api/admin/partner-applications/{number}")
async def read_application(number: str, ident=Depends(auth.require_admin)):
    require_enabled()
    application = await by_number(number)
    return {**operator_view(application), "criteria": criteria_state(application), "criteria_open": missing_criteria(application)}


class AssignIn(BaseModel):
    workshop_id: str = Field(min_length=1, max_length=80)


@router.post("/api/admin/partner-applications/{number}/workshop")
async def assign_workshop(number: str, body: AssignIn, ident=Depends(auth.require_admin)):
    require_enabled()
    application, flow = await by_number(number), policy()["partnerantrag"]
    if not flow["uebergaenge"][application["status"]]:
        raise HTTPException(409, {"error": "application_closed"})
    if not await db.workshops.find_one({"_id": body.workshop_id}, {"_id": 1}):
        raise HTTPException(422, {"error": "workshop_not_found", "fields": {"workshop_id": "unknown"}})
    active = [state for state in flow["statuswerte"] if flow["uebergaenge"][state]] + [flow["freigabezustand"]]
    if await db.partner_applications.count_documents({"workshop_id": body.workshop_id, "_id": {"$ne": application["_id"]}, "status": {"$in": active}}):
        raise HTTPException(409, {"error": "workshop_already_assigned"})
    entry = log_entry(ident.user_id, "workshop", workshop_id=body.workshop_id, previous=application.get("workshop_id"))
    await db.partner_applications.update_one({"_id": application["_id"]}, {"$set": {"workshop_id": body.workshop_id, "updated_at": now_iso()}, "$push": {"review_log": entry}})
    return operator_view(await by_number(number))


class CriterionIn(BaseModel):
    criterion: str = Field(max_length=80)
    result: str = Field(max_length=20)
    note: str = Field("", max_length=1000)


@router.post("/api/admin/partner-applications/{number}/criteria")
async def record_criterion(number: str, body: CriterionIn, ident=Depends(auth.require_admin)):
    require_enabled()
    application, rules = await by_number(number), policy()
    criterion = next((c for c in rules["freischaltkriterien"] if c["id"] == body.criterion), None)
    if not criterion or body.result not in RESULTS or (body.result == "nicht_anwendbar" and not criterion.get("nicht_anwendbar_zulaessig")):
        raise HTTPException(422, {"error": "criterion_invalid"})
    if not rules["partnerantrag"]["uebergaenge"][application["status"]]:
        raise HTTPException(409, {"error": "application_closed"})
    entry = log_entry(ident.user_id, "criterion", criterion=body.criterion, result=body.result, reason=body.note.strip())
    await db.partner_applications.update_one({"_id": application["_id"]}, {"$set": {"updated_at": now_iso()}, "$push": {"review_log": entry}})
    application = await by_number(number)
    return {**operator_view(application), "criteria": criteria_state(application), "criteria_open": missing_criteria(application)}


class StatusIn(BaseModel):
    status: str = Field(max_length=40)
    reason: str = Field("", max_length=2000)  # internal: review log only
    message_to_applicant: str = Field("", max_length=2000)  # goes into the mail to the applicant


@router.post("/api/admin/partner-applications/{number}/status")
async def decide(number: str, body: StatusIn, ident=Depends(auth.require_admin)):
    require_enabled()
    application = await by_number(number)
    if body.status not in policy()["partnerantrag"]["statuswerte"]:
        raise HTTPException(422, {"error": "status_invalid"})
    return operator_view(await change_status(application, body.status, actor=ident.user_id, reason=body.reason, note=body.message_to_applicant))


async def set_archive(number, ident, archive):
    application, flow = await by_number(number), policy()["partnerantrag"]
    if archive and application["status"] not in flow["archivierbar"]:
        raise HTTPException(409, {"error": "not_archivable", "status": application["status"]})
    if bool(application.get("archived_at")) == archive:
        raise HTTPException(409, {"error": "already_archived" if archive else "not_archived"})
    stamp = now_iso()
    entry = log_entry(ident.user_id, "archive" if archive else "restore")
    await db.partner_applications.update_one({"_id": application["_id"]}, {"$set": {"archived_at": stamp if archive else None, "archived_by": ident.user_id if archive else None,
                                                                                    "updated_at": stamp}, "$push": {"review_log": entry}})
    return operator_view(await by_number(number))


@router.post("/api/admin/partner-applications/{number}/archive")
async def archive(number: str, ident=Depends(auth.require_admin)):
    require_enabled()
    return await set_archive(number, ident, True)


@router.post("/api/admin/partner-applications/{number}/restore")
async def restore(number: str, ident=Depends(auth.require_admin)):
    require_enabled()
    return await set_archive(number, ident, False)
