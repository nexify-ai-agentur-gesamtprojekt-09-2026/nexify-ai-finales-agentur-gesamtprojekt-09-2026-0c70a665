import ShopFrame from "../../../components/shop/ShopFrame";
import Checkout from "../../../components/shop/Checkout";
import {routeMetadata} from "../../../lib/page-seo";
export const generateMetadata = () => routeMetadata("tk-checkout", false);
export default function CheckoutPage() {
  return <ShopFrame title="Kasse" testId="shop-checkout" crumbs={[["/teileklar/warenkorb", "Warenkorb"]]}><Checkout /></ShopFrame>;
}
