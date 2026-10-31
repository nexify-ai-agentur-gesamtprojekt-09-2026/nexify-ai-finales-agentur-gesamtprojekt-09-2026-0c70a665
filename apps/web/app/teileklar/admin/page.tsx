import ShopFrame from "../../../components/shop/ShopFrame";
import AdminShop from "../../../components/shop/AdminShop";
export const metadata = { title: "Shop-Verwaltung · TEILEKLAR" };
export default function AdminPage() {
  return <ShopFrame title="Shop-Verwaltung" kicker="Admin" testId="shop-admin"><AdminShop /></ShopFrame>;
}
