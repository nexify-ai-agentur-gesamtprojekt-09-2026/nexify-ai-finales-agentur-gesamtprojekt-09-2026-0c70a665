import {readFile,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
/** Integrity only: does not approve voices, identities, or spoken module coverage. */
export async function verifyEditorialFilms(registry,publicRoot){
 const root=await realpath(publicRoot),seen=new Set();
 if(registry.schema_version!==1||!Array.isArray(registry.assets))throw new Error('Invalid editorial registry');
 for(const asset of registry.assets){
  if(seen.has(asset.id))throw new Error('Duplicate editorial film');seen.add(asset.id);
  const f=asset.film;
  if(!f||f.kind!=='generated_editorial_motion_no_speech'||!Number.isInteger(f.width)||f.width<1||!Number.isInteger(f.height)||f.height<1||!Number.isFinite(f.duration_seconds)||f.duration_seconds<=0||f.duration_seconds>30)throw new Error('Invalid editorial film metadata');
  for(const [field,ext] of [['src','mp4'],['poster','jpg']]){
   if(!new RegExp('^/media/atelier/films/[a-z0-9-]+\\.'+ext+'$').test(f[field]))throw new Error('Unsafe editorial film path');
   const path=await realpath(resolve(root,f[field].slice(1)));if(!path.startsWith(root+'/'))throw new Error('Editorial film outside public root');
   const b=await readFile(path);if(field==='src'&&(b.length!==f.bytes||createHash('sha256').update(b).digest('hex')!==f.sha256||b.toString('ascii',4,8)!=='ftyp'))throw new Error('Editorial film source drift');
   if(field==='poster'&&createHash('sha256').update(b).digest('hex')!==f.poster_sha256)throw new Error('Editorial film poster drift');
  }
 }
}

export function verifySceneDirection(direction,pages,registry){
 if(direction.schema_version!==1||!Array.isArray(direction.pages))throw new Error('Invalid scene direction');
 const expected=new Map(pages.map(p=>[p.id,p.path])),seen=new Set(),families=new Set(registry.assets.map(a=>a.id));
 for(const p of direction.pages){
  if(seen.has(p.page_id)||expected.get(p.page_id)!==p.path||!families.has(p.family)||!['hero_pending','quiet','cinematic'].includes(p.mode))throw new Error('Invalid or private scene route');
  if((p.mode==='hero_pending')!==(p.page_id==='home'))throw new Error('Invalid hero scene binding');
  seen.add(p.page_id);
 }
 if(seen.size!==expected.size)throw new Error('Missing public scene route');
}
