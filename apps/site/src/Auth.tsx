import {Component,lazy,Suspense,useState,type ReactNode} from "react";
import {deDE,nlNL,frFR} from "@clerk/localizations";
import {SiteLink} from "../../web/components/Router";
import {useUI} from "../../web/components/Workspace";
import type {Locale} from "../../web/lib/i18n";
import {AUTH_REDIRECT,publicAuthConfiguration} from "./auth-policy.mjs";

const copy={
 de:{loading:"Anmeldung wird vorbereitet…",disabled:"Die Anmeldung ist hier noch nicht aktiviert.",unavailable:"Die Anmeldung ist momentan nicht verfügbar.",help:"Es werden keine Zugangsdaten angefordert. Nutze bei Fragen die Kontaktseite.",signedIn:"Du bist angemeldet.",signOut:"Abmelden",signingOut:"Abmeldung läuft…",signOutError:"Die Abmeldung konnte nicht bestätigt werden. Bitte erneut versuchen.",disclaimer:"Ein Konto erteilt keine automatische Adminrolle und keine Freigabe für Mandanten- oder Geschäftsdaten."},
 nl:{loading:"Aanmelding wordt voorbereid…",disabled:"Aanmelden is hier nog niet geactiveerd.",unavailable:"Aanmelden is momenteel niet beschikbaar.",help:"Voer geen wachtwoorden in. Neem bij vragen contact met ons op.",signedIn:"U bent aangemeld.",signOut:"Afmelden",signingOut:"Bezig met afmelden…",signOutError:"Afmelden kon niet worden bevestigd. Probeer het opnieuw.",disclaimer:"Een account geeft niet automatisch beheerdersrechten of toegang tot bedrijfsgegevens."},
 fr:{loading:"Préparation de la connexion…",disabled:"La connexion n’est pas encore activée ici.",unavailable:"La connexion est momentanément indisponible.",help:"Ne saisissez aucun mot de passe. Contactez-nous pour toute question.",signedIn:"Vous êtes connecté.",signOut:"Se déconnecter",signingOut:"Déconnexion en cours…",signOutError:"La déconnexion n’a pas pu être confirmée. Réessayez.",disclaimer:"Un compte n’accorde automatiquement aucun droit d’administration ni accès aux données professionnelles."}
};
const localizations={de:deDE,nl:nlNL,fr:frFR};
type Mode="login"|"signup";
function AuthStatus({kind}:{kind:"loading"|"disabled"|"unavailable"}){
 const {locale}=useUI();const text=copy[locale];
 return <div className="auth-fallback editorial-note" role="status"><strong>{text[kind]}</strong>{kind!=="loading"&&<p>{text.help}</p>}</div>;
}
class AuthErrorBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}
const ClerkBoundary=lazy(async()=>{
 const {ClerkProvider,SignIn,SignUp,useAuth,useClerk}=await import("@clerk/react");
 function AccountPanel({mode,locale}:{mode:Mode;locale:Locale}){
  const {isLoaded,isSignedIn}=useAuth();const {signOut}=useClerk();
  const [busy,setBusy]=useState(false);const [failed,setFailed]=useState(false);const text=copy[locale];
  async function leave(){
   if(busy)return;
   setBusy(true);setFailed(false);
   try{await signOut({redirectUrl:AUTH_REDIRECT});}catch{setFailed(true);}finally{setBusy(false);}
  }
  if(!isLoaded)return <AuthStatus kind="loading"/>;
  return <div className="public-auth">
   {isSignedIn?<><p>{text.signedIn}</p><button type="button" className="outline-button" disabled={busy} onClick={()=>void leave()}>{busy?text.signingOut:text.signOut}</button>{failed&&<p role="alert">{text.signOutError}</p>}</>
    :mode==="signup"?<SignUp routing="hash" signInUrl="/anmelden" forceRedirectUrl={AUTH_REDIRECT}/>:<SignIn routing="hash" signUpUrl="/registrieren" forceRedirectUrl={AUTH_REDIRECT}/>}
   <p>{text.disclaimer}</p>
  </div>;
 }
 return {default:function ConfiguredClerk({publishableKey,mode,locale}:{publishableKey:string;mode:Mode;locale:Locale}){
  return <ClerkProvider publishableKey={publishableKey} localization={localizations[locale]}
   signInUrl="/anmelden" signUpUrl="/registrieren"
   signInForceRedirectUrl={AUTH_REDIRECT} signUpForceRedirectUrl={AUTH_REDIRECT} afterSignOutUrl={AUTH_REDIRECT}>
   <AccountPanel mode={mode} locale={locale}/>
  </ClerkProvider>;
 }};
});
export function AuthenticationPanel({mode,hashMode=false}:{mode:Mode;hashMode?:boolean}){
 const {locale}=useUI();
 const configuration=publicAuthConfiguration({
  VITE_CLERK_ENABLED:import.meta.env.VITE_CLERK_ENABLED,
  VITE_CLERK_PUBLISHABLE_KEY:import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
 },{hashMode});
 // This capability switch grants no tenant/role access. Only this route-local
 // panel loads the SDK; public pages and Workspace state stay outside Suspense.
 if(!configuration.enabled)return <AuthStatus kind="disabled"/>;
 return <AuthErrorBoundary fallback={<AuthStatus kind="unavailable"/>}>
  <Suspense fallback={<AuthStatus kind="loading"/>}>
   <ClerkBoundary publishableKey={configuration.publishableKey!} mode={mode} locale={locale}/>
  </Suspense>
 </AuthErrorBoundary>;
}

// Public navigation reaches the existing route-local account lifecycle. Loading
// an identity SDK on every public page must not replace shell state or mint rights.
export function AccountControl(){
 const {locale}=useUI();
 const label={de:"Kundenbereich",nl:"Klantenzone",fr:"Espace client"}[locale];
 return <SiteLink className="account-control account-link" href="/anmelden">{label}</SiteLink>;
}
