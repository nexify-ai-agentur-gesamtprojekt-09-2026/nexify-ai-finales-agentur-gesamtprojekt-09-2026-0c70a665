import type {Metadata} from 'next';
import type {PublicPage} from './page-types';
import type {Locale} from './i18n';
import {pageFaq} from './page-faq';
export const PUBLIC_ORIGIN='https://www.nexifyai.de';
export const localeOf=(value:unknown):Locale=>typeof value==='string'&&['de','nl','fr','en'].includes(value)?value as Locale:'de';
export const localizedUrl=(path:string,locale:Locale)=>PUBLIC_ORIGIN+path+(locale==='de'?'':'?lang='+locale);
export function pageMetadata(page:PublicPage,locale:Locale):Metadata{
 const title=page.localizedTitle[locale]+' · '+(page.site_context==='teileklar'?'TEILEKLAR.shop':'NeXify AI');
 const languages:Record<string,string>={'x-default':localizedUrl(page.path,'de')};
 for(const code of ['de','nl','fr','en'] as Locale[])if(page.localizedTitle[code]&&page.localizedSummary[code]&&page.sections.every(s=>s.body[code]))languages[code]=localizedUrl(page.path,code);
 return {title,description:page.localizedSummary[locale],alternates:{canonical:localizedUrl(page.path,locale)},openGraph:{title,description:page.localizedSummary[locale],url:localizedUrl(page.path,locale),type:'website',locale},robots:{index:false,follow:false}};
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
