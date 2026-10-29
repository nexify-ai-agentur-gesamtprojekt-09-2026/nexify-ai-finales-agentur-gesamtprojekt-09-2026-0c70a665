"use client";
import {SiteLink as Link} from "./Router";
import "./WorkspaceRebuild.css";
import SiteNavigation from "./SiteNavigation";
import SiteFooter from "./SiteFooter";
import OracleCompanion from "./OracleCompanion";
import DeferredChatBoundary from "./DeferredChatBoundary";
import PublicRequestFallback from "./PublicRequestFallback";
import {readWorkspaceCapabilities,type WorkspaceCapabilities} from "./WorkspaceCapabilities";
import {lazy,Suspense, createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {useSitePathname} from "./Router";
import type { PublicPage } from "../lib/page-types";
import { translations, type Locale } from "../lib/i18n";
import {ActionButton,type ActionVariant} from './ActionControl';

type Intent = "choose" | "quote" | "booking" | "marketing";
type Message = {role:"user"|"assistant"; text?:string; intent?:Intent; label?:string};
type Delivery = "queued"|"sent"|"blocked_limit"|"failed";
const speechKey=(intent?:Intent)=>intent==="quote"?"quoteReply":intent==="booking"?"bookingReply":intent==="marketing"?"marketingReply":"choose";
type Quote = {id:string;title:string;details:string;download_url:string};
type Slot = {id:string;starts:string;source:string};
type Booking = {id:string;starts:string;confirmed:boolean};
const PublicOrientationChat=lazy(()=>import("./PublicOrientationChat"));
const intents: Intent[] = ["quote", "booking", "marketing"];
// Einstiegszeilen nach Zielbild: füllen das Textfeld vor, senden nichts automatisch.
const starters:Record<Locale,[string,string][]>={
  de:[["Website planen","Ich möchte eine Website planen: "],["Ablauf automatisieren","Ich möchte einen Ablauf automatisieren: "],["Bestehendes Projekt","Ich habe ein bestehendes Projekt: "]],
  nl:[["Website plannen","Ik wil een website plannen: "],["Proces automatiseren","Ik wil een proces automatiseren: "],["Bestaand project","Ik heb een bestaand project: "]],
  fr:[["Planifier un site","Je veux planifier un site web : "],["Automatiser un processus","Je veux automatiser un processus : "],["Projet existant","J’ai un projet existant : "]],
};
const UIContext=createContext({locale:"de" as Locale,t:translations.de,session:null as {csrf:string}|null,chatReady:false});
export const useUI=()=>useContext(UIContext);


export function StartAction({intent,children,variant='primary'}:{intent:Intent;children:ReactNode;variant?:ActionVariant}) {
  return <ActionButton variant={variant} onClick={() => window.dispatchEvent(new CustomEvent("nexify-action",{detail:intent}))}>{children}</ActionButton>;
}

export default function Workspace({children,pages,accountControl}:{children:ReactNode;pages:PublicPage[];accountControl?:ReactNode}) {
  const [locale,setLocale] = useState<Locale>("de");
  const [open,setOpen] = useState(true);
  const [mobile,setMobile]=useState(false);
  const [ready,setReady] = useState(false);
  const [chatMode,setChatMode]=useState<"workspace"|"orientation">("workspace");
  const [orientationLoaded,setOrientationLoaded]=useState(false);
  const [,setOrientationWorking]=useState(false);
  const [capabilities,setCapabilities]=useState<WorkspaceCapabilities|null>(null);
  const [quoteView,setQuoteView]=useState<"details"|"preview">("preview");
  const [messages,setMessages] = useState<Message[]>([]);
  const [intent,setIntent] = useState<Intent>("choose");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [prefillNotice,setPrefillNotice]=useState('');
  const [quote,setQuote] = useState<Quote|null>(null);
  const [slots,setSlots] = useState<Slot[]>([]);
  const [booking,setBooking] = useState<Booking|null>(null);
  const [mailPending,setMailPending] = useState(false);
  const [delivery,setDelivery] = useState<Delivery|null>(null);
  const [useChatGPT,setUseChatGPT] = useState(false);
  const [speaking,setSpeaking] = useState<string|null>(null);
  const audio = useRef<HTMLAudioElement|null>(null);
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
  const canMail=ready&&capabilities?.email_delivery===true;
  // Cost-bounded rollout (Pascal, 29.10.2026): paid read-aloud and ChatGPT option first only on the home page.
  const providerPage=pathname==="/";
  const canSpeak=ready&&providerPage&&capabilities?.speech_readout===true;
  const canChatGPT=ready&&providerPage&&capabilities?.chatgpt_option===true;
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
  useEffect(() => {if(messages.length||intent!=="choose"||quote||booking||marketing.length)chatEnd.current?.scrollIntoView({block:"nearest",behavior:"instant"});},[messages,intent,quote,booking,marketing]);
  useEffect(() => {
    const handler=(event:Event)=>{const selected=(event as CustomEvent).detail;if(intents.includes(selected)){setOpen(true);setIntent(selected);setChatMode("workspace");}};
    window.addEventListener("nexify-action",handler);return()=>window.removeEventListener("nexify-action",handler);
  },[]);
  useEffect(()=>{
    let frame=0;
    const prefill=(event:Event)=>{
      const text=(event as CustomEvent).detail;
      if(!ready||typeof text!=='string'||!text.trim()||text.length>3000)return;
      setOpen(true);setChatMode('workspace');setIntent('choose');
      frame=window.requestAnimationFrame(()=>{
        const input=messageInput.current;if(!input)return;
        const existing=input.value.trim();const next=existing&&!existing.includes(text)?`${existing}\n\n${text}`:existing||text;
        if(next.length<=3000){input.value=next;setPrefillNotice(locale==='de'?'Du kannst den Text anpassen. Es wurde noch nichts gesendet.':locale==='nl'?'Je kunt de tekst aanpassen. Er is nog niets verzonden.':'Tu peux modifier le texte. Rien n’a encore été envoyé.');}
        else setPrefillNotice(locale==='de'?'Dein vorhandener Text bleibt erhalten. Kürze ihn, bevor du ein Beispiel ergänzt.':locale==='nl'?'Je bestaande tekst blijft behouden. Kort deze in voordat je een voorbeeld toevoegt.':'Ton texte est conservé. Raccourcis-le avant d’ajouter un exemple.');
        input.focus({preventScroll:true});
      });
    };
    window.addEventListener('nexify-project-prefill',prefill);
    return()=>{window.removeEventListener('nexify-project-prefill',prefill);window.cancelAnimationFrame(frame);};
  },[ready,locale]);
  useEffect(() => {
    if(intent==="booking" && canBook)fetch("/api/slots",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(r=>setSlots(r.slots)).catch(()=>setError("error"));
  },[intent,canBook,booking]);

  function watchDelivery(kind:string,ref:string){
    let rounds=0;
    const poll=()=>fetch("/api/deliveries",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(r=>{
      const found=(r.deliveries as {kind:string;ref:string;state:string}[]).find(item=>item.kind===kind&&item.ref===ref);
      const state=found?.state;
      if(state==="sent"||state==="blocked_limit"){setDelivery(state);return;}
      if(state==="failed_permanent"||state==="unknown_outcome_review"){setDelivery("failed");return;}
      if(++rounds<15)window.setTimeout(poll,2000);
    }).catch(()=>{if(++rounds<15)window.setTimeout(poll,4000);});
    window.setTimeout(poll,1500);
  }
  function readAloud(key:string){
    audio.current?.pause();
    if(speaking===key){setSpeaking(null);return;}
    const player=new Audio(`/api/speech/${key}?locale=${locale}&page=${encodeURIComponent(pathname)}`);audio.current=player;setSpeaking(key);
    player.onended=()=>setSpeaking(null);player.onerror=()=>{setSpeaking(null);setError("speech");};
    player.play().catch(()=>{setSpeaking(null);setError("speech");});
  }
  async function post(path:string,body:object) {
    const identity=path+"|"+JSON.stringify(body);
    if(!keys.current.has(identity))keys.current.set(identity,crypto.randomUUID());
    const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf.current,"Idempotency-Key":keys.current.get(identity)!},body:JSON.stringify(body)});
    if(!response.ok){const failure=await response.json().catch(()=>({}));throw new Error(typeof failure.error==="string"?failure.error:"request");}
    return response.json();
  }
  async function act(action:()=>Promise<void>) {
    if(active.current || !ready)return;
    active.current=true;setBusy(true);setError("");
    try {await action();}catch(failure){setError(failure instanceof Error&&failure.message.startsWith("chatgpt_")&&failure.message.endsWith("_reached")?"chatgpt_limit":"error");}finally{active.current=false;setBusy(false);}
  }
  const reply=(selected?:Intent)=>selected==="quote"?t.quoteReply:selected==="booking"?t.bookingReply:selected==="marketing"?t.marketingReply:t.choose;
  function closePanel(){setOpen(false);requestAnimationFrame(()=>{const target=document.querySelector<HTMLButtonElement>(".reopen-chat")||document.querySelector<HTMLButtonElement>(".header-actions button");target?.focus();});}
  async function submitMessage(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const value=String(new FormData(form).get("message")||"").trim();if(!value)return;setPrefillNotice('');
    if(useChatGPT&&canChatGPT){await act(async()=>{const result=await post("/api/assistant/chatgpt",{message:value.slice(0,1000),locale,page_path:pathname});setMessages(previous=>[...previous,{role:"user",text:value},{role:"assistant",text:result.text,label:result.label}]);form.reset();});return;}
    await act(async()=>{const result=await post("/api/chat",{message:value,locale,...(currentPage?{page_path:currentPage.path}:{})});setMessages(previous=>[...previous,{role:"user",text:value},{role:"assistant",intent:result.intent}]);setIntent(result.intent);form.reset();});
  }

  return <UIContext.Provider value={{locale,t,session:ready?{csrf:csrf.current}:null,chatReady:ready}}><div className={`workspace-shell ${open?"is-open":"is-closed"}`}>
    <div className="website" inert={mobile&&open?true:undefined} aria-hidden={mobile&&open?true:undefined}>
      <a className="skip-link" href="#page-content" onClick={event=>{event.preventDefault();const main=document.getElementById("page-content");main?.focus({preventScroll:true});main?.scrollIntoView({block:"start"});}}>{locale==="de"?"Zum Inhalt":locale==="nl"?"Naar de inhoud":"Aller au contenu"}</a>
      <header className="site-header"><Link href={site==="teileklar"?"/teileklar":"/"} className="brand" aria-label={`${site==="teileklar"?"TEILEKLAR":"NeXify AI"} · ${locale==="de"?"Startseite":locale==="nl"?"Startpagina":"Accueil"}`}>{site==="teileklar"?<span>TEILE<strong>KLAR</strong><small>{locale==="de"?"Ein Bereich von NeXify AI":locale==="nl"?"Een onderdeel van NeXify AI":"Une activité de NeXify AI"}</small></span>:<><img src="/signet.svg" alt="" width="30" height="30"/><span>NeXify <strong>AI</strong><small>{t.footer}</small></span></>}</Link>
        <SiteNavigation pages={pages} site={site} locale={locale} pathname={pathname}/>
        <div className="header-actions"><label className="visually-hidden" htmlFor="locale">{t.locale}</label><select id="locale" data-testid="locale-select" value={locale} onChange={event=>setLocale(event.target.value as Locale)}><option value="de">DE</option><option value="nl">NL</option><option value="fr">FR</option></select>{accountControl??<Link className="account-link" href="/anmelden">{locale==="de"?"Kundenbereich":locale==="nl"?"Klantenzone":"Espace client"}</Link>}{!open&&<button className="outline-button compact" aria-expanded={open} aria-controls="aifly-panel" onClick={()=>{setOpen(true);messageInput.current?.focus();}}>{t.open}</button>}</div>
      </header>
      <main id="page-content" tabIndex={-1}>{children}</main>
      <SiteFooter pages={pages} site={site} locale={locale}/>
    </div>
    {!open && <button className="reopen-chat" onClick={()=>setOpen(true)} aria-expanded="false" aria-controls="aifly-panel"><OracleCompanion/>{t.open}</button>}
    {mobile&&open&&<div className="chat-backdrop" aria-hidden="true"/>}
    <aside id="aifly-panel" className="aifly-panel" role={mobile?"dialog":undefined} aria-modal={mobile&&open?true:undefined} aria-label={t.assistant} hidden={!open} onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();closePanel();}if(mobile&&event.key==="Tab"){const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled])')).filter(element=>element.offsetParent!==null);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}}>
      <div className="panel-topstrip" aria-hidden="true"/>
      <div className="panel-heading"><div className="panel-heading-copy"><p className="panel-brandline"><span>NeXify</span><span className="panel-brandline-sep" aria-hidden="true">/</span><span>{t.subtitle.split("·")[0].trim()}</span></p><h2 className="visually-hidden">{t.assistant}</h2></div><button ref={closeButton} className="icon-button" aria-label={t.close} onClick={closePanel}>×</button></div>
      <div className="panel-connection visually-hidden" role="status"><span className={`connection-indicator ${ready?"available":""}`} aria-hidden="true"/>{chatMode==="orientation"?(locale==="de"?"Textgeführte Orientierung":locale==="nl"?"Tekstgestuurde oriëntatie":"Guide textuel"):ready?(locale==="de"?"Entwurfswerkzeuge verbunden":locale==="nl"?"Concepttools verbonden":"Outils de projet connectés"):(locale==="de"?"Vorschau · Verbindung ausstehend":locale==="nl"?"Voorbeeld · verbinding volgt":"Aperçu · connexion en attente")}</div>
      {orientationLoaded&&!standalone&&currentPage&&<div className="sdk-orientation-view" hidden={chatMode!=="orientation"}><DeferredChatBoundary fallback={<PublicRequestFallback locale={locale} contact={contact} kind="chat"/>}><Suspense fallback={<p className="orientation-loading">{locale==="de"?"Orientierung wird geladen …":locale==="nl"?"Oriëntatie wordt geladen …":"Chargement du guide…"}</p>}><PublicOrientationChat locale={locale} pagePath={currentPage.path} pages={pages} onActivityChange={setOrientationWorking}/></Suspense></DeferredChatBoundary></div>}
      <div className="conversation" aria-label={t.history} hidden={chatMode!=="workspace"&&Boolean(currentPage)}>
        {pathname!=="/"&&<div className="panel-page-context">{locale==="de"?"Hier bist du":locale==="nl"?"Je bent hier":"Tu es ici"}<strong>{currentPage?.localizedTitle[locale]||(site==="teileklar"?"TEILEKLAR":"NeXify AI")}</strong></div>}
        <div className="welcome-card"><p>{t.welcome}</p><p className="welcome-body">{t.welcomeBody}</p><div className="welcome-eyebrow-row"><span className="eyebrow">{t.welcomeEyebrow}</span>{canSpeak&&<button type="button" className="text-button" aria-pressed={speaking==="welcome"} onClick={()=>readAloud("welcome")}>{speaking==="welcome"?t.readAloudStop:t.readAloud}</button>}</div><div className="action-options">{starters[locale].map(([label,seed])=><button key={label} type="button" className="action-option" disabled={busy} onClick={()=>{setIntent("choose");setChatMode("workspace");const field=messageInput.current;if(field){if(!field.value.trim())field.value=seed;field.focus();field.setSelectionRange(field.value.length,field.value.length);}}}>{label}<span aria-hidden="true">→</span></button>)}</div></div>
        <div className="message-list" aria-live="polite" aria-relevant="additions">{messages.map((message,index)=><div key={index} className={`message ${message.role}`}><span className="message-role">{message.role==="assistant"?t.assistant:locale==="de"?"Du":locale==="nl"?"U":"Vous"}</span><p>{message.role==="user"||message.label?message.text:reply(message.intent)}</p>{message.label&&<small className="state-label">{message.label}</small>}{canSpeak&&message.role==="assistant"&&!message.label&&<button type="button" className="text-button" aria-pressed={speaking===speechKey(message.intent)} onClick={()=>readAloud(speechKey(message.intent))}>{speaking===speechKey(message.intent)?t.readAloudStop:t.readAloud}</button>}</div>)}</div>
        {intent==="choose"&&!ready&&<PublicRequestFallback locale={locale} contact={contact}/>}
        {intent!=="choose" && <section className="action-card" aria-label={t[intent]}>
          <div className="action-card-heading"><h3>{t[intent]}</h3><button className="text-button" onClick={()=>setIntent("choose")}>{t.back}</button></div>
          {!canUseIntent&&<PublicRequestFallback locale={locale} contact={contact}/>}
          {intent==="quote" && canQuote && <><form onSubmit={event=>{event.preventDefault();if(!canQuote)return;const data=new FormData(event.currentTarget);void act(async()=>{setQuote(await post("/api/quotes",{title:data.get("title"),details:data.get("details"),locale}));setMailPending(false);});}}><label>{t.title}<input name="title" maxLength={160} required/></label><label>{t.details}<textarea name="details" maxLength={3000} required rows={4}/></label><button className="primary-button" disabled={busy||!canQuote}>{t.createPdf}</button></form>{quote&&<div className="result-card"><p className="state-label">{t.draft}</p><h4>{quote.title}</h4><div className="quote-view-switch" role="group" aria-label={locale==="de"?"Entwurfsansicht":locale==="nl"?"Conceptweergave":"Vue du projet"}><button type="button" aria-pressed={quoteView==="preview"} onClick={()=>setQuoteView("preview")}>{locale==="de"?"Vorschau":locale==="nl"?"Voorbeeld":"Aperçu"}</button><button type="button" aria-pressed={quoteView==="details"} onClick={()=>setQuoteView("details")}>{locale==="de"?"Details":locale==="nl"?"Details":"Détails"}</button></div>{quoteView==="preview"?<div className="quote-document-preview"><span>NeXify AI</span><h5>{quote.title}</h5><p>{quote.details}</p><small>{t.draft}</small></div>:<dl className="quote-details"><dt>{locale==="de"?"Referenz":locale==="nl"?"Referentie":"Référence"}</dt><dd>{quote.id}</dd><dt>{t.title}</dt><dd>{quote.title}</dd></dl>}<a className="download-link" href={quote.download_url} download>{t.download} <span aria-hidden="true">↓</span></a><form onSubmit={event=>{event.preventDefault();if(!canOutbox)return;const data=new FormData(event.currentTarget);void act(async()=>{const result=await post(`/api/quotes/${quote.id}/send`,{email:data.get("email"),confirmed:data.get("confirmed")==="on",locale});setMailPending(result.state==="pending_provider" && result.sent===false && !result.delivery);if(result.delivery){setDelivery(result.delivery==="blocked_limit"?"blocked_limit":"queued");if(result.delivery==="queued")watchDelivery("customer_quote",quote.id);}});}}><label>{t.email}<input name="email" type="email" maxLength={254} required autoComplete="email"/></label><label className="checkbox-label"><input type="checkbox" name="confirmed" required/>{t.emailConfirm}</label><button className="outline-button" disabled={busy||!canOutbox}>{canMail?t.sendConfirmation:t.prepareEmail}</button></form>{mailPending&&<p className="status-note" role="status">{t.pending}</p>}{delivery&&<p className="status-note" role="status">{delivery==="queued"?t.mailQueued:delivery==="sent"?t.mailSent:delivery==="blocked_limit"?t.mailBlocked:t.mailFailed}</p>}</div>}</>}
          {intent==="booking" && canBook && <><p className="status-note">{t.planning}</p>{slots.length?<form onSubmit={event=>{event.preventDefault();if(!canBook)return;const data=new FormData(event.currentTarget);void act(async()=>{const saved=await post("/api/bookings",{slot_id:data.get("slot_id"),name:data.get("name"),email:data.get("email"),locale});setBooking(saved);if(saved.delivery==="queued"){setDelivery("queued");watchDelivery("customer_booking",saved.id);}else if(saved.delivery==="blocked_limit")setDelivery("blocked_limit");});}}><fieldset><legend>{t.times} · Europe/Amsterdam</legend><div className="slot-list">{slots.map(slot=><label className="slot" key={slot.id}><input type="radio" name="slot_id" value={slot.id} required/>{new Intl.DateTimeFormat(locale,{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Amsterdam"}).format(new Date(slot.starts))}</label>)}</div></fieldset><label>{t.name}<input name="name" autoComplete="name" maxLength={100} required/></label><label>{t.email}<input name="email" type="email" autoComplete="email" maxLength={254} required/></label><button className="primary-button" disabled={busy||!canBook}>{t.requestBooking}</button></form>:<p>{t.noSlots}</p>}{booking&&<div className="result-card" role="status"><p>{t.bookingSaved}</p>{canMail&&<p>{t.bookingMail}</p>}<strong>{new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Amsterdam"}).format(new Date(booking.starts))}</strong></div>}</>}
          {intent==="marketing" && canMarket && <><form onSubmit={event=>{event.preventDefault();if(!canMarket)return;const data=new FormData(event.currentTarget);void act(async()=>setMarketing((await post("/api/marketing",{goal:data.get("goal"),audience:data.get("audience"),locale})).draft));}}><label>{t.goal}<textarea name="goal" maxLength={800} required rows={3}/></label><label>{t.audience}<input name="audience" maxLength={500} required/></label><button className="primary-button" disabled={busy||!canMarket}>{t.createMarketing}</button></form>{marketing.length>0&&<div className="result-card"><p className="state-label">{t.marketingDraft}</p><ul>{marketing.map((line,index)=><li key={index}>{line}</li>)}</ul></div>}</>}
        </section>}
        {error&&error!=="offline"&&<p className="error-note" role="alert">{error==="speech"?t.readAloudError:error==="chatgpt_limit"?t.chatgptLimit:t.error}</p>}
        <div ref={chatEnd}/>
      </div>
      <div className="composer-area" hidden={!ready||(chatMode!=="workspace"&&Boolean(currentPage))}><form className="composer-form" onSubmit={submitMessage}><div className="composer"><label className="visually-hidden" htmlFor="chat-message">{t.message}</label><textarea id="chat-message" ref={messageInput} name="message" placeholder={t.placeholder} maxLength={3000} rows={2} required disabled={!ready}/><p className="composer-hint" aria-hidden="true">{locale==="de"?"Ein paar Sätze reichen für den Einstieg.":locale==="nl"?"Een paar zinnen zijn genoeg om te beginnen.":"Quelques phrases suffisent pour commencer."}</p>{prefillNotice&&<p className="composer-hint" role="status" data-testid="chat-prefill-notice">{prefillNotice}</p>}</div><ActionButton type="submit" variant="primary" className="send-button" disabled={!ready} loading={busy} data-testid="chat-send-button">{busy?t.working:t.send}</ActionButton>{canChatGPT&&<div className="chatgpt-option"><label className="checkbox-label"><input type="checkbox" checked={useChatGPT} onChange={event=>setUseChatGPT(event.target.checked)}/>{t.chatgptToggle}</label>{useChatGPT&&<p className="status-note">{t.chatgptNote}</p>}</div>}</form><p className="connection-note">{locale==="de"?"Bitte keine Passwörter oder vertraulichen Daten eingeben.":locale==="nl"?"Voer geen wachtwoorden of vertrouwelijke gegevens in.":"Merci de ne pas saisir de mots de passe ou de données confidentielles."}</p><div className="panel-footnote"><span>{locale==="de"?"Wenn es persönlich oder komplex wird:":locale==="nl"?"Als het persoonlijk of complex wordt:":"Si c’est personnel ou complexe :"}</span><Link className="panel-pascal-link" href="/kontakt">{locale==="de"?"Mit Pascal weiterklären":locale==="nl"?"Verder met Pascal":"Continuer avec Pascal"} <span aria-hidden="true">↗</span></Link></div></div>
      <div className="panel-footer-row">{!standalone&&currentPage&&<div className="workspace-chat-modes" role="group" aria-label={locale==="de"?"Arbeitsbereich wählen":locale==="nl"?"Werkruimte kiezen":"Choisir un espace"}><button type="button" aria-pressed={chatMode==="orientation"} onClick={()=>{setOrientationLoaded(true);setChatMode("orientation");}}>{locale==="de"?"Orientierung":locale==="nl"?"Oriëntatie":"Orientation"}</button><button type="button" aria-pressed={chatMode==="workspace"} onClick={()=>setChatMode("workspace")}>{locale==="de"?"Entwurfswerkzeuge":locale==="nl"?"Concepttools":"Outils de projet"}</button></div>}<div className="panel-footnote-status"><span>{locale==="de"?"Konzeptansicht":locale==="nl"?"Conceptweergave":"Vue concept"}</span><span aria-hidden="true">·</span><b>{ready?(locale==="de"?"Entwurfswerkzeuge bereit":locale==="nl"?"Concepttools gereed":"Outils de projet prêts"):(locale==="de"?"Verbindung ausstehend":locale==="nl"?"Verbinding volgt":"Connexion en attente")}</b></div></div>
    </aside>
  </div></UIContext.Provider>;
}
