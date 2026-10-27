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
test('only public Clerk variables are consumed; forced redirects stay fixed and no membership is minted',()=>{
 const source=readFileSync(new URL('../src/Auth.tsx',import.meta.url),'utf8');
 assert.deepEqual([...new Set([...source.matchAll(/import\.meta\.env\.([A-Z0-9_]+)/g)].map(match=>match[1]))].sort(),['VITE_CLERK_ENABLED','VITE_CLERK_PUBLISHABLE_KEY']);
 assert.doesNotMatch(source,/CLERK_SECRET|AUTH0|unsafeMetadata|publicMetadata|roles?\s*:/);
 assert.equal(AUTH_REDIRECT,'/');
 assert.match(source,/signInForceRedirectUrl=\{AUTH_REDIRECT\}/);assert.match(source,/signUpForceRedirectUrl=\{AUTH_REDIRECT\}/);
 assert.match(source,/<SignIn routing="hash"/);assert.match(source,/<SignUp routing="hash"/);
 assert.match(source,/localization=\{deDE\}/);
 assert.match(source,/<Show when="signed-out"/);
 assert.match(source,/<UserButton\/>/);
 assert.match(source,/afterSignOutUrl=\{AUTH_REDIRECT\}/);
});
test('the wrapper retains public media, guide and honest disabled fallback',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 for(const marker of ['<PresenterGuide ','<ExplainerSections ','<PublicAuthProvider hashMode={hashMode}>','<AuthenticationPanel mode=','accountControl={<AccountControl/>}'])assert.ok(source.includes(marker),marker);
 const auth=readFileSync(new URL('../src/Auth.tsx',import.meta.url),'utf8');
 assert.match(auth,/auth-fallback editorial-note/);assert.match(auth,/keine automatische Adminrolle/);
 assert.match(source,/routeIndex\.get\(path\)/);
});
