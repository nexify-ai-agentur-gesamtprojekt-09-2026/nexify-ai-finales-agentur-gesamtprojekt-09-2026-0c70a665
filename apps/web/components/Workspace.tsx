"use client";
import {SiteLink as Link} from "./Router";
import "./WorkspaceRebuild.css";
import SiteNavigation from "./SiteNavigation";
import SiteFooter from "./SiteFooter";
import OracleCompanion from "./OracleCompanion";
import DeferredChatBoundary from "./DeferredChatBoundary";
import PublicRequestFallback from "./PublicRequestFallback";
import {readWorkspaceCapabilities,type WorkspaceCapabilities} from "./WorkspaceCapabilities";
import {lazy,Suspense, createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {useSitePathname} from "./Router";
import type { PublicPage } from "../lib/page-types";
import { translations, type Locale } from "../lib/i18n";
import {emptyBrief} from '../lib/project-brief.mjs';

type Intent = "choose" | "quote" | "booking" | "marketing";
type Message = {role:"user"|"assistant"; text?:string; intent?:Intent};
type Quote = {id:string;title:string;details:string;download_url:string};
type Slot = {id:string;starts:string;source:string};
type Booking = {id:string;starts:string;confirmed:boolean};
const PublicOrientationChat=lazy(()=>import("./PublicOrientationChat"));
const intents: Intent[] = ["quote", "booking", "marketing"];
const UIContext=createContext({locale:"de" as Locale,t:translations.de,session:null as {csrf:string}|null});
export const useUI=()=>useContext(UIContext);

function ActionGlyph({intent}:{intent:Intent}){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{intent==="quote"?<><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 12h6M9 16h6"/></>:intent==="booking"?<><circle cx="12" cy="12" r="9"/><path d="M12 7v6h4"/></>:<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>}</svg>}

export function StartAction({intent,children}:{intent:Intent;children:ReactNode}) {
  return <button className="primary-button" onClick={() => window.dispatchEvent(new CustomEvent("nexify-action",{detail:intent}))}>{children}</button>;
}

export default function Workspace({children,pages,accountControl}:{children:ReactNode;pages:PublicPage[];accountControl?:ReactNode}) {
  const [locale,setLocale] = useState<Locale>("de");
  const [open,setOpen] = useState(true);
  const [mobile,setMobile]=useState(false);
  const [ready,setReady] = useState(false);
  const [chatMode,setChatMode]=useState<"workspace"|"orientation">("workspace");
  const [orientationLoaded,setOrientationLoaded]=useState(false);
  const [orientationWorking,setOrientationWorking]=useState(false);
  const [capabilities,setCapabilities]=useState<WorkspaceCapabilities|null>(null);
  const [quoteView,setQuoteView]=useState<"details"|"preview">("preview");
  const [messages,setMessages] = useState<Message[]>([]);
  const [intent,setIntent] = useState<Intent>("choose");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [quote,setQuote] = useState<Quote|null>(null);
  const [quoteFields,setQuoteFields]=useState({title:'',details:''});
  const quoteTitleInput=useRef<HTMLInputElement>(null),pendingQuoteFocus=useRef(false);
  const [projectBrief,setProjectBrief]=useState(emptyBrief);
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
  const currentPage=pages.find(page=>page.path===pathname);
  const standalone=typeof window!=="undefined"&&(window as Window&{__NEXIFY_STANDALONE_PREVIEW__?:boolean}).__NEXIFY_STANDALONE_PREVIEW__===true;
  const canQuote=ready&&capabilities?.quote_pdf===true;
  const canOutbox=ready&&capabilities?.pending_outbox===true;
  const canBook=ready&&capabilities?.booking_request===true;
  const canMarket=ready&&capabilities?.marketing_template===true;
  const canUseIntent=intent==="quote"?canQuote:intent==="booking"?canBook:intent==="marketing"?canMarket:false;
  const contact=pages.find(page=>page.path==="/kontakt")?.contact_channels?.find(channel=>channel.type==="email"&&channel.address==="mail@nexifyai.cloud");

  useEffect(() => {
    try { const saved = localStorage.getItem("nexify-locale"); if(saved && saved in translations)setLocale(saved as Locale); } catch {}
    const query=window.matchMedia("(max-width: 820px)");
    setMobile(query.matches);if(query.matches)setOpen(false);
    const resized=()=>setMobile(query.matches);query.addEventListener("change",resized);
    if((window as Window&{__NEXIFY_STANDALONE_PREVIEW__?:boolean}).__NEXIFY_STANDALONE_PREVIEW__){setError("offline");return()=>query.removeEventListener("change",resized);}
    fetch("/api/session",{cache:"no-store"}).then(async response => {
      if(!response.ok)throw new Error("session");
      const session=await response.json();
      const described=readWorkspaceCapabilities(session.capabilities);
      if(!described||typeof session.csrf!=="string"||!Array.isArray(session.history))throw new Error("capabilities");
      csrf.current=session.csrf;setCapabilities(described);
      setMessages(session.history.map((entry:{role:"user"|"assistant";body:string}) => entry.role==="user" ? {role:"user",text:entry.body} : {role:"assistant",intent:JSON.parse(entry.body).intent}));
      if(session.workspace?.quotes?.length)setQuote(session.workspace.quotes.at(-1));
      setReady(true);
    }).catch(() => {setError("offline");setOrientationLoaded(true);setChatMode("orientation");});
    return()=>query.removeEventListener("change",resized);
  },[]);
  useEffect(()=>{document.body.classList.toggle("chat-modal-open",mobile&&open);if(mobile&&open)closeButton.current?.focus();return()=>document.body.classList.remove("chat-modal-open");},[mobile,open]);
  useEffect(()=>{document.querySelectorAll<HTMLDetailsElement>(".site-header details[open]").forEach(menu=>{menu.open=false;});},[pathname]);
  useEffect(() => {document.documentElement.lang=locale;try{localStorage.setItem("nexify-locale",locale);}catch{}},[locale]);
  useEffect(() => {chatEnd.current?.scrollIntoView({block:"nearest",behavior:"instant"});},[messages,intent,quote,booking,marketing]);
  useEffect(() => {
    const handler=(event:Event)=>{const selected=(event as CustomEvent).detail;if(intents.includes(selected)){setOpen(true);setIntent(selected);const localBrief=selected==="quote"&&!standalone&&!canQuote&&Boolean(currentPage);if(localBrief)setOrientationLoaded(true);setChatMode(localBrief?"orientation":"workspace");}};
    window.addEventListener("nexify-action",handler);return()=>window.removeEventListener("nexify-action",handler);
  },[canQuote,currentPage?.id,standalone]);
  useEffect(() => {
    if(intent==="booking" && canBook)fetch("/api/slots",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(r=>setSlots(r.slots)).catch(()=>setError("error"));
  },[intent,canBook,booking]);

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
  useLayoutEffect(()=>{if(pendingQuoteFocus.current&&open&&chatMode==='workspace'&&intent==='quote'&&canQuote){pendingQuoteFocus.current=false;quoteTitleInput.current?.focus();}});
  function prepareProjectQuote(title:string,details:string){
    if(!canQuote)return;
    pendingQuoteFocus.current=true;
    setQuoteFields(previous=>previous.title||previous.details?previous:{title,details});
    setIntent('quote');setChatMode('workspace');setOpen(true);
  }
  function closePanel(){setOpen(false);requestAnimationFrame(()=>{const target=document.querySelector<HTMLButtonElement>(".reopen-chat")||document.querySelector<HTMLButtonElement>(".header-actions button");target?.focus({preventScroll:true});});}
  async function submitMessage(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const value=String(new FormData(form).get("message")||"").trim();if(!value)return;
    await act(async()=>{const result=await post("/api/chat",{message:value,locale,...(currentPage?{page_path:currentPage.path}:{})});setMessages(previous=>[...previous,{role:"user",text:value},{role:"assistant",intent:result.intent}]);setIntent(result.intent);form.reset();});
  }

  return <UIContext.Provider value={{locale,t,session:ready?{csrf:csrf.current}:null}}><div className={`workspace-shell ${open?"is-open":"is-closed"}`}>
    <div className="website" inert={mobile&&open?true:undefined} aria-hidden={mobile&&open?true:undefined}>
      <a className="skip-link" href="#page-content" onClick={event=>{event.preventDefault();const main=document.getElementById("page-content");main?.focus({preventScroll:true});main?.scrollIntoView({block:"start"});}}>{locale==="de"?"Zum Inhalt":locale==="nl"?"Naar de inhoud":"Aller au contenu"}</a>
      <header className="site-header"><Link href={site==="teileklar"?"/teileklar":"/"} className="brand" aria-label={`${site==="teileklar"?"TEILEKLAR":"NeXify AI"} · ${locale==="de"?"Startseite":locale==="nl"?"Startpagina":"Accueil"}`}>{site==="teileklar"?<span>TEILE<strong>KLAR</strong><small>{locale==="de"?"Ein Bereich von NeXify AI":locale==="nl"?"Een onderdeel van NeXify AI":"Une activité de NeXify AI"}</small></span>:<><img src="/signet.svg" alt="" width="30" height="30"/><span>NeXify <strong>AI</strong><small>{t.footer}</small></span></>}</Link>
        <SiteNavigation pages={pages} site={site} locale={locale} pathname={pathname}/>
        <div className="header-actions"><label className="visually-hidden" htmlFor="locale">{t.locale}</label><select id="locale" value={locale} onChange={event=>setLocale(event.target.value as Locale)}><option value="de">DE</option><option value="nl">NL</option><option value="fr">FR</option></select>{accountControl??<Link className="account-link" href="/anmelden">{locale==="de"?"Kundenbereich":locale==="nl"?"Klantenzone":"Espace client"}</Link>}<button className="outline-button compact" aria-expanded={open} aria-controls="aifly-panel" onClick={()=>{setOpen(true);messageInput.current?.focus();}}>{t.open}</button></div>
      </header>
      <main id="page-content" tabIndex={-1}>{children}</main>
      <SiteFooter pages={pages} site={site} locale={locale}/>
    </div>
    {!open && <button className="reopen-chat" onClick={()=>setOpen(true)} aria-expanded="false" aria-controls="aifly-panel"><OracleCompanion/>{t.open}</button>}
    {mobile&&open&&<div className="chat-backdrop" aria-hidden="true"/>}
    <aside id="aifly-panel" className="aifly-panel" role={mobile?"dialog":undefined} aria-modal={mobile&&open?true:undefined} aria-label={t.assistant} hidden={!open} onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();closePanel();}if(mobile&&event.key==="Tab"){const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled])')).filter(element=>element.offsetParent!==null);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}}>
      <div className="panel-heading"><OracleCompanion working={chatMode==="orientation"?orientationWorking:busy}/><div><h2>{t.assistant}</h2><p>{t.subtitle}</p></div><button ref={closeButton} className="icon-button" aria-label={t.close} onClick={closePanel}>×</button></div>
      <div className="panel-connection" role="status"><span className={`connection-indicator ${ready?"available":""}`} aria-hidden="true"/>{chatMode==="orientation"?(locale==="de"?"Textgeführte Orientierung":locale==="nl"?"Tekstgestuurde oriëntatie":"Guide textuel"):ready?(locale==="de"?"Entwurfswerkzeuge verbunden":locale==="nl"?"Concepttools verbonden":"Outils de projet connectés"):(locale==="de"?"Vorschau · Verbindung ausstehend":locale==="nl"?"Voorbeeld · verbinding volgt":"Aperçu · connexion en attente")}</div>
      {!standalone&&currentPage&&<div className="workspace-chat-modes" role="group" aria-label={locale==="de"?"Arbeitsbereich wählen":locale==="nl"?"Werkruimte kiezen":"Choisir un espace"}><button type="button" aria-pressed={chatMode==="orientation"} onClick={()=>{setOrientationLoaded(true);setChatMode("orientation");}}>{locale==="de"?"Orientierung":locale==="nl"?"Oriëntatie":"Orientation"}</button><button type="button" aria-pressed={chatMode==="workspace"} onClick={()=>setChatMode("workspace")}>{locale==="de"?"Entwurfswerkzeuge":locale==="nl"?"Concepttools":"Outils de projet"}</button></div>}
      {orientationLoaded&&!standalone&&currentPage&&<div className="sdk-orientation-view" hidden={chatMode!=="orientation"}><DeferredChatBoundary fallback={<PublicRequestFallback locale={locale} contact={contact} kind="chat"/>}><Suspense fallback={<p className="orientation-loading">{locale==="de"?"Orientierung wird geladen …":locale==="nl"?"Oriëntatie wordt geladen …":"Chargement du guide…"}</p>}><PublicOrientationChat locale={locale} pagePath={currentPage.path} pages={pages} onActivityChange={setOrientationWorking} projectBrief={projectBrief} onProjectBriefChange={setProjectBrief} onUseQuote={prepareProjectQuote} canQuote={canQuote} contact={contact}/></Suspense></DeferredChatBoundary></div>}
      <div className="conversation" aria-label={t.history} hidden={chatMode!=="workspace"&&Boolean(currentPage)}>
        <div className="panel-page-context">{locale==="de"?"Hier bist du":locale==="nl"?"Je bent hier":"Tu es ici"}<strong>{currentPage?.localizedTitle[locale]||(site==="teileklar"?"TEILEKLAR":"NeXify AI")}</strong></div>
        <div className="welcome-card"><span className="eyebrow">{site==="teileklar"?"TEILEKLAR":"NEXIFY AI"}</span><p>{t.welcome}</p><div className="action-options">{intents.map(action=><button key={action} className="action-option" disabled={busy} onClick={()=>setIntent(action)}><span><ActionGlyph intent={action}/></span>{t[action]}<span aria-hidden="true">→</span></button>)}</div></div>
        <div className="message-list" aria-live="polite" aria-relevant="additions">{messages.map((message,index)=><div key={index} className={`message ${message.role}`}><span className="message-role">{message.role==="assistant"?t.assistant:locale==="de"?"Du":locale==="nl"?"U":"Vous"}</span><p>{message.role==="user"?message.text:reply(message.intent)}</p></div>)}</div>
        {intent==="choose"&&!ready&&<PublicRequestFallback locale={locale} contact={contact}/>}
        {intent!=="choose" && <section className="action-card" aria-label={t[intent]}>
          <div className="action-card-heading"><h3>{t[intent]}</h3><button className="text-button" onClick={()=>setIntent("choose")}>{t.back}</button></div>
          {!canUseIntent&&<PublicRequestFallback locale={locale} contact={contact}/>}
          {intent==="quote" && canQuote && <><form onSubmit={event=>{event.preventDefault();if(!canQuote)return;const data=new FormData(event.currentTarget);void act(async()=>{setQuote(await post("/api/quotes",{title:data.get("title"),details:data.get("details"),locale}));setMailPending(false);});}}><label>{t.title}<input name="title" ref={quoteTitleInput} maxLength={160} required value={quoteFields.title} onChange={event=>setQuoteFields(previous=>({...previous,title:event.target.value}))}/></label><label>{t.details}<textarea name="details" maxLength={3000} required rows={4} value={quoteFields.details} onChange={event=>setQuoteFields(previous=>({...previous,details:event.target.value}))}/></label><button className="primary-button" disabled={busy||!canQuote}>{t.createPdf}</button></form>{quote&&<div className="result-card"><p className="state-label">{t.draft}</p><h4>{quote.title}</h4><div className="quote-view-switch" role="group" aria-label={locale==="de"?"Entwurfsansicht":locale==="nl"?"Conceptweergave":"Vue du projet"}><button type="button" aria-pressed={quoteView==="preview"} onClick={()=>setQuoteView("preview")}>{locale==="de"?"Vorschau":locale==="nl"?"Voorbeeld":"Aperçu"}</button><button type="button" aria-pressed={quoteView==="details"} onClick={()=>setQuoteView("details")}>{locale==="de"?"Details":locale==="nl"?"Details":"Détails"}</button></div>{quoteView==="preview"?<div className="quote-document-preview"><span>NeXify AI</span><h5>{quote.title}</h5><p>{quote.details}</p><small>{t.draft}</small></div>:<dl className="quote-details"><dt>{locale==="de"?"Referenz":locale==="nl"?"Referentie":"Référence"}</dt><dd>{quote.id}</dd><dt>{t.title}</dt><dd>{quote.title}</dd></dl>}<a className="download-link" href={quote.download_url} download>{t.download} <span aria-hidden="true">↓</span></a><form onSubmit={event=>{event.preventDefault();if(!canOutbox)return;const data=new FormData(event.currentTarget);void act(async()=>{const result=await post(`/api/quotes/${quote.id}/send`,{email:data.get("email"),confirmed:data.get("confirmed")==="on"});setMailPending(result.state==="pending_provider" && result.sent===false);});}}><label>{t.email}<input name="email" type="email" maxLength={254} required autoComplete="email"/></label><label className="checkbox-label"><input type="checkbox" name="confirmed" required/>{t.emailConfirm}</label><button className="outline-button" disabled={busy||!canOutbox}>{t.prepareEmail}</button></form>{mailPending&&<p className="status-note" role="status">{t.pending}</p>}</div>}</>}
          {intent==="booking" && canBook && <><p className="status-note">{t.planning}</p>{slots.length?<form onSubmit={event=>{event.preventDefault();if(!canBook)return;const data=new FormData(event.currentTarget);void act(async()=>{setBooking(await post("/api/bookings",{slot_id:data.get("slot_id"),name:data.get("name"),email:data.get("email")}));});}}><fieldset><legend>{t.times} · Europe/Amsterdam</legend><div className="slot-list">{slots.map(slot=><label className="slot" key={slot.id}><input type="radio" name="slot_id" value={slot.id} required/>{new Intl.DateTimeFormat(locale,{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Amsterdam"}).format(new Date(slot.starts))}</label>)}</div></fieldset><label>{t.name}<input name="name" autoComplete="name" maxLength={100} required/></label><label>{t.email}<input name="email" type="email" autoComplete="email" maxLength={254} required/></label><button className="primary-button" disabled={busy||!canBook}>{t.requestBooking}</button></form>:<p>{t.noSlots}</p>}{booking&&<div className="result-card" role="status"><p>{t.bookingSaved}</p><strong>{new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Amsterdam"}).format(new Date(booking.starts))}</strong></div>}</>}
          {intent==="marketing" && canMarket && <><form onSubmit={event=>{event.preventDefault();if(!canMarket)return;const data=new FormData(event.currentTarget);void act(async()=>setMarketing((await post("/api/marketing",{goal:data.get("goal"),audience:data.get("audience"),locale})).draft));}}><label>{t.goal}<textarea name="goal" maxLength={800} required rows={3}/></label><label>{t.audience}<input name="audience" maxLength={500} required/></label><button className="primary-button" disabled={busy||!canMarket}>{t.createMarketing}</button></form>{marketing.length>0&&<div className="result-card"><p className="state-label">{t.marketingDraft}</p><ul>{marketing.map((line,index)=><li key={index}>{line}</li>)}</ul></div>}</>}
        </section>}
        {error&&error!=="offline"&&<p className="error-note" role="alert">{error==="offline"?t.offline:t.error}</p>}
        <div ref={chatEnd}/>
      </div>
      <div className="composer-area" hidden={!ready||(chatMode!=="workspace"&&Boolean(currentPage))}><form className="composer" onSubmit={submitMessage}><label className="visually-hidden" htmlFor="chat-message">{t.message}</label><textarea id="chat-message" ref={messageInput} name="message" placeholder={t.placeholder} maxLength={3000} rows={2} required disabled={!ready}/><div className="composer-bottom"><span>{busy?t.working:"NeX · AIFly"}</span><button className="send-button" aria-label={t.send} disabled={!ready||busy}>↑</button></div></form><p className="connection-note">{ready?t.localStatus:t.offline}</p></div>
    </aside>
  </div></UIContext.Provider>;
}
