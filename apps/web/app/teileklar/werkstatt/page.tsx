import ShopFrame from "../../../components/shop/ShopFrame";
import WorkshopFinder from "../../../components/shop/WorkshopFinder";
import RouteStructuredData from "../../../components/RouteStructuredData";
import {routeMetadata} from "../../../lib/page-seo";
export const generateMetadata = () => routeMetadata("tk-workshop", true);
export default async function FinderPage({ searchParams }: { searchParams: Promise<{ q?: string; umkreis?: string }> }) {
  const { q = "", umkreis } = await searchParams;
  return <><RouteStructuredData pageId="tk-workshop" /><ShopFrame title="Werkstatt in Ihrer Nähe" kicker="Werkstattsuche" testId="workshop-search" intro="Suchen Sie nach PLZ oder Ort. Die Liste zeigt Betriebe aus einem Werkstattverzeichnis, sortiert nach Entfernung (Luftlinie)."><WorkshopFinder q={q} radius={[10, 25, 50, 100].includes(Number(umkreis)) ? Number(umkreis) : 25} /></ShopFrame></>;
}
