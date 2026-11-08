import SeoJsonLd from "../../../components/SeoJsonLd";
import { pageMetadata } from "../../../lib/seo";
import ShopFrame from "../../../components/shop/ShopFrame";
import Checkout from "../../../components/shop/Checkout";
export const metadata = pageMetadata("/teileklar/kasse", "Kasse · TEILEKLAR", "Kasse bei TEILEKLAR: Lieferadresse, Versandkosten und Zahlung in einem Schritt. Die Bestellbestaetigung folgt per E-Mail.");
export default function CheckoutPage() {
  return <><SeoJsonLd description="Kasse bei TEILEKLAR: Lieferadresse, Versandkosten und Zahlung in einem Schritt. Die Bestellbestaetigung folgt per E-Mail." /><ShopFrame title="Kasse" testId="shop-checkout" crumbs={[["/teileklar/warenkorb", "Warenkorb"]]}><Checkout /></ShopFrame></>;
}
