import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {preparePublicData} from '../scripts/generate-public-data.mjs';
const root=new URL('../../../',import.meta.url),read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(read(p));
const legal=json('config/legal-public-documents.json'),map=json('config/site-map.json');
test('ten complete original public texts retain byte/hash provenance',()=>{
 const manifest=json('docs/sources/legal-public-2026-10-28/manifest.json');assert.equal(manifest.length,10);assert.equal(legal.documents.length,10);
 for(const source of manifest){const bytes=read('docs/sources/legal-public-2026-10-28/'+source.filename);assert.equal(bytes.length,source.main_text_bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),source.text_sha256);assert.equal(new URL(source.url).origin,'https://www.nexifyai.cloud');const doc=legal.documents.find(d=>d.source.filename===source.filename);assert.deepEqual(doc.source,source);assert.equal(doc.legal_review,'pending');for(const section of doc.sections)if(section.adaptation==='unchanged_source')assert.ok(bytes.toString().includes(section.body));}
});
test('current adopted operator replaces the BV placeholder without claiming registry or lawyer verification',()=>{
 assert.equal(legal.operator.owner,'Pascal Courbois');assert.equal(legal.operator.independent_register_check,false);assert.match(legal.operator.legal_form,/Eenmanszaak/);assert.equal(map.operator_context.legal_review,'pending');
 const imprint=map.pages.find(p=>p.id==='imprint');const body=JSON.stringify(imprint);for(const value of ['90483944','NL865786276B01','5921 JA Venlo'])assert.ok(body.includes(value));assert.doesNotMatch(body,/bestätigte B.V.-Profil/);
});
test('all source documents are reachable in existing public legal routes, preserving German originals',()=>{
 assert.equal(new Set(Object.values(legal.route_mapping)).size,6);
 for(const doc of legal.documents){const page=map.pages.find(p=>p.id===legal.route_mapping[doc.id]);assert.ok(map.public_allowlist.includes(page.id));assert.equal(page.access.auth_required,false);assert.equal(page.legal_review,'pending');if(doc.id==='recht'){assert.ok(page.next_actions.length>=5);continue;}for(const section of doc.sections){const projected=page.sections.find(s=>s.id===doc.id+'-'+section.source_section);assert.ok(projected,doc.id+section.source_section);assert.equal(projected.body_locale,'de');for(const locale of ['de','nl','fr'])assert.equal(projected.body[locale],section.body);}}
});
test('adapted technical disclosures do not claim legacy authentication, free AI, fixed tariffs or legal approval',()=>{
 const docs=Object.fromEntries(legal.documents.map(d=>[d.id,d]));const text=id=>docs[id].sections.map(s=>s.body).join('\n');assert.match(text('datenschutz'),/Vercel/);assert.match(text('datenschutz'),/standardmäßig aus/);assert.match(text('datenschutz'),/IP-Adresse/);assert.match(text('cookie-richtlinie'),/nexify-locale/);assert.match(text('ki-transparenz'),/ohne Live-KI/);assert.doesNotMatch(text('agb'),/449/);assert.equal(legal.automatic_legal_translation,false);assert.equal(legal.normative_rules_added,false);
 assert.equal(map.pages.find(p=>p.id==='tk-legal').site_context,'teileklar');assert.ok(JSON.stringify(map.pages.find(p=>p.id==='contact').contact_channels).includes('mail@nexifyai.cloud'));assert.ok(map.pages.find(p=>p.id==='contact').contact_channels.some(c=>c.address==='hello@nexifyai.cloud'));assert.ok(map.pages.filter(p=>p.id!=='contact').every(p=>!p.contact_channels?.length));
});

test('legal language annotation projects only the explicit German original and rejects unsupported declarations',()=>{
 const result=preparePublicData(map);assert.equal(result.pages.length,36);
 assert.equal(result.pages.find(p=>p.id==='privacy').sections[1].bodyLocale,'de');
 const invalid=structuredClone(map);invalid.pages.find(p=>p.id==='privacy').sections[1].body_locale='nl';
 assert.throws(()=>preparePublicData(invalid),/Unsupported original legal language/);
});
