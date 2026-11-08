import ShopFrame from "../../../components/shop/ShopFrame";
import CartView from "../../../components/shop/CartView";
import {routeMetadata} from "../../../lib/page-seo";
export const generateMetadata = () => routeMetadata("tk-cart", false);
export default function CartPage() {
  return <ShopFrame title="Ihr Warenkorb" testId="shop-cart" crumbs={[["/teileklar/shop", "Shop"]]}><CartView /></ShopFrame>;
}
