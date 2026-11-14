import type {Metadata} from 'next';
import type {PublicPage} from './page-types';
import type {Locale} from './i18n';
import {pageFaq} from './page-faq';
import {publicPages} from './catalog';
export const PUBLIC_ORIGIN='https://www.nexifyai.de';
export const localeOf=(value:unknown):Locale=>typeof value==='string'&&['de','nl','fr','en'].includes(value)?value as Locale:'de';
export const localizedUrl=(path:string,locale:Locale)=>PUBLIC_ORIGIN+path+(locale==='de'?'':'?lang='+locale);
/** Beschreibung für Suchergebnisse: höchstens 160 Zeichen, bevorzugt am Satzende, sonst am Wortende; der Seiteninhalt bleibt unverändert. */
export function seoDescription(text:string,max=160):string{
 const flat=text.replace(/\s+/g,' ').trim();
 if(flat.length<=max)return flat;
 const cut=flat.slice(0,max),sentence=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('! '),cut.lastIndexOf('? '));
 if(sentence>=80)return cut.slice(0,sentence+1);
 const word=cut.lastIndexOf(' ');
 return cut.slice(0,word>=80?word:max-1).replace(/[,;:–-]\s*$/,'')+'…';
}
/** Indexierung ist standardmäßig AUS (noindex), bis der Inhaber die Veröffentlichung freigibt. Dieser Schalter (NEXIFY_INDEXING=enabled im Vercel-Projekt, danach neu deployen; Rückweg: Variable entfernen, neu deployen) steuert nur das Meta-Tag der Katalogseiten aus pageMetadata. Maßgeblich ist die Regel in auth/indexing.ts: Sie verlangt zusätzlich Produktion, freigegebenen Host, indexierbaren Pfad und für /teileklar NEXIFY_INDEXING_TEILEKLAR=enabled, und proxy.ts setzt sie als Kopfzeile X-Robots-Tag durch. Seiten mit eigener Route übernehmen diese Entscheidung auch ins Meta-Tag (auth/page-robots.ts, OA-164). */
export const indexingEnabled=():boolean=>process.env.NEXIFY_INDEXING==='enabled';
export function pageMetadata(page:PublicPage,locale:Locale):Metadata{
 const title=page.localizedTitle[locale]+' · '+(page.site_context==='teileklar'?'TEILEKLAR.shop':'NeXify AI');
 const languages:Record<string,string>={'x-default':localizedUrl(page.path,'de')};
 for(const code of ['de','nl','fr','en'] as Locale[])if(page.localizedTitle[code]&&page.localizedSummary[code]&&page.sections.every(s=>s.body[code]))languages[code]=localizedUrl(page.path,code);
 const description=seoDescription(page.localizedSummary[locale]);
 return {title,description,alternates:{canonical:localizedUrl(page.path,locale),languages},openGraph:{title,description,url:localizedUrl(page.path,locale),type:'website',locale},robots:indexingEnabled()?{index:true,follow:true}:{index:false,follow:false}};
}
/** Metadata for dedicated (non-catalog-renderer) routes: same title/description/canonical/hreflang as the catalog page, explicit robots.
 * `robots` ist entweder `false` (nie indexiert: Anmeldung, Suche, Warenkorb, Kasse) oder die Entscheidung der Indexierungsregel aus pageRobots(); ein festes `index` gibt es nicht mehr (OA-164). */
export function routeMetadata(pageId:string,robots:false|{index:boolean;follow:boolean},locale:Locale='de'):Metadata{
 const page=publicPages().find(candidate=>candidate.id===pageId);
 if(!page)throw new Error('Unknown public page: '+pageId);
 const base=pageMetadata(page,locale);
 return {...base,robots:robots===false?{index:false,follow:true}:{index:robots.index,follow:robots.follow}};
}
export function pageStructuredData(page:PublicPage,locale:Locale){
 const url=localizedUrl(page.path,locale),brand=page.site_context==='teileklar'?'TEILEKLAR.shop':'NeXify AI',faq=pageFaq(page,locale);
 const provider={'@type':'ProfessionalService','@id':PUBLIC_ORIGIN+'/#organization',name:'NeXify AI',url:PUBLIC_ORIGIN,email:'mail@nexifyai.cloud'};
 const graph:Record<string,unknown>[]=[provider,{'@type':'WebPage','@id':url+'#webpage',url,name:page.localizedTitle[locale],description:page.localizedSummary[locale],inLanguage:locale,publisher:{'@id':provider['@id']}}];
 if(faq.length)graph.push({'@type':'Service','@id':url+'#service',name:page.localizedTitle[locale],description:page.localizedSummary[locale],url,provider:{'@id':provider['@id']}});
 if(faq.length)graph.push({'@type':'FAQPage','@id':url+'#questions',inLanguage:locale,mainEntity:faq.map(row=>({'@type':'Question',name:row.question,acceptedAnswer:{'@type':'Answer',text:row.answer}}))});
 graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:brand,item:PUBLIC_ORIGIN+(page.site_context==='teileklar'?'/teileklar':'/')},{'@type':'ListItem',position:2,name:page.localizedTitle[locale],item:url}]});
 return {'@context':'https://schema.org','@graph':graph};
}
export const safeJsonLd=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');
