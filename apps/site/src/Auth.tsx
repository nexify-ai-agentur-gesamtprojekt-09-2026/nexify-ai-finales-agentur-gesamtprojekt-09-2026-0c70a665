import {createContext,useContext,lazy,Suspense,type ReactNode} from "react";
import {deDE} from "@clerk/localizations/de-DE";
import {useUI} from "../../web/components/Workspace";
import {SiteLink} from "../../web/components/Router";
import {AUTH_REDIRECT,publicAuthConfiguration} from "./auth-policy.mjs";

type Widgets={SignIn:typeof import("@clerk/react").SignIn;SignUp:typeof import("@clerk/react").SignUp;Show:typeof import("@clerk/react").Show;UserButton:typeof import("@clerk/react").UserButton};
const AuthAvailability=createContext<{loading?:boolean;widgets?:Widgets}>({});
const ClerkBoundary=lazy(async()=>{
  const {ClerkProvider,SignIn,SignUp,Show,UserButton}=await import("@clerk/react");
  return {default:function ConfiguredClerk({publishableKey,children}:{publishableKey:string;children:ReactNode}) {
    return <ClerkProvider publishableKey={publishableKey} localization={deDE}
      signInUrl="/anmelden" signUpUrl="/registrieren"
      signInForceRedirectUrl={AUTH_REDIRECT} signUpForceRedirectUrl={AUTH_REDIRECT}
      afterSignOutUrl={AUTH_REDIRECT}>
      <AuthAvailability.Provider value={{widgets:{SignIn,SignUp,Show,UserButton}}}>{children}</AuthAvailability.Provider>
    </ClerkProvider>;
  }};
});
export function PublicAuthProvider({children,hashMode=false}:{children:ReactNode;hashMode?:boolean}) {
  const configuration=publicAuthConfiguration({
    VITE_CLERK_ENABLED:import.meta.env.VITE_CLERK_ENABLED,
    VITE_CLERK_PUBLISHABLE_KEY:import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  },{hashMode});
  // This public capability switch neither verifies server readiness nor creates
  // role/tenant membership. Offline file/hash previews never initialize Clerk.
  if(!configuration.enabled)return <AuthAvailability.Provider value={{}}>{children}</AuthAvailability.Provider>;
  return <Suspense fallback={<AuthAvailability.Provider value={{loading:true}}>{children}</AuthAvailability.Provider>}>
    <ClerkBoundary publishableKey={configuration.publishableKey!}>{children}</ClerkBoundary>
  </Suspense>;
}
export function AccountControl() {
  const {widgets,loading}=useContext(AuthAvailability);
  const {locale}=useUI();
  const login=locale==='nl'?'Aanmelden':locale==='fr'?'Se connecter':'Anmelden';
  const account=locale==='nl'?'Account en afmelden':locale==='fr'?'Compte et déconnexion':'Konto und Abmelden';
  if(loading)return <span className="account-control is-loading" aria-label={login} aria-busy="true"/>;
  if(!widgets)return <SiteLink className="account-control account-link" href="/anmelden">{login}</SiteLink>;
  const {Show,UserButton}=widgets;
  return <span className="account-control"><Show when="signed-out" fallback={
    <span aria-label={account}><UserButton/></span>
  }><SiteLink className="account-link" href="/anmelden">{login}</SiteLink></Show></span>;
}
export function AuthenticationPanel({mode}:{mode:"login"|"signup"}) {
  const {widgets,loading}=useContext(AuthAvailability);
  const {locale}=useUI();
  if(loading)return <div className="auth-fallback editorial-note" role="status">{locale==='nl'?'Aanmelding wordt voorbereid…':locale==='fr'?'Préparation de la connexion…':'Anmeldung wird vorbereitet…'}</div>;
  if(!widgets)return <div className="auth-fallback editorial-note" role="status"><strong>{locale==='nl'?'Aanmelden is hier nog niet geactiveerd.':locale==='fr'?'La connexion n’est pas encore activée ici.':'Die Anmeldung ist hier noch nicht aktiviert.'}</strong><p>{locale==='nl'?'Voer geen wachtwoorden in. Neem bij vragen contact met ons op.':locale==='fr'?'Ne saisissez aucun mot de passe. Contactez-nous pour toute question.':'Es werden keine Zugangsdaten angefordert. Nutzen Sie bei Fragen die Kontaktseite.'}</p></div>;
  const {SignIn,SignUp}=widgets;
  return <div className="public-auth">
    {mode==="signup" ? <SignUp routing="hash" signInUrl="/anmelden" forceRedirectUrl={AUTH_REDIRECT}/> : <SignIn routing="hash" signUpUrl="/registrieren" forceRedirectUrl={AUTH_REDIRECT}/>}
    <p>{locale==='nl'?'Een account geeft niet automatisch beheerdersrechten of toegang tot bedrijfsgegevens.':locale==='fr'?'Un compte n’accorde automatiquement aucun droit d’administration ni accès aux données professionnelles.':'Ein Konto erteilt keine automatische Adminrolle und keine Freigabe für Mandanten- oder Geschäftsdaten.'}</p>
  </div>;
}
