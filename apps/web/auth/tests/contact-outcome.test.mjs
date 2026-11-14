import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONTACT_ADDRESS,contactMailHref,requestNotStored} from '../../lib/contact-outcome.mjs';
import {contactCopy} from '../../lib/contact-copy.ts';

const root=new URL('../../../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('only a refusal before any handler counts as not stored',()=>{
  // Wortlaut des Laufzeit-Gates: apps/shop-api/vercel_app.py `unavailable`, geprüft in apps/shop-api/tests/test_vercel_adapter.py.
  assert.equal(requestNotStored({status:503,error:'runtime_binding_unavailable',body:{reason:'payment_mode_unbound'}}),true);
  assert.equal(requestNotStored({status:403,error:'origin_rejected'}),true);
  for(const uncertain of [
    {status:503,error:'request_readback_unavailable'},
    {status:503,error:'request_failed'},
    {status:500,error:'runtime_binding_unavailable'},
    {status:200,error:'invalid_json_response'},
    {status:429,error:'rate_limited'},
    new Error('unconfirmed_request'),
    new DOMException('aborted','AbortError'),
    new TypeError('Failed to fetch'),
    null,undefined,'runtime_binding_unavailable',
  ]) assert.equal(requestNotStored(uncertain),false,JSON.stringify(uncertain));
});

test('the gate wording in the shop service is the one the form recognises',()=>{
  const gate=read('apps/shop-api/vercel_app.py');
  assert.match(gate,/JSONResponse\(\{"detail": \{"error": "runtime_binding_unavailable", "reason": code\}, "available": False\}, status_code=503/);
  assert.match(gate,/\{"detail": \{"error": "origin_rejected"\}\}, status_code=403/);
});

test('the fallback address is the email channel of the contact page in the site map',()=>{
  const contact=JSON.parse(read('config/site-map.json')).pages.find(page=>page.path==='/kontakt');
  const channels=contact.contact_channels.filter(channel=>channel.type==='email');
  assert.equal(channels.length,1);
  assert.equal(CONTACT_ADDRESS,channels[0].address);
});

test('the mail link carries the entered details and nothing else',()=>{
  const href=contactMailHref('Anfrage über das Kontaktformular',[['Name','Ada Beispiel'],['E-Mail','ada@example.invalid'],['Unternehmen','  '],['','Zeile eins\nZeile zwei & mehr?']]);
  const url=new URL(href);
  assert.equal(url.protocol,'mailto:');
  assert.equal(url.pathname,CONTACT_ADDRESS);
  assert.deepEqual([...url.searchParams.keys()],['subject','body']);
  assert.equal(url.searchParams.get('subject'),'Anfrage über das Kontaktformular');
  assert.equal(url.searchParams.get('body'),'Name: Ada Beispiel\nE-Mail: ada@example.invalid\nZeile eins\nZeile zwei & mehr?');
  assert.doesNotMatch(href,/[\s&]cc=|[\s&]bcc=|[\s&]to=/);
  assert.ok(contactMailHref('s',[['','x'.repeat(4000)]]).length<1700,'long text stays within a usable link length');
});

test('all four languages say plainly that nothing was sent and name the mail route',()=>{
  const keys=Object.keys(contactCopy.de).sort();
  for(const locale of ['de','nl','fr','en']){
    const copy=contactCopy[locale];
    assert.deepEqual(Object.keys(copy).sort(),keys,'same keys '+locale);
    assert.ok(copy.unavailable.length>80&&copy.mailSubject.length>8,locale);
    assert.notEqual(copy.unavailable,copy.failure);
    assert.match(copy.unavailable,/e-?mail/i,locale);
  }
  assert.match(contactCopy.de.unavailable,/nicht gesendet und nicht gespeichert/);
  assert.match(contactCopy.nl.unavailable,/niet verzonden en niet opgeslagen/);
  assert.match(contactCopy.fr.unavailable,/ni envoyée ni enregistrée/);
  assert.match(contactCopy.en.unavailable,/not sent and not stored/);
  // Der ungewisse Ausgang behält seinen Wortlaut: dort kann die Anfrage eingegangen sein.
  assert.match(contactCopy.de.failure,/kann bereits eingegangen sein/);
});

test('the form shows success only for a confirmed receipt and routes a refusal to the mail fallback',()=>{
  const form=read('apps/web/components/ContactRequestForm.tsx');
  assert.match(form,/if\(typeof result\.number!=='string'\|\|!\/\^NX-\[A-Z0-9-\]\{8,\}\$\/\.test\(result\.number\)\|\|result\.status!=='eingegangen'\)throw new Error\('unconfirmed_request'\)/);
  assert.equal(form.match(/setNumber\(/g).length,1,'success state is set in exactly one place');
  assert.ok(form.indexOf('if(requestNotStored(err))')<form.indexOf('else if(err.fields)'),'refusal is handled before field errors');
  assert.match(form,/if\(requestNotStored\(err\)\)\{attempt\.current=null;try\{sessionStorage\.removeItem\(storageKey\);\}/,'a refused attempt is discarded so changed details can be sent later');
  assert.match(form,/setMailHref\(contactMailHref\(text\.mailSubject,/);
  assert.match(form,/setFailure\(text\.unavailable\)/);
  assert.match(form,/data-testid="contact-error" data-reason=\{mailHref\?'unavailable':'unconfirmed'\}/);
  assert.match(form,/href=\{mailHref\|\|'mailto:'\+CONTACT_ADDRESS\} data-testid="contact-email-fallback"/);
  assert.doesNotMatch(form,/mailto:mail@/,'no second copy of the address in the component');
});
