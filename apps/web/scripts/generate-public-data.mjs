import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {generate} from '../../site/scripts/generate-public-data.mjs';
import {publicInstallationManifest} from '../../site/pwa/plugin.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

export function prepareInstallation(mode,tokens,worker){
 const enabled=mode==='public-pwa';
 return {enabled,manifest:enabled?publicInstallationManifest(tokens):null,worker:enabled?worker:null};
}
export async function generateNextPublicData(){
 await generate();
 const root=new URL('../../../',import.meta.url);
 const tokens=JSON.parse(await readFile(new URL('packages/tokens/tokens.json',root),'utf8'));
 const worker=await readFile(new URL('apps/site/pwa/worker.js',root),'utf8');
 const data=prepareInstallation(process.env.NEXIFY_PUBLIC_INSTALLATION,tokens,worker);
 const target=new URL('../.generated/',import.meta.url);await mkdir(target,{recursive:true});
 await writeFile(new URL('installation.json',target),JSON.stringify(data)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await generateNextPublicData();
