"""Own accounts: e-mail/password (bcrypt), server-side sessions in httpOnly cookie, reset via Resend, lockout, Emergent Google Auth."""
import hashlib
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from . import config, mail_templates, mailer, store
from .db import now_iso

router = APIRouter(prefix="/api/auth")
SESSION_COOKIE = "tk_session"
SESSION_DAYS = 14
LOCK_WINDOW = timedelta(minutes=15)
MAX_FAILS = 5
EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
GOOGLE_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
WRONG = "E-Mail oder Passwort ist falsch"


def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_password(password, hashed):
    return bool(hashed) and bcrypt.checkpw(password.encode(), hashed.encode())


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def public_user(user):
    return {"user_id": user["user_id"], "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "customer")}


async def ensure_auth_indexes(database=None):
    await store.accounts.ensure_indexes(int(LOCK_WINDOW.total_seconds()), database)


async def seed_accounts():
    for prefix, role in (("ADMIN", "admin"), ("TEST_CUSTOMER", "customer")):
        email, password = os.environ.get(prefix + "_EMAIL", "").lower(), os.environ.get(prefix + "_PASSWORD", "")
        if not (email and password):
            continue
        existing = await store.accounts.role_and_hash_by_email(email)
        if not existing:
            await store.accounts.create_user({"user_id": "user_" + uuid.uuid4().hex[:12], "email": email, "name": "Pascal Courbois" if role == "admin" else "Testkunde", "role": role,
                                              "password_hash": hash_password(password), "created_at": now_iso()})
        elif existing.get("role") != role or not check_password(password, existing.get("password_hash") or ""):
            await store.accounts.set_role_and_password_hash(email, role, hash_password(password))


async def start_session(response, user):
    token = secrets.token_urlsafe(32)
    await store.accounts.create_session(digest(token), user["user_id"], now_iso(),
                                        datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS))
    response.set_cookie(SESSION_COOKIE, token, max_age=SESSION_DAYS * 86400, httponly=True, secure=True, samesite="lax", path="/")
    return public_user(user)


async def session_user(request):
    header = request.headers.get("authorization", "")
    token = request.cookies.get(SESSION_COOKIE) or (header[7:] if header.lower().startswith("bearer ") else None)
    if not token or len(token) > 128:
        return None
    session = await store.accounts.session(digest(token))
    if not session:
        return None
    expires = session["expires_at"] if session["expires_at"].tzinfo else session["expires_at"].replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        return None
    return await store.accounts.profile_by_id(session["user_id"])


class RegisterIn(BaseModel):
    email: str = Field(max_length=160)
    password: str = Field(max_length=200)
    name: str = Field("", max_length=100)


class LoginIn(BaseModel):
    email: str = Field(max_length=160)
    password: str = Field(max_length=200)


class ForgotIn(BaseModel):
    email: str = Field(max_length=160)


class ResetIn(BaseModel):
    token: str = Field(max_length=128)
    password: str = Field(max_length=200)


class GoogleIn(BaseModel):
    session_id: str = Field(max_length=256)


async def send_welcome(user):
    subject, html, text = mail_templates.welcome(user)
    await mailer.enqueue("welcome:" + user["user_id"], user["email"], subject, html, text)


@router.post("/register", status_code=201)
async def register(body: RegisterIn, response: Response):
    email, errors = body.email.strip().lower(), {}
    if not EMAIL.fullmatch(email):
        errors["email"] = "invalid"
    if len(body.password) < 10:
        errors["password"] = "too_short"
    if errors:
        raise HTTPException(422, {"error": "register_invalid", "fields": errors})
    if await store.accounts.email_taken(email):
        raise HTTPException(409, {"error": "email_taken", "message": "Diese E-Mail-Adresse ist bereits registriert", "fields": {"email": "taken"}})
    user = {"user_id": "user_" + uuid.uuid4().hex[:12], "email": email, "name": body.name.strip(), "role": "customer",
            "password_hash": hash_password(body.password), "created_at": now_iso()}
    try:
        await store.accounts.create_user(user)
    except store.AlreadyExists:
        raise HTTPException(409, {"error": "email_taken", "message": "Diese E-Mail-Adresse ist bereits registriert", "fields": {"email": "taken"}}) from None
    await send_welcome(user)
    return await start_session(response, user)


@router.post("/login")
async def login(body: LoginIn, response: Response):
    email = body.email.strip().lower()
    since = datetime.now(timezone.utc) - LOCK_WINDOW
    if await store.accounts.count_login_failures(email, since) >= MAX_FAILS:
        raise HTTPException(429, {"error": "locked", "message": "Zu viele Fehlversuche. Bitte versuchen Sie es in 15 Minuten erneut."})
    user = await store.accounts.user_by_email(email)
    if not user or not check_password(body.password, user.get("password_hash")):
        await store.accounts.record_login_failure(email, datetime.now(timezone.utc))
        raise HTTPException(401, {"error": "invalid_credentials", "message": WRONG})
    await store.accounts.clear_login_failures(email)
    return await start_session(response, user)


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        await store.accounts.delete_session(digest(token))
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
async def me(request: Request):
    user = await session_user(request)
    if not user:
        raise HTTPException(401, {"error": "authentication_required"})
    return public_user(user)


@router.post("/forgot-password")
async def forgot_password(body: ForgotIn):
    user = await store.accounts.user_by_email(body.email.strip().lower())
    if user:
        token = secrets.token_urlsafe(32)
        await store.accounts.create_password_reset(digest(token), user["user_id"],
                                                   datetime.now(timezone.utc) + timedelta(minutes=60))
        link = config.PUBLIC_ORIGIN + "/passwort-zuruecksetzen?token=" + token
        subject, html, text = mail_templates.password_reset(link)
        outbox = await mailer.enqueue("reset:" + digest(token), user["email"], subject, html, text)
        await store.accounts.set_password_reset_mail_status(digest(token), (outbox or {}).get("status"))
    return {"ok": True, "message": "Wenn ein Konto zu dieser E-Mail-Adresse besteht, haben wir einen Link zum Zurücksetzen gesendet."}


@router.post("/reset-password")
async def reset_password(body: ResetIn):
    if len(body.password) < 10:
        raise HTTPException(422, {"error": "reset_invalid", "fields": {"password": "too_short"}})
    reset = await store.accounts.consume_password_reset(digest(body.token), datetime.now(timezone.utc))
    if not reset:
        raise HTTPException(400, {"error": "token_invalid", "message": "Der Link ist ungültig oder abgelaufen."})
    # The reset link reached this mailbox, so the address is now proven for this account.
    await store.accounts.set_password_hash_verified(reset["user_id"], hash_password(body.password))
    await store.accounts.delete_sessions_of(reset["user_id"])
    # Keys created by whoever held the account before the reset must not outlive it.
    await store.accounts.revoke_api_keys_of(reset["user_id"], now_iso())
    await store.accounts.clear_login_failures((await store.accounts.user_by_id(reset["user_id"]))["email"])
    return {"ok": True}


@router.post("/google/session")
async def google_session(body: GoogleIn, response: Response):
    async with httpx.AsyncClient(timeout=15) as client:
        data = await client.get(GOOGLE_SESSION_URL, headers={"X-Session-ID": body.session_id})
    if data.status_code != 200 or not EMAIL.fullmatch((data.json().get("email") or "").lower()):
        raise HTTPException(401, {"error": "google_session_invalid"})
    profile = data.json()
    email = profile["email"].lower()
    user = await store.accounts.user_by_email(email)
    # Refuse instead of merging: privileged roles never sign in via Google, and a password account whose address
    # was never proven may belong to whoever registered it first (pre-account takeover). Nothing is changed here.
    if user and user.get("role", "customer") != "customer":
        raise HTTPException(403, {"error": "google_login_not_allowed", "message": "Für dieses Konto ist die Anmeldung mit Google nicht freigegeben. Bitte melden Sie sich mit Ihrem Passwort an."})
    if user and "password_hash" in user and user.get("email_verified") is not True:
        raise HTTPException(409, {"error": "account_exists_unverified", "message": "Zu dieser E-Mail-Adresse besteht bereits ein Konto mit Passwort. Bitte melden Sie sich mit Ihrem Passwort an oder nutzen Sie „Passwort vergessen“; danach ist auch die Anmeldung mit Google möglich."})
    if not user:
        user = {"user_id": "user_" + uuid.uuid4().hex[:12], "email": email, "name": profile.get("name", ""), "role": "customer", "email_verified": True, "created_at": now_iso()}
        await store.accounts.create_user(user)
        await send_welcome(user)
    await store.accounts.mark_google_linked(user["user_id"])
    return await start_session(response, user)
