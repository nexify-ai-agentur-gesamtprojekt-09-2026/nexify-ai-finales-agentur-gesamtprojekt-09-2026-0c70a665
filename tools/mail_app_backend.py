"""Local mail transport boundary; never a connector, SMTP client or identity resolver."""
import json
import sqlite3

import remediation_queue as rq
from app_backend import LocalAppBackend, Session
from mail_workspace import MailWorkspace


class MailAppBackend:
    def __init__(self, app: LocalAppBackend, mail: MailWorkspace):
        self.app, self.mail = app, mail
        rq.require((mail.tenant, mail.project) == (app.control.tenant, app.control.project),
                   'mail_binding_scope_mismatch')

    def response(self, session: Session, *, method: str, payload: dict):
        """Only a trusted server resolver supplies Session. No caller tenant or sender."""
        headers = {'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization'}
        try:
            # Reuse the existing read/operator distinction, without granting a new role.
            self.app._authorize(session, 'status' if method == 'GET' else 'submit')
            if method == 'GET':
                rq.require(type(payload) is dict and not payload, 'invalid_mail_request')
                return 200, headers, self.mail.snapshot()
            if method != 'POST':
                return 405, {**headers, 'Allow': 'GET, POST'}, {'error': 'method_not_allowed'}
            rq.require(type(payload) is dict, 'invalid_mail_request')
            action = payload.get('action')
            common = {'action', 'provider', 'mailbox_id', 'message_id', 'expected_revision'}
            if action == 'prepare':
                fields = common | {'mode', 'to', 'cc', 'bcc', 'reply_to', 'text',
                                   'signature_text', 'signature_html', 'idempotency_key'}
                rq.require(set(payload) == fields, 'invalid_mail_request')
                args = {k: v for k, v in payload.items() if k != 'action'}
                result = {'schema_version': 'local-mail-1', 'binding': 'local_only',
                          'outbox': self.mail.prepare(**args)}
            elif action == 'local_state':
                rq.require(set(payload) == common | {'read', 'task_status', 'local_archived'},
                           'invalid_mail_request')
                args = {k: v for k, v in payload.items() if k != 'action'}
                result = {'schema_version': 'local-mail-1', 'binding': 'local_only',
                          'message': self.mail.set_local_state(**args)}
            else:
                return 400, headers, {'error': 'unsupported_mail_action'}
            return 200, headers, result
        except rq.QueueError as exc:
            reason = str(exc)
            if reason in {'trusted_local_session_required', 'session_expired', 'session_revoked'}:
                status, error = 401, 'authentication_required'
            elif reason == 'role_or_operation_forbidden':
                status, error = 403, 'membership_required'
            elif reason in {'session_tenant_or_project_mismatch', 'mailbox_not_connected', 'mail_message_not_found'}:
                status, error = 404, 'scoped_mail_not_found'
            elif reason in {'app_contract_changed_restart_required', 'unknown_mail_send_state',
                            'mail_projection_limit'}:
                status, error = 503, 'mail_binding_unavailable'
            elif 'revision' in reason or 'idempotency' in reason:
                status, error = 409, 'mail_revision_or_request_conflict'
            else:
                status, error = 400, 'invalid_mail_request'
            return status, headers, {'error': error}
        except (OSError, sqlite3.DatabaseError, json.JSONDecodeError):
            return 503, headers, {'error': 'mail_binding_unavailable'}
