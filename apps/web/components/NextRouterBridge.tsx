"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useMemo,type ReactNode} from "react";
import {RouterProvider,type SiteLinkProps} from "./Router";
import type {Locale} from '../lib/i18n';
export default function NextRouterBridge({children,locale='de'}:{children:ReactNode;locale?:Locale}){
 const pathname=usePathname()||'/';const router=useRouter();
 const adapter=useMemo(()=>{
  const local=(href:string)=>{if(locale==='de'||!href.startsWith('/')||href.startsWith('//')||href.startsWith('/api/'))return href;const url=new URL(href,'https://nexifyai.cloud');if(!url.searchParams.has('lang'))url.searchParams.set('lang',locale);return url.pathname+url.search+url.hash;};
  const NextLink=(props:SiteLinkProps)=><Link {...props} href={local(props.href)}/>;
  return {pathname,Link:NextLink,navigate:(href:string)=>router.push(local(href))};
 },[pathname,router,locale]);
 return <RouterProvider adapter={adapter}>{children}</RouterProvider>;
}
