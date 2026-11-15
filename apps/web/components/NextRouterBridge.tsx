"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useMemo,type ReactNode} from "react";
import {RouterProvider,type SiteLinkProps} from "./Router";
import type {Locale} from '../lib/i18n';
import {shopInternalPath,shopPublicHref} from '../auth/shop-host';
// shopHost (Standard false): Aufruf über die eigene Shop-Domain (auth/shop-host.ts). Die Komponenten rechnen weiter mit den Pfaden der App
// (/teileklar/…); nur an dieser Stelle wird der sichtbare Pfad in den App-Pfad übersetzt und jeder Verweis in die Adresse der Shop-Domain.
export default function NextRouterBridge({children,locale='de',shopHost=false}:{children:ReactNode;locale?:Locale;shopHost?:boolean}){
 const visible=usePathname()||'/';const pathname=shopHost?shopInternalPath(visible):visible;const router=useRouter();
 const adapter=useMemo(()=>{
  const localized=(href:string)=>{if(locale==='de'||!href.startsWith('/')||href.startsWith('//')||href.startsWith('/api/'))return href;const url=new URL(href,'https://nexifyai.cloud');if(!url.searchParams.has('lang'))url.searchParams.set('lang',locale);return url.pathname+url.search+url.hash;};
  const local=(href:string)=>shopHost?shopPublicHref(localized(href)):localized(href);
  const NextLink=(props:SiteLinkProps)=><Link {...props} href={local(props.href)}/>;
  return {pathname,Link:NextLink,navigate:(href:string)=>router.push(local(href))};
 },[pathname,router,locale,shopHost]);
 return <RouterProvider adapter={adapter}>{children}</RouterProvider>;
}
