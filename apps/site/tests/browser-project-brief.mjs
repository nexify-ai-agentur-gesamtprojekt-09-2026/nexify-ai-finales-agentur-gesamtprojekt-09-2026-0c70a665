// Actual shared app and local response fixtures only; no provider/contact delivery.
import assert from 'node:assert/strict';
import {preview} from 'vite';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {projectBriefCopy} from '../../web/lib/project-brief-i18n.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../../',import.meta.url)),renderer=process.env.BRIEF_RENDERER||'vite';assert.ok(['vite','next'].includes(renderer));
const sources=['apps/web/components/Workspace.tsx','apps/web/components/PublicOrientationChat.tsx','apps/web/components/PublicOrientationChat.css','apps/web/components/ProjectBrief.tsx','apps/web/lib/project-brief.mjs','apps/web/lib/project-brief.d.mts','apps/web/lib/project-brief-i18n.ts','apps/site/tests/browser-project-brief.mjs','package.json','pnpm-lock.yaml','packages/tokens/tokens.css','apps/web/components/WorkspaceRebuild.css','config/site-map.json','config/design-tokens.json','apps/site/vite.config.ts','apps/web/next.config.ts'];
const hash=async()=>Object.fromEntries(await Promise.all(sources.map(async s=>[s,createHash('sha256').update(await readFile(root+s)).digest('hex')]))),before=await hash();
const focused=process.env.BRIEF_CASE||'';assert.ok(!focused||/^(320|1280)-(de|nl|fr)-(unavailable|denied|quote)$/.test(focused));
const output=root+'.local/project-brief/'+renderer+(focused?'/focused':'');await mkdir(output,{recursive:true});
let server,child,origin,browser;const checks=[],external=[],errors=[];
for(const dir of [root,root+'apps/site/',root+'apps/web/'])for(const name of ['.env','.env.local','.env.production','.env.production.local'])assert.equal(existsSync(dir+name),false,'Build must use a credential-free checkout');
const cwd=root+(renderer==='vite'?'apps/site':'apps/web');
const buildEnv={PATH:process.env.PATH,LANG:'C.UTF-8',NEXT_TELEMETRY_DISABLED:'1',NEXIFY_APP_ENV:'test'};
execFileSync(process.execPath,['scripts/generate-public-data.mjs'],{cwd,env:buildEnv,stdio:'pipe'});
execFileSync(process.execPath,renderer==='vite'?['node_modules/vite/bin/vite.js','build']:['node_modules/next/dist/bin/next','build'],{cwd,env:buildEnv,stdio:'pipe',maxBuffer:4*1024*1024});
assert.deepEqual(await hash(),before);
const served_artifact_sha256={};async function artifacts(dir){for(const entry of await readdir(root+dir,{withFileTypes:true})){assert.equal(entry.isSymbolicLink(),false);if(entry.isDirectory())await artifacts(dir+entry.name+'/');else if(entry.isFile())served_artifact_sha256[dir+entry.name]=createHash('sha256').update(await readFile(root+dir+entry.name)).digest('hex');}}
await artifacts(renderer==='vite'?'apps/site/dist/':'apps/web/.next/static/');
if(renderer==='next')served_artifact_sha256['apps/web/.next/BUILD_ID']=createHash('sha256').update(await readFile(root+'apps/web/.next/BUILD_ID')).digest('hex');
try{
 if(renderer==='vite'){server=await preview({root:root+'apps/site',preview:{host:'127.0.0.1',port:0,strictPort:false}});origin='http://127.0.0.1:'+server.httpServer.address().port;}
 else{const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));origin='http://127.0.0.1:'+port;child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:root+'apps/web',env:{PATH:process.env.PATH,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore'});for(let n=0;n<100;n++){try{if((await fetch(origin)).ok)break;}catch{}if(n===99)throw Error('Next startup timeout');await new Promise(resolve=>setTimeout(resolve,100));}}
 browser=await chromium.launch({headless:true});
 for(const width of [320,1280])for(const locale of ['de','nl','fr'])for(const mode of ['unavailable','denied','quote']){
  if(focused&&`${width}-${locale}-${mode}`!==focused)continue;
  const t=projectBriefCopy[locale],context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});let quotePosts=0,chatPosts=0,lastChatText='';const otherWrites=[];
  await context.addInitScript(l=>localStorage.setItem('nexify-locale',l),locale);
  await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==origin){external.push(u.origin);return route.abort();}
   if(u.pathname==='/api/session')return mode==='unavailable'?route.fulfill({status:404,json:{error:'synthetic_unavailable'}}):route.fulfill({json:{csrf:'synthetic-local-only',history:[],capabilities:Object.fromEntries(['quote_pdf','pending_outbox','booking_request','marketing_template','email_delivery','external_calendar','model_chat','local_planning'].map(k=>[k,k==='quote_pdf'&&mode==='quote']))}});
   if(req.method()==='POST'&&u.pathname==='/api/quotes'){quotePosts++;return route.fulfill({json:{id:'synthetic-local',title:req.postDataJSON().title,details:req.postDataJSON().details,download_url:'/api/quotes/synthetic-local/pdf'}});}
   if(req.method()==='POST'&&u.pathname==='/api/agent-chat'){chatPosts++;lastChatText=req.postDataJSON().messages.at(-1).parts.find(p=>p.type==='text').text;return new Promise(resolve=>setTimeout(resolve,150)).then(()=>route.fulfill({status:503,json:{error:'synthetic_offline'}}));}
   if(!['GET','HEAD'].includes(req.method())){otherWrites.push(u.pathname);return route.abort();}
   if(u.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'synthetic_unavailable'}});return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.name));
  async function open(){if(await page.locator('.reopen-chat').isVisible())await page.locator('.reopen-chat').click();}
  const modes=()=>page.locator('.workspace-chat-modes button');
  try{
   await page.goto(origin+'/leistungen/websites');await page.waitForFunction(l=>document.documentElement.lang===l,locale);await open();await modes().first().click();
   const guide=page.locator('.project-brief');await guide.waitFor();const starter=page.locator('.orientation-starters button').first(),composer=page.locator('#orientation-message');
   await composer.fill('Keep unsent input');assert.equal(await starter.isDisabled(),true);assert.equal(await composer.inputValue(),'Keep unsent input');await composer.fill('');await starter.click();assert.ok((await composer.inputValue()).includes(await page.locator('.orientation-starters a').innerText()));assert.equal(chatPosts,0);await composer.fill('Keep unsent input');
   await guide.getByRole('button',{name:t.start,exact:true}).focus();await page.keyboard.press('Enter');const answer=guide.locator('form textarea');await answer.waitFor();assert.equal(await answer.evaluate(e=>e===document.activeElement),true);await answer.fill('   ');assert.equal(await guide.locator('form button.primary-button').isDisabled(),true);
   const goal='Synthetic <script>not executed</script>';await answer.fill(goal);await guide.getByRole('button',{name:t.close,exact:true}).click();await guide.getByRole('button',{name:t.resume,exact:true}).click();assert.equal(await answer.inputValue(),goal);
   await modes().last().click();await modes().first().click();assert.equal(await answer.inputValue(),goal);assert.equal(await composer.inputValue(),'Keep unsent input');
   await page.locator('.panel-heading .icon-button').click();await page.locator('.site-footer a[href="/kontakt"]').first().click();await page.waitForURL(origin+'/kontakt');await open();assert.equal(await answer.inputValue(),goal);assert.equal(await guide.locator('.project-brief-source a').getAttribute('href'),'/leistungen/websites');await page.goBack();await page.waitForURL(origin+'/leistungen/websites');assert.equal(await answer.inputValue(),goal);
   await guide.locator('form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});assert.equal(await guide.locator('form label').innerText(),t.questions[1]);await answer.fill('Existing synthetic workflow');await guide.locator('form button.primary-button').click();await answer.fill('Discuss the scope');await guide.locator('form button.primary-button').click();
   const review=guide.locator('.project-brief-review');await review.waitFor();await page.waitForFunction(()=>document.activeElement?.matches('.project-brief-review textarea[readonly]'));assert.equal(await review.locator('dd').first().innerText(),goal);assert.equal(await review.locator('script').count(),0);assert.equal(await composer.inputValue(),'Keep unsent input');
   const link=guide.locator('a.project-brief-mail');assert.equal(await link.count(),1);const mail=new URL(await link.getAttribute('href'));assert.equal(mail.pathname,'mail@nexifyai.cloud');assert.ok(mail.searchParams.get('body').includes(goal));assert.equal(quotePosts,0);assert.equal(chatPosts,0);
   await guide.getByRole('button',{name:t.edit,exact:true}).click();await answer.fill('Edited project goal');await guide.locator('form button.primary-button').click();assert.equal(await answer.inputValue(),'Existing synthetic workflow');await guide.locator('form button.primary-button').click();assert.equal(await answer.inputValue(),'Discuss the scope');await guide.locator('form button.primary-button').click();
   if(mode==='quote'){
    await guide.getByRole('button',{name:t.tools,exact:true}).click();let title=page.locator('.action-card input[name="title"]'),details=page.locator('.action-card textarea[name="details"]');assert.equal(await title.inputValue(),'Edited project goal');assert.ok((await details.inputValue()).includes('Existing synthetic workflow'));assert.equal(quotePosts,0);await title.fill('Already edited quote');await details.fill('Preserve existing quote input');await modes().first().click();await guide.getByRole('button',{name:t.tools,exact:true}).click();assert.equal(await title.inputValue(),'Already edited quote');assert.equal(await details.inputValue(),'Preserve existing quote input');assert.equal(quotePosts,0);
    await page.locator('.action-card form').first().evaluate(form=>{form.requestSubmit();form.requestSubmit();});await page.locator('.result-card h4').waitFor();assert.equal(quotePosts,1);await modes().first().click();
   }else{assert.equal(await guide.getByRole('button',{name:t.tools,exact:true}).count(),0);assert.ok((await guide.innerText()).includes(t.unavailable));}
   await guide.getByRole('button',{name:t.reset,exact:true}).click();await guide.getByRole('button',{name:t.cancel,exact:true}).click();await page.waitForFunction(()=>document.activeElement?.matches('.project-brief-reset.text-button'));assert.equal(await review.locator('dd').first().innerText(),'Edited project goal');await guide.getByRole('button',{name:t.reset,exact:true}).click();await guide.getByRole('button',{name:t.confirm,exact:true}).click();await answer.waitFor();assert.equal(await answer.inputValue(),'');assert.equal(await composer.inputValue(),'Keep unsent input');
   await composer.fill('Recover this unsent question');assert.equal(await composer.inputValue(),'Recover this unsent question');await page.locator('.orientation-composer').evaluate(form=>{form.requestSubmit();form.requestSubmit();});await page.locator('.public-orientation > [role="alert"]').waitFor();assert.equal(chatPosts,1);assert.equal(lastChatText,'Recover this unsent question');assert.equal(await composer.inputValue(),'Recover this unsent question');
   assert.deepEqual(otherWrites,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).sort()),['nexify-locale']);assert.deepEqual(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k!=='nexify-presenter-guide')),[]);assert.equal(await page.evaluate(()=>[JSON.stringify(localStorage),JSON.stringify(sessionStorage)].some(v=>/Edited project goal|Existing synthetic workflow|Keep unsent input/.test(v))),false);
   await guide.screenshot({path:output+'/'+width+'-'+locale+'-'+mode+'.png'});
   await page.reload();await open();await modes().first().click();await guide.getByRole('button',{name:t.start,exact:true}).waitFor();assert.equal(await composer.inputValue(),'');
   checks.push({width,locale,mode,quote_posts:quotePosts,chat_posts:chatPosts,navigation_resume:true,edited:true,reset_confirmation:true,reload_clears:true,unavailable_honest:true,no_unrequested_writes:true,double_submit_required_steps:true,focus_transitions:true,passed:true});console.log('PASS '+renderer+' '+width+' '+locale+' '+mode);
  }finally{await context.close();}
 }
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(await hash(),before);assert.equal(checks.length,focused?1:18);
 await writeFile(output+'/browser.json',JSON.stringify({renderer,full_matrix:!focused,scope:'local optimized public app;synthetic session/API responses;no live provider/mail/AI acceptance',checks,source_sha256:before,fresh_build_performed:true,served_artifact_sha256,external,errors,passed:true},null,2)+'\n');console.log(JSON.stringify({renderer,cases:checks.length,external:0,errors:0,passed:true}));
}finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));if(child){child.kill('SIGTERM');if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');}}
