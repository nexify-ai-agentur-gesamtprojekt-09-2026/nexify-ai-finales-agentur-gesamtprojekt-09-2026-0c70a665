"use client";
import type {UIMessage} from "ai";
import {useCallback,useEffect,useRef,useState,type KeyboardEvent,type MouseEvent} from "react";
import type {Locale} from "../lib/i18n";
import type {PublicPage} from "../lib/page-types";
import {SiteLink} from "./Router";
import "./PublicOrientationChat.css";
import {staticOrientation,type StaticGuidance} from "../lib/static-orientation";
import {saveOracleBrief} from "../lib/project-brief-transfer";
import {streamChat} from "../lib/chat-client";
import type {BriefingDTO,ChatMessageDTO} from "../lib/chat-contract";
declare const __NEXIFY_STATIC_ORIENTATION__:boolean;

const copy={
  "de": {
    "title": "Was planen Sie?",
    "mode": "Leistungen finden",
    "intro": "Erzählen Sie mir von Ihrem Unternehmen und Ihrem Vorhaben. Ich helfe Ihnen, passende Leistungen zu finden und Ihr Gespräch mit Pascal vorzubereiten.",
    "label": "Wobei können wir Ihnen helfen?",
    "placeholder": "Zum Beispiel: Ich möchte meine Website erneuern …",
    "send": "Nachricht senden",
    "stop": "Antwort anhalten",
    "waiting": "Passende Informationen werden geladen …",
    "error": "Die Website-Beratung ist gerade nicht erreichbar. Ihre Eingabe bleibt erhalten. Für die persönliche Projektklärung nutzen Sie bitte die Kontaktseite.",
    "privacy": "Bitte keine Passwörter oder Zahlungsdaten eingeben.",
    "you": "Sie",
    "assistant": "AIFly ORACLE",
    "next": "Zum passenden Angebot",
    "prompt": "Welcher Einstieg von NeXify passt zu meinem Unternehmen?"
  },
  "nl": {
    "title": "Wat bent u van plan?",
    "mode": "Diensten vinden",
    "intro": "Vertel me over uw bedrijf en uw plannen. Ik help u passende diensten te vinden en uw gesprek met Pascal voor te bereiden.",
    "label": "Waarmee kunnen we u helpen?",
    "placeholder": "Bijvoorbeeld: Ik wil mijn website vernieuwen …",
    "send": "Bericht versturen",
    "stop": "Antwoord onderbreken",
    "waiting": "Passende informatie wordt geladen …",
    "error": "Het websiteadvies is nu niet bereikbaar. Uw invoer blijft behouden. Gebruik de contactpagina voor een persoonlijk projectgesprek.",
    "privacy": "Voer hier geen wachtwoorden of betaalgegevens in.",
    "you": "U",
    "assistant": "AIFly ORACLE",
    "next": "Naar het passende aanbod",
    "prompt": "Welke eerste stap van NeXify past bij mijn bedrijf?"
  },
  "fr": {
    "title": "Quel est votre projet ?",
    "mode": "Trouver une prestation",
    "intro": "Parlez-moi de votre entreprise et de votre projet. Je vous aide à trouver les services adaptés et à préparer votre échange avec Pascal.",
    "label": "Comment pouvons-nous vous aider ?",
    "placeholder": "Par exemple : je souhaite refaire mon site …",
    "send": "Envoyer le message",
    "stop": "Suspendre la réponse",
    "waiting": "Chargement des informations pertinentes…",
    "error": "Le conseil sur le site est momentanément indisponible. Votre saisie est conservée. Utilisez la page de contact pour un échange personnel sur votre projet.",
    "privacy": "Merci de ne saisir ni mot de passe ni données de paiement.",
    "you": "Vous",
    "assistant": "AIFly ORACLE",
    "next": "Vers l’offre adaptée",
    "prompt": "Quelle première étape de NeXify convient à mon entreprise ?"
  },
  "en": {
    "title": "What are you planning?",
    "mode": "Find a service",
    "intro": "Tell me about your business and what you have in mind. I can help you find relevant services and prepare your conversation with Pascal.",
    "label": "How can we help?",
    "placeholder": "For example: I would like to update my website …",
    "send": "Send message",
    "stop": "Pause response",
    "waiting": "Loading relevant information …",
    "error": "Website guidance is temporarily unavailable. Your input is retained. Please use the contact page for a personal project discussion.",
    "privacy": "Please do not enter passwords or payment details.",
    "you": "You",
    "assistant": "AIFly ORACLE",
    "next": "View the relevant offer",
    "prompt": "Which NeXify starting point suits my business?"
  }
};

// Zustände des geführten Gesprächs. Gleicher Schlüsselsatz in allen vier Sprachen.
type StateCopy={latest:string;reply:string;thinking:string;failed:string;limited:string;stopped:string;retry:string;contact:string;restart:string;brief:string;briefRequest:string;unavailable:string;counter:string;keys:string};
const stateCopy:Record<Locale,StateCopy>={
 de:{latest:"Zur neuesten Nachricht",reply:"Ihre Antwort …",thinking:"AIFly ORACLE antwortet …",failed:"Die Antwort konnte gerade nicht geladen werden. Ihre Nachricht bleibt stehen. Versuchen Sie es erneut oder schreiben Sie Pascal direkt.",limited:"Gerade gehen sehr viele Nachrichten ein. Bitte versuchen Sie es in einer Minute erneut.",stopped:"Antwort angehalten.",retry:"Erneut versuchen",contact:"Kontakt aufnehmen",restart:"Neues Gespräch",brief:"Briefing jetzt erstellen",briefRequest:"Bitte fassen Sie mein Vorhaben jetzt als Briefing zusammen.",unavailable:"Das Gespräch im Chat ist gerade nicht erreichbar. Sie erhalten hier eine Orientierung anhand der Website. Ihr Vorhaben können Sie direkt an Pascal senden.",counter:"Zeichen",keys:"Eingabetaste sendet, Umschalt und Eingabetaste beginnt eine neue Zeile."},
 nl:{latest:"Naar het nieuwste bericht",reply:"Uw antwoord …",thinking:"AIFly ORACLE antwoordt …",failed:"Het antwoord kon nu niet worden geladen. Uw bericht blijft staan. Probeer het opnieuw of schrijf Pascal rechtstreeks.",limited:"Er komen nu erg veel berichten binnen. Probeer het over een minuut opnieuw.",stopped:"Antwoord onderbroken.",retry:"Opnieuw proberen",contact:"Contact opnemen",restart:"Nieuw gesprek",brief:"Nu briefing maken",briefRequest:"Vat mijn plan nu samen als briefing.",unavailable:"Het gesprek in de chat is nu niet bereikbaar. U krijgt hier een oriëntatie op basis van de website. Uw plan kunt u rechtstreeks naar Pascal sturen.",counter:"tekens",keys:"Enter verstuurt, Shift en Enter begint een nieuwe regel."},
 fr:{latest:"Aller au dernier message",reply:"Votre réponse …",thinking:"AIFly ORACLE répond …",failed:"La réponse n’a pas pu être chargée. Votre message est conservé. Réessayez ou écrivez directement à Pascal.",limited:"De très nombreux messages arrivent en ce moment. Veuillez réessayer dans une minute.",stopped:"Réponse suspendue.",retry:"Réessayer",contact:"Prendre contact",restart:"Nouvelle conversation",brief:"Créer le briefing",briefRequest:"Merci de résumer maintenant mon projet sous forme de briefing.",unavailable:"La conversation dans le chat est momentanément indisponible. Vous obtenez ici une orientation à partir du site. Vous pouvez envoyer votre projet directement à Pascal.",counter:"caractères",keys:"Entrée envoie, Maj et Entrée commence une nouvelle ligne."},
 en:{latest:"Jump to latest message",reply:"Your reply …",thinking:"AIFly ORACLE is replying …",failed:"The reply could not be loaded just now. Your message is kept. Please try again or write to Pascal directly.",limited:"A lot of messages are coming in right now. Please try again in a minute.",stopped:"Reply paused.",retry:"Try again",contact:"Get in touch",restart:"New conversation",brief:"Create the brief now",briefRequest:"Please summarise my project as a brief now.",unavailable:"The conversation in the chat is currently unavailable. You get guidance based on the website here. You can send your project to Pascal directly.",counter:"characters",keys:"Enter sends, Shift and Enter starts a new line."}
};

// Hinweis unter dem Eingabefeld: sachlicher Eingabehinweis mit Verweis auf die Datenschutzseite der jeweiligen Marke.
const privacyLink:Record<Locale,string>={de:"Datenschutz",nl:"Privacy",fr:"Confidentialité",en:"Privacy"};
function ComposerNote({locale,site,pages,children}:{locale:Locale;site:"nexify"|"teileklar";pages:PublicPage[];children:string}){
 const target=pages.find(page=>page.path===(site==="teileklar"?"/teileklar/rechtliches":"/datenschutz"));
 return <>{children}{target&&<> <SiteLink href={target.path}>{privacyLink[locale]}</SiteLink></>}</>;
}

// TEILEKLAR-specific overrides for the default-visible orientation chat (vehicle/part/workshop context).
const tkCopy={
 de:{title:"Willkommen bei TEILEKLAR",intro:"Willkommen bei TEILEKLAR. Worum geht es bei Ihnen: ein Ersatzteil, ein Werkstattbesuch oder eine Zusammenarbeit? Bei einer Teile- oder Werkstattfrage nennen Sie bitte Ihr Fahrzeug und beschreiben Sie Ihr Anliegen. Eine vorhandene Teilenummer hilft bei der Zuordnung.",label:"Ihr Fahrzeug-/Teile-Anliegen",placeholder:"Fahrzeug und gesuchtes Teil nennen …"},
 nl:{title:"Welkom bij TEILEKLAR",intro:"Welkom bij TEILEKLAR. Waar gaat het bij u om: een onderdeel, een werkplaatsbezoek of een samenwerking? Bij een onderdeel- of werkplaatsvraag: noem uw voertuig en beschrijf uw vraag. Een bestaand onderdeelnummer helpt bij de toewijzing. Online bestellen is momenteel niet mogelijk.",label:"Uw voertuig-/onderdeelvraag",placeholder:"Voertuig en gezocht onderdeel noemen …"},
 fr:{title:"Bienvenue chez TEILEKLAR",intro:"Bienvenue chez TEILEKLAR. Que recherchez-vous : une pièce, une visite en atelier ou une collaboration ? Pour une demande de pièce ou d’atelier, indiquez votre véhicule et décrivez votre demande. Un numéro de pièce existant facilite l’affectation. La commande en ligne n’est pas possible actuellement.",label:"Votre demande véhicule/pièce",placeholder:"Indiquez le véhicule et la pièce recherchée …"},
 en:{"title": "Welcome to TEILEKLAR", "intro": "Welcome to TEILEKLAR. What is it about for you: a spare part, a workshop visit or a partnership? For a parts or workshop question, please name your vehicle and describe your request. An existing part number helps with the assignment. Online ordering is currently not possible.", "label": "Your vehicle/part request", "placeholder": "Enter the vehicle and the part you need …"}
};
const staticModeLabel:Record<Locale,string>={de:'Orientierung anhand der Website · ohne Live-KI',nl:'Oriëntatie op basis van de website · zonder live AI',fr:'Orientation selon le site · sans IA en direct',en:'Website-based guidance · no live AI'};
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

function OrientationJourney({locale,site,step=0}:{locale:Locale;site:"nexify"|"teileklar";step?:number}){
 const content=journeyCopy[locale][site];
 return <ol className="orientation-path" aria-label={content.title}>{content.steps.map(([number,label],index)=><li key={number} data-state={index<step?"done":index===step?"current":"open"} aria-current={index===step?"step":undefined}><small>{number}</small>{label}</li>)}</ol>;
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

const briefingCopy:Record<Locale,{title:string;intro:string;label:string;copy:string;copied:string;fallback:string;tooLong:string;contact:string;hint:string;heading:string}>={
 de:{title:"Ihr Projektbriefing",intro:"Aus Ihren Angaben entsteht ein Entwurf für das persönliche Gespräch. Sie können ihn ändern.",label:"Briefing bearbeiten",copy:"Briefing kopieren",copied:"Kopiert.",fallback:"Die Übernahme ist hier nicht möglich. Kopieren Sie den Text und fügen Sie ihn im Kontaktformular ein.",tooLong:"Bitte kürzen Sie das Briefing auf höchstens 4.000 Zeichen.",contact:"Mit diesem Briefing anfragen",hint:"Der Text wird auf diesem Gerät ins Kontaktformular übernommen. Erst dort entscheiden Sie, ob Sie die Anfrage absenden.",heading:"Mein Vorhaben"},
 nl:{title:"Uw projectbriefing",intro:"Uw informatie vormt een concept voor een persoonlijk gesprek. U kunt het aanpassen.",label:"Briefing bewerken",copy:"Briefing kopiëren",copied:"Gekopieerd.",fallback:"Overnemen is hier niet mogelijk. Kopieer de tekst en plak deze in het contactformulier.",tooLong:"Kort het briefing in tot maximaal 4.000 tekens.",contact:"Aanvragen met dit briefing",hint:"De tekst wordt op dit apparaat in het contactformulier gezet. U beslist daar zelf over verzenden.",heading:"Mijn project"},
 fr:{title:"Votre briefing projet",intro:"Vos informations forment une base pour un échange personnel. Vous pouvez la modifier.",label:"Modifier le briefing",copy:"Copier le briefing",copied:"Copié.",fallback:"Le transfert est indisponible ici. Copiez le texte puis collez-le dans le formulaire de contact.",tooLong:"Raccourcissez le briefing à 4 000 caractères maximum.",contact:"Faire une demande avec ce briefing",hint:"Le texte est repris dans le formulaire sur cet appareil. Vous décidez ensuite de l’envoyer.",heading:"Mon projet"},
 en:{title:"Your project brief",intro:"Your details become a draft for a personal conversation. You can edit it.",label:"Edit brief",copy:"Copy brief",copied:"Copied.",fallback:"Transfer is unavailable here. Copy the text and paste it into the contact form.",tooLong:"Please shorten the brief to 4,000 characters or fewer.",contact:"Enquire with this brief",hint:"The text is added to the contact form on this device. You decide whether to send it there.",heading:"My project"}
};

function ProjectBriefing({locale,questions,prepared}:{locale:Locale;questions:string[];prepared?:string}){
 const t=briefingCopy[locale];
 const [edited,setEdited]=useState<string|null>(null),[notice,setNotice]=useState("");
 const priorQuestions=useRef<string[]>([]);
 const questionSignature=questions.join('\u0001');
 useEffect(()=>{
  const previous=priorQuestions.current;
  const incoming=questions.length>previous.length?questions.slice(previous.length):previous.at(-1)!==questions.at(-1)?questions.slice(-1):[];
  priorQuestions.current=questions;
  if(incoming.length&&prepared===undefined)setEdited(current=>current===null?null:`${current}\n${incoming.join('\n')}`);
 },[questionSignature]);
 const prompts:Record<Locale,string>={de:"Ziel / gewünschtes Ergebnis:\n\nBestehende Website oder Systeme:\n\nZeitrahmen und Budget (falls bekannt):",nl:"Doel / gewenst resultaat:\n\nBestaande website of systemen:\n\nPlanning en budget (indien bekend):",fr:"Objectif / résultat souhaité :\n\nSite ou systèmes existants :\n\nCalendrier et budget (si connus) :",en:"Goal / desired outcome:\n\nExisting website or systems:\n\nTimeline and budget (if known):"};
 // Ein im Gespräch entstandenes Briefing ersetzt den Entwurf; eine neue Fassung ersetzt auch eigene Änderungen daran.
 useEffect(()=>{if(prepared!==undefined){setEdited(null);setNotice("");}},[prepared]);
 const generated=prepared??`${t.heading}:\n${questions.map((question,index)=>`${index+1}. ${question}`).join("\n")}\n\n${prompts[locale]}`;
 const value=edited??generated;
 async function copyBrief(){try{await navigator.clipboard.writeText(value);setNotice(t.copied);}catch{setNotice(t.fallback);}}
 function transferBrief(event:MouseEvent<HTMLAnchorElement>){
  try{
   if(value.length>4000){event.preventDefault();setNotice(t.tooLong);return;}
   if(!saveOracleBrief(sessionStorage,value))throw new Error('invalid_brief');
  }catch{
   event.preventDefault();
   setNotice(t.fallback);
  }
 }
 return <section className="orientation-brief" aria-label={t.title}><div className="orientation-brief-heading"><span className="orientation-brief-icon" aria-hidden="true">✳</span><div><h4>{t.title}</h4><p>{t.intro}</p></div></div><label htmlFor="orientation-brief-text">{t.label}</label><textarea id="orientation-brief-text" rows={prepared?10:5} maxLength={4000} value={value} onChange={event=>{setEdited(event.target.value);setNotice("");}}/><div className="orientation-brief-actions"><button type="button" className="outline-button" onClick={()=>void copyBrief()}>{t.copy}</button><SiteLink className="primary-button" href="/kontakt" onClick={transferBrief}>{t.contact} <span aria-hidden="true">→</span></SiteLink></div><p className="orientation-brief-hint">{t.hint}</p><p className="orientation-brief-notice" role="status">{notice}</p></section>;
}

type OrientationProps={locale:Locale;pagePath:string;pages:PublicPage[];onActivityChange?:(working:boolean)=>void};
type FallbackProps=OrientationProps&{unavailable?:boolean;initialQuestion?:string};

export default function PublicOrientationChat(props:OrientationProps){
 const local=typeof __NEXIFY_STATIC_ORIENTATION__!=="undefined"&&__NEXIFY_STATIC_ORIENTATION__===true;
 const site=props.pagePath.startsWith('/teileklar')?'teileklar':'nexify';
 const conversationKey=`${site}:${props.locale}`;
 // Ohne angebundenen Chat fällt die Oberfläche verständlich auf Orientierung und Kontaktweg zurück.
 const [fallback,setFallback]=useState<{key:string;question:string}|null>(null);
 return local?<StaticOrientationChat key={conversationKey} {...props}/>
  :fallback?.key===conversationKey?<StaticOrientationChat key={conversationKey+":fallback"} {...props} unavailable initialQuestion={fallback.question}/>
  :<ServerOrientationChat key={conversationKey} {...props} onUnavailable={question=>setFallback({key:conversationKey,question})}/>;
}

// UI history is visitor-supplied context, never proof of an authenticated conversation.
// Send a bounded suffix of whole text turns; never truncate the latest user question.
export function serverTextHistory(messages:UIMessage[]){
 const validId=/^[A-Za-z0-9_-]{1,100}$/;
 const invalidText=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
 const result:{id:string;role:'user'|'assistant';parts:{type:'text';text:string}[]}[]=[];
 const ids=new Set<string>();let characters=0;
 for(let i=messages.length-1;i>=0&&result.length<12;i--){
  const message=messages[i],latest=i===messages.length-1;
  if((message.role!=='user'&&message.role!=='assistant')||typeof message.id!=='string'||!validId.test(message.id)||ids.has(message.id)){
   if(latest)throw new Error('invalid_latest_message');continue;
  }
  const textParts=message.parts.filter(part=>part.type==='text');
  if(textParts.some(part=>typeof part.text!=='string')){if(latest)throw new Error('invalid_latest_message');continue;}
  const parts=textParts.map(part=>({type:'text' as const,text:part.text}));
  const count=parts.reduce((total,part)=>total+part.text.length,0);
  if(!parts.length||parts.length>12||parts.some(part=>invalidText.test(part.text))||!count){
   if(latest)throw new Error('invalid_latest_message');continue;
  }
  if(characters+count>3000){if(latest)throw new Error('latest_message_too_long');break;}
  ids.add(message.id);characters+=count;result.unshift({id:message.id,role:message.role,parts});
 }
 while(result[0]?.role==='assistant')result.shift();
 if(result.at(-1)?.role!=='user')throw new Error('latest_user_message_required');
 return result;
}

type Turn={id:string;role:"user"|"assistant";text:string;state:"done"|"streaming"|"stopped";briefing?:BriefingDTO};
type Phase="idle"|"sending"|"streaming"|"failed"|"limited";
const MESSAGE_LIMIT=1000;

// Sichtbarer Text der Antwort: Absätze, Links nur auf bekannte Seiten, keine Auszeichnungszeichen.
function AssistantText({text,pages}:{text:string;pages:PublicPage[]}){
 const paragraphs=text.replace(/\*\*|__/g,"").split(/\n{2,}/).map(paragraph=>paragraph.trim()).filter(Boolean);
 return <>{paragraphs.map((paragraph,index)=><p key={index}>{guidedText(paragraph,pages)}</p>)}</>;
}

// Seiten, die in einer Antwort verlinkt sind: als ruhige Wegweiser unter der Antwort.
function linkedPages(text:string,pages:PublicPage[]){
 const found:PublicPage[]=[];
 for(const match of text.matchAll(/\]\((\/[A-Za-z0-9/-]*)\)/g)){const page=pages.find(candidate=>candidate.path===match[1]);if(page&&!found.includes(page))found.push(page);}
 return found.slice(0,3);
}

// Verlauf für den Server: abgeschlossene Beiträge, jüngste zuerst begrenzt. Ein Briefing reist als Block mit,
// damit eine spätere Ergänzung darauf aufbauen kann. Der Server begrenzt und bereinigt erneut.
export function clientHistory(turns:{role:"user"|"assistant";text:string;briefing?:BriefingDTO}[]):ChatMessageDTO[]{
 return turns.filter(turn=>turn.text.trim()||turn.briefing).slice(-16).map(turn=>({role:turn.role,content:turn.briefing?`${turn.text}\n\n\`\`\`briefing\n${JSON.stringify(turn.briefing.data)}\n\`\`\``:turn.text}));
}

const ArrowUp=()=><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>;
const StopSquare=()=><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor"/></svg>;
const ArrowDown=()=><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14m-6-6 6 6 6-6"/></svg>;

// Eingabe als Hauptbedienung: eine wachsende Schreibfläche mit einem einzigen runden Schalter (Senden oder Anhalten).
function Composer({value,onChange,onSubmit,onStop,busy,placeholder,label,sendLabel,stopLabel,keysHint,counterLabel,inputRef}:{value:string;onChange:(value:string)=>void;onSubmit:()=>void;onStop?:()=>void;busy:boolean;placeholder:string;label:string;sendLabel:string;stopLabel:string;keysHint:string;counterLabel:string;inputRef:React.RefObject<HTMLTextAreaElement|null>}){
 // Höhe folgt dem Inhalt (eine bis etwa sechs Zeilen), danach scrollt das Feld.
 useEffect(()=>{const field=inputRef.current;if(!field)return;field.style.height="auto";field.style.height=Math.min(field.scrollHeight,168)+"px";},[value,inputRef]);
 function onKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form?.requestSubmit();}}
 const ready=value.trim().length>0&&value.length<=MESSAGE_LIMIT;
 return <form className="oc-composer orientation-composer" data-busy={busy||undefined} onSubmit={event=>{event.preventDefault();if(ready&&!busy)onSubmit();}}>
  <label className="visually-hidden" htmlFor="orientation-message">{label}</label>
  <textarea ref={inputRef} id="orientation-message" rows={1} maxLength={MESSAGE_LIMIT} value={value} onChange={event=>onChange(event.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} aria-describedby="orientation-keys" enterKeyHint="send" required/>
  <span id="orientation-keys" className="visually-hidden">{keysHint}</span>
  {value.length>=MESSAGE_LIMIT-100&&<span className="oc-counter" aria-live="polite">{value.length}/{MESSAGE_LIMIT}<span className="visually-hidden"> {counterLabel}</span></span>}
  {busy&&onStop?<button type="button" className="oc-send oc-stop" onClick={onStop} aria-label={stopLabel} title={stopLabel}><StopSquare/></button>:<button type="submit" className="oc-send" disabled={!ready||busy} aria-label={sendLabel} title={sendLabel}><ArrowUp/></button>}
 </form>;
}

// Die Eingabeleiste schwebt als Glasfläche über dem Verlauf; der Verlauf erhält dafür unten Raum.
function useDockSpace(shell:React.RefObject<HTMLElement|null>,dock:React.RefObject<HTMLDivElement|null>){
 useEffect(()=>{const node=dock.current,root=shell.current;if(!node||!root)return;const apply=()=>root.style.setProperty("--oc-dock",Math.ceil(node.getBoundingClientRect().height)+"px");apply();if(typeof ResizeObserver==="undefined")return;const observer=new ResizeObserver(apply);observer.observe(node);return()=>observer.disconnect();},[shell,dock]);
}

function ServerOrientationChat({locale,pagePath,pages,onActivityChange,onUnavailable}:OrientationProps&{onUnavailable:(question:string)=>void}){
 const site=pagePath.startsWith("/teileklar")?"teileklar":"nexify";const text={...copy[locale],...(site==="teileklar"?tkCopy[locale]:{})};const state=stateCopy[locale];
 const [draft,setDraft]=useState("");const [turns,setTurns]=useState<Turn[]>([]);const [phase,setPhase]=useState<Phase>("idle");const [away,setAway]=useState(false);
 const turnsRef=useRef<Turn[]>([]);const conversation=useRef<string|null>(null);const controller=useRef<AbortController|null>(null);
 const pending=useRef("");const sequence=useRef(0);const mounted=useRef(true);
 const composerInput=useRef<HTMLTextAreaElement>(null);const scroller=useRef<HTMLDivElement>(null);const pinned=useRef(true);
 const shell=useRef<HTMLElement>(null);const dock=useRef<HTMLDivElement>(null);
 useDockSpace(shell,dock);
 const busy=phase==="sending"||phase==="streaming";
 const update=useCallback((next:Turn[])=>{turnsRef.current=next;setTurns(next);},[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{onActivityChange?.(busy);return()=>onActivityChange?.(false);},[busy,onActivityChange]);
 // Während die Antwort wächst, bleibt das Ende im Blick – außer der Besucher hat nach oben geblättert.
 useEffect(()=>{const node=scroller.current;if(node&&pinned.current)node.scrollTop=node.scrollHeight;},[turns,phase]);
 const nextId=(role:string)=>`${role}-${++sequence.current}`;
 function toLatest(){const node=scroller.current;if(!node)return;pinned.current=true;setAway(false);node.scrollTo({top:node.scrollHeight,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});}

 async function send(value:string,options:{retry?:boolean}={}){
  const message=value.trim();if(!message||busy)return;
  const base=options.retry?turnsRef.current:[...turnsRef.current,{id:nextId("user"),role:"user" as const,text:message,state:"done" as const}];
  const answerId=nextId("assistant");
  pending.current=message;pinned.current=true;setAway(false);update(base);setPhase("sending");
  const abort=new AbortController();controller.current=abort;
  const outcome=await streamChat({message,locale,pagePath,conversationId:conversation.current,history:clientHistory(base.slice(0,-1))},{
   onStart:id=>{conversation.current=id;},
   onText:full=>{if(!mounted.current)return;setPhase("streaming");update([...base,{id:answerId,role:"assistant",text:full,state:"streaming"}]);}
  },{signal:abort.signal});
  if(!mounted.current)return;
  controller.current=null;
  if("conversationId" in outcome&&outcome.conversationId)conversation.current=outcome.conversationId;
  if(outcome.kind==="unavailable"){onUnavailable(message);return;}
  if(outcome.kind==="done"){pending.current="";update([...base,{id:answerId,role:"assistant",text:outcome.text,state:"done",...(outcome.briefing?{briefing:outcome.briefing}:{})}]);setPhase("idle");}
  else if(outcome.kind==="stopped"){pending.current="";update(outcome.text.trim()?[...base,{id:answerId,role:"assistant",text:outcome.text,state:"stopped"}]:base);setPhase("idle");}
  else{update(base);setPhase(outcome.kind==="limited"?"limited":"failed");}
  if(document.activeElement===document.body&&composerInput.current?.offsetParent!==null)composerInput.current?.focus();
 }
 function submit(){const value=draft.trim();if(!value||busy||value.length>MESSAGE_LIMIT)return;setDraft("");void send(value);}
 function restart(){controller.current?.abort();conversation.current=null;pending.current="";update([]);setPhase("idle");setDraft("");composerInput.current?.focus();}
 const users=turns.filter(turn=>turn.role==="user");
 const latestBriefing=[...turns].reverse().find(turn=>turn.briefing)?.briefing;
 const problem=phase==="failed"||phase==="limited";
 const empty=turns.length===0&&!busy;
 return <section ref={shell} className="public-orientation oc" aria-label={text.title} data-orientation-mode="guided" data-phase={phase} data-empty={empty||undefined}>
  <div className="oc-scroll" ref={scroller} onScroll={event=>{const node=event.currentTarget;const near=node.scrollHeight-node.scrollTop-node.clientHeight<64;pinned.current=near;setAway(!near);}}>
   <div className="oc-thread">
    {empty&&<header className="oc-welcome orientation-intro"><h3>{text.title}</h3><p>{text.intro}</p></header>}
    <div className="oc-log" role="log" aria-live="polite" aria-relevant="additions text" aria-busy={busy}>
     {turns.map((turn,index)=>{const routes=turn.role==="assistant"&&turn.state==="done"?linkedPages(turn.text,pages):[];
      return <article className={"oc-msg orientation-message role-"+turn.role} data-state={turn.state} key={turn.id}>
       {turn.role==="assistant"?<span className="oc-who">{turns[index-1]?.role==="assistant"?<span className="visually-hidden">{text.assistant}</span>:"Oracle"}</span>:<span className="visually-hidden">{text.you}: </span>}
       <div className="oc-bubble">{turn.role==="assistant"?<AssistantText text={turn.text} pages={pages}/>:<p>{turn.text}</p>}</div>
       {routes.length>0&&<nav className="oc-routes" aria-label={text.next}>{routes.map(page=><SiteLink className="oc-route" key={page.path} href={page.path}><span>{page.localizedTitle[locale]}</span><span aria-hidden="true">→</span></SiteLink>)}</nav>}
       {turn.state==="stopped"&&<small className="oc-note">{state.stopped}</small>}
      </article>;})}
     {phase==="sending"&&<article className="oc-msg orientation-message role-assistant oc-thinking"><span className="oc-who">Oracle</span><div className="oc-bubble"><span className="oc-dots" aria-hidden="true"><i/><i/><i/></span><span className="visually-hidden">{state.thinking}</span></div></article>}
    </div>
    {problem&&<div className="oc-problem" role="alert"><p>{phase==="limited"?state.limited:state.failed}</p><div className="oc-actions"><button type="button" className="oc-button" onClick={()=>void send(pending.current,{retry:true})}>{state.retry}</button><SiteLink className="oc-button oc-button-quiet" href="/kontakt">{state.contact} <span aria-hidden="true">→</span></SiteLink></div></div>}
    {site==="nexify"&&latestBriefing&&<ProjectBriefing locale={locale} questions={users.map(turn=>turn.text)} prepared={latestBriefing.text}/>}
    {site==="nexify"&&!latestBriefing&&users.length>=2&&!problem&&!busy&&<div className="oc-actions oc-offer"><button type="button" className="oc-button" onClick={()=>void send(state.briefRequest)}>{state.brief}</button></div>}
   </div>
  </div>
  {away&&!empty&&<button type="button" className="oc-jump" onClick={toLatest} aria-label={state.latest} title={state.latest}><ArrowDown/></button>}
  <div className="oc-dock" ref={dock}>
   {empty&&<div className="oc-suggestions" role="group" aria-label={text.label}>{starters[locale][site].map(([title,seed])=><button key={title} type="button" className="oc-suggestion orientation-starter" onClick={()=>{setDraft(seed);composerInput.current?.focus();}}>{title}</button>)}</div>}
   <Composer value={draft} onChange={setDraft} onSubmit={submit} onStop={()=>controller.current?.abort()} busy={busy} placeholder={turns.length?state.reply:text.placeholder} label={text.label} sendLabel={text.send} stopLabel={text.stop} keysHint={state.keys} counterLabel={state.counter} inputRef={composerInput}/>
   <p className="oc-foot"><span className="connection-note"><ComposerNote locale={locale} site={site} pages={pages}>{text.privacy}</ComposerNote></span>{turns.length>0&&<button type="button" className="oc-restart" onClick={restart}>{state.restart}</button>}</p>
  </div>
  <p className="visually-hidden" role="status">{busy?state.thinking:""}</p>
 </section>;
}


function StaticOrientationChat({locale,pagePath,pages,onActivityChange,unavailable,initialQuestion}:FallbackProps){
 const site=pagePath.startsWith("/teileklar")?"teileklar":"nexify",text={...copy[locale],...(site==="teileklar"?tkCopy[locale]:{})};const state=stateCopy[locale];
 const [draft,setDraft]=useState(""),[error,setError]=useState(false);
 // Beim Rückfall wird die bereits gestellte Frage sofort anhand der Website beantwortet.
 const [messages,setMessages]=useState<{question:string;answer:StaticGuidance}[]>(()=>{
  const question=initialQuestion?.trim();if(!question)return [];
  try{return [{question,answer:staticOrientation({locale,pagePath,question,pages,previousQuestions:[]})}];}catch{return [];}
 });
 const input=useRef<HTMLTextAreaElement>(null),latest=useRef<HTMLElement|null>(null);
 const shell=useRef<HTMLElement>(null);const dock=useRef<HTMLDivElement>(null);
 useDockSpace(shell,dock);
 useEffect(()=>{onActivityChange?.(false);},[onActivityChange]);
 const firstLocale=useRef(locale);
 useEffect(()=>{if(firstLocale.current===locale)return;firstLocale.current=locale;setMessages([]);setError(false);},[locale]);
 const notice=useRef<HTMLDivElement>(null),answered=useRef(0);
 // Beim Rückfall zuerst den Hinweis mit dem Kontaktweg zeigen, danach wie gewohnt die jeweils neueste Antwort.
 useEffect(()=>{if(!messages.length)return;const first=answered.current===0;answered.current=messages.length;if(first&&unavailable&&notice.current){notice.current.scrollIntoView({block:"end",behavior:"instant"});return;}latest.current?.scrollIntoView({block:"nearest",behavior:"instant"});},[messages,unavailable]);
 function submit(){
  const question=draft.trim();if(!question)return;
  try{const answer=staticOrientation({locale,pagePath,question,pages,previousQuestions:messages.map(message=>message.question)});setMessages(previous=>[...previous.slice(-5),{question,answer}]);setDraft("");setError(false);input.current?.focus();}
  catch{setError(true);}
 }
 const empty=messages.length===0;
 return <section ref={shell} className="public-orientation oc" aria-label={text.title} data-orientation-mode={unavailable?"fallback":"local-public-pages"} data-empty={empty||undefined}>
  <div className="oc-scroll">
   <div className="oc-thread">
    {empty&&<header className="oc-welcome orientation-intro"><h3>{text.title}</h3><p>{text.intro}</p></header>}
    <div className="oc-log" role="log" aria-live="polite" aria-relevant="additions text">{messages.map((message,index)=><div className="oc-pair" key={index}>
     <article className="oc-msg orientation-message role-user"><span className="visually-hidden">{text.you}: </span><div className="oc-bubble"><p>{message.question}</p></div></article>
     <article className="oc-msg orientation-message role-assistant" ref={index===messages.length-1?latest:undefined}><span className="oc-who">Oracle</span><div className="oc-bubble"><OrientationAnswer text={message.answer.text} locale={locale}/></div><nav className="oc-routes orientation-page-results" aria-label={text.next}>{message.answer.cards.map(card=><SiteLink className="oc-route oc-route-card orientation-page-link" key={card.path} href={card.path}><span className="orientation-page-copy"><strong>{card.title}</strong><small>{card.summary}</small></span><span className="orientation-page-arrow" aria-hidden="true">→</span></SiteLink>)}</nav></article>
    </div>)}</div>
    {unavailable&&<div className="oc-problem oc-unavailable" role="status" ref={notice}><p>{state.unavailable}</p><div className="oc-actions"><SiteLink className="oc-button oc-button-primary" href="/kontakt">{state.contact} <span aria-hidden="true">→</span></SiteLink></div></div>}
    {messages.length>0&&<OrientationJourney locale={locale} site={site}/>}
    {site==="nexify"&&messages.length>0&&<ProjectBriefing locale={locale} questions={messages.map(message=>message.question)}/>}
    {error&&<p className="oc-problem error-note" role="alert">{text.error}</p>}
   </div>
  </div>
  <div className="oc-dock" ref={dock}>
   {empty&&<div className="oc-suggestions" role="group" aria-label={text.label}>{starters[locale][site].map(([title,seed])=><button key={title} type="button" className="oc-suggestion orientation-starter" onClick={()=>{setDraft(seed);input.current?.focus();}}>{title}</button>)}</div>}
   <Composer value={draft} onChange={setDraft} onSubmit={submit} busy={false} placeholder={messages.length?state.reply:text.placeholder} label={text.label} sendLabel={text.send} stopLabel={text.stop} keysHint={state.keys} counterLabel={state.counter} inputRef={input}/>
   <p className="oc-foot"><span className="connection-note">{site==='nexify'&&<span className="orientation-mode-note">{staticModeLabel[locale]}</span>}<ComposerNote locale={locale} site={site} pages={pages}>{text.privacy}</ComposerNote></span></p>
  </div>
 </section>;
}
