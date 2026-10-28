// Local regression only: chat close keeps the reading position and keyboard focus.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const cache=await mkdtemp(join(tmpdir(),'nexify-collapse-'));
const sources=['apps/web/components/Workspace.tsx','apps/web/components/HomeRebuild.css','apps/site/tests/browser-chat-collapse.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(root+p)).digest('hex')])));
const before=await hashes(),server=await createServer({root:root+'apps/site',cacheDir:cache,server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();
const origin='http://127.0.0.1:'+server.httpServer.address().port,browser=await chromium.launch({headless:true});
const report={scope:'local synthetic API204; no external event/provider/send; current sources',source_sha256:before,checks:[],external:[],errors:[],passed:false};
try{for(const width of [390,1180])for(const path of ['/','/leistungen'])for(const textScale of [1,2]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){report.external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/'))return r.fulfill({status:204});return r.continue();});
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(e.name));await page.goto(origin+path);await page.locator('h1').waitFor();await page.locator('.public-orientation').waitFor({state:'attached'});
 if(textScale===2)await page.evaluate(()=>{const rows=[...document.querySelectorAll('body,body *')].filter(e=>e instanceof HTMLElement).map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const[e,size]of rows)e.style.setProperty('font-size',size*2+'px','important');});
 if(!await page.locator('#aifly-panel').isVisible()){await page.locator('.reopen-chat').focus();await page.keyboard.press('Enter');}
 await page.evaluate(()=>scrollTo(0,0));const initial=await page.evaluate(()=>scrollY);
 await page.locator('.panel-heading .icon-button').click();await page.waitForFunction(()=>document.activeElement?.classList.contains('reopen-chat'));
 const afterClick=await page.evaluate(()=>scrollY);assert.ok(Math.abs(afterClick-initial)<=1,'mouse close must preserve reading position');
 assert.equal(await page.locator('.reopen-chat').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#aifly-panel').isVisible(),false);
 await page.keyboard.press('Enter');await page.locator('#aifly-panel').waitFor({state:'visible'});if(width===390)assert.equal(await page.locator('.panel-heading .icon-button').evaluate(e=>e===document.activeElement),true);
 await page.locator('.panel-heading .icon-button').focus();await page.evaluate(()=>scrollTo(0,0));const beforeEscape=await page.evaluate(()=>scrollY);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.classList.contains('reopen-chat'));
 const afterEscape=await page.evaluate(()=>scrollY);assert.ok(Math.abs(afterEscape-beforeEscape)<=1,'Escape close must preserve reading position');
 await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement instanceof HTMLElement&&document.activeElement!==document.body&&!document.activeElement.closest('[hidden],[inert]')),true);
 report.checks.push({width,path,textScale,initial,afterClick,beforeEscape,afterEscape,focus_return:true,keyboard_reopen:true,backward_tab:true,passed:true});await context.close();
}assert.deepEqual(report.external,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(await hashes(),before);report.passed=true;
}finally{await browser.close();await server.close();await rm(cache,{recursive:true,force:true});await mkdir(root+'.local/chat-collapse',{recursive:true});await writeFile(root+'.local/chat-collapse/browser.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:report.checks.length,passed:report.passed}));
