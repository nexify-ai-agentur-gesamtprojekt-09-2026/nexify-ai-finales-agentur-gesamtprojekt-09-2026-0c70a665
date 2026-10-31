import test from 'node:test';
import assert from 'node:assert/strict';
import {frameHeaders,PREVIEW_FRAME_ANCESTORS} from '../../frame-headers.mjs';

test('without the preview flag the frame policy stays X-Frame-Options DENY',()=>{
 assert.deepEqual(frameHeaders({}),[{key:'X-Frame-Options',value:'DENY'}]);
 assert.deepEqual(frameHeaders({ALLOW_EMERGENT_PREVIEW_FRAME:'true'}),[{key:'X-Frame-Options',value:'DENY'}]);
});

test('flag on in the preview pod sends frame-ancestors and no X-Frame-Options',()=>{
 const headers=frameHeaders({ALLOW_EMERGENT_PREVIEW_FRAME:'1'});
 assert.deepEqual(headers,[{key:'Content-Security-Policy',value:PREVIEW_FRAME_ANCESTORS}]);
 assert.ok(!headers.some(h=>h.key==='X-Frame-Options'));
 assert.doesNotMatch(PREVIEW_FRAME_ANCESTORS,/\*(?!\.)|https?:\/\/\*\s|http:/);
});

test('Vercel never honours the preview flag',()=>{
 assert.deepEqual(frameHeaders({ALLOW_EMERGENT_PREVIEW_FRAME:'1',VERCEL:'1'}),[{key:'X-Frame-Options',value:'DENY'}]);
 assert.deepEqual(frameHeaders({ALLOW_EMERGENT_PREVIEW_FRAME:'1',VERCEL_ENV:'production'}),[{key:'X-Frame-Options',value:'DENY'}]);
});
