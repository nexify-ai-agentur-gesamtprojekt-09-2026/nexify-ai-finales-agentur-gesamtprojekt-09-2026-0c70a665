import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {verifyEditorialFilms,verifySceneDirection} from '../scripts/editorial-films.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const registry=JSON.parse(await readFile(root+'config/editorial-art.json','utf8'));
test('delivered editorial films bind to exact source and poster bytes',async()=>{await verifyEditorialFilms(registry,root+'apps/web/public');});
test('corrupted film descriptor and path escape fail closed',async()=>{
 const changed=structuredClone(registry);changed.assets[0].film.sha256='0'.repeat(64);
 await assert.rejects(verifyEditorialFilms(changed,root+'apps/web/public'),/drift/);
 const escaped=structuredClone(registry);escaped.assets[0].film.src='/media/atelier/films/../../secret.mp4';
 await assert.rejects(verifyEditorialFilms(escaped,root+'apps/web/public'),/Unsafe/);
});

const direction=JSON.parse(await readFile(root+'config/scene-direction.json','utf8'));
const site=JSON.parse(await readFile(root+'apps/site/.generated/public-site.json','utf8'));
test('all public scene routes are explicitly assigned, without private routes',()=>{verifySceneDirection(direction,site.pages,registry);});
test('missing and unauthorized scene routes fail closed',()=>{
 const missing=structuredClone(direction);missing.pages.pop();assert.throws(()=>verifySceneDirection(missing,site.pages,registry),/Missing/);
 const extra=structuredClone(direction);extra.pages.push({page_id:'admin',path:'/admin',family:'workspace',mode:'cinematic'});assert.throws(()=>verifySceneDirection(extra,site.pages,registry),/private/);
});
