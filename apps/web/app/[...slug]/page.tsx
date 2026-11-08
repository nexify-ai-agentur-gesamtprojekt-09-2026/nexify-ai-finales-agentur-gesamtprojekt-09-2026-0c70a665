import {cookies} from 'next/headers';
import {PortalWorkspace} from '../../components/PortalWorkspace';
import { notFound,redirect } from 'next/navigation';
import { publicPages,protectedRouteExists,publicExperienceData } from '../../lib/catalog';
import PublicExperience from '../../components/PublicExperience';
import {localeOf,pageMetadata,pageStructuredData,safeJsonLd} from '../../lib/page-seo';
const DEDICATED_ROUTES=new Set(['/teileklar/shop','/teileklar/suche','/teileklar/kategorien','/teileklar/warenkorb','/teileklar/kasse','/teileklar/werkstatt']);
type Props={params:Promise<{slug:string[]}>;searchParams:Promise<{lang?:string;ansicht?:string}>};
export function generateStaticParams(){return publicPages().filter(page=>page.path!=='/'&&page.path!=='/anmelden'&&!DEDICATED_ROUTES.has(page.path)).map(page=>({slug:page.path.slice(1).split('/')}));}
export async function generateMetadata({params,searchParams}:Props){const{slug}=await params;const locale=localeOf((await searchParams).lang);const page=publicPages().find(page=>page.path==='/'+slug.join('/'));return page?pageMetadata(page,locale):{title:'Geschützter Bereich',robots:{index:false,follow:false}};}
export default async function PublicPageRoute({params,searchParams}:Props){
 const{slug}=await params;const path='/'+slug.join('/');if(path==='/teileklar/produkt')redirect('/teileklar/shop');if(path==='/teileklar/kategorie')redirect('/teileklar/kategorien');const page=publicPages().find(page=>page.path===path);const locale=localeOf((await searchParams).lang);
 if(!page){if(protectedRouteExists(path))return <PortalWorkspace sessionPresent={(await cookies()).has('tk_session')} path={path} view={(await searchParams).ansicht||(path==='/intern/posteingang'?'requests':'overview')}/>;notFound();}
 return <><script type="application/ld+json" data-testid="page-structured-data" dangerouslySetInnerHTML={{__html:safeJsonLd(pageStructuredData(page,locale))}}/><PublicExperience page={page} data={publicExperienceData}/></>;
}
