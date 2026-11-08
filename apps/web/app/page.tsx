import PublicExperience from '../components/PublicExperience';
import {publicExperienceData} from '../lib/catalog';
import {localeOf,pageMetadata,pageStructuredData,safeJsonLd} from '../lib/page-seo';
const home=publicExperienceData.pages.find(page=>page.path==='/')!;
type Props={searchParams:Promise<{lang?:string}>};
export async function generateMetadata({searchParams}:Props){return pageMetadata(home,localeOf((await searchParams).lang));}
export default async function Home({searchParams}:Props){const locale=localeOf((await searchParams).lang);return <><script type="application/ld+json" data-testid="home-structured-data" dangerouslySetInnerHTML={{__html:safeJsonLd(pageStructuredData(home,locale))}}/><PublicExperience page={home} data={publicExperienceData}/></>;}
