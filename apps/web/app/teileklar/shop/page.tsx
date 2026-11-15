import ShopFrame from '../../../components/shop/ShopFrame';
import CatalogView,{SearchBar} from '../../../components/shop/CatalogView';
import {CatalogStatus} from '../../../components/shop/CatalogStatus';
import {publicUrl} from '../../../auth/shop-host';
// Ohne NEXIFY_SHOP_HOST wie bisher 'https://www.nexifyai.de/teileklar/shop'; mit Schalter die eigene Shop-Domain (auth/shop-host.ts).
const SHOP_URL=publicUrl('/teileklar/shop',process.env);
export const metadata={title:'Auto & Motorrad · TEILEKLAR.shop',description:'Echte Lieferantenartikel für Auto und Motorrad. Produktdaten, Preise inklusive Mehrwertsteuer und transparenter Datenstand.',alternates:{canonical:SHOP_URL,languages:{de:SHOP_URL,'x-default':SHOP_URL}}};
export default async function ShopPage({searchParams}:{searchParams:Promise<{seite?:string}>}){const{seite}=await searchParams;return <ShopFrame title="Auto & Motorrad. Klar ausgewählt." testId="shop-catalog"><p className="tk-meta" data-testid="shop-intro">Artikel finden. Angaben prüfen. Sicher bestellen.</p><CatalogStatus/><SearchBar/><CatalogView base="/teileklar/shop" page={Math.max(1,Number(seite)||1)}/></ShopFrame>;}
