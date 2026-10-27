import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const artifact=new URL('../standalone/nexify-preview.html',import.meta.url);
const files=await readdir(new URL('../dist/assets/',import.meta.url));
assert.equal(files.filter(name=>name.endsWith('.js')).length,1);
const html=await readFile(artifact,'utf8');assert.doesNotMatch(html,/<script[^>]+src=/);
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
const errors=[];const external=[];page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',route=>{
 const url=route.request().url();
 if(url.startsWith('file:')||url.startsWith('data:'))return route.continue();
 external.push(url);return route.abort();
});
try{
 await page.goto(artifact.href);await page.locator('#locale').waitFor();
 await page.evaluate(()=>location.hash='#/anmelden');await page.locator('.auth-fallback').waitFor();
 for(const locale of ['nl','fr','de']){
  await page.locator('#locale').selectOption(locale);
  await page.waitForFunction(value=>document.documentElement.lang===value,locale);
 }
 assert.equal(await page.getByRole('button',{name:'Abmelden',exact:true}).count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS built standalone renders file/hash routes, DE/NL/FR and disabled auth with no external requests');
}finally{await browser.close();}
