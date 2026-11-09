import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareInstallation} from '../../scripts/generate-public-data.mjs';
import {preparePublicData} from '../../../site/scripts/generate-public-data.mjs';
import {publicInstallationManifest} from '../../../site/pwa/plugin.mjs';

test('Next installation stays opt-in and reuses the network-only worker and central tokens',async()=>{
 const tokens=JSON.parse(await readFile(new URL('../../../../packages/tokens/tokens.json',import.meta.url),'utf8'));
 const worker=await readFile(new URL('../../../site/pwa/worker.js',import.meta.url),'utf8');
 for(const mode of [undefined,'true','production','PUBLIC-PWA'])assert.deepEqual(prepareInstallation(mode,tokens,worker),{enabled:false,manifest:null,worker:null});
 const enabled=prepareInstallation('public-pwa',tokens,worker);
 assert.deepEqual(enabled.manifest,publicInstallationManifest(tokens));assert.equal(enabled.worker,worker);
 assert.doesNotMatch(worker,/caches\.|fetch\(|skipWaiting\(|clients\.claim\(|['"](?:fetch|sync|push)['"]/);
});

test('the shared public projection excludes a private page even when accidentally allowlisted',async()=>{
 const map=JSON.parse(await readFile(new URL('../../../../config/site-map.json',import.meta.url),'utf8'));
 const privateIds=map.pages.filter(p=>p.access.visibility!=='public'||p.access.auth_required).map(p=>p.id);
 const projection=preparePublicData({...map,public_allowlist:[...map.public_allowlist,...privateIds]});
 assert.equal(projection.pages.length,43);
 assert.ok(projection.pages.every(p=>!privateIds.includes(p.id)));
});
