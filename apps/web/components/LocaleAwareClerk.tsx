"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {ClerkProvider} from '@clerk/nextjs';
import type {PublicProviderProps} from '../auth/public-provider';
import {deDE,nlNL,frFR} from '@clerk/localizations';
const localizations={de:deDE,nl:nlNL,fr:frFR};
// Presentation follows the existing shell language; this never derives identity or rights.
export default function LocaleAwareClerk({children,providerProps}:{children:ReactNode;providerProps:PublicProviderProps}){
 const[locale,setLocale]=useState<keyof typeof localizations>('de');
 useEffect(()=>{const update=()=>{const lang=document.documentElement.lang;setLocale(lang==='nl'||lang==='fr'?lang:'de');};update();const observer=new MutationObserver(update);observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});return()=>observer.disconnect();},[]);
 return <ClerkProvider {...providerProps} localization={localizations[locale]}>{children}</ClerkProvider>;
}
