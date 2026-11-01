import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {inspectFiles, preparationManifest, validProjectLabel, FILE_LIMITS} from '../../web/lib/project-files.ts';
if (!globalThis.crypto) globalThis.crypto=webcrypto;
const file=(name,body='briefing',type='text/plain')=>({name,type,size:Buffer.byteLength(body),arrayBuffer:async()=>Uint8Array.from(Buffer.from(body)).buffer});
test('hashes original UTF-8 bytes and records preparation without transfer or Brain effects',async()=>{
 const {files,rejected}=await inspectFiles([file('briefing.txt','abc')]);assert.deepEqual(rejected,[]);
 assert.equal(files[0].sha256,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 const m=preparationManifest(' Projekt A ','specification',files);assert.equal(m.project_label,'Projekt A');assert.equal(m.transfer,'not_started');assert.equal(m.content_included,false);assert.equal(m.project_authorization,'not_verified');assert.ok(Object.values(m.brain).every(x=>x==='not_started'));
});
test('rejects forged MIME, active formats, inherited keys, unsafe and bidi names',async()=>{
 const candidates=[file('briefing.pdf','abc','application/pdf'),file('picture.png','abc','image/png'),file('data.txt','abc','text/html'),file('x.svg','<svg/>','image/svg+xml'),file('x.__proto__','abc',''),file('../a.txt'),file('a\u202etxt.txt')];
 const r=await inspectFiles(candidates);assert.equal(r.files.length,0);assert.equal(r.rejected.length,7);
});
test('blocks binary masquerading as UTF-8, invalid JSON and empty files',async()=>{
 for(const item of [file('x.txt','a\0b'),file('x.json','not json','application/json')])assert.equal((await inspectFiles([item])).files.length,0);
 await assert.rejects(inspectFiles([file('empty.txt','')]),/file_size_limit/);
});
test('deduplicates by bytes across names and preserves conflicting versions',async()=>{
 const r=await inspectFiles([file('brief.txt','one'),file('other.txt','one'),file('BRIEF.txt','two')]);
 assert.equal(r.files.length,2);assert.equal(r.rejected[0].reason,'duplicate');assert.equal(r.files[1].state,'version_conflict');
 assert.deepEqual(r.files[1].versionOf,[r.files[0].sha256]);
 const acknowledged=r.files.map(row=>({...row,state:'prepared'}));assert.deepEqual(preparationManifest('Project','briefing',acknowledged).files[1].additional_version_of,[r.files[0].sha256]);
 assert.throws(()=>preparationManifest('Project','briefing',r.files),/preparation_incomplete/);
 const next=await inspectFiles([file('v3.txt','one')],r.files);assert.equal(next.files.length,0);assert.equal(next.rejected[0].reason,'duplicate');
});
test('checks count, per-file and aggregate budgets before reading any bytes',async()=>{
 let reads=0;const item={name:'large.txt',type:'text/plain',size:FILE_LIMITS.perFile+1,arrayBuffer:async()=>{reads++;throw Error('must not read');}};
 await assert.rejects(inspectFiles([item]),/file_size_limit/);assert.equal(reads,0);
 await assert.rejects(inspectFiles(Array.from({length:11},()=>file('x.txt'))),/count_limit/);
 await assert.rejects(inspectFiles([{...item,size:9*1024*1024},{...item,size:9*1024*1024},{...item,size:9*1024*1024}]),/total_size_limit/);assert.equal(reads,0);
});
test('cancel before and during a pending read cannot yield prepared files',async()=>{
 const before=new AbortController();before.abort();await assert.rejects(inspectFiles([file('x.txt')],[],before.signal),{name:'AbortError'});
 const during=new AbortController();let release;const pending={...file('x.txt'),arrayBuffer:()=>new Promise(resolve=>release=resolve)};
 const result=inspectFiles([pending],[],during.signal);during.abort();release(Uint8Array.from(Buffer.from('briefing')).buffer);await assert.rejects(result,{name:'AbortError'});
});
test('requires an intentional project label, supported purpose and resolved files',()=>{
 assert.equal(validProjectLabel(' '),false);assert.equal(validProjectLabel('x\u202e'),false);assert.equal(validProjectLabel('X'.repeat(121)),false);
 assert.throws(()=>preparationManifest('Project','briefing',[]),/preparation_incomplete/);assert.throws(()=>preparationManifest('Project','publish',[{}]),/preparation_incomplete/);
});
test('never executes text markup and requires content length to match metadata',async()=>{
 const payload=file('requirements.md','<script>throw new Error("executed")</script>','text/plain');assert.equal((await inspectFiles([payload])).files.length,1);
 const mismatch={...file('a.txt'),size:1};assert.equal((await inspectFiles([mismatch])).rejected[0].reason,'content_format');
});
