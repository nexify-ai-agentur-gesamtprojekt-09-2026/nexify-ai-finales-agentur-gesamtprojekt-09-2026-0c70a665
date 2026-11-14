"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteLink } from "../Router";
import { api, type ApiError } from "./api";
import "./shop.css";

type Mode = "login" | "register" | "forgot" | "reset";
const TITLES: Record<Mode, string> = { login: "Anmelden", register: "Konto erstellen", forgot: "Passwort vergessen", reset: "Neues Passwort festlegen" };
const FIELD_MSG: Record<string, string> = { invalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein.", too_short: "Das Passwort muss mindestens 10 Zeichen lang sein.", taken: "Diese E-Mail-Adresse ist bereits registriert", required: "Bitte füllen Sie dieses Feld aus." };

function GoogleButton() {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const start = () => { const redirectUrl = window.location.origin + "/anmelden"; window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`; };
  return <button type="button" className="outline-button tk-cta" onClick={start} data-testid="google-login-button">Mit Google anmelden</button>;
}

export default function AuthForms({ mode, token = "" }: { mode: Mode; token?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({}), [message, setMessage] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const processed = useRef(false);
  useEffect(() => {
    const match = window.location.hash.match(/session_id=([^&]+)/);
    if (!match || processed.current) return;
    processed.current = true; window.history.replaceState(null, "", window.location.pathname);
    api("/api/auth/google/session", { method: "POST", json: { session_id: decodeURIComponent(match[1]) } }).then(() => router.push("/teileklar/bestellungen")).catch(() => setMessage("Die Anmeldung mit Google ist fehlgeschlagen."));
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
      if (mode === "login") { await api("/api/auth/login", { method: "POST", json: { email, password } }); router.push("/teileklar/bestellungen"); }
      if (mode === "register") { await api("/api/auth/register", { method: "POST", json: { email, password, name } }); router.push("/teileklar/bestellungen"); }
      if (mode === "forgot") setNotice((await api<{ message: string }>("/api/auth/forgot-password", { method: "POST", json: { email } })).message);
      if (mode === "reset") { await api("/api/auth/reset-password", { method: "POST", json: { token, password } }); setNotice("Ihr Passwort wurde geändert. Sie können sich jetzt anmelden."); }
    } catch (failure) {
      const e = failure as ApiError;
      if (e.fields) setErrors(e.fields);
      setMessage(e.fields ? "" : String(e.body?.message || "Die Aktion ist fehlgeschlagen. Bitte versuchen Sie es erneut."));
    } finally { setBusy(false); }
  }
  const field = (key: string, label: string, value: string, set: (v: string) => void, type: string, auto: string) => <div className="tk-field is-wide"><label htmlFor={"auth-" + key}>{label}</label>
    <input id={"auth-" + key} type={type} autoComplete={auto} value={value} onChange={e => set(e.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? "auth-" + key + "-error" : undefined} data-testid={"auth-" + key + "-input"} />
    {errors[key] && <p id={"auth-" + key + "-error"} role="alert" className="tk-field-error" data-testid={"auth-" + key + "-error"}>{FIELD_MSG[errors[key]] || FIELD_MSG.invalid}</p>}</div>;
  return <section className="public-page tk-shop" aria-labelledby="auth-title" data-testid={"auth-" + mode}>
    <header className="tk-shop-head"><span className="eyebrow">TEILEKLAR-Kundenkonto</span><h1 id="auth-title">{TITLES[mode]}</h1><p className="tk-meta" data-testid="auth-scope-note">Dieses Konto gilt für den TEILEKLAR-Shop: Bestellungen, Warenkorb und Werkstattanfragen. Es ist kein Zugang zur NeXify-Suite (NeX AIFly Suite, one, API); dieser Zugang ist noch nicht freigeschaltet.</p></header>
    <form className="tk-form tk-auth" noValidate onSubmit={submit} data-testid={"auth-" + mode + "-form"}>
      {mode === "register" && field("name", "Name (optional)", name, setName, "text", "name")}
      {mode !== "reset" && field("email", "E-Mail-Adresse", email, setEmail, "email", "email")}
      {mode !== "forgot" && field("password", mode === "login" ? "Passwort" : "Passwort (mindestens 10 Zeichen)", password, setPassword, "password", mode === "login" ? "current-password" : "new-password")}
      {message && <p role="alert" className="tk-alert" data-testid="auth-error">{message}</p>}
      {notice && <p role="status" className="tk-success" data-testid="auth-notice">{notice}</p>}
      <button className="primary-button tk-cta" type="submit" disabled={busy} data-testid={"auth-" + mode + "-submit"}>{mode === "login" ? "Anmelden" : mode === "register" ? "Konto erstellen" : mode === "forgot" ? "Link anfordern" : "Passwort speichern"}</button>
      {(mode === "login" || mode === "register") && <GoogleButton />}
      <div className="tk-actions">
        {mode !== "login" && <SiteLink href="/anmelden" data-testid="auth-link-login">Zur Anmeldung</SiteLink>}
        {mode !== "register" && <SiteLink href="/registrieren" data-testid="auth-link-register">Neues Konto erstellen</SiteLink>}
        {mode === "login" && <SiteLink href="/passwort-vergessen" data-testid="auth-link-forgot">Passwort vergessen?</SiteLink>}
      </div>
    </form>
  </section>;
}
