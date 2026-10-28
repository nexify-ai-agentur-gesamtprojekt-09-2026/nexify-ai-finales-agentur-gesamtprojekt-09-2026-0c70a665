"""Loopback synthetic mail transport; never imported by the production application."""
import json
import sys
from dataclasses import replace
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / 'tests'))
import test_mail_app_backend as fixture

f = fixture.MailBoundaryTests(); f.setUp()
sessions = {'reader': f.session, 'foreign': replace(f.session, tenant='foreign'),
            'forbidden': replace(f.session, role='customer'),
            'reviewer': replace(f.session, role='reviewer'),
            'expired': replace(f.session, expires_at=f.fixture.f.clock),
            'revoked': replace(f.session, revoked=True)}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def handle_request(self):
        path = urlsplit(self.path).path
        if path == '/fixture-snapshot' and self.command == 'GET':
            code, headers, result = 200, {}, f.mail.snapshot()
        elif path == '/fixture-update-source' and self.command == 'POST':
            # Synthetic race trigger, unavailable outside this test server.
            f.mail.ingest_page('gmail','mailbox-1',[fixture.source_message(revision=2)],
                               cursor=None,next_cursor=None,complete=True)
            code, headers, result = 200, {}, {'synthetic':True}
        elif path == '/api/internal/workspace/mail':
            name = next((v.split('=',1)[1] for v in self.headers.get('Cookie','').split('; ')
                         if v.startswith('mail_fixture=')),None)
            if self.command == 'POST':
                length = int(self.headers.get('Content-Length','0'))
                if length > 262144:
                    self.send_error(413); return
                try: payload = json.loads(self.rfile.read(length))
                except (ValueError,UnicodeDecodeError):
                    self.send_error(400); return
            else: payload = {}
            # Fixed synthetic sessions, never taken from browser role/tenant claims.
            code, headers, result = f.backend.response(sessions.get(name),method=self.command,payload=payload)
        else: code, headers, result = 404, {}, {'error':'fixture_not_found'}
        self.send_response(code)
        for key,value in headers.items(): self.send_header(key,value)
        self.send_header('Content-Type','application/json'); self.end_headers()
        self.wfile.write(json.dumps(result).encode())

    do_GET = handle_request
    do_POST = handle_request


server = ThreadingHTTPServer(('127.0.0.1',0),Handler)
print(json.dumps({'port':server.server_port,'synthetic':True}),flush=True)
try: server.serve_forever()
finally: server.server_close(); f.doCleanups()
