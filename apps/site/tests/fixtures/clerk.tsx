// Synthetic SDK protocol fixture, used only by the local browser regression server.
import {useState,type ReactNode} from 'react';
export function ClerkProvider({children,localization}:{children:ReactNode;localization:{locale:string}}){return <div data-fixture-locale={localization.locale}>{children}</div>;}
export function SignIn(){return <div data-fixture-login>Fixture sign in</div>;}
export function SignUp(){return <div data-fixture-signup>Fixture sign up</div>;}
export function useAuth(){return {isLoaded:true,isSignedIn:true};}
export function useClerk(){
 const [,setCount]=useState(0);
 return {signOut:async(options:unknown)=>{
  const w=window as Window&{fixtureSignouts?:unknown[];fixtureFail?:boolean};
  if(w.fixtureFail)throw new Error('synthetic signout failure');
  (w.fixtureSignouts??=[]).push(options);setCount(n=>n+1);
 }};
}
