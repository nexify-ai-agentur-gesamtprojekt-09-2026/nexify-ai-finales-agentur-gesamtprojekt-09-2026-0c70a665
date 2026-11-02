import {readFile,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

export async function verifyPresenterArtwork(registry,publicRoot){
 if(registry.schema_version!==1||Object.keys(registry.images||{}).sort().join(',')!=='aifly,nex,pascal')throw new Error('Invalid presenter artwork registry');
 const root=await realpath(publicRoot);
 const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
 for(const image of Object.values(registry.images)){
  if(!Number.isInteger(image.width)||image.width<=0||!Number.isInteger(image.height)||image.height<=0)throw new Error('Invalid presenter dimensions');
  for(const [field,hashField,pattern] of [['src','sha256',/^\/media\/atelier\/presenters\/[a-z-]+\.webp$/],['source','source_sha256',/^\/media\/presenters\/[a-z0-9-]+\.png$/]]){
   if(!pattern.test(image[field])||!/^[a-f0-9]{64}$/.test(image[hashField]))throw new Error('Invalid presenter asset binding');
   const file=await realpath(resolve(root,image[field].slice(1)));
   if(!file.startsWith(root+'/'))throw new Error('Presenter artwork outside public root');
   const bytes=await readFile(file);
   if(createHash('sha256').update(bytes).digest('hex')!==image[hashField])throw new Error('Presenter artwork source drift');
   if(field==='source'&&(bytes.length<24||!bytes.subarray(0,8).equals(pngSignature)||bytes.readUInt32BE(16)!==image.width||bytes.readUInt32BE(20)!==image.height))throw new Error('Presenter source dimensions do not match registry');
  }
 }
}
