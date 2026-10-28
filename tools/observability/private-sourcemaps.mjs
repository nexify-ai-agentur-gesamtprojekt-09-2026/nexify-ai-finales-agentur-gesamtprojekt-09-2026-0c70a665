/** Local escrow only. No credentials, uploads, or public source-map artifacts. */
import {resolve,relative,join} from 'node:path';
import {mkdir,readdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export function mapPolicy(env,surface,root){
 if(env.NEXIFY_SOURCE_MAP_UPLOAD)throw new Error('source_map_upload_not_authorized');
 if(env.NEXIFY_RELEASE_SHA&&env.VERCEL_GIT_COMMIT_SHA&&env.NEXIFY_RELEASE_SHA!==env.VERCEL_GIT_COMMIT_SHA)throw new Error('conflicting_release_identity');
 const enabled=env.NEXIFY_PRIVATE_SOURCE_MAPS==='1',release=env.VERCEL_GIT_COMMIT_SHA||env.NEXIFY_RELEASE_SHA||'';
 if(enabled&&!/^[a-f0-9]{40}$/.test(release))throw new Error('exact_release_required_for_private_maps');
 return {enabled,release,surface,destination:resolve(root,'.local/private-source-maps',surface,release||'disabled')};
}
export async function escrowMaps(output,policy){
 if(!policy.enabled)return;
 output=resolve(output);const destination=resolve(policy.destination);
 if(!destination.includes('/.local/private-source-maps/')||!relative(output,destination).startsWith('..'))throw new Error('private_destination_required');
 const files=[];
 async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,item.name);if(item.isSymbolicLink())throw new Error('symlink_in_map_output');
  if(item.isDirectory())await walk(path);else if(item.isFile())files.push(path);
 }}
 await walk(output);await mkdir(destination,{recursive:true,mode:0o700});const manifest=[];
 for(const path of files.filter(p=>p.endsWith('.map'))){
  const bytes=await readFile(path),name=relative(output,path),target=join(destination,name);await mkdir(resolve(target,'..'),{recursive:true,mode:0o700});
  await writeFile(target,bytes,{mode:0o600});if(!(await readFile(target)).equals(bytes))throw new Error('private_map_readback_failed');
  manifest.push({path:name,sha256:createHash('sha256').update(bytes).digest('hex')});await unlink(path);
 }
 // Next adds sourceMappingURL even though maps have been escrowed; remove only the directive.
 for(const path of files.filter(p=>/\.(?:js|mjs|css)$/.test(p))){const text=await readFile(path,'utf8');const clean=text.replace(/\/\/[#@] sourceMappingURL=[^\r\n]*/g,'').replace(/\/\*[#@] sourceMappingURL=[^*]*\*\//g,'');if(clean!==text)await writeFile(path,clean);}
 await writeFile(join(destination,'manifest.json'),JSON.stringify({surface:policy.surface,release:policy.release,uploaded:false,maps:manifest},null,2)+'\n',{mode:0o600});
}
export function privateMapPlugin(policy){let output;return {name:'nexify-private-source-maps',apply:'build',configResolved(config){output=resolve(config.root,config.build.outDir);},async closeBundle(){await escrowMaps(output,policy);}};}
