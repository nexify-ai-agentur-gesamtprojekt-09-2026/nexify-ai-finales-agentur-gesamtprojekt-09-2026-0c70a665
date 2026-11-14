"""Operator inbox for TEILEKLAR: workshop requests and TEILEKLAR enquiries, read-only.

Behind the switch TEILEKLAR_OPERATOR_INBOX (exactly "on"); off, both routes answer 404. Operator role
required. Only TEILEKLAR records are returned: NeXify enquiries are filtered out by brand, not by convention.
"""
import os

from fastapi import APIRouter, Depends, HTTPException

from . import auth, brands
from .db import db

router = APIRouter(prefix="/api/admin/teileklar")
SWITCH = "TEILEKLAR_OPERATOR_INBOX"


def require_enabled():
    if os.environ.get(SWITCH) != "on":
        raise HTTPException(404, {"error": "not_found"})


@router.get("/workshop-requests")
async def workshop_requests(ident=Depends(auth.require_admin)):
    require_enabled()
    rows = await db.workshop_requests.find({}).sort("created_at", -1).to_list(200)
    for row in rows:
        row["id"] = row.pop("_id")
    return {"items": rows}


@router.get("/requests")
async def requests(ident=Depends(auth.require_admin)):
    require_enabled()
    rows = await db.requests.find(brands.scope("teileklar"), {"payload_hash": 0}).sort("created_at", -1).to_list(200)
    for row in rows:
        row["id"] = row.pop("_id")
    return {"items": rows}
