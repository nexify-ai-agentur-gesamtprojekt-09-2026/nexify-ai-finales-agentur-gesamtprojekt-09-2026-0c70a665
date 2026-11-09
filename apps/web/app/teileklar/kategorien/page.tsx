import ShopFrame from "../../../components/shop/ShopFrame";
import CategoryList from "../../../components/shop/CategoryList";
import RouteStructuredData from "../../../components/RouteStructuredData";
import {routeMetadata} from "../../../lib/page-seo";
export const generateMetadata = () => routeMetadata("tk-categories", true);
export default function CategoriesPage() {
  return <><RouteStructuredData pageId="tk-categories" /><ShopFrame title="Kategorien" testId="shop-categories" crumbs={[["/teileklar/shop", "Shop"]]}><CategoryList /></ShopFrame></>;
}
