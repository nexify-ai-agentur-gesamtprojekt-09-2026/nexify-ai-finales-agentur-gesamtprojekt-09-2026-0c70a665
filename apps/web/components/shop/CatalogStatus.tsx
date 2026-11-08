'use client';
import {useEffect,useState} from 'react';
import {api,dateTime} from './api';
export const CatalogStatus=()=>{
 const[state,setState]=useState<{products:number;last_import_at:string;partial:boolean}|null>(null);
 useEffect(()=>{const c=new AbortController();api<{products:number;last_import_at:string;partial:boolean}>('/api/shop/status',{signal:c.signal}).then(setState).catch(()=>{});return()=>c.abort();},[]);
 if(!state?.products)return null;
 return <aside className="tk-catalog-status" data-testid="catalog-source-status"><span data-testid="catalog-real-count">{state.products} echte Lieferantenartikel</span><span data-testid="catalog-sync-date">Datenstand: {dateTime(state.last_import_at)}</span><p data-testid="catalog-coverage">{state.partial?'Auswahl aus dem BigBuy-Sortiment Auto & Motorrad; kein vollständiger Lieferantenkatalog.':'Quelle: BigBuy.'} Die Fahrzeugpassung ist nicht geprüft.</p></aside>;
};
