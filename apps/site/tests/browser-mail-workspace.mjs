// Local shared UI -> loopback HTTP -> durable existing queue database. Synthetic only.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../../',import.meta.url));
const sources=['tools/mail_workspace.py','tools/mail_app_backend.py','tests/test_mail_workspace.py','tests/test_mail_app_backend.py','apps/web/components/MailWorkspacePanel.tsx','apps/web/components/MailWorkspacePanel.css','apps/web/app/intern/workspace/page.tsx','apps/web/app/api/internal/workspace/mail/route.ts','apps/web/proxy.ts','apps/site/tests/browser-mail-workspace.mjs','apps/site/tests/fixtures/mail-workspace-server.py','apps/site/tests/fixtures/mail-workspace.tsx','apps/site/tests/fixtures/mail-workspace.html'];
const hashes=async()=>Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(root+p)).digest('hex')])));
const before=await hashes();await mkdir(root+'.local/mail-workspace/browser',{recursive:true});
const child=spawn('python3',[root+'apps/site/tests/fixtures/mail-workspace-server.py'],{env:{PATH:process.env.PATH,LANG:'C.UTF-8'},stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',b=>stderr+=b);const lines=createInterface({input:child.stdout});
let timer;const startup=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('fixture start timeout')),15000);});
const fixture=JSON.parse(await Promise.race([once(lines,'line').then(([line])=>line),once(child,'exit').then(()=>{throw Error('fixture exit: '+stderr)}),startup]).finally(()=>clearTimeout(timer)));
assert.equal(fixture.synthetic,true);const backend='http://127.0.0.1:'+fixture.port;
const server=await createServer({root:root+'apps/site',server:{port:0,strictPort:false,hmr:false,proxy:{'/api':backend}}});await server.listen();
const origin='http://127.0.0.1:'+server.httpServer.address().port,browser=await chromium.launch({headless:true}),checks=[],external=[],errors=[];
const w={de:{reload:'Neu laden',reply:'Antworten',all:'Allen antworten',forward:'Weiterleiten',prepare:'Lokal vorbereiten',ready:'Lokal vorbereitet. Kein Versand erfolgt.',send:'Versand nicht verfügbar',read:'Lokal als gelesen markieren',unread:'Lokal als ungelesen markieren',archive:'Lokal archivieren',undo:'Lokale Archivierung aufheben',done:'Lokale Aufgabe abschließen',open:'Lokale Aufgabe öffnen',failed:'Vorbereitung fehlgeschlagen.',missing:'Mail-Arbeitsplatz nicht verbunden',denied:'Kein Zugriff',invalid:'Unbekanntes oder ungültiges'},nl:{reload:'Opnieuw laden',reply:'Antwoorden',all:'Allen antwoorden',forward:'Doorsturen',prepare:'Lokaal voorbereiden',ready:'Lokaal voorbereid. Niet verzonden.',send:'Verzending niet beschikbaar',read:'Lokaal als gelezen markeren',unread:'Lokaal als ongelezen markeren',archive:'Lokaal archiveren',undo:'Lokale archivering opheffen',done:'Lokale taak afronden',open:'Lokale taak openen',failed:'Voorbereiden mislukt.',missing:'Mailwerkplek niet verbonden',denied:'Geen toegang',invalid:'Onbekend of ongeldig'},fr:{reload:'Actualiser',reply:'Répondre',all:'Répondre à tous',forward:'Transférer',prepare:'Préparer localement',ready:'Préparé localement. Aucun envoi effectué.',send:'Envoi indisponible',read:'Marquer comme lu localement',unread:'Marquer comme non lu localement',archive:'Archiver localement',undo:'Annuler l’archivage local',done:'Terminer la tâche locale',open:'Ouvrir la tâche locale',failed:'Échec de la préparation.',missing:'Messagerie non connectée',denied:'Accès à la messagerie refusé',invalid:'Format de réponse inconnu'}};
try{
 for(const width of [320,1280])for(const locale of ['de','nl','fr']){
  const context=await browser.newContext({viewport:{width,height:950}}),t=w[locale];await context.addInitScript(l=>localStorage.setItem('nexify-locale',l),locale);await context.addCookies([{name:'mail_fixture',value:'reader',url:origin}]);
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/')&&u.pathname!=='/api/internal/workspace/mail')return r.fulfill({status:503,json:{error:'synthetic_unavailable'}});return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.name));const panel=page.locator('.mail-workspace');
  async function select(){await panel.locator('#mail-account').waitFor();await panel.locator('.mail-message-list button').first().click();await panel.locator('.mail-message').waitFor();}
  async function reload(){await panel.getByRole('button',{name:t.reload,exact:true}).click();await panel.locator('#mail-account').waitFor();}
  try{
   await page.goto(origin+'/tests/fixtures/mail-workspace.html');if(await page.locator('#aifly-panel').isVisible())await page.locator('.panel-heading .icon-button').click();await select();
   assert.equal(await panel.locator('#mail-account option').count(),2);assert.equal(await panel.locator('img,iframe,script,a[download]').count(),0);assert.match(await panel.locator('.mail-message .mail-plain-text').innerText(),/https:\/\/example.invalid\/tracker/);
   await panel.getByRole('button',{name:t.reply,exact:true}).click();assert.equal(await panel.locator('#mail-to').inputValue(),'reply@example.invalid');
   await panel.getByRole('button',{name:t.all,exact:true}).click();assert.equal(await panel.locator('#mail-to').inputValue(),'reply@example.invalid');assert.equal(await panel.locator('#mail-cc').inputValue(),'colleague@example.invalid');
   await panel.getByRole('button',{name:t.forward,exact:true}).click();assert.equal(await panel.locator('#mail-to').inputValue(),'');assert.match(await panel.locator('#mail-text').inputValue(),/Synthetic local conversation/);
   await panel.getByRole('button',{name:t.reply,exact:true}).click();await panel.locator('#mail-text').fill('Synthetic draft '+width+' '+locale);await panel.locator('#mail-signature_html').fill('<img src="https://example.invalid/signature">');
   const countBefore=(await fetch(backend+'/fixture-snapshot').then(r=>r.json())).outbox.length;
   // First response is lost after the server has committed: same-key retry must read back one draft.
   let lost=true;await page.route('**/api/internal/workspace/mail',async r=>{if(r.request().method()==='POST'&&lost){lost=false;await r.fetch();return r.abort('failed');}return r.continue();});
   await panel.getByRole('button',{name:t.prepare,exact:true}).click();await panel.getByRole('status').filter({hasText:t.failed}).waitFor();await panel.getByRole('button',{name:t.prepare,exact:true}).click();await panel.getByRole('status').filter({hasText:t.ready}).waitFor();
   await panel.getByRole('button',{name:t.prepare,exact:true}).dblclick();await panel.getByRole('status').filter({hasText:t.ready}).waitFor();await page.unroute('**/api/internal/workspace/mail');
   const snapshot=await fetch(backend+'/fixture-snapshot').then(r=>r.json());assert.equal(snapshot.outbox.length,countBefore+1);const last=snapshot.outbox.at(-1);assert.equal(last.provider,'gmail');assert.equal(last.sender,'operator@example.invalid');assert.equal(last.state,'prepared');assert.equal(last.send_status,'unavailable');assert.match(last.signature_html,/^<img/);
   assert.equal(await panel.getByRole('button',{name:t.send,exact:true}).isDisabled(),true);assert.equal(await panel.locator('img').count(),0);
   // Local read/task/archive remain independent, and archive is undoable.
   if(await panel.getByRole('button',{name:t.unread,exact:true}).count())await panel.getByRole('button',{name:t.unread,exact:true}).click();
   await panel.getByRole('button',{name:t.read,exact:true}).click();await panel.getByRole('button',{name:t.unread,exact:true}).waitFor();
   if(await panel.getByRole('button',{name:t.open,exact:true}).count())await panel.getByRole('button',{name:t.open,exact:true}).click();
   assert.equal(await panel.getByRole('button',{name:t.done,exact:true}).count(),1);
   await panel.getByRole('button',{name:t.archive,exact:true}).click();await panel.getByRole('button',{name:t.undo,exact:true}).waitFor();await panel.getByRole('button',{name:t.undo,exact:true}).click();await panel.getByRole('button',{name:t.archive,exact:true}).waitFor();
   await panel.locator('#mail-account').selectOption('hostinger:mailbox-1');assert.equal(await panel.locator('.mail-composer').count(),0);await select();await panel.getByRole('button',{name:t.reply,exact:true}).click();assert.match(await panel.locator('.mail-composer').innerText(),/Hostinger/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   const touch=await panel.getByRole('button',{name:t.prepare,exact:true}).boundingBox();assert.ok(touch.height>=44&&touch.width>=44);
   await panel.locator('#mail-to').focus();await page.keyboard.press('Tab');assert.equal(await panel.locator('#mail-cc').evaluate(e=>e===document.activeElement),true);
   await page.screenshot({path:root+'.local/mail-workspace/browser/'+width+'-'+locale+'.png',fullPage:true});
   await page.reload();await select();assert.equal(await panel.locator('.mail-composer').count(),0);
   await panel.locator('#mail-saved').selectOption(last.id);assert.match(await panel.locator('.mail-saved').innerText(),new RegExp('Synthetic draft '+width+' '+locale));
   assert.match(await panel.locator('.mail-saved').innerText(),/reply@example.invalid/);
   assert.match(await panel.locator('.mail-saved').innerText(),/https:\/\/example.invalid\/signature/);
   assert.equal(await panel.locator('.mail-saved img').count(),0);
   if(width===320&&locale==='de'){
    // Unsupported send states must not be represented as a prepared/no-send result.
    const current=await fetch(backend+'/fixture-snapshot').then(r=>r.json());
    for(const badState of ['unknown','sent',null]){
     const malformed=structuredClone(current);malformed.outbox[0].send_status=badState;
     await page.route('**/api/internal/workspace/mail',r=>r.fulfill({status:200,json:malformed}));
     await panel.getByRole('button',{name:t.reload,exact:true}).click();await panel.getByRole('status').filter({hasText:t.invalid}).waitFor();
     assert.equal(await panel.locator('.mail-saved').count(),0);await page.unroute('**/api/internal/workspace/mail');
    }
    for(const field of ['task_status','classification','coverage','mode']){
     const malformed=structuredClone(current);
     if(field==='task_status')malformed.mailboxes[0].messages[0].task_status=['done'];
     if(field==='classification')malformed.mailboxes[0].messages[0].provider_metadata.classification=['unknown'];
     if(field==='coverage')malformed.mailboxes[0].sync.coverage=['complete'];
     if(field==='mode')malformed.outbox[0].mode=['reply'];
     await page.route('**/api/internal/workspace/mail',r=>r.fulfill({status:200,json:malformed}));
     await panel.getByRole('button',{name:t.reload,exact:true}).click();await panel.getByRole('status').filter({hasText:t.invalid}).waitFor();
     await page.unroute('**/api/internal/workspace/mail');
    }
    await reload();await select();await panel.getByRole('button',{name:t.reply,exact:true}).click();await panel.locator('#mail-text').fill('Synthetic request binding check');
    await page.route('**/api/internal/workspace/mail',async r=>{if(r.request().method()!=='POST')return r.continue();const response=await r.fetch();const value=await response.json();value.outbox.message_id='unrequested-message';return r.fulfill({status:200,json:value});});
    await panel.getByRole('button',{name:t.prepare,exact:true}).click();await panel.getByRole('status').filter({hasText:t.failed}).waitFor();await page.unroute('**/api/internal/workspace/mail');
    // A late completed POST may persist its old draft, but must never update the new account's UI.
    await panel.locator('#mail-text').fill('Synthetic delayed response');let started;const requested=new Promise(resolve=>{started=resolve;});
    await page.route('**/api/internal/workspace/mail',async r=>{if(r.request().method()!=='POST')return r.continue();const response=await r.fetch();started();await new Promise(resolve=>setTimeout(resolve,150));try{await r.fulfill({response});}catch{/* aborted selection owns cancellation */}});
    await panel.getByRole('button',{name:t.prepare,exact:true}).click();await requested;await panel.locator('#mail-account').selectOption('hostinger:mailbox-1');await new Promise(resolve=>setTimeout(resolve,200));
    assert.equal(await panel.locator('.mail-composer').count(),0);assert.equal(await panel.getByRole('status').filter({hasText:t.ready}).count(),0);await page.unroute('**/api/internal/workspace/mail');
   }
   for(const token of ['foreign','forbidden','expired','revoked','absent']){await context.addCookies([{name:'mail_fixture',value:token,url:origin}]);await panel.getByRole('button',{name:t.reload,exact:true}).click();await panel.getByRole('status').filter({hasText:t.denied}).waitFor();assert.equal(await panel.locator('#mail-account').count(),0);}
   await context.addCookies([{name:'mail_fixture',value:'reader',url:origin}]);
   await page.route('**/api/internal/workspace/mail',r=>r.fulfill({status:503,json:{error:'synthetic_unbound'}}));await panel.getByRole('button',{name:t.reload,exact:true}).click();await panel.getByRole('status').filter({hasText:t.missing}).waitFor();assert.equal(await panel.locator('.mail-message').count(),0);await page.unroute('**/api/internal/workspace/mail');
   await page.route('**/api/internal/workspace/mail',r=>r.fulfill({status:200,json:{schema_version:'unknown'}}));await panel.getByRole('button',{name:t.reload,exact:true}).click();await panel.getByRole('status').filter({hasText:t.invalid}).waitFor();await page.unroute('**/api/internal/workspace/mail');
   checks.push({width,locale,provider_separation:true,reply_all_forward:true,text_html_inert:true,timeout_readback_idempotent:true,doubleclick:true,local_read_not_done:true,archive_undo:true,reload_and_saved_draft_readback:true,negative_sessions:5,unbound_and_invalid:true,keyboard:true,no_overflow:true,touch44:true});
  }finally{await context.close();}
 }
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 await writeFile(root+'.local/mail-workspace/browser/report.json',JSON.stringify({schema_version:1,scope:'local shared mail UI -> synthetic trusted HTTP session -> persistent existing database;not real connectors or sending',checks,external,errors,source_sha256:before,passed:true},null,2)+'\n');console.log(JSON.stringify({passed:true,views:checks.length,negative_sessions:checks.length*5,external:external.length,errors:errors.length}));
}finally{await browser.close();await server.close();child.kill('SIGTERM');if(child.exitCode===null)await once(child,'exit');lines.close();}
