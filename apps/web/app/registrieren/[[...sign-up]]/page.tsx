import { SignUp } from "@clerk/nextjs";
import { clerkConfiguration } from "../../../auth/policy";
export const dynamic = "force-dynamic";
export default function SignUpPage() {
  return <section className="public-page"><span className="eyebrow">NEXIFY AI</span><h1>Konto erstellen</h1>{clerkConfiguration(process.env).ready ? <><SignUp routing="path" path="/registrieren" signInUrl="/anmelden" forceRedirectUrl="/" /><p>Ein neues Konto erhält keine automatische Adminrolle und keine Mandantenfreigabe.</p></> : <div className="editorial-note"><p>Die sichere Registrierung ist noch nicht vollständig eingerichtet. Es wurde kein Konto erstellt.</p></div>}</section>;
}
