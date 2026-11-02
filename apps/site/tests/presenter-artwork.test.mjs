import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {verifyPresenterArtwork} from '../scripts/presenter-artwork.mjs';

const registry=JSON.parse(await readFile(new URL('../../../config/presenter-artwork.json',import.meta.url),'utf8'));
const root=fileURLToPath(new URL('../../web/public/',import.meta.url));
test('published character derivatives and preserved originals match their exact hash bindings',async()=>{
 await verifyPresenterArtwork(registry,root);
});
test('source drift, outside paths and invalid image dimensions fail before publication',async()=>{
 for(const change of [image=>image.sha256='0'.repeat(64),image=>image.source_sha256='0'.repeat(64),image=>image.src='/media/atelier/presenters/../../private.webp',image=>image.width=0,image=>image.width=9999,image=>image.height=9999]){
  const copy=structuredClone(registry);change(copy.images.pascal);
  await assert.rejects(verifyPresenterArtwork(copy,root));
 }
});
