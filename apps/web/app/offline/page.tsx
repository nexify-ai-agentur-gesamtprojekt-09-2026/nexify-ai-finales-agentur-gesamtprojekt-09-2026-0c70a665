import type {Metadata} from 'next';
import OfflineNotice from '../../components/OfflineNotice';
import {offlineCopy} from '../../lib/offline-copy';
import {localeOf} from '../../lib/page-seo';

type Props={searchParams:Promise<{lang?:string}>};
/** Rückfall des Workers (pwa/worker.js) bei fehlender Verbindung. Nicht verlinkt, nicht in der Seitenübersicht, nicht indexierbar. */
export async function generateMetadata({searchParams}:Props):Promise<Metadata>{
 return {title:offlineCopy[localeOf((await searchParams).lang)].title+' · NeXify AI',robots:{index:false,follow:false}};
}
export default async function OfflinePage({searchParams}:Props){
 return <OfflineNotice locale={localeOf((await searchParams).lang)}/>;
}
