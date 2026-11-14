import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {generate} from '../../site/scripts/generate-public-data.mjs';
import {nextInstallationManifest} from '../pwa/manifest.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

export const WORKER_VERSION_MARK='__NEXIFY_WORKER_VERSION__';
/** Jeder Build bekommt eigene Cache-Namen: Worker-Quelle plus Stand (Commit auf Vercel, sonst Bauzeit). */
export function workerVersion(source,release){return createHash('sha256').update(source).update('\0').update(String(release)).digest('hex').slice(0,12);}
export function stampWorker(source,release){
 if(!source.includes(WORKER_VERSION_MARK))throw new Error('worker version mark missing');
 return source.replaceAll(WORKER_VERSION_MARK,workerVersion(source,release));
}
/** Opt-in: nur der ausdrückliche Modus `public-pwa` liefert Manifest und Worker aus. */
export function prepareInstallation(mode,tokens,worker){
 const enabled=mode==='public-pwa';
 return {enabled,manifest:enabled?nextInstallationManifest(tokens):null,worker:enabled?worker:null};
}
export async function generateNextPublicData(){
 await generate();
 const root=new URL('../../../',import.meta.url);
 const tokens=JSON.parse(await readFile(new URL('packages/tokens/tokens.json',root),'utf8'));
 const source=await readFile(new URL('apps/web/pwa/worker.js',root),'utf8');
 const worker=stampWorker(source,process.env.VERCEL_GIT_COMMIT_SHA||process.env.NEXIFY_WORKER_RELEASE||Date.now());
 const data=prepareInstallation(process.env.NEXIFY_PUBLIC_INSTALLATION,tokens,worker);
 const target=new URL('../.generated/',import.meta.url);await mkdir(target,{recursive:true});
 await writeFile(new URL('installation.json',target),JSON.stringify(data)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await generateNextPublicData();
