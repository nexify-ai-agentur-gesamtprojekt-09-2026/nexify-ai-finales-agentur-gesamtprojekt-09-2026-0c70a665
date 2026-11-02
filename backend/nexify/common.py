import hashlib
import json
import re
import secrets
from datetime import datetime, timezone

from fastapi import HTTPException, Request

from shop.accounts_api import session_user

EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
IDEM = re.compile(r"[A-Za-z0-9_-]{16,128}")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix):
    return prefix + "_" + secrets.token_hex(8)


def payload_hash(payload):
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def clean(doc):
    if doc is None:
        return None
    doc = dict(doc)
    doc.pop("_id", None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


async def require_user(request: Request):
    user = await session_user(request)
    if not user:
        raise HTTPException(401, {"error": "authentication_required", "message": "Bitte melden Sie sich an."})
    return user
