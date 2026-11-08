import SeoJsonLd from "../../../components/SeoJsonLd";
import { pageMetadata } from "../../../lib/seo";
import ShopFrame from "../../../components/shop/ShopFrame";
import WorkshopFinder from "../../../components/shop/WorkshopFinder";
export const metadata = pageMetadata("/teileklar/werkstatt", "Werkstattsuche · TEILEKLAR", "Werkstatt in Ihrer Naehe finden: Betriebe nach Ort und Leistung suchen, mit Kontakt und Anfahrt. Die Eintraege stammen aus OpenStreetMap.");
export default async function FinderPage({ searchParams }: { searchParams: Promise<{ q?: string; umkreis?: string }> }) {
  const { q = "", umkreis } = await searchParams;
  return <><SeoJsonLd description="Werkstatt in Ihrer Naehe finden: Betriebe nach Ort und Leistung suchen, mit Kontakt und Anfahrt. Die Eintraege stammen aus OpenStreetMap." /><ShopFrame title="Werkstatt in Ihrer Nähe" kicker="Werkstattsuche" testId="workshop-search" intro="Suchen Sie nach PLZ oder Ort. Die Liste zeigt Betriebe aus einem Werkstattverzeichnis, sortiert nach Entfernung (Luftlinie)."><WorkshopFinder q={q} radius={[10, 25, 50, 100].includes(Number(umkreis)) ? Number(umkreis) : 25} /></ShopFrame></>;
}
