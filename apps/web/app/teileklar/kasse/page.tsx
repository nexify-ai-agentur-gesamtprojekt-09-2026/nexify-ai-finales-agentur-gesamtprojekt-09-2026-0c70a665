import ShopFrame from "../../../components/shop/ShopFrame";
import Checkout from "../../../components/shop/Checkout";
export const metadata = { title: "Kasse · TEILEKLAR" };
export default function CheckoutPage() {
  return <ShopFrame title="Kasse" testId="shop-checkout" crumbs={[["/teileklar/warenkorb", "Warenkorb"]]}><Checkout /></ShopFrame>;
}
