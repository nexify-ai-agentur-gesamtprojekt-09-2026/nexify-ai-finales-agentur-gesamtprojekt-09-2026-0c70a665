"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteLink } from "../Router";
import { ActionButton } from "../ActionControl";
import { api, type ApiError } from "./api";
import "./shop.css";
import "../HomeConcept.css";
import "../PageConcept.css";
import "../HomeMaster.css";
import AtelierFilm from "../AtelierFilm";
import { words as sceneWords } from "../SceneVideo";
import { Zeichen } from "../Zeichen";
import { brandImages } from "../../lib/brand-media";

// Was der Zugang bringt: woertlich aus dem bisherigen Einleitungssatz der Seite, nur gegliedert.
const ZUGANG = ["Persönliche Vorgänge", "Unterlagen", "Shop-Bestellungen"] as const;
const ZUGANG_ZEICHEN = ["brief", "ordner", "schloss"] as const;

type Mode = "login" | "register" | "forgot" | "reset";
const TITLES: Record<Mode, string> = { login: "Anmelden", register: "Konto erstellen", forgot: "Passwort vergessen", reset: "Neues Passwort festlegen" };
const FIELD_MSG: Record<string, string> = { invalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein.", too_short: "Das Passwort muss mindestens 10 Zeichen lang sein.", taken: "Diese E-Mail-Adresse ist bereits registriert", required: "Bitte füllen Sie dieses Feld aus." };

function GoogleButton() {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const start = () => { const redirectUrl = window.location.origin + "/anmelden"; window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`; };
  return <ActionButton variant="secondary" className="hc-text-link tk-cta" onClick={start} data-testid="google-login-button"><svg className="nx-zeichen" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 12.2c0 4.9-3.4 8.3-8.4 8.3a8.5 8.5 0 1 1 5.7-14.8M12.3 12.2h8.2"/></svg>Mit Google anmelden</ActionButton>;
}

export default function AuthForms({ mode, token = "" }: { mode: Mode; token?: string }) {
  const router = useRouter();
  const [ready,setReady]=useState(false);
  useEffect(()=>setReady(true),[]);
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({}), [message, setMessage] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  async function landing(user?:{role?:string}){const next=new URLSearchParams(window.location.search).get('next');if(next?.startsWith('/')&&!next.startsWith('//')){router.push(next);return;}const me=user||await api<{role?:string}>('/api/auth/me');router.push(me.role==='admin'?'/intern/leitstand':'/portal/kunde');}
  const processed = useRef(false);
  useEffect(() => {
    const match = window.location.hash.match(/session_id=([^&]+)/);
    if (!match || processed.current) return;
    processed.current = true; window.history.replaceState(null, "", window.location.pathname+window.location.search);
    api("/api/auth/google/session", { method: "POST", json: { session_id: decodeURIComponent(match[1]) } }).then(() => landing()).catch(() => setMessage("Die Anmeldung mit Google ist fehlgeschlagen."));
  }, [router]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage(""); setNotice("");
    const local: Record<string, string> = {};
    if (mode !== "reset" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) local.email = email.trim() ? "invalid" : "required";
    if ((mode === "register" || mode === "reset") && password.length < 10) local.password = "too_short";
    if (mode === "login" && !password) local.password = "required";
    setErrors(local); if (Object.keys(local).length) return;
    setBusy(true);
    try {
      if (mode === "login") {const user=await api<{role?:string}>("/api/auth/login", { method: "POST", json: { email, password } });await landing(user);}
      if (mode === "register") {const user=await api<{role?:string}>("/api/auth/register", { method: "POST", json: { email, password, name } });await landing(user);}
      if (mode === "forgot") setNotice((await api<{ message: string }>("/api/auth/forgot-password", { method: "POST", json: { email } })).message);
      if (mode === "reset") { await api("/api/auth/reset-password", { method: "POST", json: { token, password } }); setNotice("Ihr Passwort wurde geändert. Sie können sich jetzt anmelden."); }
    } catch (failure) {
      const e = failure as ApiError;
      if (e.fields) setErrors(e.fields);
      setMessage(e.fields ? "" : String(e.body?.message || "Die Aktion ist fehlgeschlagen. Bitte versuchen Sie es erneut."));
    } finally { setBusy(false); }
  }
  const field = (key: string, label: string, value: string, set: (v: string) => void, type: string, auto: string) => {
    const input = <input id={"auth-" + key} type={type === "password" && show ? "text" : type} autoComplete={auto} value={value} onChange={e => set(e.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? "auth-" + key + "-error" : undefined} data-testid={"auth-" + key + "-input"} />;
    // Felder wie im Kontaktformular (tk-field). Nur das Passwortfeld bekommt eine Hülle für den Sichtbarkeits-Schalter.
    return <div className="tk-field is-wide" key={key}><label htmlFor={"auth-" + key}>{label}</label>
    {type === "password" ? <span className="nx-feld">{input}<button type="button" className="nx-feld-schalter" onClick={() => setShow(v => !v)} aria-pressed={show} aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"} title={show ? "Passwort verbergen" : "Passwort anzeigen"}><Zeichen name={show ? "auge-aus" : "auge"} /></button></span> : input}
    {errors[key] && <p id={"auth-" + key + "-error"} role="alert" className="tk-field-error" data-testid={"auth-" + key + "-error"}>{FIELD_MSG[errors[key]] || FIELD_MSG.invalid}</p>}</div>;
  };
  const testId = "auth-" + mode;
  return <div className="home-concept page-concept tk-shop nx-konto" data-testid={testId}>
   <section className="hc-container nx-konto-buehne" aria-labelledby={testId + "-title"}>
    <div className="nx-konto-blatt">
     <nav className="pc-breadcrumb" aria-label="Brotkrumennavigation"><ol><li><SiteLink href="/" data-testid={testId + "-home"}>Startseite</SiteLink><span aria-hidden="true">/</span></li><li><span aria-current="page">{TITLES[mode]}</span></li></ol></nav>
     <h1 id={testId + "-title"} data-testid={testId + "-title"}>{TITLES[mode]}</h1>
     <p className="nx-konto-lead">Das Konto ist für persönliche Vorgänge, Unterlagen und Shop-Bestellungen vorgesehen. Diese Bereiche sind noch im Aufbau; Registrierung und Anmeldung sind zurzeit nicht in Betrieb.</p>
    <form className="tk-form tk-auth" method="post" noValidate onSubmit={submit} data-testid={"auth-" + mode + "-form"}>
      {mode === "register" && field("name", "Name (optional)", name, setName, "text", "name")}
      {mode !== "reset" && field("email", "E-Mail-Adresse", email, setEmail, "email", "email")}
      {mode !== "forgot" && field("password", mode === "login" ? "Passwort" : "Passwort (mindestens 10 Zeichen)", password, setPassword, "password", mode === "login" ? "current-password" : "new-password")}
      {message && <p role="alert" className="tk-alert" data-testid="auth-error">{message}</p>}
      {notice && <p role="status" className="tk-success" data-testid="auth-notice">{notice}</p>}
      <ActionButton variant="primary" className="hc-finish-primary tk-cta" type="submit" disabled={busy||!ready} data-testid={"auth-" + mode + "-submit"}>{mode === "login" ? "Anmelden" : mode === "register" ? "Konto erstellen" : mode === "forgot" ? "Link anfordern" : "Passwort speichern"}</ActionButton>
      {(mode === "login" || mode === "register") && <><span className="nx-konto-oder" aria-hidden="true">oder</span><GoogleButton /></>}
      <div className="tk-actions">
        {mode !== "login" && <p><span>Bereits ein Konto?</span> <SiteLink href="/anmelden" data-testid="auth-link-login">Zur Anmeldung</SiteLink></p>}
        {mode !== "register" && <p><SiteLink href="/registrieren" data-testid="auth-link-register">Neues Konto erstellen</SiteLink></p>}
        {mode === "login" && <p><SiteLink href="/passwort-vergessen" data-testid="auth-link-forgot">Passwort vergessen?</SiteLink></p>}
        <p className="nx-konto-hinweis"><SiteLink href="/datenschutz">Datenschutz</SiteLink></p>
      </div>
    </form>
    </div>
    <aside className="nx-konto-szene" aria-labelledby={testId + "-szene"}>
     {/* Exakt die Einbettung der Startseite (identity-media > identity-hero-photo > AtelierFilm); startet nur auf Klick. */}
     <div className="identity-media"><figure className="identity-hero-photo"><AtelierFilm hero locale="de" asset={{src:"/media/scenes/tablet-foyer-20261113.mp4",poster:brandImages.workspace.src,posterAlt:brandImages.workspace.alt,width:1280,height:720,title:sceneWords.de.title,hasAudio:true,autoplayWithAudio:false,autostart:false}}/></figure></div>
     <div className="nx-konto-nutzen">
      <span className="hc-kicker" id={testId + "-szene"}>NEXIFY AI<span aria-hidden="true"> / </span>Ihr NeXify-Konto</span>
      <ul>{ZUGANG.map((label, i) => <li key={label}><Zeichen name={ZUGANG_ZEICHEN[i]} />{label}</li>)}</ul>
      <p>Zusätzliche Produkt- und Partnerberechtigungen werden separat freigeschaltet.</p>
     </div>
    </aside>
   </section>
  </div>;
}
