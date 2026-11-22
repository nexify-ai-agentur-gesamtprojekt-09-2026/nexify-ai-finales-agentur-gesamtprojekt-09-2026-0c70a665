"""Actual FastAPI routing/Pydantic/header contract with an isolated in-memory store."""
import ast
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
import types
import unittest

try:
    import httpx
    from fastapi import APIRouter, FastAPI, Header, HTTPException, Request
    from pydantic import BaseModel, Field
    HTTP_DEPS = True
except ImportError:
    HTTP_DEPS = False

from test_contact_recovery import Requests, Duplicate

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(HTTP_DEPS, 'pinned FastAPI/httpx dependencies unavailable')
class ContactHttpContract(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = Requests()
        async def notify(_):
            return 'wartend'
        async def anonymous(_):
            return None
        source = ast.parse((ROOT/'apps/shop-api/shop/requests_api.py').read_text())
        nodes = [node for node in source.body if isinstance(node,ast.ClassDef) and node.name in {'RequestIn','RequestReceipt'}
                 or isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)) and node.name not in {'notify','_requester'}]
        router = APIRouter(prefix='/api/requests')
        namespace = {'__name__':'contact_http_fixture','router':router,'BaseModel':BaseModel,'Field':Field,
                     'Header':Header,'HTTPException':HTTPException,'Request':Request,
                     'store':types.SimpleNamespace(requests=self.db,AlreadyExists=Duplicate),'notify':notify,'_requester':anonymous,
                     'hashlib':hashlib,'json':json,'re':re,'datetime':datetime,'timedelta':timedelta,'timezone':timezone,
                     'EMAIL':re.compile(r'[^@\s]+@[^@\s]+\.[^@\s]+'),'HOURLY_LIMIT':5,
                     'now_iso':lambda:datetime.now(timezone.utc).isoformat()}
        exec(compile(ast.fix_missing_locations(ast.Module(body=nodes,type_ignores=[])),'requests_api.py','exec'),namespace)
        app = FastAPI()
        app.include_router(router)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='https://contact.example.invalid')
        self.payload = {'name':'Synthetic User','email':'user@example.invalid','message':'Offline HTTP contract test.','consent':True}

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_real_hyphenated_header_and_response_replay(self):
        headers = {'Idempotency-Key':'http-contact-key-0001'}
        first = await self.client.post('/api/requests',json=self.payload,headers=headers)
        second = await self.client.post('/api/requests',json=self.payload,headers=headers)
        self.assertEqual(first.status_code,201)
        self.assertEqual(second.json(),first.json())
        self.assertEqual(len(self.db.rows),1)
        self.assertEqual(first.json()['status'],'eingegangen')

    async def test_missing_header_and_underscore_alias_do_not_write(self):
        for headers in [{},{'idempotency_key':'http-contact-key-0001'}]:
            result = await self.client.post('/api/requests',json=self.payload,headers=headers)
            self.assertEqual(result.status_code,400)
        self.assertEqual(self.db.rows,{})

    async def test_invalid_json_fields_and_changed_payload_are_rejected(self):
        headers = {'Idempotency-Key':'http-contact-key-0001'}
        invalid = await self.client.post('/api/requests',json={**self.payload,'consent':False},headers=headers)
        self.assertEqual(invalid.status_code,422)
        await self.client.post('/api/requests',json=self.payload,headers=headers)
        conflict = await self.client.post('/api/requests',json={**self.payload,'message':'Changed payload with same key.'},headers=headers)
        self.assertEqual(conflict.status_code,409)
        self.assertEqual(conflict.json()['detail']['error'],'idempotency_conflict')
        self.assertEqual(len(self.db.rows),1)
