"use client";
import { useState, type FormEvent } from "react";
import { api, type ApiError } from "./shop/api";
import "./shop/shop.css";

const MSG: Record<string, string> = { required: "Bitte füllen Sie dieses Feld aus.", invalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein.", too_short: "Bitte beschreiben Sie Ihr Anliegen in mindestens 10 Zeichen." };

export default function ContactRequestForm({ kind = "contact" }: { kind?: "contact" | "partner" }) {
  const partner = kind === "partner";
  const [errors, setErrors] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), [number, setNumber] = useState(""), [failure, setFailure] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const body = { name: String(form.get("name") || ""), email: String(form.get("email") || ""), company: String(form.get("company") || ""), message: String(form.get("message") || ""), consent: form.get("consent") === "on", kind, page_path: partner ? "/teileklar/partner-werden" : "/kontakt" };
    const local: Record<string, string> = {};
    if (body.name.trim().length < 2) local.name = "required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email.trim())) local.email = "invalid";
    if (body.message.trim().length < 10) local.message = "too_short";
    if (!body.consent) local.consent = "required";
    if (partner && body.company.trim().length < 2) local.company = "required";
    setErrors(local); setFailure("");
    if (Object.keys(local).length) return;
    setBusy(true);
    try { setNumber((await api<{ number: string }>("/api/requests", { method: "POST", json: body })).number); }
    catch (e) { const err = e as ApiError; if (err.fields) setErrors(err.fields); else setFailure(err.status === 429 ? "Zu viele Anfragen. Bitte versuchen Sie es später erneut." : "Die Anfrage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut."); }
    finally { setBusy(false); }
  }
  if (number) return <section className="tk-notice" role="status" data-testid="contact-success"><strong>{partner ? "Ihre Partneranfrage ist eingegangen." : "Ihre Anfrage ist eingegangen."}</strong><p>Vorgangsnummer: <span data-testid="contact-number">{number}</span>. Wir melden uns per E-Mail.</p></section>;
  const field = (name: string, label: string, input: React.ReactNode) => <label className={"tk-field" + (name === "message" ? " is-wide" : "")}>{label}{input}{errors[name] && <span className="tk-field-error" data-testid={`contact-${name}-error`}>{MSG[errors[name]] || MSG.required}</span>}</label>;
  return <form className="tk-form" onSubmit={submit} noValidate aria-labelledby="contact-form-title" data-testid="contact-form">
    <h2 id="contact-form-title">{partner ? "Als Partnerwerkstatt anfragen" : "Anfrage senden"}</h2>
    <p className="tk-meta">Pflichtfelder sind mit * markiert.</p>
    <div className="tk-form-grid">
      {field("name", "Name *", <input name="name" autoComplete="name" maxLength={100} aria-invalid={!!errors.name} data-testid="contact-name" />)}
      {field("email", "E-Mail *", <input name="email" type="email" autoComplete="email" maxLength={160} aria-invalid={!!errors.email} data-testid="contact-email" />)}
      {field("company", partner ? "Werkstatt / Betrieb *" : "Unternehmen", <input name="company" autoComplete="organization" maxLength={120} aria-invalid={!!errors.company} data-testid="contact-company" />)}
      {field("message", "Ihr Anliegen *", <textarea name="message" rows={5} maxLength={4000} aria-invalid={!!errors.message} data-testid="contact-message" />)}
    </div>
    <label className="tk-check"><input type="checkbox" name="consent" aria-invalid={!!errors.consent} data-testid="contact-consent" /> Ich bin einverstanden, dass meine Angaben zur Bearbeitung der Anfrage gespeichert werden. Details in der <a href="/datenschutz">Datenschutzerklärung</a>. *</label>
    {errors.consent && <span className="tk-field-error" data-testid="contact-consent-error">{MSG.required}</span>}
    {failure && <p role="alert" className="tk-field-error" data-testid="contact-error">{failure}</p>}
    <div className="tk-actions"><button className="primary-button" type="submit" disabled={busy} data-testid="contact-submit">{busy ? "Wird gesendet …" : "Anfrage senden"}</button></div>
  </form>;
}
