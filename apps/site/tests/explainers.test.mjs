import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareExplainers,resolveExplainerReferences} from '../scripts/public-explainers.mjs';
const tr=value=>({de:value,nl:value,fr:value,en:value});
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
  delete media.captions.en;
  assert.equal(prepareExplainers(source,pages,inventory,{},checked)[0].modules[0].media.status,'published');
  assert.deepEqual(Object.keys(prepareExplainers(source,pages,inventory,{},checked)[0].modules[0].media.captions).sort(),['de','fr','nl']);
  for(const src of ['https://external.invalid/video.webm','/media/../private.webm','/media/%2e%2e/video.webm','/media/video.webm?token=secret']){
    media.src=src;assert.throws(()=>prepareExplainers(source,pages,inventory));
  }
  media.src='/media/intro.webm';delete media.captions.fr;assert.throws(()=>prepareExplainers(source,pages,inventory));
});
test('projection preserves all public explainer copy but excludes unrelated configuration',()=>{
  const source=fixture();source.server_secret='UNRELATED_SERVER_SENTINEL';source.pages[0].modules[0].private_note='PRIVATE_NOTE_SENTINEL';
  const result=prepareExplainers(source,pages,inventory);
  assert.deepEqual(result[0].modules[0].body,{de:'Ein erklärter Schritt.',nl:'Ein erklärter Schritt.',fr:'Ein erklärter Schritt.'});
  assert.equal(JSON.stringify(result).includes('SENTINEL'),false);
  assert.deepEqual(result[0].modules[0].source_refs,[]);
});

test('invented source references cannot pass the provenance gate',()=>{
  const source=fixture();source.pages[0].modules[0].source_refs=['DOES_NOT_EXIST_UNREVIEWED_SOURCE'];
  assert.throws(()=>prepareExplainers(source,pages,inventory),/provenance/);
  source.pages[0].modules[0].source_refs=['docs/09-final/01-produkt-und-marke.md'];
  assert.throws(()=>prepareExplainers(source,pages,new Map()),/provenance/);
});

test('four-locale canonical text and action labels are required without inventing legacy English',()=>{
  const canonical=pages.map(page=>({...page,sections:[{id:'benefit',heading:tr('Benefit'),body:tr('Body')}]}));
  for(const field of ['heading','body','label']){
    const source=fixture();source.pages[0].modules[0].content_ref={page_id:'home',section_id:'benefit'};
    const edited=structuredClone(canonical);
    delete (field==='label'?source.pages[0].modules[0].next_action.label:edited[0].sections[0][field]).en;
    assert.throws(()=>prepareExplainers(source,edited,inventory),/translation/);
  }
  const source=fixture();
  for(const module of source.pages.flatMap(page=>page.modules)){
    for(const field of ['title','body','outcome'])delete module[field].en;
    delete module.next_action.label.en;
  }
  const legacy=prepareExplainers(source,pages,inventory)[0].modules[0];
  assert.deepEqual(Object.keys(legacy.body),['de','nl','fr']);
  assert.equal(Object.hasOwn(legacy.body,'en'),false);
});

test('canonical section edits propagate to the explainer without duplicate scripts',()=>{
  const canonical=pages.map(page=>({...page,sections:[{id:'benefit',heading:tr('A specific benefit'),body:tr('Canonical customer copy.')}]}));
  const source=fixture();
  const module=source.pages[0].modules[0];
  module.content_ref={page_id:'home',section_id:'benefit'};
  delete module.title;delete module.body;delete module.outcome;
  let output=prepareExplainers(source,canonical,inventory)[0].modules[0];
  assert.deepEqual(output.body,tr('Canonical customer copy.'));
  assert.equal(output.content_section_id,'benefit');
  canonical[0].sections[0].body.en='An updated English paragraph.';
  output=prepareExplainers(source,canonical,inventory)[0].modules[0];
  assert.equal(output.body.en,'An updated English paragraph.');
  module.content_ref.section_id='missing';
  assert.throws(()=>prepareExplainers(source,canonical,inventory),/Missing canonical/);
  module.content_ref={page_id:'contact',section_id:'benefit'};
  assert.throws(()=>prepareExplainers(source,canonical,inventory),/Cross-page/);
});

test('reference resolution preserves metadata and media while propagating all four text locales',()=>{
  const source=fixture();source.pages[0].modules[0].content_ref={page_id:'home',section_id:'benefit'};
  const canonical=pages.map(page=>({...page,sections:[{id:'benefit',heading:tr('Heading'),body:tr('Body')}]}));
  const untouched=structuredClone(source.pages[1]);
  const resolved=resolveExplainerReferences(source,canonical);
  assert.deepEqual(resolved.pages[0].modules[0].body,tr('Body'));
  assert.deepEqual(resolved.pages[0].modules[0].media,source.pages[0].modules[0].media);
  assert.deepEqual(resolved.pages[1],untouched);
  assert.equal(Object.hasOwn(source.pages[0].modules[0],'content_section_id'),false);
  source.pages[0].modules[0].content_ref={page_id:'contact',section_id:'benefit'};
  assert.throws(()=>resolveExplainerReferences(source,canonical),/Cross-page/);
  source.pages[0].modules[0].content_ref={page_id:'home',section_id:'missing'};
  assert.throws(()=>resolveExplainerReferences(source,canonical),/Missing canonical/);
});

test('caption and verified module bindings remain independent of English customer text',()=>{
  const source=fixture();const module=source.pages[0].modules[0];
  module.content_ref={page_id:'home',section_id:'benefit'};
  const canonical=pages.map(page=>({...page,sections:[{id:'benefit',heading:tr('Heading'),body:tr('Body')}]}));
  module.media={status:'published',src:'/media/intro.webm',captions:{de:'/media/de.vtt',nl:'/media/nl.vtt',fr:'/media/fr.vtt'}};
  const checked={home:{orientation:Object.fromEntries(['de','nl','fr'].map(locale=>[locale,{locale,src:module.media.src,captionsSrc:module.media.captions[locale]}]))}};
  const output=prepareExplainers(source,canonical,inventory,{},checked)[0].modules[0];
  assert.equal(output.body.en,'Body');
  assert.equal(Object.hasOwn(output.media.captions,'en'),false);
  checked.home.orientation.fr.src='/media/other.webm';
  assert.throws(()=>prepareExplainers(source,canonical,inventory,{},checked),/verified asset binding/);
});

test('English renderer keeps untranslated source copy in German and marks its language without claiming English text',async()=>{
  const {readFileSync}=await import('node:fs');
  const {createRequire}=await import('node:module');
  const {runInNewContext}=await import('node:vm');
  const runtimeRequire=createRequire(process.env.NEXIFY_OVERLAY_REPO_ROOT ? process.env.NEXIFY_OVERLAY_REPO_ROOT+'/apps/site/package.json' : new URL('../package.json',import.meta.url));
  const ts=runtimeRequire('typescript');const React=runtimeRequire('react');const {renderToStaticMarkup}=runtimeRequire('react-dom/server');
  const code=readFileSync(new URL('../../web/components/ExplainerSections.tsx',import.meta.url),'utf8');
  const compiled=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  const fakeRequire=id=>{
    if(id==='./Workspace')return {useUI:()=>({locale:'en'})};
    if(id==='./Router')return {SiteLink:({children,...props})=>React.createElement('a',props,children)};
    if(id==='./PresenterVideo')return {__esModule:true,default:()=>React.createElement('video'),isPublicVideo:video=>Boolean(video)};
    if(id==='./PresenterScene')return {__esModule:true,default:({title})=>React.createElement('span',null,title)};
    if(id.endsWith('.css'))return {};
    return runtimeRequire(id);
  };
  runInNewContext(compiled,{module,exports:module.exports,require:fakeRequire});
  const Component=module.exports.default;
  const legacy={id:'legal',speaker:'aifly',title:{de:'Originaltitel'},body:{de:'Originaltext'},outcome:{de:'Originalschritt'},media_side:'left',media:{status:'asset_pending',src:null,captions:null},next_action:{type:'route',target_id:'contact',label:{de:'Originalkontakt'}},source_refs:[]};
  const html=renderToStaticMarkup(React.createElement(Component,{modules:[legacy],pages:[{id:'contact',path:'/kontakt'}],video:{},moduleVideos:{legal:{de:{}}}}));
  assert.match(html,/lang="de"/);assert.match(html,/German source version/);assert.match(html,/Originaltitel/);assert.match(html,/Originaltext/);assert.match(html,/Originalschritt/);assert.match(html,/Originalkontakt/);
  assert.doesNotMatch(html,/text on this page is available in English|accompanying explanatory text is in English/);
  const english=structuredClone(legacy);for(const field of ['title','body','outcome'])english[field].en='English '+field;english.next_action.label.en='English contact';
  const translated=renderToStaticMarkup(React.createElement(Component,{modules:[english],pages:[{id:'contact',path:'/kontakt'}]}));
  assert.match(translated,/English body/);assert.match(translated,/lang="en"/);assert.doesNotMatch(translated,/An English version is not provided/);
});
