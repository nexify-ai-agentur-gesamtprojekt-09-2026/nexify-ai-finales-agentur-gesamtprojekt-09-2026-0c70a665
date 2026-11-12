import assert from 'node:assert/strict';
import {createServer as httpServer} from 'node:http';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {createIsolatedLiveChatHandler} from '../../../api/agent-chat.ts';

// Real UI + SDK transport + isolated actual handler/adapter. The provider is a
// fixture; no real service, credential, model, customer data or action is used.
const requests=[],provider=[];let origin,aborted=false,failures=0,holds=0;
function sse(text){
 const model='deepseek/deepseek-v4.1-flash-1017';
 const part={id:'fixture',model,created:1,choices:[{index:0,delta:{role:'assistant',content:text},finish_reason:null}]};
 const end={id:'fixture',model,created:1,choices:[{index:0,delta:{},finish_reason:'stop'}]};
 return new Response(`data: ${JSON.stringify(part)}\n\ndata: ${JSON.stringify(end)}\n\ndata: [DONE]\n\n`,{headers:{'content-type':'text/event-stream'}});
}
const handler=createIsolatedLiveChatHandler({baseUrl:'http://127.0.0.1:20128/v1',apiKey:'fixture-only',fetch:async(_url,init)=>{
 const body=JSON.parse(init.body);provider.push(body);
 const input=body.messages.filter(message=>message.role==='user').at(-1)?.content;
 const last=typeof input==='string'?input:JSON.stringify(input);
 if(last.includes('FAIL-ME')&&failures++===0)return new Response('fixture-secret-detail',{status:503});
 if(last.includes('HALT-ME')&&holds++===0){
  const bytes=new TextEncoder();
  return new Response(new ReadableStream({start(controller){
   controller.enqueue(bytes.encode(`data: ${JSON.stringify({id:'fixture',model:body.model,created:1,choices:[{index:0,delta:{role:'assistant',content:'Teilantwort'},finish_reason:null}]})}\n\n`));
   init.signal.addEventListener('abort',()=>{aborted=true;try{controller.close();}catch{}},{once:true});
  },cancel(){aborted=true;}}),{headers:{'content-type':'text/event-stream'}});
 }
 return sse('Antwort zur Projektplanung.');
}});
const backend=httpServer(async(req,res)=>{try{
 const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks);
 requests.push(JSON.parse(raw.toString('utf8')));
 const request=new Request(new URL(req.url,origin),{method:req.method,headers,body:raw});
 const response=await handler.fetch(request);res.writeHead(response.status,Object.fromEntries(response.headers));
 if(response.body)await pipeline(Readable.fromWeb(response.body),res);else res.end();
}catch{if(!res.headersSent)res.writeHead(500);res.end();}});
await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
const root=fileURLToPath(new URL('../',import.meta.url));
const server=await createServer({root,server:{host:'127.0.0.1',port:0,strictPort:false,proxy:{'/api/agent-chat':{target:`http://127.0.0.1:${backend.address().port}`,changeOrigin:false}}},
 define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"','__NEXIFY_STATIC_ORIENTATION__':false}});
await server.listen();origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});const external=[];
 await page.route('**/*',route=>{const url=new URL(route.request().url());
  if(url.origin!==origin&&url.protocol!=='data:'){external.push(url.origin);return route.abort();}
  if(url.pathname==='/api/session')return route.fulfill({status:404,json:{error:'fixture_session_absent'}});
  if(url.pathname.startsWith('/api/')&&url.pathname!=='/api/agent-chat')return route.fulfill({status:503,json:{error:'fixture_unavailable'}});
  return route.continue();});
 await page.goto(origin+'/');await page.locator('main h1').waitFor();await page.locator('[data-testid="hero-project-link"]').click();
 const input=page.locator('#orientation-message');await input.waitFor({state:'visible'});
 async function ask(value){const count=await page.locator('.orientation-message.role-assistant').count();await input.fill(value);await page.locator('.orientation-composer button.primary-button').click();
  await page.waitForFunction(n=>document.querySelectorAll('.orientation-message.role-assistant').length>=n,count+1);
  await page.locator('.orientation-composer button.primary-button').waitFor({state:'visible'});
 }
 await ask('Ich betreibe eine Fahrradwerkstatt.');await ask('Ich brauche dafür eine Website.');await ask('Wie lange dauert das?');
 assert.deepEqual(requests.slice(0,3).map(body=>body.messages.map(message=>message.role)),[['user'],['user','assistant','user'],['user','assistant','user','assistant','user']]);
 assert.equal(requests[2].messages.at(-1).parts[0].text,'Wie lange dauert das?');
 assert.match(JSON.stringify(provider[2].messages),/Fahrradwerkstatt/);
 for(const body of requests)for(const message of body.messages){assert.deepEqual(Object.keys(message).sort(),['id','parts','role']);for(const part of message.parts)assert.deepEqual(Object.keys(part).sort(),['text','type']);}
 const long='🚲'.repeat(450)+'Ziel';
 for(let i=0;i<5;i++)await ask(long+i);
 for(const body of requests){assert.ok(body.messages.length<=12);assert.ok(body.messages.flatMap(m=>m.parts).reduce((n,p)=>n+p.text.length,0)<=3000);}
 assert.equal(requests.at(-1).messages.at(-1).parts[0].text,long+'4');
 assert.ok(requests.at(-1).messages.length<12);
 // Client-side brand change must not carry the prior conversation into TEILEKLAR.
 await page.evaluate(()=>{history.pushState(null,'','/teileklar');dispatchEvent(new PopStateEvent('popstate'));});
 await page.waitForURL('**/teileklar');await page.waitForFunction(()=>document.querySelectorAll('.orientation-message.role-user').length===0);
 await input.fill('Mein Fahrzeug benötigt ein Teil.');await page.locator('.orientation-composer button.primary-button').click();
 await page.waitForFunction(()=>document.querySelectorAll('.orientation-message.role-assistant').length===1);
 assert.equal(requests.at(-1).messages.length,1);assert.equal(requests.at(-1).page_path,'/teileklar');
 for(let i=0;i<7;i++)await ask(`Weitere Fahrzeugfrage ${i}`);
 assert.equal(requests.at(-1).messages.length,11);
 assert.equal(requests.at(-1).messages[0].role,'user');
 assert.equal(requests.at(-1).messages.at(-1).parts[0].text,'Weitere Fahrzeugfrage 6');
 // A new locale is a separate conversation; prior brand/locale history cannot travel.
 await page.goto(origin+'/?lang=nl');await page.locator('main h1').waitFor();await page.locator('[data-testid="hero-project-link"]').click();
 await input.waitFor({state:'visible'});await ask('Ik heb een website nodig.');
 assert.equal(requests.at(-1).locale,'nl');assert.equal(requests.at(-1).messages.length,1);
 // Provider errors are generic in the UI and the customer's draft remains editable.
 const callsBeforeError=provider.length;
 await input.fill('FAIL-ME');await page.locator('.orientation-composer button.primary-button').click();
 await page.locator('.public-orientation [role="alert"]').waitFor();assert.equal(await input.inputValue(),'FAIL-ME');
 assert.equal(provider.length,callsBeforeError+1);
 assert.doesNotMatch(await page.locator('.public-orientation').innerText(),/fixture-secret-detail|fixture-only/);
 let retryResponse=page.waitForResponse(response=>response.url().endsWith('/api/agent-chat'));
 await page.locator('.orientation-composer button.primary-button').click();await retryResponse;
 await page.waitForFunction(()=>!document.querySelector('#orientation-message')?.disabled);
 let retried=requests.at(-1).messages;
 assert.equal(provider.length,callsBeforeError+2);
 assert.equal(retried.filter(message=>message.role==='user'&&message.parts.some(part=>part.text==='FAIL-ME')).length,1);
 assert.ok(retried.some(message=>message.role==='user'&&message.parts.some(part=>part.text==='Ik heb een website nodig.')));
 // A visitor can stop a partially received reply; the fixture upstream observes cancellation.
 await page.goto(origin+'/');await page.locator('main h1').waitFor();await page.locator('[data-testid="hero-project-link"]').click();
 await input.waitFor({state:'visible'});await ask('Ein bereits besprochenes Ziel.');
 const callsBeforeAbort=provider.length;
 await input.fill('HALT-ME');await page.locator('.orientation-composer button.primary-button').click();
 await page.getByText('Teilantwort',{exact:true}).waitFor();await page.getByRole('button',{name:'Antwort anhalten'}).click();
 await page.waitForFunction(()=>!document.querySelector('.orientation-composer button.outline-button'));
 for(let i=0;i<20&&!aborted;i++)await new Promise(resolve=>setTimeout(resolve,25));assert.equal(aborted,true);
 assert.equal(provider.length,callsBeforeAbort+1);
 assert.equal(await input.inputValue(),'HALT-ME');
 retryResponse=page.waitForResponse(response=>response.url().endsWith('/api/agent-chat'));
 await page.locator('.orientation-composer button.primary-button').click();await retryResponse;
 await page.waitForFunction(()=>!document.querySelector('#orientation-message')?.disabled);
 retried=requests.at(-1).messages;
 assert.equal(provider.length,callsBeforeAbort+2);
 assert.equal(retried.filter(message=>message.role==='user'&&message.parts.some(part=>part.text==='HALT-ME')).length,1);
 assert.ok(retried.some(message=>message.role==='user'&&message.parts.some(part=>part.text==='Ein bereits besprochenes Ziel.')));
 assert.ok(!retried.some(message=>message.role==='assistant'&&message.parts.some(part=>part.text.includes('Teilantwort'))));
 assert.deepEqual(external,[]);
 await page.close();
 console.log(JSON.stringify({turns:3,rollingUtf16:true,rollingCount:true,brandIsolation:true,localeIsolation:true,errorRetryAndAbortRetry:true,externalRequests:0,provider:'isolated_fixture'}));
}finally{await browser.close();await server.close();await new Promise(resolve=>backend.close(resolve));}
