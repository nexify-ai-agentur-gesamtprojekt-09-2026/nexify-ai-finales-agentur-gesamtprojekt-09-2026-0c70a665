import ShopFrame from '../../../components/shop/ShopFrame';
import CatalogView,{SearchBar} from '../../../components/shop/CatalogView';
import {CatalogStatus} from '../../../components/shop/CatalogStatus';
import {PUBLIC_ORIGIN} from '../../../lib/page-seo';
export const metadata={title:'Auto & Motorrad · TEILEKLAR.shop',description:'Echte Lieferantenartikel für Auto und Motorrad. Produktdaten, Preise inklusive Mehrwertsteuer und transparenter Datenstand.',alternates:{canonical:PUBLIC_ORIGIN+'/teileklar/shop',languages:{de:PUBLIC_ORIGIN+'/teileklar/shop','x-default':PUBLIC_ORIGIN+'/teileklar/shop'}}};
export default async function ShopPage({searchParams}:{searchParams:Promise<{seite?:string}>}){const{seite}=await searchParams;return <ShopFrame title="Auto & Motorrad. Klar ausgewählt." testId="shop-catalog"><p className="tk-meta" data-testid="shop-intro">Artikel finden. Angaben prüfen. Sicher bestellen.</p><CatalogStatus/><SearchBar/><CatalogView base="/teileklar/shop" page={Math.max(1,Number(seite)||1)}/></ShopFrame>;}
