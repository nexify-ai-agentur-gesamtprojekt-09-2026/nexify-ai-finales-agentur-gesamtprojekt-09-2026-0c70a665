import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareExplainers} from '../scripts/public-explainers.mjs';
const tr=value=>({de:value,nl:value,fr:value});
const pages=[{id:'home'},{id:'contact'}];
const inventory=new Map([['docs/09-final/01-produkt-und-marke.md','a'.repeat(64)]]);
function fixture(){return {schema_version:1,pages:pages.map(page=>({page_id:page.id,modules:[{id:'orientation',speaker:'aifly',title:tr('Orientierung'),body:tr('Ein erklärter Schritt.'),outcome:tr('Kontakt aufnehmen.'),media_side:'left',media:{src:null,captions:null,status:'asset_pending'},next_action:{type:'route',target_id:'contact',label:tr('Kontakt')},source_refs:['docs/09-final/01-produkt-und-marke.md']}]}))};}

test('all public pages must be represented without private or duplicate page entries',()=>{
  for(const change of [s=>s.pages.pop(),s=>{s.pages[1].page_id='private-admin';},s=>{s.pages[1].page_id='home';}]){
    const source=fixture();change(source);assert.throws(()=>prepareExplainers(source,pages,inventory));
  }
});
test('private action targets and invented playable pending assets are rejected',()=>{
  for(const change of [m=>{m.next_action.target_id='private-admin';},m=>{m.media.src='/media/not-yet-created.webm';},m=>{m.media_side='arbitrary';}]){
    const source=fixture();change(source.pages[0].modules[0]);assert.throws(()=>prepareExplainers(source,pages,inventory));
  }
});
test('published videos need canonical own-origin video paths and every caption locale',()=>{
  const source=fixture();const media=source.pages[0].modules[0].media;
  Object.assign(media,{status:'published',src:'/media/intro.webm',captions:tr('/media/intro.vtt')});
  assert.throws(()=>prepareExplainers(source,pages,inventory),/verified asset binding/);
  const routeOnly={home:Object.fromEntries(['de','nl','fr'].map(locale=>[locale,{locale,src:media.src,captionsSrc:media.captions[locale]}]))};
  assert.throws(()=>prepareExplainers(source,pages,inventory,routeOnly),/verified asset binding/);
  const checked={home:{orientation:Object.fromEntries(['de','nl','fr'].map(locale=>[locale,{locale,src:media.src,captionsSrc:media.captions[locale]}]))}};
  assert.equal(prepareExplainers(source,pages,inventory,{},checked)[0].modules[0].media.status,'published');
  for(const src of ['https://external.invalid/video.webm','/media/../private.webm','/media/%2e%2e/video.webm','/media/video.webm?token=secret']){
    media.src=src;assert.throws(()=>prepareExplainers(source,pages,inventory));
  }
  media.src='/media/intro.webm';delete media.captions.fr;assert.throws(()=>prepareExplainers(source,pages,inventory));
});
test('projection preserves all public explainer copy but excludes unrelated configuration',()=>{
  const source=fixture();source.server_secret='UNRELATED_SERVER_SENTINEL';source.pages[0].modules[0].private_note='PRIVATE_NOTE_SENTINEL';
  const result=prepareExplainers(source,pages,inventory);
  assert.deepEqual(result[0].modules[0].body,tr('Ein erklärter Schritt.'));
  assert.equal(JSON.stringify(result).includes('SENTINEL'),false);
  assert.deepEqual(result[0].modules[0].source_refs,[]);
});

test('invented source references cannot pass the provenance gate',()=>{
  const source=fixture();source.pages[0].modules[0].source_refs=['DOES_NOT_EXIST_UNREVIEWED_SOURCE'];
  assert.throws(()=>prepareExplainers(source,pages,inventory),/provenance/);
  source.pages[0].modules[0].source_refs=['docs/09-final/01-produkt-und-marke.md'];
  assert.throws(()=>prepareExplainers(source,pages,new Map()),/provenance/);
});
