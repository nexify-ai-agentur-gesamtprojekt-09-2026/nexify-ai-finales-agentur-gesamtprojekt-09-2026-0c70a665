import { notFound } from "next/navigation";
import { publicPages,protectedRouteExists,publicExperienceData } from "../../lib/catalog";
import PublicExperience from "../../components/PublicExperience";
const DEDICATED_ROUTES=new Set(["/teileklar/suche","/teileklar/kategorien","/teileklar/warenkorb","/teileklar/kasse","/teileklar/werkstatt"]);
export function generateStaticParams(){return publicPages().filter(page=>page.path!=="/"&&page.path!=="/anmelden"&&!DEDICATED_ROUTES.has(page.path)).map(page=>({slug:page.path.slice(1).split("/")}));}
export async function generateMetadata({params}:{params:Promise<{slug:string[]}>}){const{slug}=await params;const page=publicPages().find(page=>page.path==="/"+slug.join("/"));return page?{}:{title:"Geschützter Bereich"};}
export default async function PublicPageRoute({params}:{params:Promise<{slug:string[]}>}) {
  const{slug}=await params;const path="/"+slug.join("/");const pages=publicPages();const page=pages.find(page=>page.path===path);
  if(!page){if(protectedRouteExists(path))return <section className="public-page"><span className="eyebrow">NEXIFY AI</span><h1>Geschützter Bereich</h1><div className="editorial-note"><h2>Anmeldung erforderlich</h2><p>Dieser Bereich benötigt ein verifiziertes Konto. Die Kontoanbindung ist in dieser Vorschau noch nicht aktiviert. Private Inhalte werden hier nicht angezeigt.</p></div></section>;notFound();}
  return <PublicExperience page={page} data={publicExperienceData} documentTitle/>;
}
