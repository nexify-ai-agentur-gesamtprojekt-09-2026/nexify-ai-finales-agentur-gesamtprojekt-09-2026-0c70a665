// Real Chromium UI test for the discreet installation area against the built public site.
// Covers: missing prompt event (honest guidance, no install button), available prompt (real
// prompt() call), accepted and rejected prompt, dismiss persistence, standalone suppression,
// keyboard activation, and a narrow viewport that must not overlap the chat launcher.
// Local only; no network beyond the fixture origin; /api is refused (no session needed for footer).
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve('.local/install-dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.json':'application/json','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"offline_fixture"}');return;}
  try{let file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))file=resolve(root,'index.html');let data;try{data=await readFile(file);}catch{file=resolve(root,'index.html');data=await readFile(file);}res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(500);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const report={scope:'built public site, real Chromium; discreet install area; no OS install acceptance',checks:[]};
const external=[];
async function check(name,fn){await fn();report.checks.push(name);}
async function firePrompt(page,outcome){
  return page.evaluate(result=>{
    const event=new Event('beforeinstallprompt');
    event.prompt=()=>{window.__promptCalled=(window.__promptCalled||0)+1;return Promise.resolve();};
    event.userChoice=Promise.resolve({outcome:result});
    window.dispatchEvent(event);
  },outcome);
}
try{
  const context=await browser.newContext();
  await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){external.push(r.request().url());return r.abort();}return r.continue();});

  // 1) Missing beforeinstallprompt: honest guidance, no install button.
  const page=await context.newPage();
  await page.goto(origin+'/');
  const invite=page.locator('[data-testid="install-invitation"]');
  await invite.waitFor({timeout:10000});
  await check('missing event shows honest guidance without an install button',async()=>{
    assert.equal(await page.locator('[data-testid="install-invitation-install"]').count(),0);
    assert.equal(await invite.getAttribute('data-mode'),'instructions');
    assert.ok((await page.locator('[data-testid="install-invitation-text"]').innerText()).length>0);
  });

  // 2) Available prompt: install button appears and the real prompt() is invoked (accepted path).
  await firePrompt(page,'accepted');
  await page.locator('[data-testid="install-invitation-install"]').waitFor({timeout:5000});
  await check('available prompt reveals a real install action',async()=>{
    assert.equal(await invite.getAttribute('data-mode'),'prompt');
  });
  await check('accepting the prompt calls prompt() and stops offering (no re-nag)',async()=>{
    await page.locator('[data-testid="install-invitation-install"]').click();
    await invite.waitFor({state:'detached',timeout:5000});
    assert.equal(await page.evaluate(()=>window.__promptCalled||0),1);
  });

  // 3) Rejected prompt: still resolves and stops offering; no false install claim.
  const rejectPage=await context.newPage();
  await rejectPage.goto(origin+'/');
  await rejectPage.locator('[data-testid="install-invitation"]').waitFor({timeout:10000});
  await firePrompt(rejectPage,'dismissed');
  await rejectPage.locator('[data-testid="install-invitation-install"]').waitFor({timeout:5000});
  await check('rejected prompt is respected without a fabricated install confirmation',async()=>{
    await rejectPage.locator('[data-testid="install-invitation-install"]').click();
    await rejectPage.locator('[data-testid="install-invitation"]').waitFor({state:'detached',timeout:5000});
    assert.equal(await rejectPage.evaluate(()=>window.__promptCalled||0),1);
  });
  await rejectPage.close();

  // 4) Dismiss persists across reloads (respect the user's choice; no automatic popups).
  // Isolated context so the persisted dismissal does not leak into later scenarios.
  const dismissContext=await browser.newContext();
  await dismissContext.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){external.push(r.request().url());return r.abort();}return r.continue();});
  const dismissPage=await dismissContext.newPage();
  await dismissPage.goto(origin+'/');
  await dismissPage.locator('[data-testid="install-invitation-dismiss"]').waitFor({timeout:10000});
  await check('dismiss hides the area and persists on reload',async()=>{
    await dismissPage.locator('[data-testid="install-invitation-dismiss"]').click();
    await dismissPage.locator('[data-testid="install-invitation"]').waitFor({state:'detached',timeout:5000});
    await dismissPage.reload();
    await dismissPage.locator('footer[data-testid="site-footer"]').waitFor({timeout:10000});
    assert.equal(await dismissPage.locator('[data-testid="install-invitation"]').count(),0);
  });
  await dismissContext.close();

  // 5) Standalone/installed: never offer installation.
  const standaloneContext=await browser.newContext();
  await standaloneContext.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){external.push(r.request().url());return r.abort();}return r.continue();});
  await standaloneContext.addInitScript(()=>{
    const original=window.matchMedia.bind(window);
    window.matchMedia=query=>query.includes('display-mode: standalone')?{matches:true,media:query,onchange:null,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){},dispatchEvent(){return false;}}:original(query);
  });
  const standalonePage=await standaloneContext.newPage();
  await standalonePage.goto(origin+'/');
  await standalonePage.locator('footer[data-testid="site-footer"]').waitFor({timeout:10000});
  await check('standalone/installed context never offers installation',async()=>{
    assert.equal(await standalonePage.locator('[data-testid="install-invitation"]').count(),0);
  });
  await standaloneContext.close();

  // 6) Keyboard: the install action is reachable and activates with the keyboard.
  const keyboardPage=await context.newPage();
  await keyboardPage.goto(origin+'/');
  await keyboardPage.locator('[data-testid="install-invitation"]').waitFor({timeout:10000});
  await firePrompt(keyboardPage,'accepted');
  const installButton=keyboardPage.locator('[data-testid="install-invitation-install"]');
  await installButton.waitFor({timeout:5000});
  await check('install action is keyboard focusable and activates with the keyboard',async()=>{
    await installButton.focus();
    assert.equal(await keyboardPage.evaluate(()=>document.activeElement?.getAttribute('data-testid')),'install-invitation-install');
    await keyboardPage.keyboard.press('Enter');
    await keyboardPage.locator('[data-testid="install-invitation"]').waitFor({state:'detached',timeout:5000});
    assert.equal(await keyboardPage.evaluate(()=>window.__promptCalled||0),1);
  });
  await keyboardPage.close();

  // 7) Narrow viewport: the install area stays in the footer and never overlaps the chat launcher.
  const mobilePage=await context.newPage();
  await mobilePage.setViewportSize({width:360,height:720});
  await mobilePage.goto(origin+'/');
  await mobilePage.locator('[data-testid="install-invitation"]').scrollIntoViewIfNeeded();
  await mobilePage.locator('[data-testid="install-invitation"]').waitFor({timeout:10000});
  await check('narrow viewport keeps the install area clear of the chat launcher',async()=>{
    const inviteBox=await mobilePage.locator('[data-testid="install-invitation"]').boundingBox();
    const launcher=mobilePage.locator('[data-testid="chat-launcher"]');
    assert.ok(inviteBox&&inviteBox.width<=360,'install area fits the narrow viewport');
    if(await launcher.count()){
      const box=await launcher.boundingBox();
      if(box){const overlap=!(inviteBox.x+inviteBox.width<=box.x||box.x+box.width<=inviteBox.x||inviteBox.y+inviteBox.height<=box.y||box.y+box.height<=inviteBox.y);assert.equal(overlap,false,'install area and chat launcher do not overlap');}
    }
  });
  await mobilePage.close();

  assert.deepEqual(external,[],'no external requests');
  report.passed=true;
}finally{
  await browser.close();
  await new Promise(r=>server.close(r));
  await mkdir(dirname('.local/install/browser-install-invitation.json'),{recursive:true}).catch(()=>{});
  await writeFile('.local/install/browser-install-invitation.json',JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,scope:report.scope}));
