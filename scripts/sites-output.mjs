import {cp,mkdir,rm} from 'node:fs/promises';
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
await cp(new URL('../apps/site/dist/',import.meta.url),new URL('../dist/',import.meta.url),{recursive:true,force:true});
if(process.env.NEXIFY_OWNER_CINEMA_PREVIEW!=='1'){
 for(const name of ['hero-native-editorial-20261104.webm','hero-native-editorial-20261104.png','hero-native-editorial-20261104.de.vtt'])await rm(new URL('../dist/media/atelier/films/'+name,import.meta.url),{force:true});
}
console.log('Sites static output prepared in dist');
