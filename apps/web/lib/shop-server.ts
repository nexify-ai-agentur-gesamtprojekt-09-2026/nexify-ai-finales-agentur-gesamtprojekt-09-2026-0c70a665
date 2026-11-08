import {cache} from 'react';
import type {ProductDetail} from '../components/shop/api';
export const SHOP_CANONICAL='https://nexifyai.cloud/teileklar';
export const getProduct=cache(async(id:string):Promise<ProductDetail|null>=>{
 const origin=process.env.SHOP_API_BASE_URL||process.env.REACT_APP_BACKEND_URL||'http://127.0.0.1:8001';
 const response=await fetch(origin.replace(/\/$/,'')+'/api/shop/products/'+encodeURIComponent(id),{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(response.status===404)return null;
 if(!response.ok)throw new Error('catalog_unavailable');
 return response.json();
});
export const plainText=(value:string)=>value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
