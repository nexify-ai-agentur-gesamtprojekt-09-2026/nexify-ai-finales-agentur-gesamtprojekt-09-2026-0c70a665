import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';
import {publicPages} from '../lib/catalog';
import {localizedUrl} from '../lib/page-seo';
import {teileklarIndexingOn} from '../auth/indexing';
import {hostKind,requestHosts,shopHostOn} from '../auth/shop-host';
// 2026-11-14 16:45 (Europe/Berlin): Rechtsrouten /agb /avv /widerruf fehlten in der Sitemap (G-205 Rest).
// Sie stehen nicht im Katalog, weil sie seit 14.11. eigene Seiten statt Rewrites sind. Canonical ist DE.
const legalPages=['/agb','/avv','/widerruf'];
// TEILEKLAR-Seiten stehen erst mit NEXIFY_INDEXING_TEILEKLAR=enabled in der Sitemap (auth/indexing.ts): solange der Shop-Dienst
// nicht antwortet, bleiben sie noindex, und eine Sitemap soll keine gesperrten Adressen einreichen. Gilt je Build.
const listed=(p:{site_context:string})=>p.site_context!=='teileklar'||teileklarIndexingOn(process.env);
// Eigene Shop-Domain (auth/shop-host.ts, Standard AUS): Mit NEXIFY_SHOP_HOST führt jede Domain nur ihre eigenen Seiten, die Shop-Domain die
// Shop-Seiten (weiter erst mit NEXIFY_INDEXING_TEILEKLAR), jede andere die Agentur- und Rechtsseiten. Ohne Schalter liest die Funktion keine
// Kopfzeilen und liefert dieselbe Liste wie bisher, beim Build erzeugt.
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const split=shopHostOn(process.env),shop=split&&hostKind(requestHosts((await headers()).get('host'),(await headers()).get('x-forwarded-host')))==='shop';
 const own=(p:{site_context:string})=>!split||(p.site_context==='teileklar')===shop;
 return [...publicPages().filter(own).filter(p=>!['login','signup','tk-cart','tk-checkout','tk-product','tk-category','tk-search'].includes(p.id)).filter(listed).map(p=>({url:localizedUrl(p.path,'de'),alternates:{languages:p.site_context==='teileklar'?{de:localizedUrl(p.path,'de')}:{de:localizedUrl(p.path,'de'),nl:localizedUrl(p.path,'nl'),fr:localizedUrl(p.path,'fr'),en:localizedUrl(p.path,'en')}}})),...(shop?[]:legalPages).map(p=>({url:localizedUrl(p,'de')}))];}
