const localeTags={de:'de-DE',nl:'nl-NL',fr:'fr-FR',en:'en-US'};
const ogLocales={de:'de_DE',nl:'nl_NL',fr:'fr_FR',en:'en_US'};
const fallbackDescriptions={
  de:'NeXify AI: Websites, Apps und vernetzte Abläufe. Besprechen Sie Ihr Vorhaben direkt mit NeX Agentic AIFly.',
  nl:'NeXify AI: websites, apps en verbonden processen. Bespreek uw plan direct met NeX Agentic AIFly.',
  fr:'NeXify AI : sites web, applications et processus connectés. Discutez de votre projet directement avec NeX Agentic AIFly.',
  en:'NeXify AI: websites, apps and connected processes. Discuss your project directly with NeX Agentic AIFly.'
};
const unavailableTitles={de:'Seite nicht verfügbar',nl:'Pagina niet beschikbaar',fr:'Page indisponible',en:'Page unavailable'};
const homeTitle='NeXify AI · Websites, Systeme und Kampagnen aus einem Konzept';
const homeDescription='NeXify AI FACTORY B.V. gestaltet Markenauftritte und Websites, verbindet digitale Abläufe und entwickelt Kampagnen. Pascal Courbois begleitet Ihr Vorhaben persönlich.';
const fallbackOrigin='https://nexify-ai-factory-20261101.workspace-vo-0220.chatgpt.site';

function safeOrigin(origin){
  try{const parsed=new URL(origin);return /^https?:$/.test(parsed.protocol)?parsed.origin:fallbackOrigin;}catch{return fallbackOrigin;}
}

/** Build a route-specific, source-backed metadata state without browser globals. */
export function buildSeoState({page,locale,pathname,origin}){
  const language=localeTags[locale]||localeTags.de;
  const canonicalOrigin=safeOrigin(origin);
  // The route shell proves only its registered base. A detail slug needs a
  // real record with its own metadata before it may become canonical.
  const publicPath=page?.path||'/';
  const canonical=new URL(publicPath,canonicalOrigin).href;
  const title=page?(page.id==='home'&&locale==='de'?homeTitle:`${page.localizedTitle[locale]} · NeXify AI`):`${unavailableTitles[locale]||unavailableTitles.de} · NeXify AI`;
  const description=page?(page.id==='home'&&locale==='de'?homeDescription:page.localizedSummary[locale]):fallbackDescriptions[locale]||fallbackDescriptions.de;
  const robots=page?'noindex,nofollow':'noindex,nofollow,noarchive';
  const websiteId=new URL('/#website',canonicalOrigin).href;
  const organizationId=new URL('/#organization',canonicalOrigin).href;
  const graph=[
    {'@type':'Organization','@id':organizationId,name:'NeXify AI FACTORY B.V.',url:new URL('/',canonicalOrigin).href},
    {'@type':'WebSite','@id':websiteId,name:'NeXify AI',url:new URL('/',canonicalOrigin).href,publisher:{'@id':organizationId}}
  ];
  if(page)graph.push({'@type':'WebPage','@id':`${canonical}#webpage`,url:canonical,name:title,description,inLanguage:language,isPartOf:{'@id':websiteId},about:{'@id':organizationId}});
  return {
    title,description,canonical,robots,language,
    ogLocale:ogLocales[locale]||ogLocales.de,
    structuredData:{
      '@context':'https://schema.org',
      '@graph':graph
    }
  };
}

function setMeta(selector,attribute,value){
  const element=document.querySelector(selector);
  if(element)element.setAttribute(attribute,value);
}

/** Apply one complete metadata state after an in-app route or language change. */
export function applySeoState(state){
  document.title=state.title;
  document.documentElement.lang=state.language.split('-')[0];
  setMeta('meta[name="description"]','content',state.description);
  setMeta('meta[name="robots"]','content',state.robots);
  setMeta('meta[property="og:title"]','content',state.title);
  setMeta('meta[property="og:description"]','content',state.description);
  setMeta('meta[property="og:url"]','content',state.canonical);
  setMeta('meta[property="og:locale"]','content',state.ogLocale);
  setMeta('meta[name="twitter:title"]','content',state.title);
  setMeta('meta[name="twitter:description"]','content',state.description);
  setMeta('link[rel="canonical"]','href',state.canonical);
  const structured=document.querySelector('#route-structured-data, #home-structured-data');
  if(structured){structured.id='route-structured-data';structured.textContent=JSON.stringify(state.structuredData);}
}
