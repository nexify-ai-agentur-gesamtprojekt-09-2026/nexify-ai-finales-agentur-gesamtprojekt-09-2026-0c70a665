import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../../../vercel.json',import.meta.url),'utf8'));
const baseline=JSON.parse(await readFile(new URL('./fixtures/csp-enforcement-baseline.json',import.meta.url),'utf8'));
const group=config.headers.find(h=>h.source==='/(.*)');
const csp=group.headers.find(h=>h.key.toLowerCase()==='content-security-policy').value;
const directives=csp.split(';').map(s=>s.trim()).filter(Boolean);
test('external CSP reporting is absent without dropping the enforced header',()=>{
 assert.ok(directives.length>0);
 assert.equal(directives.some(s=>/^report-(?:uri|to)\b/i.test(s)),false);
 assert.equal(config.headers.some(g=>g.headers.some(h=>['report-to','reporting-endpoints'].includes(h.key.toLowerCase()))),false);
});
test('only the observed supplier image directory extends the reviewed CSP',()=>{
 assert.deepEqual(directives.filter(s=>!s.startsWith('img-src ')),baseline.enforcement_directives.filter(s=>!s.startsWith('img-src ')));
 assert.deepEqual(directives.filter(s=>s.startsWith('img-src ')),["img-src 'self' data: blob: https://cdnbigbuy.com/images/"]);
 assert.ok(directives.includes("frame-ancestors 'none'"));
 assert.ok(directives.includes("base-uri 'self'"));
 assert.ok(directives.includes("form-action 'self'"));
 assert.equal(csp.includes("'unsafe-eval'"),false);
});
test('other security headers and their values remain intact',()=>{
 assert.deepEqual(group.headers.filter(h=>h.key.toLowerCase()!=='content-security-policy'),baseline.other_headers);
});
