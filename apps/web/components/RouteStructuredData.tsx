import {publicPages} from '../lib/catalog';
import {pageStructuredData,safeJsonLd} from '../lib/page-seo';
/** Strukturierte Daten für dedizierte Routen: gleiche Quelle wie die Katalogseite (Organisation, WebPage, Breadcrumb). */
export default function RouteStructuredData({pageId}:{pageId:string}){
 const page=publicPages().find(candidate=>candidate.id===pageId);
 if(!page)return null;
 return <script type="application/ld+json" data-testid="route-structured-data" dangerouslySetInnerHTML={{__html:safeJsonLd(pageStructuredData(page,'de'))}}/>;
}
