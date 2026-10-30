"""Partner request persistence and fail-closed, role/tenant-scoped recipient access.

Storage (a visitor submitting their own request) and reception (an authorised partner/
staff actor of the SAME tenant reading it) are deliberately separated. Submitting never
proves delivery or authorised receipt. Reception requires an explicit role AND matching
tenant; writes additionally require MFA. There is no public listing and no cross-tenant
read. The live partner role/tenant identity is expected to come from the protected portal
auth (Clerk) and is therefore not satisfiable in the public preview (documented blocker).
"""
import hashlib
import json
import re
import secrets
import time

RECIPIENT_ROLES = {"partner", "staff"}
PARTNER_SCHEMA = """
  CREATE TABLE IF NOT EXISTS partner_requests(
    id TEXT PRIMARY KEY,
    tenant TEXT NOT NULL,
    submitter TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL,
    created INTEGER NOT NULL);
"""


class PartnerError(ValueError):
    def __init__(self, status, code):
        self.status, self.code = status, code
        super().__init__(code)


def _tenant(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", value):
        raise PartnerError(422, "invalid_tenant")
    return value


def _text(value, maximum):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise PartnerError(422, "invalid_text")
    if any(ord(c) < 32 and c not in "\n\t" for c in value) or "<" in value:
        raise PartnerError(422, "invalid_text")
    return value.strip()


class Actor:
    """An authenticated portal actor. role/tenant come from the protected auth layer."""
    def __init__(self, *, role=None, tenant=None, mfa=False):
        self.role = role
        self.tenant = tenant if tenant is None else str(tenant)
        self.mfa = bool(mfa)

    def require_recipient(self, tenant):
        # Fail closed: a real role in the recipient set AND an exact tenant match.
        if self.role not in RECIPIENT_ROLES:
            raise PartnerError(403, "recipient_role_required")
        if not self.tenant or self.tenant != tenant:
            raise PartnerError(403, "recipient_tenant_mismatch")

    def require_write(self, tenant):
        self.require_recipient(tenant)
        if not self.mfa:
            raise PartnerError(403, "mfa_required_for_writes")


class PartnerReception:
    ALLOWED_STATUS = {"pending_review", "accepted", "declined"}

    def __init__(self, connect):
        self.connect = connect
        with self.connect() as db:
            db.executescript(PARTNER_SCHEMA)

    def submit(self, submitter, tenant, payload, key):
        """Visitor-side storage only. Returns a reference; never a delivery/receipt claim."""
        if not isinstance(submitter, str) or not submitter:
            raise PartnerError(401, "session_required")
        tenant = _tenant(tenant)
        if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z0-9_-]{8,100}", key):
            raise PartnerError(422, "idempotency_key_required")
        if not isinstance(payload, dict) or set(payload) - {"company", "contact", "email", "message", "locale"}:
            raise PartnerError(422, "unexpected_field")
        record = {
            "company": _text(payload.get("company", ""), 160),
            "contact": _text(payload.get("contact", ""), 160),
            "email": _text(payload.get("email", ""), 254),
            "message": _text(payload.get("message", ""), 2000),
            "locale": payload.get("locale", "de"),
        }
        if record["locale"] not in {"de", "nl", "fr"}:
            raise PartnerError(422, "invalid_locale")
        payload_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
        operation = "partner_request:" + tenant
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            receipt = db.execute("SELECT payload_hash,response FROM receipts WHERE owner=? AND operation=? AND key=?", (submitter, operation, key)).fetchone()
            if receipt:
                if receipt[0] != payload_hash:
                    raise PartnerError(409, "idempotency_conflict")
                return json.loads(receipt[1])
            identifier = secrets.token_hex(16)
            result = {"id": identifier, "tenant": tenant, "status": "pending_review",
                      "stored": True, "received": False, "approved": False, "delivered": False}
            db.execute("INSERT INTO partner_requests VALUES (?,?,?,?,?,?)",
                       (identifier, tenant, submitter, json.dumps(record), "pending_review", int(time.time())))
            db.execute("INSERT INTO receipts VALUES (?,?,?,?,?)", (submitter, operation, key, payload_hash, json.dumps(result)))
            return result

    def receipt(self, submitter, tenant, key):
        """Read only this visitor/tenant/key receipt; absence is only a point-in-time observation."""
        if not isinstance(submitter, str) or not submitter:
            raise PartnerError(401, "session_required")
        tenant = _tenant(tenant)
        if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z0-9_-]{8,100}", key):
            raise PartnerError(422, "idempotency_key_required")
        with self.connect() as db:
            row = db.execute("SELECT response FROM receipts WHERE owner=? AND operation=? AND key=?",
                             (submitter, "partner_request:" + tenant, key)).fetchone()
        if row is None:
            raise PartnerError(404, "receipt_not_found")
        return json.loads(row[0])

    def inbox(self, actor, tenant):
        """Recipient-side read. Fail closed on role/tenant. Only this tenant's requests."""
        tenant = _tenant(tenant)
        actor.require_recipient(tenant)
        with self.connect() as db:
            rows = db.execute(
                "SELECT id,tenant,submitter,payload,status,created FROM partner_requests "
                "WHERE tenant=? ORDER BY created DESC",
                (tenant,),
            ).fetchall()
        return [{"id": r[0], "tenant": r[1], "submitter": r[2], "payload": json.loads(r[3]),
                 "status": r[4], "created": r[5]} for r in rows]

    def set_status(self, actor, tenant, request_id, status):
        """Recipient-side write. Requires role+tenant+MFA and same-tenant ownership."""
        tenant = _tenant(tenant)
        actor.require_write(tenant)
        if status not in self.ALLOWED_STATUS:
            raise PartnerError(422, "invalid_status")
        if not isinstance(request_id, str) or not re.fullmatch(r"[a-f0-9]{32}", request_id or ""):
            raise PartnerError(422, "invalid_request_id")
        with self.connect() as db:
            row = db.execute("SELECT tenant FROM partner_requests WHERE id=?", (request_id,)).fetchone()
            if row is None:
                raise PartnerError(404, "not_found")
            if row[0] != tenant:
                raise PartnerError(403, "recipient_tenant_mismatch")
            db.execute("UPDATE partner_requests SET status=? WHERE id=?", (status, request_id))
        return {"id": request_id, "tenant": tenant, "status": status}
