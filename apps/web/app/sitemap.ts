import type {MetadataRoute} from 'next';
import {publicPages} from '../lib/catalog';
import {localizedUrl} from '../lib/page-seo';
export default function sitemap():MetadataRoute.Sitemap{return publicPages().filter(p=>!['login','signup','tk-cart','tk-checkout','tk-product','tk-category','tk-search'].includes(p.id)).map(p=>({url:localizedUrl(p.path,'de'),alternates:{languages:p.site_context==='teileklar'?{de:localizedUrl(p.path,'de')}:{de:localizedUrl(p.path,'de'),nl:localizedUrl(p.path,'nl'),fr:localizedUrl(p.path,'fr'),en:localizedUrl(p.path,'en')}}}));}
