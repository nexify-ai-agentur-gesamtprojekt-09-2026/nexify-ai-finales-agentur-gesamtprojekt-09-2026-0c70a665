import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));const data=JSON.parse(await readFile(root+'.generated/public-site.json','utf8'));
const server=await createServer({root,server:{port:0,strictPort:false,hmr:false}});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});const context=await browser.newContext();await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({status:403,json:{error:'synthetic'}});return r.continue();});
const report={scope:'text-spacing and 200% text resize geometry; not screenreader or full visual conformance',checks:[],issues:[]};
try{const page=await context.newPage();for(const item of data.pages){for(const width of [390,1280]){await page.setViewportSize({width,height:900});await page.goto(origin+item.path);await page.locator('.workspace-shell').waitFor();await page.addStyleTag({content:'* {line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important;} p {margin-bottom:2em !important;}'});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);report.checks.push({path:item.path,width,text_spacing:true,overflow});if(overflow)report.issues.push({path:item.path,width,type:'text_spacing_overflow'});}
 await page.setViewportSize({width:1280,height:900});await page.goto(origin+item.path);await page.locator('.workspace-shell').waitFor();await page.addStyleTag({content:'html {font-size:200% !important;}'});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);report.checks.push({path:item.path,width:1280,text_resize_200:true,overflow});if(overflow)report.issues.push({path:item.path,width:1280,type:'text_resize_overflow'});
}}finally{await browser.close();await server.close();await writeFile('evidence/one-app-2026-10-27/text-spacing.json',JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify({checks:report.checks.length,issues:report.issues}));assert.equal(report.issues.length,0);
