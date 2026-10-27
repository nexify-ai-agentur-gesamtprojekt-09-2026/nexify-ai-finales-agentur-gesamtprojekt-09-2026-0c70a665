// Bounded local accessibility checks, explicitly not a WCAG conformance audit.
import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));const data=JSON.parse(await readFile(root+'.generated/public-site.json','utf8'));
const server=await createServer({root,server:{port:0,strictPort:false},define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"'}});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin&&u.protocol!=='data:')return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({status:403,json:{error:'synthetic_denied'}});return r.continue();});
const report={scope:'local Chromium checks; no screen reader or full WCAG certification',pages:[],issues:[],unassessed:['real provider widgets','screen-reader announcements','all content and graphical contrast over gradients/images','full zoom/text-spacing and assistive technology matrix']};
try{
 const page=await context.newPage();
 for(const item of data.pages){
  await page.goto(origin+item.path);await page.locator('.workspace-shell').waitFor();
  await page.locator('.skip-link').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'page-content');
  const findings=await page.evaluate(()=>{
   const visible=e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});
   const name=e=>e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')?.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ')||e.labels?.[0]?.textContent||e.innerText||e.getAttribute('title')||e.querySelector('img')?.alt||'';
   const controls=[...document.querySelectorAll('button,input:not([type=hidden]),select,textarea,a[href],summary')].filter(visible);
   const small=controls.filter(e=>{const b=e.getBoundingClientRect();return(b.width<44||b.height<44)&&!e.closest('p');}).map(e=>({tag:e.tagName,class:e.className,label:name(e).trim().slice(0,55),w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height)}));
   return{small,unnamed:controls.filter(e=>!name(e).trim()).map(e=>e.outerHTML.slice(0,100)),overflow:document.documentElement.scrollWidth>innerWidth+1,animations:[...document.querySelectorAll('*')].filter(visible).filter(e=>getComputedStyle(e).animationName!=='none'&&getComputedStyle(e).animationDuration!=='0s').length};
  });
  report.pages.push(item.path);if(findings.small.length||findings.unnamed.length||findings.overflow||findings.animations)report.issues.push({path:item.path,...findings});
 }
 // Real keyboard tab wrap and escape/return in the existing mobile dialog.
 await page.goto(origin+'/');await page.locator('.reopen-chat').click();const dialog=page.locator('[role=dialog]');await dialog.waitFor();
 const controls=dialog.locator('button:not([disabled]):visible,a[href]:visible,input:not([disabled]):visible,textarea:not([disabled]):visible,select:not([disabled]):visible');
 await controls.last().focus();await page.keyboard.press('Tab');assert.equal(await controls.first().evaluate(e=>e===document.activeElement),true);
 await controls.first().focus();await page.keyboard.press('Shift+Tab');assert.equal(await controls.last().evaluate(e=>e===document.activeElement),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('.reopen-chat').evaluate(e=>e===document.activeElement),true);
 report.dialog_keyboard='tab-wrap, reverse-tab-wrap, escape, focus-return passed';
}finally{await browser.close();await server.close();await writeFile(new URL('../../../evidence/one-app-2026-10-27/accessibility-local.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({routes:report.pages.length,issue_routes:report.issues.length,keyboard:report.dialog_keyboard}));
if(report.issues.length)process.exitCode=1;
