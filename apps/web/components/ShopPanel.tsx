"use client";
import {useEffect,useRef,useState} from "react";
import {useUI} from "./Workspace";
import {SiteLink} from "./Router";
import "./ShopPanel.css";
type Product={product_id:string;name:string;category_id:string;price_minor?:number;sku?:string;ean?:string;stock?:number;source_price?:{minor:number;currency:string}};
type Catalog={available:true;mode?:"read_only";observed_at?:string;pagination?:{reported_total:number;snapshot_rows:number};store_id:string;currency:string;maximum_quantity:number;partial:boolean;source_reference:string;categories:{id:string;name:string}[];products:Product[]};
type Cart={id:string;store_id:string;version:string;currency:string;total_minor:number;line_items:{product_id:string;quantity:number}[]};
type Draft={id:string;state:string;cart:Cart;order_submitted:false;payment_started:false};
const words={
 de:{title:"Dein Warenkorb",loading:"Warenkorb wird geladen …",unavailable:"Für diesen Shop ist noch kein freigegebener Katalog verbunden. Es werden keine Beispielartikel angeboten.",search:"Artikel suchen",category:"Kategorie",all:"Alle Kategorien",empty:"Dein Warenkorb ist leer.",start:"Warenkorb beginnen",add:"Hinzufügen",remove:"Entfernen",quantity:"Menge",save:"Ändern",total:"Artikelbetrag",fitment:"Passung und Verfügbarkeit sind noch nicht bestätigt.",source:"Datenquelle",prepare:"Checkout vorbereiten",blocked:"Checkout-Entwurf gespeichert. Keine Bestellung abgegeben und keine Zahlung gestartet. Anbieter-, Liefer- und Zahlungsprüfung stehen aus.",error:"Die Aktion ist nicht bestätigt. Prüfe den gespeicherten Stand, bevor du erneut änderst.",refresh:"Gespeicherten Stand prüfen",partial:"Die Ergebnisliste ist begrenzt. Bitte grenze deine Suche ein.",cartLink:"Zum Warenkorb",unknown:"Verbindung zum Warenkorb noch nicht verfügbar."},
 nl:{title:"Je winkelwagen",loading:"Winkelwagen wordt geladen …",unavailable:"Voor deze winkel is nog geen goedgekeurde catalogus verbonden. Er worden geen voorbeeldartikelen aangeboden.",search:"Artikelen zoeken",category:"Categorie",all:"Alle categorieën",empty:"Je winkelwagen is leeg.",start:"Winkelwagen beginnen",add:"Toevoegen",remove:"Verwijderen",quantity:"Aantal",save:"Wijzigen",total:"Artikelbedrag",fitment:"Geschiktheid en beschikbaarheid zijn nog niet bevestigd.",source:"Gegevensbron",prepare:"Checkout voorbereiden",blocked:"Checkoutconcept opgeslagen. Geen bestelling ingediend en geen betaling gestart. Leveranciers-, leverings- en betalingscontrole staan nog open.",error:"De actie is niet bevestigd. Controleer de opgeslagen stand voordat je opnieuw wijzigt.",refresh:"Opgeslagen stand controleren",partial:"De resultaten zijn begrensd. Verfijn je zoekopdracht.",cartLink:"Naar de winkelwagen",unknown:"Verbinding met de winkelwagen is nog niet beschikbaar."},
 fr:{title:"Ton panier",loading:"Chargement du panier…",unavailable:"Aucun catalogue approuvé n’est encore connecté à cette boutique. Aucun article d’exemple n’est proposé.",search:"Rechercher des articles",category:"Catégorie",all:"Toutes les catégories",empty:"Ton panier est vide.",start:"Créer un panier",add:"Ajouter",remove:"Retirer",quantity:"Quantité",save:"Modifier",total:"Montant des articles",fitment:"La compatibilité et la disponibilité ne sont pas encore confirmées.",source:"Source des données",prepare:"Préparer le checkout",blocked:"Projet de checkout enregistré. Aucune commande passée et aucun paiement lancé. Les contrôles du fournisseur, de livraison et du paiement restent à faire.",error:"L’action n’est pas confirmée. Vérifie l’état enregistré avant de modifier à nouveau.",refresh:"Vérifier l’état enregistré",partial:"La liste est limitée. Précise ta recherche.",cartLink:"Vers le panier",unknown:"La connexion au panier n’est pas encore disponible."}
};
const readonlyWords={
 de:{title:"Katalogausschnitt · nur lesend",sourceTime:"Abgerufen",partial:"Die Suche prüft nur diesen geladenen Ausschnitt",sourceLanguage:"Quellentexte: Deutsch",sourcePrice:"Ungeprüfte Quellenpreisangabe",unitsPending:"Netto/Brutto, Steuer und Versand sind nicht bestätigt",stock:"Gemeldeter Bestand, Aktualität unbestätigt",sku:"SKU",ean:"EAN",image:"Bildzuordnung und Bildfreigabe offen",notice:"Herkunft, Passung und Aktualisierungsrhythmus sind nicht abgenommen. Dieser Ausschnitt ermöglicht keine Warenkorb-, Bestell- oder Zahlungsaktion."},
 nl:{title:"Catalogusfragment · alleen lezen",sourceTime:"Opgehaald",partial:"Zoeken controleert alleen dit geladen fragment",sourceLanguage:"Bronteksten: Duits",sourcePrice:"Ongeverifieerde prijs uit de bron",unitsPending:"Netto/bruto, belasting en verzending zijn niet bevestigd",stock:"Gemelde voorraad, actualiteit niet bevestigd",sku:"SKU",ean:"EAN",image:"Afbeeldingskoppeling en goedkeuring staan open",notice:"Herkomst, geschiktheid en verversingsritme zijn niet goedgekeurd. Dit fragment ondersteunt geen winkelwagen-, bestel- of betaalactie."},
 fr:{title:"Extrait du catalogue · lecture seule",sourceTime:"Récupéré",partial:"La recherche ne porte que sur cet extrait chargé",sourceLanguage:"Textes source : allemand",sourcePrice:"Prix source non vérifié",unitsPending:"HT/TTC, taxes et livraison non confirmés",stock:"Stock déclaré, actualité non confirmée",sku:"SKU",ean:"EAN",image:"Association et approbation de l’image en attente",notice:"La provenance, la compatibilité et le rythme de mise à jour ne sont pas approuvés. Cet extrait ne permet aucune action de panier, de commande ou de paiement."}
};
export default function ShopPanel({pageId}:{pageId:string}){
 const{locale,session}=useUI(),t=words[locale],rw=readonlyWords[locale];
 const[catalog,setCatalog]=useState<Catalog|null>(null),[cart,setCart]=useState<Cart|null>(null),[draft,setDraft]=useState<Draft|null>(null);
 const[query,setQuery]=useState(""),[category,setCategory]=useState(""),[loaded,setLoaded]=useState(false),[unconfigured,setUnconfigured]=useState(false),[error,setError]=useState(false),[busy,setBusy]=useState(false);
 const active=useRef(false),keys=useRef(new Map<string,string>());
 const readOnly=catalog?.mode==='read_only';
 const standalone=location.protocol==='file:'||(window as Window&{__NEXIFY_STANDALONE_PREVIEW__?:boolean}).__NEXIFY_STANDALONE_PREVIEW__===true;
 useEffect(()=>{
  if(standalone){setLoaded(true);return;}
  const controller=new AbortController();setUnconfigured(false);
  fetch('/api/shop/catalog?'+new URLSearchParams({locale,q:query,category}),{cache:'no-store',signal:controller.signal}).then(async response=>{
   if(!response.ok){const failure=await response.json().catch(()=>null);if(failure?.error==='catalog_not_configured')setUnconfigured(true);throw new Error('catalog');}const data=await response.json();
   if(data.available!==true||!Array.isArray(data.products)||!Array.isArray(data.categories)||!Number.isSafeInteger(data.maximum_quantity))throw new Error('catalog');
   setCatalog(data);setLoaded(true);
  }).catch(()=>{if(!controller.signal.aborted){setCatalog(null);setLoaded(true);}});
  return()=>controller.abort();
 },[locale,query,category,standalone]);
 async function read(){
  if(active.current||readOnly)return;
  active.current=true;setBusy(true);
  try{
   const response=await fetch('/api/shop/cart',{cache:'no-store'});
   if(response.status===404){setCart(null);setDraft(null);setError(false);return;}
   if(response.status===410){const failure=await response.json().catch(()=>null);if(failure?.error!=='cart_expired')throw new Error('cart');keys.current.clear();setCart(null);setDraft(null);setError(false);return;}
   if(!response.ok)throw new Error('cart');
   const current=await response.json();setCart(current);
   const checkout=await fetch('/api/shop/cart/checkout-draft',{cache:'no-store'});
   if(checkout.status===404)setDraft(null);
   else if(checkout.ok){const result=await checkout.json();if(result.state!=='blocked_provider_acceptance'||result.order_submitted!==false||result.payment_started!==false)throw new Error('checkout');setDraft(result);}
   else throw new Error('checkout');
   setError(false);
  }finally{active.current=false;setBusy(false);}
 }
 useEffect(()=>{if(catalog?.mode==='read_only'){setCart(null);setDraft(null);setError(false);return;}if(session&&catalog)void read().catch(()=>setError(true));},[session?.csrf,catalog?.store_id,catalog?.mode]);
 async function mutate(path:string,body:object){
  if(!session||!catalog||catalog.mode==='read_only'||active.current||error)return;
  active.current=true;setBusy(true);setError(false);
  const identity=JSON.stringify([path,body,cart?.id,cart?.version]);
  if(!keys.current.has(identity))keys.current.set(identity,crypto.randomUUID());
  try{
   const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf,'Idempotency-Key':keys.current.get(identity)!,...(cart?{'If-Match':cart.version,'X-Cart-Id':cart.id}:{})},body:JSON.stringify(body)});
   if(!response.ok){const failure=await response.json().catch(()=>null);if(path==='/api/shop/cart'&&response.status===410&&failure?.error==='cart_expired')keys.current.delete(identity);throw new Error('mutation');}
   const result=await response.json();
   if(path.endsWith('/checkout-draft')){
    if(result.state!=='blocked_provider_acceptance'||result.order_submitted!==false||result.payment_started!==false)throw new Error('checkout');
    setDraft(result);
   }else{setCart(result);setDraft(null);if(path==='/api/shop/cart')keys.current.delete(identity);}
  }catch{setError(true);}finally{active.current=false;setBusy(false);}
 }
 const money=(value:number,currency:string)=>{const format=new Intl.NumberFormat(locale,{style:'currency',currency});const digits=format.resolvedOptions().maximumFractionDigits;if(digits===undefined)return t.unknown;return format.format(value/10**digits);};
 return <section className="shop-panel" aria-labelledby="shop-panel-title"><h2 id="shop-panel-title">{t.title}</h2>
  {!loaded?<p role="status">{t.loading}</p>:!catalog?<p role="status">{unconfigured?t.unavailable:t.unknown}</p>:<>
   <p className="status-note">{t.source}: {catalog.source_reference}</p>
   {readOnly&&<div className="status-note" data-catalog-mode="read_only"><p><strong>{rw.title}</strong></p><p>{rw.notice}</p><p>{rw.sourceLanguage}</p><p>{rw.sourceTime}: <time dateTime={catalog.observed_at}>{catalog.observed_at}</time></p><p>{rw.partial}: {catalog.pagination?.snapshot_rows} / {catalog.pagination?.reported_total}</p><p>{rw.unitsPending}</p></div>}
   {!readOnly&&!session&&<p role="status">{t.unknown}</p>}
   <div className="shop-controls"><label>{t.search}<input value={query} maxLength={128} onChange={event=>setQuery(event.target.value)}/></label><div><label htmlFor="shop-category">{t.category}</label><select id="shop-category" value={category} onChange={event=>setCategory(event.target.value)}><option value="">{t.all}</option>{catalog.categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div>
   {catalog.partial&&!readOnly&&<p role="status">{t.partial}</p>}
   {!readOnly&&!cart&&<button className="primary-button" disabled={!session||busy||error} onClick={()=>void mutate('/api/shop/cart',{store_id:catalog.store_id,locale})}>{t.start}</button>}
   <ul className="shop-products">{catalog.products.map(product=><li key={product.product_id}><strong>{product.name}</strong>{readOnly?<><span>{rw.sku}: {product.sku} · {rw.ean}: {product.ean}</span><span>{rw.stock}: {product.stock}</span><span>{rw.image}</span><span>{rw.sourcePrice}: {product.source_price&&Number.isSafeInteger(product.source_price.minor)?money(product.source_price.minor,product.source_price.currency):rw.unitsPending}</span></>:<span>{money(product.price_minor!,catalog.currency)}</span>}{!readOnly&&<button className="outline-button" disabled={!cart||busy||!session||error||(cart.line_items.find(item=>item.product_id===product.product_id)?.quantity||0)>=catalog.maximum_quantity} onClick={()=>void mutate('/api/shop/cart/items',{product_id:product.product_id,quantity:(cart?.line_items.find(item=>item.product_id===product.product_id)?.quantity||0)+1})}>{t.add} · {product.name}</button>}</li>)}</ul>
   <p className="status-note">{t.fitment}</p>
   {!readOnly&&cart&&<div className="shop-cart" aria-live="polite"><p>{cart.line_items.length?'':t.empty}</p><ul>{cart.line_items.map(item=><li key={item.product_id}><strong>{catalog.products.find(product=>product.product_id===item.product_id)?.name||item.product_id}</strong><form key={item.quantity} onSubmit={event=>{event.preventDefault();const quantity=Number(new FormData(event.currentTarget).get("quantity"));if(Number.isSafeInteger(quantity)&&quantity>=1&&quantity<=catalog.maximum_quantity)void mutate("/api/shop/cart/items",{product_id:item.product_id,quantity});}}><label>{t.quantity}<input name="quantity" type="number" min={1} max={catalog.maximum_quantity} defaultValue={item.quantity} disabled={busy||error} required/></label><button className="outline-button" disabled={busy||error}>{t.save}</button></form><button className="text-button" disabled={busy||error} onClick={()=>void mutate('/api/shop/cart/items',{product_id:item.product_id,quantity:0})}>{t.remove}</button></li>)}</ul><p><strong>{t.total}: {money(cart.total_minor,cart.currency)}</strong></p><button className="primary-button" disabled={busy||error||cart.line_items.length===0} onClick={()=>void mutate('/api/shop/cart/checkout-draft',{})}>{t.prepare}</button></div>}
   {!readOnly&&draft&&<p role="status" data-checkout-state={draft.state}>{t.blocked} · {draft.id}</p>}
   {pageId!=='tk-cart'&&<SiteLink className="content-action-link" href="/teileklar/warenkorb">{t.cartLink}</SiteLink>}
  </>}
  {error&&<p role="alert">{t.error}</p>}
  {catalog&&!readOnly&&<button className="text-button" disabled={busy||!session} onClick={()=>{void read().catch(()=>setError(true));}}>{t.refresh}</button>}
 </section>;
}
