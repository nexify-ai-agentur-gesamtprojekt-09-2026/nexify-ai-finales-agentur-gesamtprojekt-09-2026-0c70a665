import {notFound} from 'next/navigation';
import ShopFrame from '../../../../components/shop/ShopFrame';
import ProductDetail from '../../../../components/shop/ProductDetail';
import {getProduct,SHOP_CANONICAL,plainText} from '../../../../lib/shop-server';
import {safeJsonLd} from '../../../../lib/page-seo';
type Props={params:Promise<{id:string}>};
export async function generateMetadata({params}:Props){const{id}=await params;try{const p=await getProduct(id);return p?{title:p.name+' · TEILEKLAR.shop',description:plainText(p.description||p.name).slice(0,160),alternates:{canonical:SHOP_CANONICAL+'/produkt/'+id,languages:{de:SHOP_CANONICAL+'/produkt/'+id,'x-default':SHOP_CANONICAL+'/produkt/'+id}}}:{title:'Artikel nicht gefunden · TEILEKLAR.shop',robots:{index:false,follow:true}};}catch{return{title:'Artikel · TEILEKLAR.shop',robots:{index:false,follow:true}};}}
export default async function ProductPage({params}:Props){
 const{id}=await params;let product;try{product=await getProduct(id);}catch{return <ShopFrame title="Artikel" testId="shop-product"><ProductDetail id={id}/></ShopFrame>;}
 if(!product)notFound();
 const url=SHOP_CANONICAL+'/produkt/'+id;
 const schema={'@context':'https://schema.org','@type':'Product',name:product.name,description:plainText(product.description||product.name),sku:product.sku,...(/^\d{13}$/.test(product.ean||'')?{gtin13:product.ean}:{}),...(product.images.length?{image:product.images}:{}),url,...(product.price_cents!==null?{offers:{'@type':'Offer',url,price:(product.price_cents/100).toFixed(2),priceCurrency:'EUR',availability:product.stock!==null?(product.stock>0?'https://schema.org/InStock':'https://schema.org/OutOfStock'):undefined,seller:{'@type':'Organization',name:'TEILEKLAR.shop'}}}:{})};
 return <ShopFrame title={product.name} testId="shop-product" crumbs={[["/teileklar/shop","Shop"]]}><script type="application/ld+json" data-testid="product-structured-data" dangerouslySetInnerHTML={{__html:safeJsonLd(schema)}}/><ProductDetail id={id} initialProduct={product}/></ShopFrame>;
}
