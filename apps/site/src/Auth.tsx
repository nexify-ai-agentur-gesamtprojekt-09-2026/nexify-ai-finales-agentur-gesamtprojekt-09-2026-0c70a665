import {SiteLink} from "../../web/components/Router";
import {useUI} from "../../web/components/Workspace";

// Clerk removed (DECISIONS D-007). Accounts live in the shop API (/api/auth); this
// preview adapter only points to the Next.js sign-in and never mints rights.
const copy={
 de:{disclaimer:"Ein Konto erteilt keine automatische Adminrolle und keine Freigabe für Mandanten- oder Geschäftsdaten.",note:"Die Anmeldung erfolgt über das TEILEKLAR-Kundenkonto.",login:"Zur Anmeldung",signup:"Konto erstellen"},
 nl:{disclaimer:"Een account geeft niet automatisch beheerdersrechten of toegang tot bedrijfsgegevens.",note:"Aanmelden gebeurt via het TEILEKLAR-klantaccount.",login:"Naar aanmelden",signup:"Account aanmaken"},
 fr:{disclaimer:"Un compte n’accorde automatiquement aucun droit d’administration ni accès aux données professionnelles.",note:"La connexion se fait via le compte client TEILEKLAR.",login:"Se connecter",signup:"Créer un compte"},
 en:{disclaimer:"An account grants no automatic admin role and no access to tenant or business data.",note:"Sign-in uses the TEILEKLAR customer account.",login:"Go to sign-in",signup:"Create account"}
};
type Mode="login"|"signup";
export function AuthenticationPanel({mode}:{mode:Mode;hashMode?:boolean}){
 const {locale}=useUI();const text=copy[locale];
 return <div className="auth-fallback editorial-note" role="status" data-testid="site-auth-panel">
  <strong>{text.note}</strong>
  <p><a data-testid="site-auth-link" href={mode==="signup"?"/registrieren":"/anmelden"}>{mode==="signup"?text.signup:text.login}</a></p>
  <p>{text.disclaimer}</p>
 </div>;
}

export function AccountControl(){
 const {locale}=useUI();
 const label={de:"Kundenbereich",nl:"Klantenzone",fr:"Espace client",en:"Customer area"}[locale];
 return <SiteLink className="account-control account-link" href="/anmelden">{label}</SiteLink>;
}
