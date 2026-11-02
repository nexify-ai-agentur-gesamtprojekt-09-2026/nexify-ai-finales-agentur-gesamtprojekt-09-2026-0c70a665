"use client";
import {useChat} from "@ai-sdk/react";
import {DefaultChatTransport} from "ai";
import {useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import type {Locale} from "../lib/i18n";
import type {PublicPage} from "../lib/page-types";
import {SiteLink} from "./Router";
import "./PublicOrientationChat.css";
import {staticOrientation,type StaticGuidance} from "../lib/static-orientation";
declare const __NEXIFY_STATIC_ORIENTATION__:boolean;

const copy={
  "de": {
    "title": "Was haben Sie vor?",
    "mode": "Leistungen finden",
    "intro": "Beschreiben Sie kurz Ihr Vorhaben oder wählen Sie einen Bereich. Hier finden Sie passende Informationen und den Weg zum persönlichen Gespräch.",
    "label": "Wobei können wir Ihnen helfen?",
    "placeholder": "Zum Beispiel: Ich möchte meine Website erneuern …",
    "send": "Informationen anzeigen",
    "stop": "Antwort anhalten",
    "waiting": "Passende Informationen werden geladen …",
    "error": "Die Website-Beratung ist gerade nicht erreichbar. Ihre Eingabe bleibt erhalten. Für die persönliche Projektklärung nutzen Sie bitte die Kontaktseite.",
    "privacy": "NeX Agentic AIFly kann Fehler machen.",
    "notice": "Wie diese Einordnung entsteht",
    "you": "Sie",
    "assistant": "AIFly ORACLE",
    "next": "Zum passenden Angebot",
    "prompt": "Welcher Einstieg von NeXify passt zu meinem Unternehmen?"
  },
  "nl": {
    "title": "Wat bent u van plan?",
    "mode": "Diensten vinden",
    "intro": "Beschrijf kort uw plan of kies een onderwerp. Hier vindt u passende informatie en de weg naar een persoonlijk gesprek.",
    "label": "Waarmee kunnen we u helpen?",
    "placeholder": "Bijvoorbeeld: Ik wil mijn website vernieuwen …",
    "send": "Informatie tonen",
    "stop": "Antwoord onderbreken",
    "waiting": "Passende informatie wordt geladen …",
    "error": "Het websiteadvies is nu niet bereikbaar. Uw invoer blijft behouden. Gebruik de contactpagina voor een persoonlijk projectgesprek.",
    "privacy": "NeX Agentic AIFly kan fouten maken.",
    "notice": "Hoe deze indeling ontstaat",
    "you": "U",
    "assistant": "AIFly ORACLE",
    "next": "Naar het passende aanbod",
    "prompt": "Welke eerste stap van NeXify past bij mijn bedrijf?"
  },
  "fr": {
    "title": "Quel est votre projet ?",
    "mode": "Trouver une prestation",
    "intro": "Décrivez brièvement votre projet ou choisissez un sujet. Retrouvez les informations utiles et le contact pour en discuter.",
    "label": "Comment pouvons-nous vous aider ?",
    "placeholder": "Par exemple : je souhaite refaire mon site …",
    "send": "Afficher les informations",
    "stop": "Suspendre la réponse",
    "waiting": "Chargement des informations pertinentes…",
    "error": "Le conseil sur le site est momentanément indisponible. Votre saisie est conservée. Utilisez la page de contact pour un échange personnel sur votre projet.",
    "privacy": "NeX Agentic AIFly peut faire des erreurs.",
    "notice": "Comment cette orientation est établie",
    "you": "Vous",
    "assistant": "AIFly ORACLE",
    "next": "Vers l’offre adaptée",
    "prompt": "Quelle première étape de NeXify convient à mon entreprise ?"
  },
  "en": {
    "title": "What are you planning?",
    "mode": "Find a service",
    "intro": "Briefly describe your project or choose a topic. Find relevant information and the route to a personal conversation.",
    "label": "How can we help?",
    "placeholder": "For example: I would like to update my website …",
    "send": "Show information",
    "stop": "Pause response",
    "waiting": "Loading relevant information …",
    "error": "Website guidance is temporarily unavailable. Your input is retained. Please use the contact page for a personal project discussion.",
    "privacy": "NeX Agentic AIFly can make mistakes.",
    "notice": "How this guidance is made",
    "you": "You",
    "assistant": "AIFly ORACLE",
    "next": "View the relevant offer",
    "prompt": "Which NeXify starting point suits my business?"
  }
};

// TEILEKLAR-specific overrides for the default-visible orientation chat (vehicle/part/workshop context).
const tkCopy={
 de:{title:"Willkommen bei TEILEKLAR",intro:"Willkommen bei TEILEKLAR. Worum geht es bei Ihnen: ein Ersatzteil, ein Werkstattbesuch oder eine Zusammenarbeit? Bei einer Teile- oder Werkstattfrage nennen Sie bitte Ihr Fahrzeug und beschreiben Sie Ihr Anliegen. Eine vorhandene Teilenummer hilft bei der Zuordnung.",label:"Ihr Fahrzeug-/Teile-Anliegen",placeholder:"Fahrzeug und gesuchtes Teil nennen …"},
 nl:{title:"Welkom bij TEILEKLAR",intro:"Welkom bij TEILEKLAR. Waar gaat het bij u om: een onderdeel, een werkplaatsbezoek of een samenwerking? Bij een onderdeel- of werkplaatsvraag: noem uw voertuig en beschrijf uw vraag. Een bestaand onderdeelnummer helpt bij de toewijzing. Online bestellen is momenteel niet mogelijk.",label:"Uw voertuig-/onderdeelvraag",placeholder:"Voertuig en gezocht onderdeel noemen …"},
 fr:{title:"Bienvenue chez TEILEKLAR",intro:"Bienvenue chez TEILEKLAR. Que recherchez-vous : une pièce, une visite en atelier ou une collaboration ? Pour une demande de pièce ou d’atelier, indiquez votre véhicule et décrivez votre demande. Un numéro de pièce existant facilite l’affectation. La commande en ligne n’est pas possible actuellement.",label:"Votre demande véhicule/pièce",placeholder:"Indiquez le véhicule et la pièce recherchée …"},
 en:{"title": "Welcome to TEILEKLAR", "intro": "Welcome to TEILEKLAR. What is it about for you: a spare part, a workshop visit or a partnership? For a parts or workshop question, please name your vehicle and describe your request. An existing part number helps with the assignment. Online ordering is currently not possible.", "label": "Your vehicle/part request", "placeholder": "Enter the vehicle and the part you need …"}
};
const starters={
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
} as const;

function guidedText(text:string,pages:PublicPage[]){
 return text.split(/(\[[^\]\n]+\]\(\/[A-Za-z0-9/-]*\))/g).map((part,index)=>{
  const match=/^\[([^\]\n]+)\]\((\/[A-Za-z0-9/-]*)\)$/.exec(part);
  const target=match&&pages.find(page=>page.path===match[2]);
  return target?<SiteLink key={index} href={target.path}>{match![1]}</SiteLink>:part;
 });
}

type OrientationProps={locale:Locale;pagePath:string;pages:PublicPage[];onActivityChange?:(working:boolean)=>void};

export default function PublicOrientationChat(props:OrientationProps){
 const local=typeof __NEXIFY_STATIC_ORIENTATION__!=="undefined"&&__NEXIFY_STATIC_ORIENTATION__===true;
 return local?<StaticOrientationChat {...props}/>:<ServerOrientationChat {...props}/>;
}

function ServerOrientationChat({locale,pagePath,pages,onActivityChange}:OrientationProps){
 const site=pagePath.startsWith("/teileklar")?"teileklar":"nexify";const text={...copy[locale],...(site==="teileklar"?tkCopy[locale]:{})};const[draft,setDraft]=useState("");const lastSubmitted=useRef("");
 const transport=useMemo(()=>new DefaultChatTransport({api:"/api/agent-chat",prepareSendMessagesRequest:({id,messages,trigger,messageId,body})=>({body:{id,trigger,...(messageId?{messageId}:{}),page_path:body?.page_path,locale:body?.locale,messages:messages.filter(message=>message.role==="user").slice(-1).map(message=>({id:message.id,role:message.role,parts:message.parts.filter(part=>part.type==="text")}))}})}),[]);
 const{messages,sendMessage,status,error,stop}=useChat({id:"nexify-public-orientation",transport,onError:()=>setDraft(previous=>previous||lastSubmitted.current)});
 const busy=status==="submitted"||status==="streaming";
 useEffect(()=>{onActivityChange?.(busy);return()=>onActivityChange?.(false);},[busy,onActivityChange]);
 const composerInput=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{if(!busy&&lastSubmitted.current&&document.activeElement===document.body&&composerInput.current?.offsetParent!==null)composerInput.current?.focus();},[busy]);
 async function submit(event:FormEvent){event.preventDefault();const value=draft.trim();if(!value||busy)return;lastSubmitted.current=value;setDraft("");try{await sendMessage({text:value},{body:{page_path:pagePath,locale}});}catch{setDraft(previous=>previous||value);}}
 return <section className="public-orientation" aria-label={text.title}>
  <div className="orientation-intro"><span className="state-label">{text.mode}</span><h3>{text.title}</h3><p>{text.intro}</p></div>
  <div className="orientation-history" role="log" aria-live="polite" aria-relevant="additions text">{messages.map(message=><article className={"orientation-message role-"+message.role} key={message.id}><strong>{message.role==="user"?text.you:text.assistant}</strong>{message.parts.map((part,index)=>{
   if(part.type==="text")return <p key={index}>{message.role==="assistant"?guidedText(part.text,pages):part.text}</p>;
   if(part.type!=="data-page"||!("data" in part)||!part.data||typeof part.data!=="object")return null;
   const ref=part.data as Record<string,unknown>;const page=pages.find(page=>page.id===ref.page_id&&page.path===ref.path);
   return page?<SiteLink className="orientation-page-link" key={index} href={page.path}>{page.localizedTitle[locale]} <span aria-hidden="true">→</span><span className="visually-hidden"> · {text.next}</span></SiteLink>:null;
  })}</article>)}</div>
  {error&&<p className="error-note" role="alert">{text.error}</p>}
  {messages.length===0&&<div className="orientation-starters" role="group" aria-label={text.label}>{starters[locale][site].map(([label,seed])=><button key={label} type="button" className="orientation-starter" onClick={()=>{setDraft(seed);composerInput.current?.focus();}}><span className="orientation-starter-label">{label}</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg></button>)}</div>}
  <form className="orientation-composer" onSubmit={submit}><label htmlFor="orientation-message">{text.label}</label><textarea ref={composerInput} id="orientation-message" maxLength={1000} rows={3} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={text.placeholder} disabled={busy} required/><button className="primary-button" disabled={busy||!draft.trim()}>{text.send} <span aria-hidden="true">→</span></button>{busy&&<button type="button" className="outline-button" onClick={()=>void stop()}>{text.stop}</button>}</form>
  {busy&&<p className="connection-note" role="status">{text.waiting}</p>}<p className="connection-note">{text.privacy}</p>
 </section>;
}


function StaticOrientationChat({locale,pagePath,pages,onActivityChange}:OrientationProps){
 const site=pagePath.startsWith("/teileklar")?"teileklar":"nexify",text={...copy[locale],...(site==="teileklar"?tkCopy[locale]:{})};
 const [draft,setDraft]=useState(""),[error,setError]=useState(false);
 const [messages,setMessages]=useState<{question:string;answer:StaticGuidance}[]>([]);
 const input=useRef<HTMLTextAreaElement>(null),history=useRef<HTMLDivElement>(null);
 useEffect(()=>{onActivityChange?.(false);},[onActivityChange]);
 useEffect(()=>{setMessages([]);setError(false);},[locale]);
 useEffect(()=>{if(messages.length&&history.current)history.current.scrollTop=messages.length===1?0:history.current.scrollHeight;},[messages]);
 function submit(event:FormEvent){
  event.preventDefault();const question=draft.trim();if(!question)return;
  try{const answer=staticOrientation({locale,pagePath,question,pages});setMessages(previous=>[...previous.slice(-5),{question,answer}]);setDraft("");setError(false);input.current?.focus();}
  catch{setError(true);}
 }
 return <section className="public-orientation" aria-label={text.title} data-orientation-mode="local-public-pages">
  <div className="orientation-intro"><span className="state-label">{text.mode}</span><h3>{text.title}</h3><p>{text.intro}</p></div>
  <div className="orientation-history" ref={history} role="log" aria-live="polite" aria-relevant="additions text">{messages.map((message,index)=><div key={index}>
   <article className="orientation-message role-user"><strong>{text.you}</strong><p>{message.question}</p></article>
   <article className="orientation-message role-assistant"><strong>{text.assistant}</strong><p>{message.answer.text}</p>{message.answer.cards.map(card=><SiteLink className="orientation-page-link" key={card.path} href={card.path}><span><strong>{card.title}</strong><br/>{card.summary}</span><span aria-hidden="true">→</span><span className="visually-hidden"> · {text.next}</span></SiteLink>)}<details className="orientation-disclosure"><summary>{text.notice}</summary><p>{message.answer.notice}</p></details></article>
  </div>)}</div>
  {error&&<p className="error-note" role="alert">{text.error}</p>}
  {messages.length===0&&<div className="orientation-starters" role="group" aria-label={text.label}>{starters[locale][site].map(([label,seed])=><button key={label} type="button" className="orientation-starter" onClick={()=>{setDraft(seed);input.current?.focus();}}><span className="orientation-starter-label">{label}</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg></button>)}</div>}
  <form className="orientation-composer" onSubmit={submit}><label htmlFor="orientation-message">{text.label}</label><textarea ref={input} id="orientation-message" maxLength={1000} rows={3} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={text.placeholder} required/><button className="primary-button" disabled={!draft.trim()}>{text.send} <span aria-hidden="true">→</span></button></form>
  <p className="connection-note">{text.privacy}</p>
 </section>;
}
