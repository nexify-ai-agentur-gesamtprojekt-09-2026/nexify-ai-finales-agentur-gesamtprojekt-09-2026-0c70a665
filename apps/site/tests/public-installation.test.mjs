import test from 'node:test';
import assert from 'node:assert/strict';
import {registerPublicInstallation} from '../src/public-installation.mjs';
import {publicPwaPlugin} from '../pwa/plugin.mjs';
const env=()=>({isSecureContext:true,location:{protocol:'https:'},navigator:{serviceWorker:{register:async()=>{}}}});
test('default/standalone/unknown build modes emit no manifest or worker',()=>{
 for(const mode of ['production','standalone','development','PUBLIC-PWA',undefined]){const p=publicPwaPlugin(mode);assert.equal(p.config().define.__PUBLIC_PWA__,'false');assert.deepEqual(p.transformIndexHtml(),[]);p.generateBundle.call({emitFile(){assert.fail('unexpected artifact')}});}
});
test('explicit mode emits network-only installation and unchanged existing brand icon',()=>{
 const p=publicPwaPlugin('public-pwa'),files=[];p.generateBundle.call({emitFile:f=>files.push(f)});assert.equal(files.length,2);const manifest=JSON.parse(files[0].source);assert.equal(manifest.icons[0].src,'/signet.svg');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(p.config().define.__PUBLIC_PWA__,'true');
});
test('missing capability, insecure, file and standalone fail closed',async()=>{
 for(const overrides of [{isSecureContext:false},{location:{protocol:'file:'}},{__NEXIFY_STANDALONE_PREVIEW__:true},{navigator:{}}]){const e={...env(),...overrides};if(e.navigator.serviceWorker)e.navigator.serviceWorker.register=()=>assert.fail('registration');assert.equal((await registerPublicInstallation(true,e)).status,'disabled');}
 for(const flag of [undefined,false,'true',1])assert.equal((await registerPublicInstallation(flag,env())).status,'disabled');
});
test('exact worker registration, errors remain explicit without retry',async()=>{
 const e=env();let calls=0;e.navigator.serviceWorker.register=async(url,options)=>{calls++;assert.equal(url,'/public-install-worker.js');assert.deepEqual(options,{scope:'/',updateViaCache:'none'});throw Error('denied');};assert.equal((await registerPublicInstallation(true,e)).status,'unavailable');assert.equal(calls,1);
 e.navigator.serviceWorker.register=async()=>{};assert.equal((await registerPublicInstallation(true,e)).status,'registered_network_only');
});
