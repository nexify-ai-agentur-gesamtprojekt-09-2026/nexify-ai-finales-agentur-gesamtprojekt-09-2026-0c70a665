// Real shared footer in optimized local output; no mail, login or provider calls.
import assert from 'node:assert/strict';
import {preview} from 'vite';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=fileURLToPath(new URL('../../../',import.meta.url)),root=repo+'apps/site/';
const sources=['apps/web/components/SiteFooter.tsx','apps/web/components/WorkspaceRebuild.css','config/site-map.json','apps/site/tests/browser-legal-footer.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(repo+p)).digest('hex')])));
const before=await hashes(),data=JSON.parse(await readFile(root+'.generated/public-site.json','utf8'));
const externalOrigin=process.env.LOCAL_FOOTER_ORIGIN;
// Sprachwahl heute: serverseitig per ?lang= (apps/web/proxy.ts, seit 5222298; nexify-locale wird nicht mehr gelesen, OF-12).
// Der Next-Renderer liefert de/nl/fr; das Vite-SPA (apps/site) kennt nur Deutsch und wird entsprechend nur in de geprueft.
const locales=externalOrigin?['de','nl','fr']:['de'],suffix=l=>l==='de'?'':'?lang='+l;
// Der TEILEKLAR-Shop ist deutschsprachiger Markt: proxy.ts erzwingt dort lang=de, auch bei ?lang=nl|fr (WCAG 3.1.1). Geprueft wird
// daher fuer /teileklar* die tatsaechlich gezeigte Sprache (de), waehrend die Anfrage weiterhin mit der Zielsprache gestellt wird.
const germanOnly=p=>p==='/teileklar'||p.startsWith('/teileklar/');
if(externalOrigin)assert.ok(['127.0.0.1','localhost'].includes(new URL(externalOrigin).hostname),'local servers only');
const server=externalOrigin?null:await preview({root,preview:{host:'127.0.0.1',port:0,strictPort:false}});
const origin=externalOrigin||'http://127.0.0.1:'+server.httpServer.address().port;
const out=repo+'.local/legal-footer/';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),external=[],errors=[],views=[],interaction=[];
try{
 for(const width of [320,1280])for(const locale of locales){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/'))return r.fulfill({status:503,json:{error:'local_unconfigured'}});return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const entry of data.pages){
   const shown=germanOnly(entry.path)?'de':locale,sfx=suffix(shown);
   await page.goto(origin+entry.path+suffix(locale));await page.waitForFunction(l=>document.documentElement.lang===l,shown);
   const footer=page.locator('.footer-legal'),direct=footer.locator('.footer-legal-direct'),details=footer.locator('details'),summary=details.locator('summary');
   assert.equal(await details.count(),1);assert.equal(await page.locator('.site-footer .footer-bottom details').count(),1);
   const paths=entry.site_context==='teileklar'?['/teileklar/rechtliches']:['/impressum','/datenschutz'];
   await footer.scrollIntoViewIfNeeded();assert.equal(await details.evaluate(d=>d.open),false);assert.equal(await summary.getAttribute('aria-expanded'),'false');
   for(const path of paths){
    const a=direct.locator(`a[href="${path+sfx}"]`);assert.equal(await a.isVisible(),true);assert.equal(await a.evaluate(e=>e.closest('details')),null);
    const box=await a.boundingBox();assert.ok(box.height>=44&&box.width>=44);
   }
   const labels={de:entry.site_context==='teileklar'?['TEILEKLAR: Anbieterinformationen und Datenschutz']:['Impressum','Datenschutz'],nl:entry.site_context==='teileklar'?['TEILEKLAR: aanbiederinformatie en privacy']:['Colofon','Privacy'],fr:entry.site_context==='teileklar'?['TEILEKLAR : prestataire et confidentialité']:['Mentions légales','Confidentialité']}[shown];assert.deepEqual(await direct.locator('a').allTextContents(),labels);
   assert.equal(await direct.locator('a').count(),paths.length);if(entry.site_context==='teileklar')assert.equal(await direct.locator('a[href^="/datenschutz"],a[href^="/impressum"]').count(),0);assert.equal(await footer.locator('a[href="#"],a[href^="/lizenzen"]').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   views.push({path:entry.path,width,locale,rendered_locale:shown,legal_context:entry.site_context,legal_paths:paths,legal_disclosures:1,all_pages_disclosures_outside:1,passed:true});
   if(!['/','/teileklar'].includes(entry.path))continue;
   await summary.focus();assert.equal(await summary.evaluate(e=>e===document.activeElement),true);
   const focus=await summary.evaluate(e=>({style:getComputedStyle(e).outlineStyle,width:parseFloat(getComputedStyle(e).outlineWidth)}));assert.notEqual(focus.style,'none');assert.ok(focus.width>=2);
   await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.footer-legal summary').getAttribute('aria-expanded')==='true');
   const controlled=await summary.getAttribute('aria-controls');assert.equal(await page.locator(`[id="${controlled}"]`).isVisible(),true);
   assert.match(await details.innerText(),{de:/noch nicht verfügbar/,nl:/nog niet beschikbaar/,fr:/pas encore disponible/}[shown]);
   assert.match(await details.locator('div').innerText(),{de:/Prüfung und Freigabe/,nl:/gecontroleerd en goedgekeurd/,fr:/à vérifier et à valider/}[shown]);
   assert.equal(await page.locator('.diagnostic-consent').count(),1);
   await page.screenshot({path:out+`footer-${entry.path==='/'?'nexify':'teileklar'}-${width}-${locale}.png`});
   await summary.focus();await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('.footer-legal summary').getAttribute('aria-expanded')==='false');
   const first=direct.locator(`a[href="${paths[0]+sfx}"]`);await first.focus();await page.keyboard.press('Enter');await page.waitForURL(origin+paths[0]+sfx);await page.locator('main h1').waitFor();
   await page.goBack();await page.waitForURL(origin+entry.path+suffix(locale));await direct.locator(`a[href="${paths.at(-1)+sfx}"]`).click();await page.waitForURL(origin+paths.at(-1)+sfx);await page.reload();assert.equal(await direct.locator(`a[href="${paths[0]+sfx}"]`).isVisible(),true);
   interaction.push({path:entry.path,width,locale,keyboard_open_close:true,direct_links:true,back_reload:true,passed:true});
  }
  await context.close();
 }
 assert.equal(views.length,data.pages.length*locales.length*2);assert.equal(interaction.length,2*locales.length*2);
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 const report={scope:'local optimized shared footer;not legal completeness or production acceptance',renderer:externalOrigin?'Next-local':'Vite-local',views,interaction,source_sha256:before,missing_license_route:true,external_requests:0,page_errors:errors,passed:true};
 await writeFile(out+(externalOrigin?'next-browser.json':'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({views:views.length,interaction:interaction.length,external:0,passed:true}));
}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));}
