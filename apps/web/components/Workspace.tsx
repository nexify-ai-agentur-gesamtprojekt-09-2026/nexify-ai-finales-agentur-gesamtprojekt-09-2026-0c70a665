"use client";
import {SiteLink as Link} from "./Router";
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {useSitePathname} from "./Router";
import type { PublicPage } from "../lib/page-types";
import { translations, type Locale } from "../lib/i18n";

type Intent = "choose" | "quote" | "booking" | "marketing";
type Message = {role:"user"|"assistant"; text?:string; intent?:Intent};
type Quote = {id:string;title:string;details:string;download_url:string};
type Slot = {id:string;starts:string;source:string};
type Booking = {id:string;starts:string;confirmed:boolean};
const intents: Intent[] = ["quote", "booking", "marketing"];
const UIContext=createContext({locale:"de" as Locale,t:translations.de});
export const useUI=()=>useContext(UIContext);

function ActionGlyph({intent}:{intent:Intent}){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{intent==="quote"?<><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 12h6M9 16h6"/></>:intent==="booking"?<><circle cx="12" cy="12" r="9"/><path d="M12 7v6h4"/></>:<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>}</svg>}

export function StartAction({intent,children}:{intent:Intent;children:ReactNode}) {
  return <button className="primary-button" onClick={() => window.dispatchEvent(new CustomEvent("nexify-action",{detail:intent}))}>{children}</button>;
}

export default function Workspace({children,pages}:{children:ReactNode;pages:PublicPage[]}) {
  const [locale,setLocale] = useState<Locale>("de");
  const [open,setOpen] = useState(true);
  const [mobile,setMobile]=useState(false);
  const [ready,setReady] = useState(false);
  const [messages,setMessages] = useState<Message[]>([]);
  const [intent,setIntent] = useState<Intent>("choose");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [quote,setQuote] = useState<Quote|null>(null);
  const [slots,setSlots] = useState<Slot[]>([]);
  const [booking,setBooking] = useState<Booking|null>(null);
  const [mailPending,setMailPending] = useState(false);
  const [marketing,setMarketing] = useState<string[]>([]);
  const csrf = useRef("");
  const active = useRef(false);
  const keys = useRef(new Map<string,string>());
  const chatEnd = useRef<HTMLDivElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  const t = translations[locale];
  const pathname=useSitePathname();
  const site=pathname.startsWith("/teileklar")?"teileklar":"nexify";
  const navigation=pages.filter(page=>page.navigationContexts.includes(site));

  useEffect(() => {
    try { const saved = localStorage.getItem("nexify-locale"); if(saved && saved in translations)setLocale(saved as Locale); } catch {}
    const query=window.matchMedia("(max-width: 820px)");
    setMobile(query.matches);if(query.matches)setOpen(false);
    const resized=()=>setMobile(query.matches);query.addEventListener("change",resized);
    if((window as Window&{__NEXIFY_STANDALONE_PREVIEW__?:boolean}).__NEXIFY_STANDALONE_PREVIEW__){setError("offline");return()=>query.removeEventListener("change",resized);}
    fetch("/api/session",{cache:"no-store"}).then(async response => {
      if(!response.ok)throw new Error("session");
      const session=await response.json(); csrf.current=session.csrf;
      setMessages(session.history.map((entry:{role:"user"|"assistant";body:string}) => entry.role==="user" ? {role:"user",text:entry.body} : {role:"assistant",intent:JSON.parse(entry.body).intent}));
      if(session.workspace?.quotes?.length)setQuote(session.workspace.quotes.at(-1));
      setReady(true);
    }).catch(() => setError("offline"));
    return()=>query.removeEventListener("change",resized);
  },[]);
  useEffect(()=>{document.body.classList.toggle("chat-modal-open",mobile&&open);if(mobile&&open)closeButton.current?.focus();return()=>document.body.classList.remove("chat-modal-open");},[mobile,open]);
  useEffect(() => {document.documentElement.lang=locale;try{localStorage.setItem("nexify-locale",locale);}catch{}},[locale]);
  useEffect(() => {chatEnd.current?.scrollIntoView({block:"nearest",behavior:"instant"});},[messages,intent,quote,booking,marketing]);
  useEffect(() => {
    const handler=(event:Event)=>{const selected=(event as CustomEvent).detail;if(intents.includes(selected)){setOpen(true);setIntent(selected);}};
    window.addEventListener("nexify-action",handler);return()=>window.removeEventListener("nexify-action",handler);
  },[]);
  useEffect(() => {
    if(intent==="booking" && ready)fetch("/api/slots",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(r=>setSlots(r.slots)).catch(()=>setError("error"));
  },[intent,ready,booking]);

  async function post(path:string,body:object) {
    const identity=path+"|"+JSON.stringify(body);
    if(!keys.current.has(identity))keys.current.set(identity,crypto.randomUUID());
    const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf.current,"Idempotency-Key":keys.current.get(identity)!},body:JSON.stringify(body)});
    if(!response.ok)throw new Error("request");
    return response.json();
  }
  async function act(action:()=>Promise<void>) {
    if(active.current || !ready)return;
    active.current=true;setBusy(true);setError("");
    try {await action();}catch {setError("error");}finally{active.current=false;setBusy(false);}
  }
  const reply=(selected?:Intent)=>selected==="quote"?t.quoteReply:selected==="booking"?t.bookingReply:selected==="marketing"?t.marketingReply:t.choose;
  function closePanel(){setOpen(false);requestAnimationFrame(()=>{const target=document.querySelector<HTMLButtonElement>(".reopen-chat")||document.querySelector<HTMLButtonElement>(".header-actions button");target?.focus();});}
  async function submitMessage(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const value=String(new FormData(form).get("message")||"").trim();if(!value)return;
    await act(async()=>{const result=await post("/api/chat",{message:value,locale});setMessages(previous=>[...previous,{role:"user",text:value},{role:"assistant",intent:result.intent}]);setIntent(result.intent);form.reset();});
  }

  return <UIContext.Provider value={{locale,t}}><div className={`workspace-shell ${open?"is-open":"is-closed"}`}>
    <div className="website" inert={mobile&&open?true:undefined} aria-hidden={mobile&&open?true:undefined}>
      <a className="skip-link" href="#page-content">Zum Inhalt</a>
      <header className="site-header"><Link href={site==="teileklar"?"/teileklar":"/"} className="brand" aria-label={site==="teileklar"?"TEILEKLAR Startseite":"NeXify AI Startseite"}>{site==="teileklar"?<span>TEILE<strong>KLAR</strong><small>Ein Bereich von NeXify AI</small></span>:<><img src="/signet.svg" alt="" width="30" height="30"/><span>NeXify <strong>AI</strong><small>{t.footer}</small></span></>}</Link>
        <nav aria-label="Hauptnavigation">{navigation.map(page=><Link key={page.id} href={page.path}>{page.localizedTitle[locale]}</Link>)}</nav>
        <details className="mobile-navigation"><summary aria-label={t.pages}>☰</summary><nav aria-label={t.pages}>{navigation.map(page=><Link key={page.id} href={page.path}>{page.localizedTitle[locale]}</Link>)}</nav></details>
        <div className="header-actions"><label className="visually-hidden" htmlFor="locale">{t.locale}</label><select id="locale" value={locale} onChange={event=>setLocale(event.target.value as Locale)}><option value="de">DE</option><option value="nl">NL</option><option value="fr">FR</option></select><button className="outline-button compact" aria-expanded={open} aria-controls="aifly-panel" onClick={()=>{setOpen(true);messageInput.current?.focus();}}>{t.open}</button></div>
      </header>
      <main id="page-content">{children}</main>
      <footer className="site-footer"><span>{site==="teileklar"?"TEILEKLAR · NeXify AI":"NeXify AI"} · {t.footer}</span><span className="preview-badge">{t.preview}</span><Link href={site==="teileklar"?"/":"/teileklar"}>{site==="teileklar"?"NeXify AI":"TEILEKLAR"} →</Link><details><summary>{t.pages}</summary><nav aria-label={t.pages}>{pages.filter(page=>page.site_context===site).map(page=><Link key={page.path} href={page.path}>{page.localizedTitle[locale]}</Link>)}</nav></details></footer>
    </div>
    {!open && <button className="reopen-chat" onClick={()=>setOpen(true)} aria-expanded="false" aria-controls="aifly-panel"><span className="aifly-symbol">N</span>{t.open}</button>}
    {mobile&&open&&<div className="chat-backdrop" aria-hidden="true"/>}
    <aside id="aifly-panel" className="aifly-panel" role={mobile?"dialog":undefined} aria-modal={mobile&&open?true:undefined} aria-label={t.assistant} hidden={!open} onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();closePanel();}if(mobile&&event.key==="Tab"){const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled])')).filter(element=>element.offsetParent!==null);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}}>
      <div className="panel-heading"><span className="aifly-symbol" aria-hidden="true">N</span><div><h2>{t.assistant}</h2><p>{t.subtitle}</p></div><button ref={closeButton} className="icon-button" aria-label={t.close} onClick={closePanel}>×</button></div>
      <div className="conversation" aria-label={t.history}>
        <div className="welcome-card"><span className="eyebrow">NEXIFY AI</span><p>{t.welcome}</p><div className="action-options">{intents.map(action=><button key={action} className="action-option" disabled={!ready||busy} onClick={()=>setIntent(action)}><span><ActionGlyph intent={action}/></span>{t[action]}<span aria-hidden="true">→</span></button>)}</div></div>
        <div className="message-list" aria-live="polite" aria-relevant="additions">{messages.map((message,index)=><div key={index} className={`message ${message.role}`}><span className="message-role">{message.role==="assistant"?"AIFly":locale==="de"?"Sie":locale==="nl"?"U":"Vous"}</span><p>{message.role==="user"?message.text:reply(message.intent)}</p></div>)}</div>
        {intent!=="choose" && <section className="action-card" aria-label={t[intent]}>
          <div className="action-card-heading"><h3>{t[intent]}</h3><button className="text-button" onClick={()=>setIntent("choose")}>{t.back}</button></div>
          {intent==="quote" && <><form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);void act(async()=>{setQuote(await post("/api/quotes",{title:data.get("title"),details:data.get("details"),locale}));setMailPending(false);});}}><label>{t.title}<input name="title" maxLength={160} required/></label><label>{t.details}<textarea name="details" maxLength={3000} required rows={4}/></label><button className="primary-button" disabled={busy||!ready}>{t.createPdf}</button></form>{quote&&<div className="result-card"><p className="state-label">{t.draft}</p><h4>{quote.title}</h4><a className="download-link" href={quote.download_url} download>{t.download} <span aria-hidden="true">↓</span></a><form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);void act(async()=>{const result=await post(`/api/quotes/${quote.id}/send`,{email:data.get("email"),confirmed:data.get("confirmed")==="on"});setMailPending(result.state==="pending_provider" && result.sent===false);});}}><label>{t.email}<input name="email" type="email" maxLength={254} required autoComplete="email"/></label><label className="checkbox-label"><input type="checkbox" name="confirmed" required/>{t.emailConfirm}</label><button className="outline-button" disabled={busy}>{t.prepareEmail}</button></form>{mailPending&&<p className="status-note" role="status">{t.pending}</p>}</div>}</>}
          {intent==="booking" && <><p className="status-note">{t.planning}</p>{slots.length?<form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);void act(async()=>{setBooking(await post("/api/bookings",{slot_id:data.get("slot_id"),name:data.get("name"),email:data.get("email")}));});}}><fieldset><legend>{t.times} · Europe/Amsterdam</legend><div className="slot-list">{slots.map(slot=><label className="slot" key={slot.id}><input type="radio" name="slot_id" value={slot.id} required/>{new Intl.DateTimeFormat(locale,{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Amsterdam"}).format(new Date(slot.starts))}</label>)}</div></fieldset><label>{t.name}<input name="name" autoComplete="name" maxLength={100} required/></label><label>{t.email}<input name="email" type="email" autoComplete="email" maxLength={254} required/></label><button className="primary-button" disabled={busy||!ready}>{t.requestBooking}</button></form>:<p>{t.noSlots}</p>}{booking&&<div className="result-card" role="status"><p>{t.bookingSaved}</p><strong>{new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Amsterdam"}).format(new Date(booking.starts))}</strong></div>}</>}
          {intent==="marketing" && <><form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);void act(async()=>setMarketing((await post("/api/marketing",{goal:data.get("goal"),audience:data.get("audience"),locale})).draft));}}><label>{t.goal}<textarea name="goal" maxLength={800} required rows={3}/></label><label>{t.audience}<input name="audience" maxLength={500} required/></label><button className="primary-button" disabled={busy||!ready}>{t.createMarketing}</button></form>{marketing.length>0&&<div className="result-card"><p className="state-label">{t.marketingDraft}</p><ul>{marketing.map((line,index)=><li key={index}>{line}</li>)}</ul></div>}</>}
        </section>}
        {error&&<p className="error-note" role="alert">{error==="offline"?t.offline:t.error}</p>}
        <div ref={chatEnd}/>
      </div>
      <div className="composer-area"><form className="composer" onSubmit={submitMessage}><label className="visually-hidden" htmlFor="chat-message">{t.message}</label><textarea id="chat-message" ref={messageInput} name="message" placeholder={t.placeholder} maxLength={3000} rows={2} required disabled={!ready}/><div className="composer-bottom"><span>{busy?t.working:"NeX · AIFly"}</span><button className="send-button" aria-label={t.send} disabled={!ready||busy}>↑</button></div></form><p className="connection-note">{t.localStatus}</p></div>
    </aside>
  </div></UIContext.Provider>;
}
