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
export function pageMetadata(page:PublicPage,locale:Locale):Metadata{
 const title=page.localizedTitle[locale]+' · '+(page.site_context==='teileklar'?'TEILEKLAR.shop':'NeXify AI');
 const languages:Record<string,string>={'x-default':localizedUrl(page.path,'de')};
 for(const code of ['de','nl','fr','en'] as Locale[])if(page.localizedTitle[code]&&page.localizedSummary[code]&&page.sections.every(s=>s.body[code]))languages[code]=localizedUrl(page.path,code);
 const description=seoDescription(page.localizedSummary[locale]);
 return {title,description,alternates:{canonical:localizedUrl(page.path,locale)},openGraph:{title,description,url:localizedUrl(page.path,locale),type:'website',locale},robots:{index:false,follow:false}};
}
/** Metadata for dedicated (non-catalog-renderer) routes: same title/description/canonical/hreflang as the catalog page, explicit robots. */
export function routeMetadata(pageId:string,indexable:boolean):Metadata{
 const page=publicPages().find(candidate=>candidate.id===pageId);
 if(!page)throw new Error('Unknown public page: '+pageId);
 const base=pageMetadata(page,'de');
 return {...base,robots:indexable?{index:true,follow:true}:{index:false,follow:true}};
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
