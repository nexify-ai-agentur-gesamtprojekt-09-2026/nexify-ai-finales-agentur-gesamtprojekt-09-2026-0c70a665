import type {MetadataRoute} from 'next';
import {publicPages} from '../lib/catalog';
import {localizedUrl} from '../lib/page-seo';
import {teileklarIndexingOn} from '../lib/indexing';
// 2026-11-14 16:45 (Europe/Berlin): Rechtsrouten /agb /avv /widerruf fehlten in der Sitemap (G-205 Rest).
// Sie stehen nicht im Katalog, weil sie seit 14.11. eigene Seiten statt Rewrites sind. Canonical ist DE.
const legalPages=['/agb','/avv','/widerruf'];
// TEILEKLAR-Seiten stehen erst mit NEXIFY_INDEXING_TEILEKLAR=enabled in der Sitemap (lib/indexing.ts): solange der Shop-Dienst
// nicht antwortet, bleiben sie noindex, und eine Sitemap soll keine gesperrten Adressen einreichen. Gilt je Build.
const listed=(p:{site_context:string})=>p.site_context!=='teileklar'||teileklarIndexingOn(process.env);
export default function sitemap():MetadataRoute.Sitemap{return [...publicPages().filter(p=>!['login','signup','tk-cart','tk-checkout','tk-product','tk-category','tk-search'].includes(p.id)).filter(listed).map(p=>({url:localizedUrl(p.path,'de'),alternates:{languages:p.site_context==='teileklar'?{de:localizedUrl(p.path,'de')}:{de:localizedUrl(p.path,'de'),nl:localizedUrl(p.path,'nl'),fr:localizedUrl(p.path,'fr'),en:localizedUrl(p.path,'en')}}})),...legalPages.map(p=>({url:localizedUrl(p,'de')}))];}
