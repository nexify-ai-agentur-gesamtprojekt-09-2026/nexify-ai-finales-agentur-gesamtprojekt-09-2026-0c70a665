import ShopFrame from "../../../../components/shop/ShopFrame";
import WorkshopDetail from "../../../../components/shop/WorkshopDetail";
export default async function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShopFrame title="Werkstatt" kicker="Werkstattsuche" testId="workshop-page" crumbs={[["/teileklar/werkstatt", "Werkstattsuche"]]}><WorkshopDetail id={id} /></ShopFrame>;
}
