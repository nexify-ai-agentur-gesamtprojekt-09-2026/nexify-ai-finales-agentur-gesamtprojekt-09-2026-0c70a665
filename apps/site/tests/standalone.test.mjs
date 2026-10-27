import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

async function fixture(split){
 const root=await mkdtemp(join(tmpdir(),'nexify-standalone-'));
 await mkdir(join(root,'scripts'));await mkdir(join(root,'dist/assets'),{recursive:true});await mkdir(join(root,'dist/fonts'));
 
 await writeFile(join(root,'dist/index.html'),'<html><head><script type="module" src="/assets/entry.js"></script><link rel="stylesheet" href="/assets/site.css"></head><body></body></html>');
 await writeFile(join(root,'dist/assets/entry.js'),split?'import {ready} from "./shared.js";document.body.textContent=ready;':'document.body.textContent="ready";');
 if(split)await writeFile(join(root,'dist/assets/shared.js'),'export const ready="ready";');
 await writeFile(join(root,'dist/assets/site.css'),'body{display:block}');
 for(const f of ['portrait.png','signet.svg','fonts/geist-latin.woff2','fonts/geist-mono-latin.woff2'])await writeFile(join(root,'dist',f),'fixture');
 return root;
}
test('split standalone input fails before publishing an incomplete preview',async()=>{
 const root=await fixture(true);
 try{const result=spawnSync(process.execPath,[new URL('../scripts/build-standalone.mjs',import.meta.url).pathname,root],{encoding:'utf8'});assert.notEqual(result.status,0);await assert.rejects(readFile(join(root,'standalone/nexify-preview.html')));}
 finally{await rm(root,{recursive:true,force:true});}
});
test('self contained input retains offline CSP and preview mode',async()=>{
 const root=await fixture(false);
 try{const result=spawnSync(process.execPath,[new URL('../scripts/build-standalone.mjs',import.meta.url).pathname,root],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const html=await readFile(join(root,'standalone/nexify-preview.html'),'utf8');assert.match(html,/__NEXIFY_STANDALONE_PREVIEW__/);assert.match(html,/connect-src 'none'/);assert.doesNotMatch(html,/<script[^>]+src=/);}
 finally{await rm(root,{recursive:true,force:true});}
});

for(const [name,source]of[
 ['nested static chunk','import "./chunks/shared.mjs";'],
 ['external re-export','export {ready} from "./chunks/shared.mjs";'],
 ['dynamic literal chunk','const load=()=>import("./chunks/shared.mjs");'],
 ['computed dynamic chunk','const load=path=>import(path);'],
 ['bare module','import "external-package";'],
 ['invalid syntax','import {']
])test(`standalone rejects ${name} even with only one top-level JavaScript file`,async()=>{
 const root=await fixture(false);
 try{
  await mkdir(join(root,'dist/assets/chunks'));
  await writeFile(join(root,'dist/assets/chunks/shared.mjs'),'export const ready=true;');
  await writeFile(join(root,'dist/assets/entry.js'),source);
  const result=spawnSync(process.execPath,[new URL('../scripts/build-standalone.mjs',import.meta.url).pathname,root],{encoding:'utf8'});
  assert.notEqual(result.status,0);await assert.rejects(readFile(join(root,'standalone/nexify-preview.html')));
 }finally{await rm(root,{recursive:true,force:true});}
});
