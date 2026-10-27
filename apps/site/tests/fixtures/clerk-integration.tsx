// Synthetic local SDK adapter: no account, token, customer or network authority.
import {useSyncExternalStore,type ReactNode} from 'react';
const state=()=>Boolean((window as Window&{fixtureSignedIn?:boolean}).fixtureSignedIn);
const subscribe=(fn:()=>void)=>{window.addEventListener('fixture-session',fn);return()=>window.removeEventListener('fixture-session',fn);};
function change(value:boolean){(window as Window&{fixtureSignedIn?:boolean}).fixtureSignedIn=value;window.dispatchEvent(new Event('fixture-session'));}
export function ClerkProvider({children,localization}:{children:ReactNode;localization:{locale:string}}){return <div data-fixture-locale={localization.locale}>{children}</div>;}
export function SignIn(){return <button data-fixture-login onClick={()=>change(true)}>Synthetic sign in</button>;}
export function SignUp(){return <button data-fixture-signup onClick={()=>change(true)}>Synthetic sign up</button>;}
export function useAuth(){return {isLoaded:true,isSignedIn:useSyncExternalStore(subscribe,state)};}
export function useClerk(){return {signOut:async(options:unknown)=>{
 const w=window as Window&{fixtureSignouts?:unknown[];fixtureFail?:boolean};
 if(w.fixtureFail)throw new Error('synthetic signout failure');
 (w.fixtureSignouts??=[]).push(options);change(false);
}};}
