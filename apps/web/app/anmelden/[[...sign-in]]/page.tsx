import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { clerkConfiguration } from "../../../auth/policy";
export const dynamic = "force-dynamic";
export default function SignInPage() {
  return <section className="public-page"><span className="eyebrow">NEXIFY AI</span><h1>Anmelden</h1>{clerkConfiguration(process.env).ready ? <><SignIn routing="path" path="/anmelden" signUpUrl="/registrieren" forceRedirectUrl="/" /><p>Die Anmeldung allein erteilt keine Rollen- oder Mandantenrechte.</p></> : <div className="editorial-note"><h2>Anmeldung noch nicht verfügbar</h2><p>Die sichere Kontoanbindung ist noch nicht vollständig eingerichtet. Öffentliche Inhalte und die Besucherberatung bleiben erreichbar.</p><Link href="/">Zur Startseite</Link></div>}</section>;
}
