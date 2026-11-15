import {Storefront} from '../../components/shop/Storefront';
import {publicUrl} from '../../auth/shop-host';
// Ohne NEXIFY_SHOP_HOST wie bisher 'https://www.nexifyai.de/teileklar'; mit Schalter die eigene Shop-Domain (auth/shop-host.ts).
const SHOP_HOME_URL=publicUrl('/teileklar',process.env);
export const metadata={title:'TEILEKLAR.shop – Zubehör für Auto & Motorrad',description:'Entdecken Sie unser Sortiment für Auto und Motorrad: Originalfotos, klare Produktangaben und Preise inklusive Mehrwertsteuer. Schwerpunkt Deutschland.',alternates:{canonical:SHOP_HOME_URL,languages:{de:SHOP_HOME_URL,'x-default':SHOP_HOME_URL}}};
export default function ShopHome(){return <Storefront/>;}
