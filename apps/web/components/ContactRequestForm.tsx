"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, type ApiError } from "./shop/api";
import {useUI} from './Workspace';
import {contactCopy} from '../lib/contact-copy';
import {contactAttempt,persistContactAttempt,readContactAttempt,type ContactAttempt} from '../lib/contact-attempt';
import {takeOracleBrief} from '../lib/project-brief-transfer';
import "./shop/shop.css";

export default function ContactRequestForm({ kind = "contact",topic }: { kind?: "contact" | "partner";topic?:string }) {
  const [ready,setReady]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{if(kind==='contact'&&!topic){try{const brief=takeOracleBrief(sessionStorage);if(brief)setMessage(brief);}catch{/* The form remains editable without session storage. */}}setReady(true);},[kind,topic]);
  const partner = kind === "partner";
  const {locale}=useUI();const text=contactCopy[locale];
  const MSG:Record<string,string>={required:text.required,invalid:text.invalid,too_short:text.too_short};
  const attempt=useRef<ContactAttempt|null>(null),busyRef=useRef(false);
  const storageKey='nexify-contact-attempt-v1:'+kind+(topic?':'+encodeURIComponent(topic):'');
  const [errors, setErrors] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), [number, setNumber] = useState(""), [failure, setFailure] = useState(""), [mailStatus, setMailStatus] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
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
    if(topic){body.message=topic+'\n\n'+body.message;body.page_path=window.location.pathname;}
    setBusy(true);busyRef.current=true;
    try {
      let stored=attempt.current;
      if(!stored){let raw:string|null=null;try{raw=sessionStorage.getItem(storageKey);}catch{throw new Error('request_storage_unavailable');}stored=readContactAttempt(raw);}
      attempt.current=await contactAttempt(JSON.stringify(body),stored);
      try{persistContactAttempt(sessionStorage,storageKey,attempt.current);}catch{throw new Error('request_storage_unavailable');}
      const controller=new AbortController();const timeout=window.setTimeout(()=>controller.abort(),15000);
      let result:{number:string;status:string;notification_status:string};
      try{result=await api<{number:string;status:string;notification_status:string}>("/api/requests",{method:"POST",json:body,signal:controller.signal,headers:{'Idempotency-Key':attempt.current.key}});}finally{window.clearTimeout(timeout);}
      if(typeof result.number!=='string'||!/^NX-[A-Z0-9-]{8,}$/.test(result.number)||result.status!=='eingegangen')throw new Error('unconfirmed_request');
      setNumber(result.number);setMailStatus(result.notification_status);attempt.current=null;try{sessionStorage.removeItem(storageKey);}catch{/* optional storage */}
    }
    catch (e) { const err=e as ApiError;if(err.fields){setErrors(err.fields);if(err.status===422){attempt.current=null;try{sessionStorage.removeItem(storageKey);}catch{/* optional storage */}}}else setFailure(e instanceof Error&&e.message==='request_storage_unavailable'?text.storage:e instanceof Error&&e.message.startsWith('pending_request')?text.pending:err.status===429?text.limit:text.failure); }
    finally { busyRef.current=false;setBusy(false); }
  }
  const notificationCopy={de:{sent:'Die Benachrichtigung wurde von Resend angenommen. Das bestätigt noch nicht die Zustellung im Postfach.',pending:'Ihre Anfrage ist sicher gespeichert. Die E-Mail-Benachrichtigung ist noch nicht bestätigt; bitte senden Sie die Anfrage nicht erneut.'},nl:{sent:'Resend heeft de melding geaccepteerd. Dit bevestigt nog niet de bezorging.',pending:'Uw aanvraag is opgeslagen. De e-mailmelding is nog niet bevestigd; verstuur de aanvraag niet opnieuw.'},fr:{sent:'Resend a accepté la notification. Cela ne confirme pas encore sa livraison.',pending:'Votre demande est enregistrée. La notification n’est pas encore confirmée ; ne renvoyez pas la demande.'},en:{sent:'Resend accepted the notification. Inbox delivery is not yet confirmed.',pending:'Your enquiry is safely stored. The email notification is not yet confirmed; please do not submit it again.'}}[locale];
  if (number) return <section className="tk-notice" role="status" data-testid="contact-success"><strong>{partner?text.partnerSaved:text.saved}</strong><p>{text.number}: <span data-testid="contact-number">{number}</span></p><p data-testid="contact-notification-status">{mailStatus==='gesendet'?notificationCopy.sent:notificationCopy.pending}</p></section>;
  const field = (name: string, label: string, input: React.ReactNode) => <label className={"tk-field" + (name === "message" ? " is-wide" : "")}>{label}{input}{errors[name] && <span className="tk-field-error" data-testid={`contact-${name}-error`}>{MSG[errors[name]] || MSG.required}</span>}</label>;
  return <form className="tk-form" method="post" onSubmit={submit} noValidate aria-labelledby="contact-form-title" data-testid="contact-form">
    <h2 id="contact-form-title">{partner?text.partnerTitle:text.title}</h2>
    <p className="tk-meta">{text.requiredNote}</p>
    <div className="tk-form-grid">
      {field("name",text.name, <input name="name" autoComplete="name" maxLength={100} aria-invalid={!!errors.name} data-testid="contact-name" />)}
      {field("email",text.email, <input name="email" type="email" autoComplete="email" maxLength={160} aria-invalid={!!errors.email} data-testid="contact-email" />)}
      {field("company",partner?text.workshop:text.company, <input name="company" autoComplete="organization" maxLength={120} aria-invalid={!!errors.company} data-testid="contact-company" />)}
      {field("message",text.message, <textarea name="message" rows={5} maxLength={4000} value={message} onChange={event=>setMessage(event.target.value)} aria-invalid={!!errors.message} data-testid="contact-message" />)}
    </div>
    <label className="tk-check"><input type="checkbox" name="consent" aria-invalid={!!errors.consent} data-testid="contact-consent" /><span>{text.consent} <a href={partner?'/teileklar/rechtliches':'/datenschutz'}>{text.privacy}</a>. *</span></label>
    {errors.consent && <span className="tk-field-error" data-testid="contact-consent-error">{MSG.required}</span>}
    {failure && <div role="alert" className="tk-field-error" data-testid="contact-error"><p>{failure}</p><a href="mailto:mail@nexifyai.cloud" data-testid="contact-email-fallback">{({de:'Direkt per E-Mail kontaktieren',nl:'Rechtstreeks per e-mail contact opnemen',fr:'Nous contacter directement par e-mail',en:'Contact us directly by email'} as const)[locale]}</a></div>}
    <div className="tk-actions"><button className="primary-button" type="submit" disabled={busy||!ready} data-testid="contact-submit">{busy?text.sending:text.send}</button></div>
  </form>;
}
