import {copyFile,mkdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
const names=['hero-native-editorial-20261104.webm','hero-native-editorial-20261104.png','hero-native-editorial-20261104.de.vtt'];
/** The flag packages review assets; actual access control remains the owner-only Sites audience. */
export function ownerReviewMediaPlugin(){
 let outDir;
 return {name:'owner-review-media',configResolved(config){outDir=resolve(config.root,config.build.outDir);},async writeBundle(){
  const target=resolve(outDir,'media/atelier/films');
  for(const name of names){
   const output=resolve(target,name);
   if(process.env.NEXIFY_OWNER_CINEMA_PREVIEW==='1'){
    await mkdir(target,{recursive:true});
    await copyFile(new URL('../../../media/review/hero-20261104/'+name,import.meta.url),output);
   }else await rm(output,{force:true});
  }
 }};
}
