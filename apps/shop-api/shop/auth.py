"""Identity: own account session (accounts_api) plus guest cookie; role from the user record."""
import re
import secrets
from dataclasses import dataclass

from fastapi import HTTPException, Request


GUEST_COOKIE = "tk_guest"


@dataclass
class Identity:
    user_id: str | None
    role: str | None
    guest_id: str | None

    @property
    def owner(self):
        return "user:" + self.user_id if self.user_id else ("guest:" + self.guest_id if self.guest_id else None)


async def identity(request: Request) -> Identity:
    from .accounts_api import session_user
    guest = request.cookies.get(GUEST_COOKIE)
    guest = guest if guest and re.fullmatch(r"[A-Za-z0-9_-]{32,64}", guest) else None
    user = await session_user(request)
    return Identity(user["user_id"], user.get("role", "customer"), guest) if user else Identity(None, None, guest)


def new_guest_id():
    return secrets.token_urlsafe(32)


def set_guest_cookie(response, guest_id):
    response.set_cookie(GUEST_COOKIE, guest_id, max_age=60 * 60 * 24 * 30, httponly=True, secure=True, samesite="lax", path="/")


async def require_admin(request: Request) -> Identity:
    ident = await identity(request)
    if not ident.user_id:
        raise HTTPException(401, {"error": "authentication_required"})
    if ident.role != "admin":
        raise HTTPException(403, {"error": "admin_required"})
    return ident
