// Real pinned browser SDK, actual application entry; all ingestion requests intercepted locally.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {createServer as portServer} from 'node:net';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
const release='1'.repeat(40),originEnv={};const keys=['NEXIFY_RELEASE_SHA','NEXIFY_APP_ENV'];for(const k of keys)originEnv[k]=process.env[k];process.env.NEXIFY_RELEASE_SHA=release;process.env.NEXIFY_APP_ENV='test';
const surface=process.env.NEXIFY_EXCEPTION_SURFACE==='next'?'next':'vite';let server,child,origin;
if(surface==='next'){
 const allocator=portServer();allocator.listen(0,'127.0.0.1');await once(allocator,'listening');const port=allocator.address().port;await new Promise(resolve=>allocator.close(resolve));
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:repo+'apps/web',env:{PATH:process.env.PATH,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore'});origin='http://127.0.0.1:'+port;
 for(let n=0;n<100;n++){try{if((await fetch(origin)).ok)break;}catch{}if(n===99)throw new Error('local Next start timeout');await new Promise(resolve=>setTimeout(resolve,100));}
}else{
server=await createServer({root,plugins:[{name:"local-synthetic-error-source",configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url==='/src/synthetic-error.js'){res.setHeader('Content-Type','text/javascript');res.end(`export function boom(){setTimeout(()=>{throw new TypeError('synthetic private@example.test token=secret')},0)};export function reject(){setTimeout(()=>Promise.reject(new Error('synthetic private@example.test secret')),0)};`);}else next();});}}],server:{port:0,strictPort:false},define:{'import.meta.env.VITE_POSTHOG_PROJECT_TOKEN':'"phc_synthetic_no_remote"','import.meta.env.VITE_CLERK_ENABLED':'"false"'}});

await server.listen();origin='http://127.0.0.1:'+server.httpServer.address().port;
}
const browser=await chromium.launch({headless:true}),events=[],requests=[],unexpected=[];
const context=await browser.newContext({userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'});
// Model a consenting human for the SDK bot filter; this test is still explicitly synthetic.
await context.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});Object.defineProperty(navigator,'userAgentData',{get:()=>({brands:[{brand:'Chromium',version:'134'}],mobile:false,platform:'Linux'})});});let blockChat=false,ingestStatus=200;
function decode(req){const data=req.postDataBuffer();try{return JSON.parse(data.toString());}catch{try{return JSON.parse(gunzipSync(data).toString());}catch{const p=new URLSearchParams(data.toString());const value=p.get('data');if(value)return JSON.parse(Buffer.from(value,'base64').toString());throw new Error('unsupported intercepted SDK wire encoding');}}}
await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin==='https://eu.i.posthog.com'){requests.push(u.pathname);const d=decode(req);events.push(...(Array.isArray(d)?d:Array.isArray(d.batch)?d.batch:[d]));return route.fulfill({status:ingestStatus,json:{status:ingestStatus===200?1:0}});}if(u.origin!==origin){unexpected.push(u.origin);return route.abort();}if(blockChat&&(u.pathname.includes('PublicOrientationChat.tsx')||(surface==='next'&&u.pathname.startsWith('/_next/static/chunks/')&&u.pathname.endsWith('.js'))))return route.abort();if(u.pathname==='/src/synthetic-error.js')return route.fulfill({contentType:'text/javascript',body:`export function boom(){setTimeout(()=>{throw new TypeError('synthetic private@example.test token=secret')},0)};export function reject(){setTimeout(()=>Promise.reject(new Error('synthetic private@example.test secret')),0)};`});if(u.pathname==='/api/session')return route.fulfill({status:200,json:{csrf:'synthetic-local-only',history:[],capabilities:Object.fromEntries(['quote_pdf','pending_outbox','booking_request','marketing_template','email_delivery','external_calendar','model_chat','local_planning'].map(k=>[k,false]))}});if(u.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'synthetic_unavailable'}});return route.continue();});
const page=await context.newPage(),checks=[];
async function state(){return page.evaluate(()=>window[Symbol.for('nexify.exceptions.v1')]?.state());}
try{
 await page.goto(origin+'/kontakt?__posthog_debug=true');await page.locator('#locale').waitFor();await page.waitForTimeout(400);assert.equal(requests.length,0);assert.equal((await state()).initialized,false);checks.push('no_initialization_or_requests_without_consent');
 await page.locator('.diagnostic-consent summary').click();await page.locator('.diagnostic-consent').getByRole('button',{name:'Ablehnen',exact:true}).click();assert.equal((await state()).decision,'declined');await page.locator('.diagnostic-consent').getByRole('button',{name:'Zulassen',exact:true}).click();await assert.doesNotReject(async()=>{for(let n=0;n<100;n++){if((await state()).initialized)return;await page.waitForTimeout(100);}throw new Error('SDK failed to initialize');});
 
 await page.evaluate(async()=>{(await import('/src/synthetic-error.js')).boom();});await assert.doesNotReject(async()=>{for(let n=0;n<100;n++){if(events.length===1)return;await page.waitForTimeout(100);}throw new Error('missing unhandled event');});checks.push('real_sdk_unhandled_error_intercepted');
 await page.evaluate(async()=>{(await import('/src/synthetic-error.js')).reject();});await assert.doesNotReject(async()=>{for(let n=0;n<100;n++){if(events.length===2)return;await page.waitForTimeout(100);}throw new Error('missing rejection event');});checks.push('real_sdk_unhandled_rejection_intercepted');
 // Activate actual lazy chat boundary after it fails. React catches it; console capture stays disabled.
 blockChat=true;if(await page.locator('.reopen-chat').isVisible())await page.locator('.reopen-chat').click();await page.locator('.workspace-chat-modes button').first().click();await page.locator('.request-fallback').first().waitFor();
 await assert.doesNotReject(async()=>{for(let n=0;n<100;n++){if(events.length===3)return;await page.waitForTimeout(100);}throw new Error('missing boundary event');});assert.equal(await page.locator('.site-header').count(),1);checks.push('actual_chat_boundary_reported_once_shell_preserved');
 await page.waitForTimeout(3500);assert.equal(events.length,3);
 for(const event of events){assert.equal(event.event,'$exception');assert.equal(event.properties.distinct_id,'nexify-unidentified-exception');assert.equal(event.properties.release_sha,release);assert.equal(event.properties.environment,'test');assert.equal(event.properties.app_surface,surface);const text=JSON.stringify(event);for(const privateText of ['private@example.test','token=secret','$current_url','$pathname','$session_id','$device_id'])assert.equal(text.includes(privateText),false);}
 assert.equal(unexpected.length,0);assert.equal((await context.cookies()).length,0);assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('ph_')).length),0);checks.push('only_redacted_exception_events_no_cookies_identity_or_other_requests');
 // A real failed SDK request must not escape through retries after revocation or later re-consent.
 ingestStatus=503;await page.evaluate(()=>{const ctl=window[Symbol.for('nexify.exceptions.v1')],err=new Error('retry private@example.test token=secret');if(!ctl.capture(err)||ctl.capture(err))throw new Error('manual dedup failed');});
 for(let n=0;events.length<4&&n<100;n++)await page.waitForTimeout(50);assert.equal(events.length,4);await page.waitForTimeout(150);
 await page.locator('.diagnostic-consent').getByRole('button',{name:'Einwilligung widerrufen',exact:true}).click();await page.evaluate(()=>dispatchEvent(new Event('online')));
 // Re-consent before the first scheduled retry must NOT replace the aborted signal.
 await page.evaluate(()=>dispatchEvent(new CustomEvent('nexify:exception-consent',{detail:{granted:true}})));
 assert.equal((await state()).requiresReload,true);assert.equal((await state()).consent,false);
 ingestStatus=200;await page.evaluate(()=>window[Symbol.for('nexify.exceptions.v1')].capture(new Error('blocked epoch private@example.test')));
 await page.waitForTimeout(9000);assert.equal(events.length,4,'old failed request must stay blocked after attempted immediate re-consent');checks.push('503_retry_and_immediate_reconsent_stay_blocked_until_reload');
 await page.evaluate(()=>dispatchEvent(new Event('pagehide')));await page.waitForTimeout(300);assert.equal(events.length,4,'unload must not bypass consent via beacon');checks.push('unload_cannot_bypass_aborted_consent');
 await page.evaluate(async()=>{(await import('/src/synthetic-error.js')).boom();});await page.waitForTimeout(500);assert.equal(events.length,4);assert.equal((await context.cookies()).length,0);assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('ph_')).length),0);checks.push('revocation_and_debug_query_create_no_persistent_sdk_state');

 const sourceFiles=['apps/web/observability/exceptions.mjs','apps/site/src/observability.ts','apps/web/instrumentation-client.ts','apps/web/components/DeferredChatBoundary.tsx','apps/site/src/main.tsx','apps/site/tests/browser-exception-capture.mjs','apps/site/package.json','apps/web/package.json','pnpm-lock.yaml'];
 const hashes=Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,createHash('sha256').update(await readFile(repo+p)).digest('hex')])));
 await mkdir(repo+'.local/observability-integration',{recursive:true});await writeFile(repo+'.local/observability-integration/browser-exceptions-'+surface+'.json',JSON.stringify({scope:'local actual '+surface+' SDK;all ingestion intercepted;synthetic release and human-like navigator;no external event',checks,events:events.length,external_events_sent:0,unexpected_origins:unexpected,synthetic:true,surface,source_sha256:hashes,passed:true},null,2)+'\n');console.log(JSON.stringify({surface,checks,events:events.length,passed:true}));
}finally{await context.close();await browser.close();if(server)await server.close();if(child){child.kill('SIGTERM');await once(child,'exit');}for(const k of keys)if(originEnv[k]===undefined)delete process.env[k];else process.env[k]=originEnv[k];}
