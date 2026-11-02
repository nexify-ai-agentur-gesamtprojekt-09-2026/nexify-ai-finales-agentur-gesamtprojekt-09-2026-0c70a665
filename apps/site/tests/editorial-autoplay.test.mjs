import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('../../web/lib/editorial-autoplay.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {autoStartEditorialVideo}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('audible autoplay remains audible when the browser permits it',async()=>{
 const attempts=[];const video={muted:true,async play(){attempts.push(this.muted);}};
 assert.deepEqual(await autoStartEditorialVideo(video,true),{playing:true,muted:false});assert.deepEqual(attempts,[false]);
});
test('audible rejection gets exactly one muted fallback',async()=>{
 const attempts=[];const video={muted:true,async play(){attempts.push(this.muted);if(!this.muted)throw new Error('NotAllowedError');}};
 assert.deepEqual(await autoStartEditorialVideo(video,true),{playing:true,muted:true});assert.deepEqual(attempts,[false,true]);
});
test('two rejected attempts preserve the manual playback state',async()=>{
 let attempts=0;const video={muted:true,async play(){attempts++;throw new Error('NotAllowedError');}};
 assert.deepEqual(await autoStartEditorialVideo(video,true),{playing:false,muted:true});assert.equal(attempts,2);
});
test('silent editorial footage makes only a muted attempt',async()=>{
 const attempts=[];const video={muted:false,async play(){attempts.push(this.muted);}};
 assert.deepEqual(await autoStartEditorialVideo(video,false),{playing:true,muted:true});assert.deepEqual(attempts,[true]);
});
