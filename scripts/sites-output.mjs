import {cp,mkdir} from 'node:fs/promises';
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
await cp(new URL('../apps/site/dist/',import.meta.url),new URL('../dist/',import.meta.url),{recursive:true,force:true});
console.log('Sites static output prepared in dist');
