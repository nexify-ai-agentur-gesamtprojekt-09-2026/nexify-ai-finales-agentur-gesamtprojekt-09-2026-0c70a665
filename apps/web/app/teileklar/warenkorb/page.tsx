import ShopFrame from "../../../components/shop/ShopFrame";
import CartView from "../../../components/shop/CartView";
export const metadata = { title: "Warenkorb · TEILEKLAR" };
export default function CartPage() {
  return <ShopFrame title="Ihr Warenkorb" testId="shop-cart" crumbs={[["/teileklar/shop", "Shop"]]}><CartView /></ShopFrame>;
}
