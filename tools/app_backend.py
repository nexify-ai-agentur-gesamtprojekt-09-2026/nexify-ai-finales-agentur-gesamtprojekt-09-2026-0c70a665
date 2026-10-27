"""Local backend boundary for the single app; no HTTP listener or browser authority.

A trusted local caller supplies a Session. No identity provider is implemented here.
The public Workspace must NOT construct sessions from browser claims or invoke this
adapter until a separately verified server identity adapter exists.
"""
from dataclasses import dataclass
import json
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

class LocalAppBackend:
    def __init__(self, control: LocalControl):
        self.control = control
        self.contract = rq.json_value(rq.read_source(control.root, 'config/one-web-app.json'))
        require(self.contract['schema_version'] == 1, 'unsupported_app_contract')

    def dispatch(self, session: Session, action: str, payload: dict):
        """One local operation, fresh session check every call; never accepts claims in payload."""
        require(type(session) is Session, 'trusted_local_session_required')
        rq.identifier(session.actor)
        require((session.tenant, session.project) == (self.control.tenant, self.control.project), 'session_tenant_or_project_mismatch')
        require(self.control.now() < session.expires_at, 'session_expired')
        allowed = self.contract['session_contract']['roles'].get(session.role, [])
        require(action in allowed, 'role_or_operation_forbidden')
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
        if action == 'status': return c.status(payload['request_id'])
        if action == 'resume': return c.resume(payload['job_id'], health_id=payload['health_id'])
        if action == 'refresh-review': return c.refresh_review(payload['job_id'], health_id=payload['health_id'])
        if action == 'review': return c.review(**payload, reviewer=session.actor)
        ticket = c.claim(payload['request_id'], session.actor)
        return c.execute(ticket) if ticket else c.status(payload['request_id'])
