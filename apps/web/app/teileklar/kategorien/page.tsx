import ShopFrame from "../../../components/shop/ShopFrame";
import CategoryList from "../../../components/shop/CategoryList";
import RouteStructuredData from "../../../components/RouteStructuredData";
import {routeMetadata} from "../../../lib/page-seo";
import {pageRobots} from "../../../lib/page-robots";
// Meta `robots` folgt derselben Regel wie die Kopfzeile X-Robots-Tag (auth/indexing.ts), OA-164.
export const generateMetadata = async () => routeMetadata("tk-categories", await pageRobots("/teileklar/kategorien"));
export default function CategoriesPage() {
  return <><RouteStructuredData pageId="tk-categories" /><ShopFrame title="Kategorien" testId="shop-categories" crumbs={[["/teileklar/shop", "Shop"]]}><CategoryList /></ShopFrame></>;
}
