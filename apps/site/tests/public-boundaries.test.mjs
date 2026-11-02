import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePublicData} from '../scripts/generate-public-data.mjs';
import {routePath,interceptNavigation} from '../src/router-state.mjs';
const localized=value=>({de:value,nl:value,fr:value,en:value});
const page=(id,path,extra={})=>({id,path,title:localized(id),summary:localized('Public summary'),site_context:'nexify',access:{visibility:'public',auth_required:false},sections:[],next_actions:[],...extra});
function fixture(){return{public_allowlist:['home','contact'],pages:[page('home','/'),page('contact','/kontakt'),page('private-customer','/customer-private-route',{access:{visibility:'private',auth_required:true},summary:localized('PRIVATE_PAYLOAD_SENTINEL')})],site_contexts:{nexify:{navigation:['home','contact','private-customer']}}};}

test('missing English is rejected rather than replaced with German customer text',()=>{
 const source=fixture();delete source.pages[0].summary.en;
 assert.throws(()=>preparePublicData(source),/Invalid public localization/);
});

test('protected fields never cross the public build boundary',()=>{
 const source=fixture();source.pages[0].secret='UNRELATED_SECRET_SENTINEL';source.pages[0].roles=['admin'];source.public_allowlist.push('private-customer');
 const output=preparePublicData(source);assert.equal(output.pages.length,2);const serialized=JSON.stringify(output);
 for(const forbidden of ['PRIVATE_PAYLOAD_SENTINEL','UNRELATED_SECRET_SENTINEL','private-customer','customer-private-route','admin'])assert.equal(serialized.includes(forbidden),false);
});
test('missing explicit authentication false is excluded',()=>{const source=fixture();delete source.pages[1].access.auth_required;assert.deepEqual(preparePublicData(source).pages.map(p=>p.id),['home']);});
test('unknown and private action targets fail rather than silently redirect',()=>{
 for(const target of ['private-customer','missing-target']){const source=fixture();source.pages[0].next_actions=[{type:'route',target_id:target,label:localized('Continue')}];assert.throws(()=>preparePublicData(source),/action target/);}
 const source=fixture();source.pages[0].next_actions=[{type:'execute',target_id:'contact',label:localized('Execute')}];assert.throws(()=>preparePublicData(source),/action target/);
});
test('route redirects and duplicate paths are rejected',()=>{
 const source=fixture();source.pages[1].path='//evil.invalid';assert.throws(()=>preparePublicData(source),/public route/);
 source.pages[1].path='/';assert.throws(()=>preparePublicData(source),/Duplicate/);
});
test('contact channels exclude encoded headers and arbitrary schemes',()=>{
 const source=fixture();source.pages[1].contact_channels=[{type:'email',address:'mail@nexifyai.cloud',label:localized('Email')},{type:'email',address:'mail@example.invalid\r\nBcc:secret',label:localized('Bad')},{type:'email',address:'mail@example.invalid?subject=private',label:localized('Bad')},{type:'url',address:'javascript:alert(1)',label:localized('Bad')}];
 assert.deepEqual(preparePublicData(source).pages[1].contact_channels.map(c=>c.address),['mail@nexifyai.cloud']);
});
test('portable route parser accepts normal and file hash navigation without unsafe decoding',()=>{
 assert.equal(routePath({pathname:'/leistungen/websites',hash:''}),'/leistungen/websites');
 assert.equal(routePath({pathname:'/download/preview.html',hash:'#/teileklar'},true),'/teileklar');
 for(const path of ['//evil.invalid','/%255cfoo','/\\evil.invalid','/a/../secret','/%00'])assert.equal(routePath({pathname:path,hash:''}),null);
});
test('only ordinary same-origin primary clicks are intercepted',()=>{
 const click={button:0,defaultPrevented:false,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false};
 assert.equal(interceptNavigation('/kontakt',click,'https://nexify.example'),true);
 for(const [href,event]of[['mailto:mail@nexifyai.cloud',click],['https://external.invalid',click],['/kontakt',{...click,ctrlKey:true}],['/kontakt',{...click,download:true}],['/kontakt',{...click,target:'_blank'}]])assert.equal(interceptNavigation(href,event,'https://nexify.example'),false);
});
