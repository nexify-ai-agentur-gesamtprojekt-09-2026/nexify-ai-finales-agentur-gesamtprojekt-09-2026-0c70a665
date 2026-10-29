"""Local backend boundary for the single app; no HTTP listener or browser authority.

A trusted local caller supplies a Session. No identity provider is implemented here.
The public Workspace must NOT construct sessions from browser claims or invoke this
adapter until a separately verified server identity adapter exists.
"""
from dataclasses import dataclass
import json
import math
import sqlite3
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from local_control import LocalControl, require, object_fields
import remediation_queue as rq

@dataclass(frozen=True)
class Session:
    actor: str
    tenant: str
    project: str
    role: str
    expires_at: float
    revoked: bool = False

class LocalAppBackend:
    def __init__(self, control: LocalControl):
        self.control = control
        raw = rq.read_source(control.root, 'config/one-web-app.json')
        self.contract = rq.json_value(raw)
        self.contract_hash = rq.digest(raw)
        require(self.contract['schema_version'] == 1, 'unsupported_app_contract')

    def _authorize(self, session: Session, action: str):
        """Trusted resolver boundary; browser fields never construct a Session."""
        require(rq.digest(rq.read_source(self.control.root, 'config/one-web-app.json')) == self.contract_hash, 'app_contract_changed_restart_required')
        require(type(session) is Session, 'trusted_local_session_required')
        rq.identifier(session.actor)
        require((session.tenant, session.project) == (self.control.tenant, self.control.project), 'session_tenant_or_project_mismatch')
        require(not session.revoked, 'session_revoked')
        require(type(session.expires_at) in {int,float} and math.isfinite(session.expires_at) and self.control.now() < session.expires_at, 'session_expired')
        allowed = self.contract['session_contract']['roles'].get(session.role, [])
        require(action in allowed, 'role_or_operation_forbidden')

    def workspace_status(self, session: Session, request_id: str):
        self._authorize(session, 'status')
        return self.control.workspace_status(request_id)

    def workspace_response(self, session: Session, *, method: str, query: dict):
        """Transport-neutral HTTP read contract. Session comes only from a trusted resolver."""
        headers = {'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization'}
        try:
            self._authorize(session, 'status')
            if method != 'GET':
                return 405, {**headers, 'Allow': 'GET'}, {'error': 'method_not_allowed'}
            object_fields(query, ['request_id'])
            rq.identifier(query['request_id'])
            result = self.workspace_status(session, query['request_id'])
            return 200, headers, result
        except rq.QueueError as exc:
            code = str(exc)
            status = 401 if code in {'trusted_local_session_required', 'session_expired', 'session_revoked'} else 404 if code in {'session_tenant_or_project_mismatch', 'scoped_request_not_found'} else 403 if code == 'role_or_operation_forbidden' else 400 if code in {'unknown_or_missing_schema_field', 'invalid_identifier', 'customer_scope_forbidden'} else 503
            return status, headers, {'error': {401:'authentication_required',403:'membership_required',404:'scoped_request_not_found',400:'invalid_query',503:'workspace_binding_unavailable'}[status]}
        except (OSError, sqlite3.DatabaseError, json.JSONDecodeError):
            return 503, headers, {'error': 'workspace_binding_unavailable'}

    def dispatch(self, session: Session, action: str, payload: dict):
        self._authorize(session, action)
        fields = {
            'probe':['operation'], 'submit':['definition'], 'run-once':['request_id'],
            'status':['request_id'], 'resume':['job_id','health_id'],
            'refresh-review':['job_id','health_id'],
            'review':['job_id','result_hash','evidence_path','evidence_sha256'],
        }
        require(action in fields, 'unknown_backend_operation')
        object_fields(payload, fields[action])
        c = self.control
        if action == 'probe': return c.probe(payload['operation'])
        if action == 'submit': return c.submit(payload['definition'])
        if action == 'status': return c.status_snapshot(payload['request_id'])
        if action == 'resume': return c.resume(payload['job_id'], health_id=payload['health_id'])
        if action == 'refresh-review': return c.refresh_review(payload['job_id'], health_id=payload['health_id'])
        if action == 'review': return c.review(**payload, reviewer=session.actor)
        ticket = c.claim(payload['request_id'], session.actor)
        return c.execute(ticket) if ticket else c.status(payload['request_id'])
