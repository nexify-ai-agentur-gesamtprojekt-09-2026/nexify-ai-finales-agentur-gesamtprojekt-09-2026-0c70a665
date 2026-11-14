import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {prepareInstallation} from '../../scripts/generate-public-data.mjs';
import {preparePublicData} from '../../../site/scripts/generate-public-data.mjs';
import {publicInstallationManifest} from '../../../site/pwa/plugin.mjs';
// Run the shared worker's behavioral cases in the Next test suite too: offline
// language/brand, online errors, and exclusion of API, writes and cross-origin.
import '../../../site/tests/pwa-offline-worker.test.mjs';

test('Next installation stays opt-in; its manifest builds on the shared one with central tokens and only shipped files',async()=>{
 const tokens=JSON.parse(await readFile(new URL('../../../../packages/tokens/tokens.json',import.meta.url),'utf8'));
 const worker=await readFile(new URL('../../pwa/worker.js',import.meta.url),'utf8');
 for(const mode of [undefined,'true','production','PUBLIC-PWA'])assert.deepEqual(prepareInstallation(mode,tokens,worker),{enabled:false,manifest:null,worker:null});
 const enabled=prepareInstallation('public-pwa',tokens,worker),shared=publicInstallationManifest(tokens);
 assert.equal(enabled.worker,worker);
 for(const field of ['id','name','short_name','start_url','scope','display','lang'])assert.equal(enabled.manifest[field],shared[field],field);
 assert.equal(enabled.manifest.dir,'ltr');assert.equal(enabled.manifest.theme_color,tokens['color-dunkel-grund']);assert.equal(enabled.manifest.background_color,tokens['color-dunkel-grund']);
 // Icons: a subset of the shared list, and every file is really shipped by apps/web (the shared /signet.svg is not).
 assert.deepEqual(enabled.manifest.icons.map(icon=>icon.sizes+' '+icon.purpose).sort(),['192x192 any','512x512 any','512x512 maskable']);
 for(const icon of enabled.manifest.icons){assert.ok(shared.icons.some(candidate=>JSON.stringify(candidate)===JSON.stringify(icon)));await access(new URL('../../public'+icon.src,import.meta.url));}
 // Shortcuts lead only to existing public pages.
 const map=JSON.parse(await readFile(new URL('../../../../config/site-map.json',import.meta.url),'utf8'));
 const publicPaths=map.pages.filter(p=>p.access.visibility==='public'&&!p.access.auth_required&&map.public_allowlist.includes(p.id)).map(p=>p.path);
 assert.ok(enabled.manifest.shortcuts.length>0);
 for(const shortcut of enabled.manifest.shortcuts){assert.ok(publicPaths.includes(shortcut.url),shortcut.url);assert.ok(shortcut.name);}
});

// Since 14.11.2026 apps/web ships its own worker (pwa/worker.js) with a bounded static cache and the offline page;
// its limits are tested in pwa-worker.test.mjs. Neither worker may take over an open session or use push/sync,
// and the shared apps/site worker stays free of CacheStorage.
test('no public worker takes over open sessions or uses push/sync; the shared site worker stays cache-free',async()=>{
 const shared=await readFile(new URL('../../../site/pwa/worker.js',import.meta.url),'utf8');
 const next=await readFile(new URL('../../pwa/worker.js',import.meta.url),'utf8');
 for(const worker of [shared,next])assert.doesNotMatch(worker,/\bskipWaiting\s*\(|\bclients\s*\.\s*claim\s*\(|addEventListener\s*\(\s*['"](?:sync|push)['"]/);
 assert.doesNotMatch(shared,/\bcaches\s*(?:\.|\[)/);
});

test('the shared public projection excludes a private page even when accidentally allowlisted',async()=>{
 const map=JSON.parse(await readFile(new URL('../../../../config/site-map.json',import.meta.url),'utf8'));
 const privateIds=map.pages.filter(p=>p.access.visibility!=='public'||p.access.auth_required).map(p=>p.id);
 const projection=preparePublicData({...map,public_allowlist:[...map.public_allowlist,...privateIds]});
 assert.equal(projection.pages.length,43);
 assert.ok(projection.pages.every(p=>!privateIds.includes(p.id)));
});
