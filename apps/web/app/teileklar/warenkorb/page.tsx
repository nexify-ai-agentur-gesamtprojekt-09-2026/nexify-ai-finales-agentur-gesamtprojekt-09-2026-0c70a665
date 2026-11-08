import SeoJsonLd from "../../../components/SeoJsonLd";
import { pageMetadata } from "../../../lib/seo";
import ShopFrame from "../../../components/shop/ShopFrame";
import CartView from "../../../components/shop/CartView";
export const metadata = pageMetadata("/teileklar/warenkorb", "Warenkorb · TEILEKLAR", "Ihr Warenkorb bei TEILEKLAR: Mengen anpassen, Versandkosten sehen und versandkostenfrei ab 75 Euro Warenwert bestellen.");
export default function CartPage() {
  return <><SeoJsonLd description="Ihr Warenkorb bei TEILEKLAR: Mengen anpassen, Versandkosten sehen und versandkostenfrei ab 75 Euro Warenwert bestellen." /><ShopFrame title="Ihr Warenkorb" testId="shop-cart" crumbs={[["/teileklar/shop", "Shop"]]}><CartView /></ShopFrame></>;
}
