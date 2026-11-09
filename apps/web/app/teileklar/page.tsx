import {Storefront} from '../../components/shop/Storefront';
import {PUBLIC_ORIGIN} from '../../lib/page-seo';
export const metadata={title:'TEILEKLAR.shop – Zubehör für Auto & Motorrad',description:'Entdecken Sie unser Sortiment für Auto und Motorrad: Originalfotos, klare Produktangaben und Preise inklusive Mehrwertsteuer. Schwerpunkt Deutschland.',alternates:{canonical:PUBLIC_ORIGIN+'/teileklar',languages:{de:PUBLIC_ORIGIN+'/teileklar','x-default':PUBLIC_ORIGIN+'/teileklar'}}};
export default function ShopHome(){return <Storefront/>;}
