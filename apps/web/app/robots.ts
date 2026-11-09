import type {MetadataRoute} from 'next';
import {PUBLIC_ORIGIN} from '../lib/page-seo';
export default function robots():MetadataRoute.Robots{return{rules:{userAgent:'*',allow:'/',disallow:['/api/','/intern/','/portal/','/teileklar/kasse','/teileklar/warenkorb','/teileklar/bestellung/','/teileklar/bestellungen','/teileklar/konto','/teileklar/partnerportal','/teileklar/nachbarschaft']},sitemap:PUBLIC_ORIGIN+'/sitemap.xml'};}
