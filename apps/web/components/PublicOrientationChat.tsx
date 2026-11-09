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
    "title": "Was planen Sie?",
    "mode": "Leistungen finden",
    "intro": "Wählen Sie ein Thema oder beschreiben Sie Ihr Projekt.",
    "label": "Wobei können wir Ihnen helfen?",
    "placeholder": "Zum Beispiel: Ich möchte meine Website erneuern …",
    "send": "Informationen anzeigen",
    "stop": "Antwort anhalten",
    "waiting": "Passende Informationen werden geladen …",
    "error": "Die Website-Beratung ist gerade nicht erreichbar. Ihre Eingabe bleibt erhalten. Für die persönliche Projektklärung nutzen Sie bitte die Kontaktseite.",
    "privacy": "NeX Agentic AIFly kann Fehler machen.",
    "you": "Sie",
    "assistant": "AIFly ORACLE",
    "next": "Zum passenden Angebot",
    "prompt": "Welcher Einstieg von NeXify passt zu meinem Unternehmen?"
  },
  "nl": {
    "title": "Wat bent u van plan?",
    "mode": "Diensten vinden",
    "intro": "Kies een onderwerp of beschrijf uw project.",
    "label": "Waarmee kunnen we u helpen?",
    "placeholder": "Bijvoorbeeld: Ik wil mijn website vernieuwen …",
    "send": "Informatie tonen",
    "stop": "Antwoord onderbreken",
    "waiting": "Passende informatie wordt geladen …",
    "error": "Het websiteadvies is nu niet bereikbaar. Uw invoer blijft behouden. Gebruik de contactpagina voor een persoonlijk projectgesprek.",
    "privacy": "NeX Agentic AIFly kan fouten maken.",
    "you": "U",
    "assistant": "AIFly ORACLE",
    "next": "Naar het passende aanbod",
    "prompt": "Welke eerste stap van NeXify past bij mijn bedrijf?"
  },
  "fr": {
    "title": "Quel est votre projet ?",
    "mode": "Trouver une prestation",
    "intro": "Choisissez un sujet ou décrivez votre projet.",
    "label": "Comment pouvons-nous vous aider ?",
    "placeholder": "Par exemple : je souhaite refaire mon site …",
    "send": "Afficher les informations",
    "stop": "Suspendre la réponse",
    "waiting": "Chargement des informations pertinentes…",
    "error": "Le conseil sur le site est momentanément indisponible. Votre saisie est conservée. Utilisez la page de contact pour un échange personnel sur votre projet.",
    "privacy": "NeX Agentic AIFly peut faire des erreurs.",
    "you": "Vous",
    "assistant": "AIFly ORACLE",
    "next": "Vers l’offre adaptée",
    "prompt": "Quelle première étape de NeXify convient à mon entreprise ?"
  },
  "en": {
    "title": "What are you planning?",
    "mode": "Find a service",
    "intro": "Choose a topic or describe your project.",
    "label": "How can we help?",
    "placeholder": "For example: I would like to update my website …",
    "send": "Show information",
    "stop": "Pause response",
    "waiting": "Loading relevant information …",
    "error": "Website guidance is temporarily unavailable. Your input is retained. Please use the contact page for a personal project discussion.",
    "privacy": "NeX Agentic AIFly can make mistakes.",
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

const starterDetails:Record<Locale,Record<"nexify"|"teileklar",readonly string[]>>={
 de:{
  nexify:["Positionierung, Sprache, Design und Website als überzeugender Auftritt.","Abläufe, Systeme und KI zu einer kontrollierten Arbeitsweise verbinden.","Angebot, Zielgruppe, Kampagne und Landingpage gemeinsam auf Wirkung ausrichten."],
  teileklar:["Mit Fahrzeugdaten und vorhandenem Hinweis zum passenden Teil starten.","Leistung, Fahrzeug und Standort für die Werkstattsuche einordnen.","Werkstattprofil, Zusammenarbeit und gemeinsamen Serviceweg besprechen."]
 },
 nl:{
  nexify:["Positionering, taal, design en website als overtuigend geheel.","Processen, systemen en AI verbinden tot een controleerbare werkwijze.","Aanbod, doelgroep, campagne en landingspagina samen op resultaat richten."],
  teileklar:["Start met voertuiggegevens en bekende informatie over het onderdeel.","Werkplaatsdienst, voertuig en locatie samen afbakenen.","Werkplaatsprofiel, samenwerking en gezamenlijke service bespreken."]
 },
 fr:{
  nexify:["Positionnement, langage, design et site réunis dans une présence convaincante.","Relier processus, systèmes et IA dans un fonctionnement maîtrisé.","Aligner offre, cible, campagne et page d’arrivée sur un même résultat."],
  teileklar:["Commencer avec le véhicule et les informations connues sur la pièce.","Préciser la prestation, le véhicule et la zone de recherche.","Échanger sur le profil atelier, la collaboration et le parcours de service."]
 },
 en:{
  nexify:["Positioning, language, design and website shaped as one convincing presence.","Connect workflows, systems and AI in a controlled way of working.","Align offer, audience, campaign and landing page around one result."],
  teileklar:["Start with vehicle details and any known information about the part.","Frame the service, vehicle and location for the workshop search.","Discuss the workshop profile, partnership and shared service journey."]
 }
};

const journeyCopy:Record<Locale,Record<"nexify"|"teileklar",{eyebrow:string;title:string;body:string;steps:readonly [string,string][]}>>={
 de:{
  nexify:{eyebrow:"Persönlich geführt",title:"Aus einer Idee wird ein klarer nächster Schritt.",body:"AIFly ordnet Ihr Vorhaben vor. Pascal übernimmt, sobald Ziele, Umfang und Entscheidungen persönlich geklärt werden sollen.",steps:[["01","Vorhaben einordnen"],["02","Passenden Weg finden"],["03","Persönlich vertiefen"]]},
  teileklar:{eyebrow:"Gezielt vorbereitet",title:"Vom Anliegen zur passenden Anlaufstelle.",body:"AIFly sammelt die entscheidenden Angaben. Anschließend führt der passende Weg zu Teil, Werkstatt oder Zusammenarbeit.",steps:[["01","Fahrzeug nennen"],["02","Anliegen eingrenzen"],["03","Nächsten Weg wählen"]]}
 },
 nl:{
  nexify:{eyebrow:"Persoonlijk begeleid",title:"Van idee naar een duidelijke volgende stap.",body:"AIFly ordent uw plan vooraf. Pascal neemt over zodra doelen, omvang en keuzes persoonlijk besproken moeten worden.",steps:[["01","Plan duiden"],["02","Route bepalen"],["03","Persoonlijk verdiepen"]]},
  teileklar:{eyebrow:"Gericht voorbereid",title:"Van vraag naar het juiste aanspreekpunt.",body:"AIFly verzamelt de beslissende gegevens. Daarna leidt de passende route naar onderdeel, werkplaats of samenwerking.",steps:[["01","Voertuig noemen"],["02","Vraag afbakenen"],["03","Route kiezen"]]}
 },
 fr:{
  nexify:{eyebrow:"Accompagnement personnel",title:"De l’idée à une prochaine étape claire.",body:"AIFly structure d’abord votre projet. Pascal prend le relais lorsque les objectifs, le périmètre et les décisions doivent être précisés ensemble.",steps:[["01","Situer le projet"],["02","Trouver la voie"],["03","Approfondir ensemble"]]},
  teileklar:{eyebrow:"Préparation ciblée",title:"De la demande au bon interlocuteur.",body:"AIFly rassemble les informations décisives, puis oriente vers la pièce, l’atelier ou la collaboration appropriée.",steps:[["01","Nommer le véhicule"],["02","Préciser le besoin"],["03","Choisir la suite"]]}
 },
 en:{
  nexify:{eyebrow:"Personally guided",title:"Turn an idea into a clear next step.",body:"AIFly structures your project first. Pascal takes over when goals, scope and decisions need a personal conversation.",steps:[["01","Frame the project"],["02","Find the right route"],["03","Develop it together"]]},
  teileklar:{eyebrow:"Purposefully prepared",title:"From request to the right point of contact.",body:"AIFly gathers the decisive details, then directs you to the relevant part, workshop or partnership route.",steps:[["01","Name the vehicle"],["02","Narrow the request"],["03","Choose the route"]]}
 }
};

function OrientationStarters({locale,site,label,onChoose}:{locale:Locale;site:"nexify"|"teileklar";label:string;onChoose:(seed:string)=>void}){
 return <div className="orientation-starters" role="group" aria-label={label}>{starters[locale][site].map(([title,seed],index)=><button key={title} type="button" className="orientation-starter" onClick={()=>onChoose(seed)}><span className="orientation-starter-index" aria-hidden="true">0{index+1}</span><span className="orientation-starter-copy"><strong>{title}</strong><small>{starterDetails[locale][site][index]}</small></span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg></button>)}</div>;
}

function OrientationJourney({locale,site}:{locale:Locale;site:"nexify"|"teileklar"}){
 const content=journeyCopy[locale][site];
 return <aside className="orientation-journey" aria-label={content.title}><span>{content.eyebrow}</span><h4>{content.title}</h4><p>{content.body}</p><ol>{content.steps.map(([number,label])=><li key={number}><small>{number}</small><strong>{label}</strong></li>)}</ol></aside>;
}

function OrientationAnswer({text,locale}:{text:string;locale:Locale}){
 const paragraphs=text.split(/\n\n+/).filter(Boolean),last=paragraphs.length-1;
 const noteLabel=({de:"Hinweis zur Einordnung",nl:"Toelichting",fr:"Note d’orientation",en:"Guidance note"} as const)[locale];
 return <div className="orientation-answer-copy">{paragraphs.map((paragraph,index)=>index===0?<p className="orientation-answer-heading" key={paragraph}>{paragraph}</p>:index===last&&paragraphs.length>2?<details className="orientation-answer-note" key={paragraph}><summary>{noteLabel}<span aria-hidden="true">+</span></summary><p>{paragraph}</p></details>:<p key={paragraph}>{paragraph}</p>)}</div>;
}

function guidedText(text:string,pages:PublicPage[]){
 return text.split(/(\[[^\]\n]+\]\(\/[A-Za-z0-9/-]*\))/g).map((part,index)=>{
  const match=/^\[([^\]\n]+)\]\((\/[A-Za-z0-9/-]*)\)$/.exec(part);
  const target=match&&pages.find(page=>page.path===match[2]);
  return target?<SiteLink key={index} href={target.path}>{match![1]}</SiteLink>:part;
 });
}

const briefingCopy:Record<Locale,{title:string;intro:string;label:string;copy:string;copied:string;fallback:string;contact:string;hint:string;heading:string}>={
 de:{title:"Ihr Projektbriefing",intro:"Ihre Angaben als Grundlage für ein persönliches Gespräch. Ergänzen oder ändern Sie den Text vor der Anfrage.",label:"Briefing bearbeiten",copy:"Briefing kopieren",copied:"Kopiert. Fügen Sie das Briefing im Kontaktformular ein.",fallback:"Bitte markieren und kopieren Sie den Text selbst.",contact:"Zum Kontaktformular",hint:"Das Kontaktformular öffnet sich ohne automatische Übertragung. Ihre Anfrage senden Sie dort selbst ab.",heading:"Mein Vorhaben"},
 nl:{title:"Uw projectbriefing",intro:"Uw informatie als basis voor een persoonlijk gesprek. U kunt de tekst vóór uw aanvraag aanpassen.",label:"Briefing bewerken",copy:"Briefing kopiëren",copied:"Gekopieerd. Plak de briefing in het contactformulier.",fallback:"Selecteer en kopieer de tekst zelf.",contact:"Naar het contactformulier",hint:"Het contactformulier opent zonder automatische overdracht. U verstuurt de aanvraag daar zelf.",heading:"Mijn project"},
 fr:{title:"Votre briefing projet",intro:"Vos informations pour préparer un échange personnel. Vous pouvez modifier le texte avant votre demande.",label:"Modifier le briefing",copy:"Copier le briefing",copied:"Copié. Collez le briefing dans le formulaire de contact.",fallback:"Sélectionnez et copiez le texte vous-même.",contact:"Vers le formulaire de contact",hint:"Le formulaire s’ouvre sans transfert automatique. Vous envoyez vous-même votre demande.",heading:"Mon projet"},
 en:{title:"Your project brief",intro:"Your details provide a starting point for a personal conversation. Edit the text before making an enquiry.",label:"Edit brief",copy:"Copy brief",copied:"Copied. Paste the brief into the contact form.",fallback:"Please select and copy the text yourself.",contact:"Go to contact form",hint:"The contact form opens without transferring your text. You send the enquiry yourself.",heading:"My project"}
};

function ProjectBriefing({locale,questions}:{locale:Locale;questions:string[]}){
 const t=briefingCopy[locale];
 const [edited,setEdited]=useState<string|null>(null),[notice,setNotice]=useState("");
 const prompts:Record<Locale,string>={de:"Ziel / gewünschtes Ergebnis:\n\nBestehende Website oder Systeme:\n\nZeitrahmen und Budget (falls bekannt):",nl:"Doel / gewenst resultaat:\n\nBestaande website of systemen:\n\nPlanning en budget (indien bekend):",fr:"Objectif / résultat souhaité :\n\nSite ou systèmes existants :\n\nCalendrier et budget (si connus) :",en:"Goal / desired outcome:\n\nExisting website or systems:\n\nTimeline and budget (if known):"};
 const generated=`${t.heading}:\n${questions.map((question,index)=>`${index+1}. ${question}`).join("\n")}\n\n${prompts[locale]}`;
 const value=edited??generated;
 async function copyBrief(){try{await navigator.clipboard.writeText(value);setNotice(t.copied);}catch{setNotice(t.fallback);}}
 return <section className="orientation-brief" aria-label={t.title}><div className="orientation-brief-heading"><span className="orientation-brief-icon" aria-hidden="true">✳</span><div><h4>{t.title}</h4><p>{t.intro}</p></div></div><label htmlFor="orientation-brief-text">{t.label}</label><textarea id="orientation-brief-text" rows={5} value={value} onChange={event=>{setEdited(event.target.value);setNotice("");}}/><div className="orientation-brief-actions"><button type="button" className="outline-button" onClick={()=>void copyBrief()}>{t.copy}</button><SiteLink className="primary-button" href="/kontakt">{t.contact} <span aria-hidden="true">→</span></SiteLink></div><p className="orientation-brief-hint">{t.hint}</p><p className="orientation-brief-notice" role="status">{notice}</p></section>;
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
  <div className="orientation-content">
  <div className="orientation-intro"><span className="state-label">{text.mode}</span><h3>{text.title}</h3><p>{text.intro}</p></div>
  <div className="orientation-history" role="log" aria-live="polite" aria-relevant="additions text">{messages.map(message=><article className={"orientation-message role-"+message.role} key={message.id}><strong>{message.role==="user"?text.you:text.assistant}</strong>{message.parts.map((part,index)=>{
   if(part.type==="text")return <p key={index}>{message.role==="assistant"?guidedText(part.text,pages):part.text}</p>;
   if(part.type!=="data-page"||!("data" in part)||!part.data||typeof part.data!=="object")return null;
   const ref=part.data as Record<string,unknown>;const page=pages.find(page=>page.id===ref.page_id&&page.path===ref.path);
   return page?<SiteLink className="orientation-page-link" key={index} href={page.path}><span className="orientation-page-index" aria-hidden="true">0{index+1}</span><span className="orientation-page-copy"><strong>{page.localizedTitle[locale]}</strong><small>{page.localizedSummary[locale]}</small></span><span className="orientation-page-arrow" aria-hidden="true">→</span><span className="visually-hidden"> · {text.next}</span></SiteLink>:null;
  })}</article>)}</div>
  {site==="nexify"&&messages.some(message=>message.role==="user")&&<ProjectBriefing locale={locale} questions={messages.filter(message=>message.role==="user").map(message=>message.parts.filter(part=>part.type==="text").map(part=>part.text).join(" "))}/>}
  {error&&<p className="error-note" role="alert">{text.error}</p>}
  {messages.length===0&&<><OrientationStarters locale={locale} site={site} label={text.label} onChoose={seed=>{setDraft(seed);composerInput.current?.focus();}}/><OrientationJourney locale={locale} site={site}/></>}
  </div>
  <form className="orientation-composer" onSubmit={submit}><label htmlFor="orientation-message">{text.label}</label><textarea ref={composerInput} id="orientation-message" maxLength={1000} rows={2} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={text.placeholder} disabled={busy} required/><button className="primary-button" disabled={busy||!draft.trim()}>{text.send} <span aria-hidden="true">→</span></button>{busy&&<button type="button" className="outline-button" onClick={()=>void stop()}>{text.stop}</button>}</form>
  {busy&&<p className="connection-note" role="status">{text.waiting}</p>}<p className="connection-note">{text.privacy}</p>
 </section>;
}


function StaticOrientationChat({locale,pagePath,pages,onActivityChange}:OrientationProps){
 const site=pagePath.startsWith("/teileklar")?"teileklar":"nexify",text={...copy[locale],...(site==="teileklar"?tkCopy[locale]:{})};
 const [draft,setDraft]=useState(""),[error,setError]=useState(false);
 const [messages,setMessages]=useState<{question:string;answer:StaticGuidance}[]>([]);
 const input=useRef<HTMLTextAreaElement>(null),latest=useRef<HTMLElement|null>(null);
 useEffect(()=>{onActivityChange?.(false);},[onActivityChange]);
 useEffect(()=>{setMessages([]);setError(false);},[locale]);
 useEffect(()=>{if(messages.length)latest.current?.scrollIntoView({block:"nearest",behavior:"instant"});},[messages]);
 function submit(event:FormEvent){
  event.preventDefault();const question=draft.trim();if(!question)return;
  try{const answer=staticOrientation({locale,pagePath,question,pages});setMessages(previous=>[...previous.slice(-5),{question,answer}]);setDraft("");setError(false);input.current?.focus();}
  catch{setError(true);}
 }
 return <section className="public-orientation" aria-label={text.title} data-orientation-mode="local-public-pages">
  <div className="orientation-content">
  <div className="orientation-intro"><span className="state-label">{text.mode}</span><h3>{text.title}</h3><p>{text.intro}</p></div>
  <div className="orientation-history" role="log" aria-live="polite" aria-relevant="additions text">{messages.map((message,index)=><div key={index}>
   <article className="orientation-message role-user"><strong>{text.you}</strong><p>{message.question}</p></article>
   <article className="orientation-message role-assistant" ref={index===messages.length-1?latest:undefined}><strong>{text.assistant}</strong><OrientationAnswer text={message.answer.text} locale={locale}/><div className="orientation-page-results">{message.answer.cards.map((card,cardIndex)=><SiteLink className="orientation-page-link" key={card.path} href={card.path}><span className="orientation-page-index" aria-hidden="true">0{cardIndex+1}</span><span className="orientation-page-copy"><strong>{card.title}</strong><small>{card.summary}</small></span><span className="orientation-page-arrow" aria-hidden="true">→</span><span className="visually-hidden"> · {text.next}</span></SiteLink>)}</div></article>
  </div>)}</div>
  {site==="nexify"&&messages.length>0&&<ProjectBriefing locale={locale} questions={messages.map(message=>message.question)}/>}
  {error&&<p className="error-note" role="alert">{text.error}</p>}
  {messages.length===0&&<><OrientationStarters locale={locale} site={site} label={text.label} onChoose={seed=>{setDraft(seed);input.current?.focus();}}/><OrientationJourney locale={locale} site={site}/></>}
  </div>
  <form className="orientation-composer" onSubmit={submit}><label htmlFor="orientation-message">{text.label}</label><textarea ref={input} id="orientation-message" maxLength={1000} rows={2} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={text.placeholder} required/><button className="primary-button" disabled={!draft.trim()}>{text.send} <span aria-hidden="true">→</span></button></form>
  <p className="connection-note">{text.privacy}</p>
 </section>;
}
