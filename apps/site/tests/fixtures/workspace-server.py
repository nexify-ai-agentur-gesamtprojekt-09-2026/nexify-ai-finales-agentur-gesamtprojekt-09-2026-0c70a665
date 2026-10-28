"""Loopback-only isolated test server. Never imported by application runtime."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[4]/'tests'))
import test_workspace_read as fixture
from dataclasses import replace
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.parse import urlsplit,parse_qs
import json,hashlib
f=fixture.WorkspaceReadTests();f.setUp()
request=f.f.submit([f.f.job('parent',dependencies=['child']),f.f.job('child',target='/unbound')])
ticket=f.f.c.claim(request,'synthetic-worker');f.f.c.execute(ticket)
sessions={'reader':f.session,'foreign':replace(f.session,tenant='foreign'),'forbidden':replace(f.session,role='customer'),'expired':replace(f.session,expires_at=f.f.clock),'revoked':replace(f.session,revoked=True)}
def fingerprint():
 with f.f.c.queue.connection(read_only=True) as db:return hashlib.sha256('\n'.join(db.iterdump()).encode()).hexdigest()
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  u=urlsplit(self.path)
  if u.path=='/fixture-integrity':status,headers,body=200,{},dict(hash=fingerprint())
  elif u.path=='/api/internal/workspace/status':
   cookie=self.headers.get('Cookie','');name=next((v.split('=',1)[1] for v in cookie.split('; ') if v.startswith('workspace_fixture=')),None)
   raw=parse_qs(u.query,keep_blank_values=True);query={k:v[0] if len(v)==1 else None for k,v in raw.items()}
   status,headers,body=f.backend.workspace_response(sessions.get(name),method='GET',query=query)
  else:status,headers,body=404,{},dict(error='fixture_not_found')
  self.send_response(status)
  for k,v in headers.items():self.send_header(k,v)
  self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(body).encode())
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
print(json.dumps(dict(port=server.server_port,request_id=request,fingerprint=fingerprint(),synthetic=True)),flush=True)
try:server.serve_forever()
finally:server.server_close();f.f.doCleanups()
