import ShopFrame from "../../../components/shop/ShopFrame";
import CategoryList from "../../../components/shop/CategoryList";
export const metadata = { title: "Kategorien · TEILEKLAR" };
export default function CategoriesPage() {
  return <ShopFrame title="Kategorien" testId="shop-categories" crumbs={[["/teileklar/shop", "Shop"]]}><CategoryList /></ShopFrame>;
}
