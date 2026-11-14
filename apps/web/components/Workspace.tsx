"use client";
import {SiteLink as Link} from "./Router";
import "./WorkspaceRebuild.css";
import SiteNavigation from "./SiteNavigation";
import SiteFooter from "./SiteFooter";
import OracleCompanion from "./OracleCompanion";
import DeferredChatBoundary from "./DeferredChatBoundary";
import PublicRequestFallback from "./PublicRequestFallback";
import {readWorkspaceCapabilities,type WorkspaceCapabilities} from "./WorkspaceCapabilities";
import {lazy,Suspense, createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {CommerceHeader} from './shop/CommerceHeader';
import ChatResizeHandle,{chatWidthStyle,readChatWidth,storeChatWidth} from "./ChatResizeHandle";
import {useSitePathname} from "./Router";
import type { PublicPage } from "../lib/page-types";
import { translations, type Locale } from "../lib/i18n";
import {ActionButton,type ActionVariant} from './ActionControl';
import ProjectFilesPanel from './ProjectFilesPanel';
import './AtelierSystem.css';

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
const starters:Record<Locale,Record<"nexify"|"teileklar",[string,string][]>>={
  "de": {
    "nexify": [
      [
        "Marke & Web",
        "Ich möchte meinen Markenauftritt und meine Website entwickeln: "
      ],
      [
        "Systeme & KI",
        "Ich möchte diesen Arbeitsablauf mit KI und Automatisierung verbessern: "
      ],
      [
        "Ads & Marketing",
        "Ich möchte diese Zielgruppe mit einer Kampagne erreichen: "
      ]
    ],
    "teileklar": [
      [
        "Fahrzeug & Teil",
        "Mein Fahrzeug und das gesuchte Teil: "
      ],
      [
        "Werkstatt-Anfrage",
        "Mein Fahrzeug und die gewünschte Werkstattleistung: "
      ],
      [
        "Zusammenarbeit",
        "Ich möchte eine Zusammenarbeit mit TEILEKLAR besprechen: "
      ]
    ]
  },
  "nl": {
    "nexify": [
      [
        "Merk & web",
        "Ik wil mijn merkuitstraling en website ontwikkelen: "
      ],
      [
        "Systemen & AI",
        "Ik wil dit werkproces met AI en automatisering verbeteren: "
      ],
      [
        "Ads & marketing",
        "Ik wil deze doelgroep met een campagne bereiken: "
      ]
    ],
    "teileklar": [
      [
        "Voertuig & onderdeel",
        "Mijn voertuig en het gezochte onderdeel: "
      ],
      [
        "Werkplaatsaanvraag",
        "Mijn voertuig en de gewenste werkplaatsdienst: "
      ],
      [
        "Samenwerking",
        "Ik wil samenwerking met TEILEKLAR bespreken: "
      ]
    ]
  },
  "fr": {
    "nexify": [
      [
        "Marque & web",
        "Je souhaite développer ma marque et mon site web : "
      ],
      [
        "Systèmes & IA",
        "Je souhaite améliorer ce processus grâce à l’IA et à l’automatisation : "
      ],
      [
        "Publicité & marketing",
        "Je souhaite toucher ce public avec une campagne : "
      ]
    ],
    "teileklar": [
      [
        "Véhicule & pièce",
        "Mon véhicule et la pièce recherchée : "
      ],
      [
        "Demande atelier",
        "Mon véhicule et la prestation d’atelier souhaitée : "
      ],
      [
        "Collaboration",
        "Je souhaite discuter d’une collaboration avec TEILEKLAR : "
      ]
    ]
  },
  "en": {
    "nexify": [
      [
        "Brand & web",
        "I want to develop my brand presence and website: "
      ],
      [
        "Systems & AI",
        "I want to improve this workflow with AI and automation: "
      ],
      [
        "Ads & marketing",
        "I want to reach this audience with a campaign: "
      ]
    ],
    "teileklar": [
      [
        "Vehicle & part",
        "My vehicle and the part I need: "
      ],
      [
        "Workshop enquiry",
        "My vehicle and the workshop service I am seeking: "
      ],
      [
        "Partnership",
        "I would like to discuss working with TEILEKLAR: "
      ]
    ]
  }
};
const UIContext=createContext({locale:"de" as Locale,t:translations.de,session:null as {csrf:string}|null,chatReady:false});
export const useUI=()=>useContext(UIContext);


export function StartAction({intent,children,variant='primary'}:{intent:Intent;children:ReactNode;variant?:ActionVariant}) {
  return <ActionButton variant={variant} onClick={() => window.dispatchEvent(new CustomEvent("nexify-action",{detail:intent}))}>{children}</ActionButton>;
}

export default function Workspace({children,pages,accountControl,initialLocale='de'}:{children:ReactNode;pages:PublicPage[];accountControl?:ReactNode;initialLocale?:Locale}) {
  const [hydrated,setHydrated]=useState(false);
  useEffect(()=>setHydrated(true),[]);
  const [locale,setLocale] = useState<Locale>(initialLocale);
  useEffect(()=>setLocale(initialLocale),[initialLocale]);
  const [open,setOpen] = useState(false);
  const [chatWidth,setChatWidthState]=useState<number|null>(null);
  const setChatWidth=useCallback((w:number|null)=>{setChatWidthState(w);storeChatWidth(w);},[]);
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
  const [speaking,setSpeaking] = useState<string|null>(null);
  const audio = useRef<HTMLAudioElement|null>(null);
  const [marketing,setMarketing] = useState<string[]>([]);
  const csrf = useRef("");
  const active = useRef(false);
  const keys = useRef(new Map<string,string>());
  const chatEnd = useRef<HTMLDivElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  const orientationFocusRequested=useRef(false);
  const workspaceRoot=useRef<HTMLDivElement>(null);
  const readyRef=useRef(false);
  readyRef.current=ready;
  useEffect(()=>{
    const root=workspaceRoot.current,footer=root?.querySelector('footer');
    if(!root||!footer||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(([entry])=>{root.dataset.footerVisible=String(entry.isIntersecting);},{rootMargin:'0px 0px -64px 0px'});
    observer.observe(footer);
    return()=>{observer.disconnect();delete root.dataset.footerVisible;};
  },[]);
  useEffect(()=>{
    const root=workspaceRoot.current,viewport=window.visualViewport;
    if(!root)return;
    let frame=0;
    const measure=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        // Pinch zoom must remain native. At scale 1 the visual viewport reflects the keyboard.
        const useVisual=viewport&&viewport.scale===1;
        const height=useVisual?viewport.height:window.innerHeight;
        root.style.setProperty('--chat-viewport-height',`${height}px`);
        root.style.setProperty('--chat-viewport-top',`${useVisual?viewport.offsetTop:0}px`);
        root.dataset.chatCompact=String(height<=560);
      });
    };
    measure();viewport?.addEventListener('resize',measure);viewport?.addEventListener('scroll',measure);window.addEventListener('resize',measure);
    return()=>{cancelAnimationFrame(frame);viewport?.removeEventListener('resize',measure);viewport?.removeEventListener('scroll',measure);window.removeEventListener('resize',measure);};
  },[]);
  const readingAnchor=useRef<{element:HTMLElement;y:number}|null>(null);
  const panelReturnFocus=useRef<HTMLElement|null>(null);
  function changePanel(next:boolean){
    if(next&&document.activeElement instanceof HTMLElement&&!document.activeElement.closest('#aifly-panel'))panelReturnFocus.current=document.activeElement;
    // Keep the same semantic text at the same viewport position when the desktop grid reflows.
    // Near the top, stay at the top; mobile overlays do not resize the page.
    if(!window.matchMedia('(max-width: 820px)').matches&&window.scrollY>0){
      const candidates=Array.from(document.querySelectorAll<HTMLElement>('.website main :is(h1,h2,h3,p),.website footer h2'));
      const visible=candidates.filter(el=>{const rect=el.getBoundingClientRect();return rect.height>0&&rect.top>=0&&rect.top<window.innerHeight;});
      const element=visible.find(el=>/^H[123]$/.test(el.tagName))||visible[0];
      readingAnchor.current=element?{element,y:element.getBoundingClientRect().top}:null;
    }
    setOpen(next);
    try{sessionStorage.setItem("nx-chat-open",next?"1":"0");}catch{}
  }
  useLayoutEffect(()=>{
    const anchor=readingAnchor.current;readingAnchor.current=null;
    if(anchor?.element.isConnected)window.scrollBy({top:anchor.element.getBoundingClientRect().top-anchor.y,behavior:'instant'});
  },[open]);
  const t = translations[locale];
  const tkWelcome={
    de:{title:"Teile, Fahrzeug und Werkstatt",body:"Für welches Fahrzeug suchen Sie ein Teil oder eine Werkstattleistung? Nennen Sie Hersteller, Modell, Baujahr und Ihr Anliegen.",eyebrow:"Womit möchten Sie beginnen?",placeholder:"Fahrzeug und gesuchtes Teil nennen …",send:"Anliegen beschreiben",mode:"Teileanfrage"},
    nl:{title:"Onderdelen, voertuig en werkplaats",body:"Voor welk voertuig zoekt u een onderdeel of een werkplaatsdienst? Noem merk, model, bouwjaar en uw vraag.",eyebrow:"Waarmee wilt u beginnen?",placeholder:"Voertuig en gezocht onderdeel noemen …",send:"Vraag beschrijven",mode:"Onderdeelaanvraag"},
    fr:{title:"Pièces, véhicule et atelier",body:"Pour quel véhicule cherchez-vous une pièce ou une prestation d’atelier ? Indiquez marque, modèle, année et votre demande.",eyebrow:"Par quoi souhaitez-vous commencer ?",placeholder:"Indiquez le véhicule et la pièce recherchée …",send:"Décrire la demande",mode:"Demande de pièce"},
    en:{title:"Parts, vehicle and workshop",body:"For which vehicle are you looking for a part or a workshop service? Give make, model, year and your request.",eyebrow:"What would you like to start with?",placeholder:"Enter the vehicle and the part you need …",send:"Describe your request",mode:"Parts request"},
  }[locale];
  const pathname=useSitePathname();
  // Solange die Haupthandlung des Kopfbereichs sichtbar ist, öffnet sie selbst das Gespräch:
  // der schwebende Schalter tritt mobil zurück und liegt nicht über dem ersten Bildschirm.
  useEffect(()=>{
    const root=workspaceRoot.current,action=root?.querySelector('[data-testid="hero-project-link"]');
    if(!root||!action||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(([entry])=>{root.dataset.heroActionVisible=String(entry.isIntersecting);});
    observer.observe(action);
    return()=>{observer.disconnect();delete root.dataset.heroActionVisible;};
  },[pathname]);
  const currentPage=pages.find(page=>page.path===pathname);
  const site=(currentPage?currentPage.site_context==="teileklar":pathname.startsWith("/teileklar"))?"teileklar":"nexify";
  const headerCta=site==="teileklar"?{href:"/teileklar/fahrzeug-und-passung",label:{de:"Fahrzeug wählen",nl:"Voertuig kiezen",fr:"Choisir le véhicule",en:"Choose vehicle"}[locale]}:{href:"/kontakt",label:{de:"Projektgespräch anfragen",nl:"Projectgesprek aanvragen",fr:"Demander un échange projet",en:"Request a project conversation"}[locale]};
  const standalone=typeof window!=="undefined"&&(window as Window&{__NEXIFY_STANDALONE_PREVIEW__?:boolean}).__NEXIFY_STANDALONE_PREVIEW__===true;
  const canQuote=ready&&capabilities?.quote_pdf===true;
  const canOutbox=ready&&capabilities?.pending_outbox===true;
  const canBook=ready&&capabilities?.booking_request===true;
  const canMarket=ready&&capabilities?.marketing_template===true;
  const canMail=ready&&capabilities?.email_delivery===true;
  // Read-aloud remains limited to the home page and requires server capability.
  const providerPage=pathname==="/";
  const canSpeak=ready&&providerPage&&capabilities?.speech_readout===true;
  const canUseIntent=intent==="quote"?canQuote:intent==="booking"?canBook:intent==="marketing"?canMarket:false;
  const contact=pages.find(page=>page.path==="/kontakt")?.contact_channels?.find(channel=>channel.type==="email"&&channel.address==="mail@nexifyai.cloud");

  useEffect(() => {
    // The URL is authoritative so server-rendered translations and SEO agree.
    const query=window.matchMedia("(max-width: 820px)");
    // Unter 1200 px Fensterbreite bleibt der Seite ihre volle Spalte: die Scheibe startet eingeklappt, bis jemand sie öffnet.
    const roomy=()=>window.innerWidth>=1200;
    const preferredOpen=()=>{try{const saved=sessionStorage.getItem("nx-chat-open");return saved==="1"||(saved===null&&site==="nexify"&&roomy());}catch{return site==="nexify"&&roomy();}};
    try { setChatWidthState(readChatWidth()); } catch {}
    setMobile(query.matches);setOpen(!query.matches&&preferredOpen());
    const resized=()=>{setMobile(query.matches);setOpen(!query.matches&&preferredOpen());};query.addEventListener("change",resized);
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
    // Ohne verbundene Projektfunktion führt jede Aktion ins Gespräch, nie in eine Ansicht ohne Funktion.
    const handler=(event:Event)=>{const selected=(event as CustomEvent).detail;if(!intents.includes(selected))return;if(!readyRef.current){window.dispatchEvent(new Event('nexify-open-orientation'));return;}changePanel(true);setIntent(selected);setChatMode("workspace");};
    window.addEventListener("nexify-action",handler);return()=>window.removeEventListener("nexify-action",handler);
  },[]);
  useEffect(()=>{
    const openOrientation=()=>{
      orientationFocusRequested.current=true;
      setOrientationLoaded(true);changePanel(true);setChatMode('orientation');
      const input=document.querySelector<HTMLTextAreaElement>('#aifly-panel #orientation-message');
      if(input&&input.offsetParent!==null){input.focus({preventScroll:true});orientationFocusRequested.current=false;}
    };
    window.addEventListener('nexify-open-orientation',openOrientation);
    return()=>window.removeEventListener('nexify-open-orientation',openOrientation);
  },[]);
  useEffect(()=>{
    if(!open||chatMode!=='orientation'||!orientationLoaded||!orientationFocusRequested.current)return;
    const panel=document.getElementById('aifly-panel');if(!panel)return;
    const focus=()=>{const input=panel.querySelector<HTMLTextAreaElement>('#orientation-message');if(!input)return false;input.focus({preventScroll:true});orientationFocusRequested.current=false;return true;};
    if(focus())return;
    const observer=new MutationObserver(()=>{if(focus())observer.disconnect();});observer.observe(panel,{childList:true,subtree:true});
    const timeout=window.setTimeout(()=>observer.disconnect(),10000);
    return()=>{observer.disconnect();window.clearTimeout(timeout);};
  },[open,chatMode,orientationLoaded]);
  useEffect(()=>{
    let frame=0;
    const prefill=(event:Event)=>{
      const text=(event as CustomEvent).detail;
      if(!ready||typeof text!=='string'||!text.trim()||text.length>3000)return;
      changePanel(true);setChatMode('workspace');setIntent('choose');
      frame=window.requestAnimationFrame(()=>{
        const input=messageInput.current;if(!input)return;
        const existing=input.value.trim();const next=existing&&!existing.includes(text)?`${existing}\n\n${text}`:existing||text;
        if(next.length<=3000){input.value=next;setPrefillNotice(locale==='de'?'Du kannst den Text anpassen. Es wurde noch nichts gesendet.':locale==='nl'?'Je kunt de tekst aanpassen. Er is nog niets verzonden.':locale==='fr'?'Tu peux modifier le texte. Rien n’a encore été envoyé.':'You can edit the text. Nothing has been sent yet.');}
        else setPrefillNotice(locale==='de'?'Ihr vorhandener Text bleibt erhalten. Kürzen Sie ihn, bevor Sie ein Beispiel ergänzen.':locale==='nl'?'Uw bestaande tekst blijft behouden. Kort deze in voordat u een voorbeeld toevoegt.':locale==='fr'?'Votre texte est conservé. Raccourcissez-le avant d’ajouter un exemple.':'Your existing text is kept. Shorten it before adding an example.');
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
    try {await action();}catch{setError("error");}finally{active.current=false;setBusy(false);}
  }
  const chatState=ready?"connected":error==="offline"?"unavailable":"connecting";
  const chatStateLabel={"de": {"connected": "Projektverbindung bereit", "unavailable": "Persönliche Anfrage per Kontakt", "connecting": "Verbindung wird geprüft …"}, "nl": {"connected": "Projectverbinding gereed", "unavailable": "Persoonlijke aanvraag via contact", "connecting": "Verbinding wordt gecontroleerd …"}, "fr": {"connected": "Connexion projet prête", "unavailable": "Demande personnelle via contact", "connecting": "Vérification de la connexion…"}, "en": {"connected": "Project connection ready", "unavailable": "Personal enquiry via contact", "connecting": "Checking the connection …"}}[locale][chatState];
  const reply=(selected?:Intent)=>selected==="quote"?t.quoteReply:selected==="booking"?t.bookingReply:selected==="marketing"?t.marketingReply:t.choose;
  function closePanel(){changePanel(false);requestAnimationFrame(()=>{
    const visible=(element:HTMLElement|null)=>{if(!element||!element.isConnected||getComputedStyle(element).visibility==='hidden')return false;const rect=element.getBoundingClientRect();return rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<window.innerHeight;};
    const original=panelReturnFocus.current;
    const preferred='.reopen-chat';
    const fallback=document.querySelector<HTMLElement>(preferred);
    const target=visible(original)?original:visible(fallback)?fallback:document.querySelector<HTMLElement>('.header-actions .compact');
    target?.focus({preventScroll:true});panelReturnFocus.current=null;
  });}
  async function submitMessage(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const value=String(new FormData(form).get("message")||"").trim();if(!value)return;setPrefillNotice('');
    await act(async()=>{const result=await post("/api/chat",{message:value,locale,...(currentPage?{page_path:currentPage.path}:{})});setMessages(previous=>[...previous,{role:"user",text:value},{role:"assistant",intent:result.intent}]);setIntent(result.intent);form.reset();});
  }

  const launcherLabel=site==="teileklar"?({de:"TEILEKLAR Hilfe",nl:"TEILEKLAR hulp",fr:"Aide TEILEKLAR",en:"TEILEKLAR help"} as const)[locale]:t.open;
  return <UIContext.Provider value={{locale,t,session:ready?{csrf:csrf.current}:null,chatReady:ready}}><div ref={workspaceRoot} id="atelier" className={`workspace-shell site-${site} ${open?"is-open":"is-closed"}`} style={open?chatWidthStyle(chatWidth,mobile):undefined}>
    <div className="website" inert={mobile&&open?true:undefined} aria-hidden={mobile&&open?true:undefined}>
      <a className="skip-link" href="#page-content" onClick={event=>{event.preventDefault();const main=document.getElementById("page-content");main?.focus({preventScroll:true});main?.scrollIntoView({block:"start"});}}>{locale==="de"?"Zum Inhalt":locale==="nl"?"Naar de inhoud":locale==="fr"?"Aller au contenu":"Skip to content"}</a>
      {site==='teileklar'?<CommerceHeader/>:<header className="site-header" data-testid="site-header"><Link href="/" className="brand" aria-label={`NeXify AI · ${locale==='de'?'Startseite':'Home'}`}><span className="brand-signet" aria-hidden="true"/><span className="brand-word">Ne<strong className="brand-x">X</strong>ify <span className="brand-ai">AI</span><small>{t.footer}</small></span></Link>
        <SiteNavigation pages={pages} site={site} locale={locale} pathname={pathname}/>
        <div className="header-actions"><label className="visually-hidden" htmlFor="locale">{t.locale}</label><select id="locale" data-testid="locale-select" disabled={!hydrated} value={locale} onChange={event=>{const url=new URL(window.location.href);if(event.target.value==='de')url.searchParams.delete('lang');else url.searchParams.set('lang',event.target.value);window.location.assign(url.pathname+url.search+url.hash);}}><option value="de" data-testid="locale-option-de">DE</option><option value="nl" data-testid="locale-option-nl">NL</option><option value="fr" data-testid="locale-option-fr">FR</option><option value="en" data-testid="locale-option-en">EN</option></select><Link className="header-cta" data-testid="header-cta" href={headerCta.href}><span aria-hidden="true"/>{headerCta.label}</Link>{!open&&<button className="outline-button compact" aria-expanded={open} aria-controls="aifly-panel" onClick={()=>{changePanel(true);messageInput.current?.focus();}}>{t.open}</button>}</div>
      </header>}
      <main id="page-content" tabIndex={-1}>{children}</main>
      <SiteFooter pages={pages} site={site} locale={locale}/>
    </div>
    {!open && <ActionButton variant="secondary" className="reopen-chat" data-testid="chat-launcher" onClick={()=>{orientationFocusRequested.current=true;setOrientationLoaded(true);setChatMode('orientation');changePanel(true);}} aria-expanded="false" aria-controls="aifly-panel"><OracleCompanion/>{launcherLabel}</ActionButton>}
    {mobile&&open&&<div className="chat-backdrop" aria-hidden="true"/>}
    <aside id="aifly-panel" data-testid="chat-panel" className="aifly-panel" role={mobile?"dialog":undefined} aria-modal={mobile&&open?true:undefined} aria-label={t.assistant} hidden={!open} onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();closePanel();}if(mobile&&event.key==="Tab"){const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],summary,input:not([disabled]),textarea:not([disabled]),select:not([disabled])')).filter(element=>element.offsetParent!==null);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}}>{!mobile&&<ChatResizeHandle width={chatWidth} onChange={setChatWidth} label={locale==="de"?"Chatbreite anpassen":locale==="nl"?"Chatbreedte aanpassen":locale==="fr"?"Ajuster la largeur du chat":"Resize chat"}/>}
      <div className="panel-topstrip" aria-hidden="true"/>
      <div className="panel-heading"><div className="panel-heading-copy"><div className="panel-identity"><OracleCompanion/><div><h2 className="panel-brandline">Oracle</h2><p className="panel-identity-subtitle">NeXify AI</p></div></div><p className="panel-status visually-hidden" data-testid="chat-status" data-state={chatState} aria-hidden="true"><span className="connection-indicator" aria-hidden="true"/>{chatStateLabel}</p></div><ActionButton variant="icon" ref={closeButton} className="panel-minimize" data-testid="chat-panel-close-button" aria-label={t.close} title={t.close} onClick={closePanel}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg></ActionButton></div>
      <div className="panel-connection visually-hidden" role="status"><span className={`connection-indicator ${ready?"available":""}`} aria-hidden="true"/>{chatMode==="orientation"?(locale==="de"?"Website-Beratung ohne Live-KI":locale==="nl"?"Websiteadvies zonder live-AI":locale==="fr"?"Conseil sur le site sans IA en direct":"Website guidance without live AI"):ready?(locale==="de"?"Projektassistent verbunden":locale==="nl"?"Concepttools verbonden":locale==="fr"?"Outils de projet connectés":"Project assistant connected"):(locale==="de"?"Vorschau · Verbindung ausstehend":locale==="nl"?"Voorbeeld · verbinding volgt":locale==="fr"?"Aperçu · connexion en attente":"Preview · connection pending")}</div>
      {orientationLoaded&&!standalone&&currentPage&&<div className="sdk-orientation-view" hidden={chatMode!=="orientation"}><DeferredChatBoundary fallback={<PublicRequestFallback locale={locale} contact={contact} kind="chat"/>}><Suspense fallback={<p className="orientation-loading">{locale==="de"?"NeXify-Beratung wird geladen …":locale==="nl"?"NeXify-advies wordt geladen …":locale==="fr"?"Chargement du conseil NeXify…":"Loading NeXify guidance …"}</p>}><PublicOrientationChat locale={locale} pagePath={currentPage.path} pages={pages} onActivityChange={setOrientationWorking}/></Suspense></DeferredChatBoundary></div>}
      <div className="conversation" aria-label={t.history} hidden={chatMode!=="workspace"&&Boolean(currentPage)}>
        {pathname!=="/"&&<div className="panel-page-context">{site==="teileklar"?(locale==="de"?"Sie sind hier":locale==="nl"?"U bent hier":locale==="fr"?"Vous êtes ici":"You are here"):(locale==="de"?"Ihr aktueller Bereich":locale==="nl"?"Uw huidige onderdeel":locale==="fr"?"Votre rubrique actuelle":"You are here")}<strong>{currentPage?.localizedTitle[locale]||(site==="teileklar"?"TEILEKLAR":"NeXify AI")}</strong></div>}
        <div className="welcome-card"><p>{site==="teileklar"?tkWelcome.title:t.welcome}</p><p className="welcome-body">{site==="teileklar"?tkWelcome.body:t.welcomeBody}</p><div className="welcome-eyebrow-row"><span className="eyebrow">{site==="teileklar"?tkWelcome.eyebrow:t.welcomeEyebrow}</span>{canSpeak&&<button type="button" className="text-button" aria-pressed={speaking==="welcome"} onClick={()=>readAloud("welcome")}>{speaking==="welcome"?t.readAloudStop:t.readAloud}</button>}</div><div className="action-options">{starters[locale][site].map(([label,seed])=><button key={label} type="button" className="action-option" disabled={busy} onClick={()=>{setIntent("choose");setChatMode("workspace");const field=messageInput.current;if(field){if(!field.value.trim())field.value=seed;field.focus();field.setSelectionRange(field.value.length,field.value.length);}}}>{label}<span aria-hidden="true">→</span></button>)}</div></div>
        <div className="message-list" aria-live="polite" aria-relevant="additions">{messages.map((message,index)=><div key={index} className={`message ${message.role}`}><span className="message-role">{message.role==="assistant"?t.assistant:locale==="de"?"Du":locale==="nl"?"U":locale==="fr"?"Vous":"You"}</span><p>{message.role==="user"||message.label?message.text:reply(message.intent)}</p>{message.label&&<small className="state-label">{message.label}</small>}{canSpeak&&message.role==="assistant"&&!message.label&&<button type="button" className="text-button" aria-pressed={speaking===speechKey(message.intent)} onClick={()=>readAloud(speechKey(message.intent))}>{speaking===speechKey(message.intent)?t.readAloudStop:t.readAloud}</button>}</div>)}</div>
        {intent==="choose"&&!ready&&(error==="offline"?<PublicRequestFallback locale={locale} contact={contact}/>:<p className="status-note" role="status" data-testid="chat-connecting">{locale==="de"?"Assistent wird verbunden …":locale==="nl"?"Assistent wordt verbonden …":locale==="fr"?"Connexion à l’assistant …":"Connecting assistant …"}</p>)}
        {intent!=="choose" && <section className="action-card" aria-label={t[intent]}>
          <div className="action-card-heading"><h3>{t[intent]}</h3><button className="text-button" onClick={()=>setIntent("choose")}>{t.back}</button></div>
          {!canUseIntent&&<PublicRequestFallback locale={locale} contact={contact}/>}
          {intent==="quote" && canQuote && <><form onSubmit={event=>{event.preventDefault();if(!canQuote)return;const data=new FormData(event.currentTarget);void act(async()=>{setQuote(await post("/api/quotes",{title:data.get("title"),details:data.get("details"),locale}));setMailPending(false);});}}><label>{t.title}<input name="title" maxLength={160} required/></label><label>{t.details}<textarea name="details" maxLength={3000} required rows={4}/></label><button className="primary-button" disabled={busy||!canQuote}>{t.createPdf}</button></form>{quote&&<div className="result-card"><p className="state-label">{t.draft}</p><h4>{quote.title}</h4><div className="quote-view-switch" role="group" aria-label={locale==="de"?"Entwurfsansicht":locale==="nl"?"Conceptweergave":locale==="fr"?"Vue du projet":"Draft view"}><button type="button" aria-pressed={quoteView==="preview"} onClick={()=>setQuoteView("preview")}>{locale==="de"?"Vorschau":locale==="nl"?"Voorbeeld":locale==="fr"?"Aperçu":"Preview"}</button><button type="button" aria-pressed={quoteView==="details"} onClick={()=>setQuoteView("details")}>{locale==="de"?"Details":locale==="nl"?"Details":locale==="fr"?"Détails":"Details"}</button></div>{quoteView==="preview"?<div className="quote-document-preview"><span>NeXify AI</span><h5>{quote.title}</h5><p>{quote.details}</p><small>{t.draft}</small></div>:<dl className="quote-details"><dt>{locale==="de"?"Referenz":locale==="nl"?"Referentie":locale==="fr"?"Référence":"Reference"}</dt><dd>{quote.id}</dd><dt>{t.title}</dt><dd>{quote.title}</dd></dl>}<a className="download-link" href={quote.download_url} download>{t.download} <span aria-hidden="true">↓</span></a><form onSubmit={event=>{event.preventDefault();if(!canOutbox)return;const data=new FormData(event.currentTarget);void act(async()=>{const result=await post(`/api/quotes/${quote.id}/send`,{email:data.get("email"),confirmed:data.get("confirmed")==="on",locale});setMailPending(result.state==="pending_provider" && result.sent===false && !result.delivery);if(result.delivery){setDelivery(result.delivery==="blocked_limit"?"blocked_limit":"queued");if(result.delivery==="queued")watchDelivery("customer_quote",quote.id);}});}}><label>{t.email}<input name="email" type="email" maxLength={254} required autoComplete="email"/></label><label className="checkbox-label"><input type="checkbox" name="confirmed" required/>{t.emailConfirm}</label><button className="outline-button" disabled={busy||!canOutbox}>{canMail?t.sendConfirmation:t.prepareEmail}</button></form>{mailPending&&<p className="status-note" role="status">{t.pending}</p>}{delivery&&<p className="status-note" role="status">{delivery==="queued"?t.mailQueued:delivery==="sent"?t.mailSent:delivery==="blocked_limit"?t.mailBlocked:t.mailFailed}</p>}</div>}</>}
          {intent==="booking" && canBook && <><p className="status-note">{t.planning}</p>{slots.length?<form onSubmit={event=>{event.preventDefault();if(!canBook)return;const data=new FormData(event.currentTarget);void act(async()=>{const saved=await post("/api/bookings",{slot_id:data.get("slot_id"),name:data.get("name"),email:data.get("email"),locale});setBooking(saved);if(saved.delivery==="queued"){setDelivery("queued");watchDelivery("customer_booking",saved.id);}else if(saved.delivery==="blocked_limit")setDelivery("blocked_limit");});}}><fieldset><legend>{t.times} · Europe/Amsterdam</legend><div className="slot-list">{slots.map(slot=><label className="slot" key={slot.id}><input type="radio" name="slot_id" value={slot.id} required/>{new Intl.DateTimeFormat(locale,{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Amsterdam"}).format(new Date(slot.starts))}</label>)}</div></fieldset><label>{t.name}<input name="name" autoComplete="name" maxLength={100} required/></label><label>{t.email}<input name="email" type="email" autoComplete="email" maxLength={254} required/></label><button className="primary-button" disabled={busy||!canBook}>{t.requestBooking}</button></form>:<p>{t.noSlots}</p>}{booking&&<div className="result-card" role="status"><p>{t.bookingSaved}</p>{canMail&&<p>{t.bookingMail}</p>}<strong>{new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Amsterdam"}).format(new Date(booking.starts))}</strong></div>}</>}
          {intent==="marketing" && canMarket && <><form onSubmit={event=>{event.preventDefault();if(!canMarket)return;const data=new FormData(event.currentTarget);void act(async()=>setMarketing((await post("/api/marketing",{goal:data.get("goal"),audience:data.get("audience"),locale})).draft));}}><label>{t.goal}<textarea name="goal" maxLength={800} required rows={3}/></label><label>{t.audience}<input name="audience" maxLength={500} required/></label><button className="primary-button" disabled={busy||!canMarket}>{t.createMarketing}</button></form>{marketing.length>0&&<div className="result-card"><p className="state-label">{t.marketingDraft}</p><ul>{marketing.map((line,index)=><li key={index}>{line}</li>)}</ul></div>}</>}
        </section>}
        {error&&error!=="offline"&&<p className="error-note" role="alert">{error==="speech"?t.readAloudError:t.error}</p>}
        <ProjectFilesPanel locale={locale}/>
        <div ref={chatEnd}/>
      </div>
      <div className="composer-area" data-testid="chat-composer" hidden={!ready||(chatMode!=="workspace"&&Boolean(currentPage))}>
       <form className="composer-form" onSubmit={submitMessage}>
        <div className="composer"><label className="visually-hidden" htmlFor="chat-message">{t.message}</label><textarea id="chat-message" data-testid="chat-composer-textarea" ref={messageInput} name="message" placeholder={site==="teileklar"?tkWelcome.placeholder:t.placeholder} maxLength={3000} rows={2} required disabled={!ready}/>{prefillNotice&&<p className="composer-hint" role="status" data-testid="chat-prefill-notice">{prefillNotice}</p>}</div>
        <details className="chat-hints" data-testid="chat-hints-disclosure">
         <summary data-testid="chat-hints-toggle"><span>{locale==="de"?"Modus & Datenschutz":locale==="nl"?"Modus & privacy":locale==="fr"?"Mode et confidentialité":"Mode & privacy"}</span><span className="chat-mode-label" data-testid="chat-mode-label">{site==="teileklar"?tkWelcome.mode:locale==="de"?"Projektplanung":locale==="nl"?"Projectplan":locale==="fr"?"Plan du projet":"Project planning"}</span></summary>
         <div className="chat-hints-content" data-testid="chat-hints-content">
          <p className="connection-note">{locale==="de"?"Bitte keine Passwörter oder vertraulichen Daten eingeben.":locale==="nl"?"Voer geen wachtwoorden of vertrouwelijke gegevens in.":locale==="fr"?"Merci de ne pas saisir de mots de passe ou de données confidentielles.":"Please do not enter passwords or confidential data."}</p>
          <div className="panel-footer-row">{!standalone&&currentPage&&<div className="workspace-chat-modes" role="group" aria-label={locale==="de"?"Arbeitsbereich wählen":locale==="nl"?"Werkruimte kiezen":locale==="fr"?"Choisir un espace":"Choose a workspace"}><ActionButton variant="quiet" data-testid="chat-mode-orientation" aria-pressed={chatMode==="orientation"} onClick={()=>{setOrientationLoaded(true);setChatMode("orientation");}}>{locale==="de"?"Leistungen entdecken":locale==="nl"?"Diensten ontdekken":locale==="fr"?"Découvrir les prestations":"Explore services"}</ActionButton><ActionButton variant="quiet" data-testid="chat-mode-workspace" aria-pressed={chatMode==="workspace"} onClick={()=>setChatMode("workspace")}>{locale==="de"?"Projekt vorbereiten":locale==="nl"?"Project voorbereiden":locale==="fr"?"Préparer le projet":"Prepare your project"}</ActionButton></div>}</div>
          <Link className="panel-pascal-link" data-testid="chat-contact-link" href="/kontakt" onClick={()=>{if(mobile)closePanel();}}>{locale==="de"?"Mit Pascal weiterklären":locale==="nl"?"Verder met Pascal":locale==="fr"?"Continuer avec Pascal":"Continue with Pascal"}<span aria-hidden="true">↗</span></Link>
         </div>
        </details>
        <ActionButton type="submit" variant="primary" className="send-button" disabled={!ready} loading={busy} data-testid="chat-send-button">{busy?t.working:(site==="teileklar"?tkWelcome.send:t.send)}</ActionButton>
       </form>
      </div>
      {/* Der Weg in die Projektvorbereitung erscheint nur, wenn sie wirklich verbunden ist; sonst führt das Briefing im Gespräch zum Kontaktformular. */}
      {chatMode==="orientation"&&ready&&<div className="chat-return"><div><span>{locale==="de"?"Nächster Schritt":locale==="nl"?"Volgende stap":locale==="fr"?"Prochaine étape":"Next step"}</span><strong>{locale==="de"?"Ihr Vorhaben konkretisieren":locale==="nl"?"Uw project concretiseren":locale==="fr"?"Préciser votre projet":"Shape your project"}</strong></div><ActionButton variant="icon" data-testid="chat-return-workspace" aria-label={locale==="de"?"Projektvorbereitung öffnen":locale==="nl"?"Projectvoorbereiding openen":locale==="fr"?"Ouvrir la préparation du projet":"Open project preparation"} onClick={()=>setChatMode("workspace")}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg></ActionButton></div>}
    </aside>
  </div></UIContext.Provider>;
}
