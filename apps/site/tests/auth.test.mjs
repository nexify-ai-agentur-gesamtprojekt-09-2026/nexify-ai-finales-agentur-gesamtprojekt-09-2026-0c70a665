import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AUTH_REDIRECT,publicAuthConfiguration,validPublicClerkKey} from '../src/auth-policy.mjs';
const key='pk_live_'+btoa('clerk.example.invalid$');
test('auth is disabled by default and only explicit public true plus a valid key enables it',()=>{
 for(const flag of [undefined,false,true,'false','TRUE','1',''])assert.equal(publicAuthConfiguration({VITE_CLERK_ENABLED:flag,VITE_CLERK_PUBLISHABLE_KEY:key}).enabled,false);
 assert.deepEqual(publicAuthConfiguration({VITE_CLERK_ENABLED:'true',VITE_CLERK_PUBLISHABLE_KEY:key}),{enabled:true,publishableKey:key});
 assert.deepEqual(publicAuthConfiguration({VITE_CLERK_ENABLED:'false',VITE_CLERK_PUBLISHABLE_KEY:key}),{enabled:false,publishableKey:null});
 assert.equal(publicAuthConfiguration({VITE_CLERK_ENABLED:'true',VITE_CLERK_PUBLISHABLE_KEY:key},{hashMode:true}).enabled,false);
});
test('malformed public keys never mount a broken provider',()=>{
 for(const value of [null,undefined,'','pk_live_a','pk_live_====','pk_live_'+btoa('not-a-host'),'pk_live_'+btoa('host.example'),...['https://host.example$','user@host.example$','host..example$','host.example:443$','host.example$$','host.example$\n'].map(host=>'pk_live_'+btoa(host))]){
  assert.equal(validPublicClerkKey(value),false,String(value));
  assert.equal(publicAuthConfiguration({VITE_CLERK_ENABLED:'true',VITE_CLERK_PUBLISHABLE_KEY:value}).enabled,false);
 }
 assert.equal(validPublicClerkKey(key),true);
});
test('Clerk removed (D-007): no identity SDK, no env-driven auth and no membership is minted',()=>{
 const source=readFileSync(new URL('../src/Auth.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(source,/@clerk|import\.meta\.env|CLERK_SECRET|AUTH0|unsafeMetadata|publicMetadata|roles?\s*:/);
 assert.equal(AUTH_REDIRECT,'/');
 assert.match(source,/<SiteLink data-testid="site-auth-link" href="\/kontakt"/);
 assert.doesNotMatch(source,/href=\{mode===/);
});
test('the wrapper retains public media, guide and honest disabled fallback',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 for(const marker of ['<PublicExperience page={page} data={experienceData}','<PublicExperienceProvider data={experienceData}>','<AuthenticationPanel hashMode={hashMode} mode=','accountControl={<AccountControl/>}'])assert.ok(source.includes(marker),marker);
 const shared=readFileSync(new URL('../../web/components/PublicExperience.tsx',import.meta.url),'utf8');
 for(const marker of ['<PresenterGuide ','<ExplainerSections ','<ShopEntry/>','<HomeContent '])assert.ok(shared.includes(marker),marker);
 const auth=readFileSync(new URL('../src/Auth.tsx',import.meta.url),'utf8');
 assert.match(auth,/auth-fallback editorial-note/);assert.match(auth,/keine automatische Adminrolle/);
 assert.match(source,/routeIndex\.get\(path\)/);
});

test('header account control reaches route-local lifecycle without global provider',()=>{
 const auth=readFileSync(new URL('../src/Auth.tsx',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.match(auth,/export function AccountControl/);
 assert.match(auth,/<SiteLink className="account-control account-link" href="\/anmelden"/);
 assert.doesNotMatch(main,/<PublicAuthProvider/);
});
