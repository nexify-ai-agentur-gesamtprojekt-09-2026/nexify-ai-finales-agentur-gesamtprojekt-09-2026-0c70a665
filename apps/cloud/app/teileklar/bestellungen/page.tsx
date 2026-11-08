import ShopFrame from "../../../components/shop/ShopFrame";
import OrderList from "../../../components/shop/OrderList";
export const metadata = { title: "Bestellungen · TEILEKLAR" };
export default function OrdersPage() {
  return <ShopFrame title="Ihre Bestellungen" kicker="Kundenkonto" testId="shop-orders"><OrderList /></ShopFrame>;
}
