import {createHash} from "node:crypto";
import {prepareExplainers} from "./public-explainers.mjs";
import {prepareVideoAssets} from "./public-video-assets.mjs";
import {readFile,mkdir,writeFile,realpath,stat} from "node:fs/promises";
import {fileURLToPath,pathToFileURL} from "node:url";
import {resolve} from "node:path";

function localized(value){
  if(!value||["de","nl","fr"].some(locale=>typeof value[locale]!=="string"))throw new Error("Invalid public localization");
  // EN runtime locale: use verified staged en when present, else base-locale (de)
  // fallback. No invented product/legal/UI text.
  return {de:value.de,nl:value.nl,fr:value.fr,en:typeof value.en==="string"?value.en:value.de};
}
function publicPath(path){
  if(typeof path!=="string"||!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(path))throw new Error("Invalid public route");
  return path;
}
export function preparePublicData(source){
  if(!Array.isArray(source.pages)||!Array.isArray(source.public_allowlist))throw new Error("Invalid sitemap");
  const allowlist=new Set(source.public_allowlist);
  const selected=source.pages.filter(page=>allowlist.has(page.id)&&page.access?.visibility==="public"&&page.access.auth_required===false);
  const ids=new Set(selected.map(page=>page.id));
  const routes=new Set();
  const pages=selected.map(page=>{
    const path=publicPath(page.path);if(routes.has(path))throw new Error("Duplicate public route");routes.add(path);
    if(typeof page.id!=="string"||!['nexify','teileklar'].includes(page.site_context))throw new Error("Invalid public site context");
    const title=localized(page.title),summary=localized(page.summary);
    return {id:page.id,path,title:title.de,purpose:summary.de,sourceId:"native:"+page.id,role:page.id,site_context:page.site_context,
      localizedTitle:title,localizedSummary:summary,
      sections:(page.sections||[]).map(section=>({id:String(section.id),heading:localized(section.heading),body:localized(section.body)})),
      actions:(page.next_actions||[]).map(action=>{
        if(action.type==="chat"&&['quote','booking','marketing'].includes(action.chat_intent))return {type:"chat",chat_intent:action.chat_intent,label:localized(action.label)};
        if(action.type!=="route"||!ids.has(action.target_id))throw new Error("Unbound or non-public action target");
        return {type:"route",target_id:action.target_id,label:localized(action.label)};
      }),
      navigationContexts:Object.entries(source.site_contexts||{}).filter(([context,settings])=>['nexify','teileklar'].includes(context)&&(settings.navigation||[]).includes(page.id)).map(([context])=>context),
      contact_channels:(page.contact_channels||[]).filter(channel=>channel.type==="email"&&typeof channel.address==="string"&&/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(channel.address)).map(channel=>({type:"email",address:channel.address,label:localized(channel.label)}))};
  });
  if(!pages.some(page=>page.path==="/"))throw new Error("Public homepage missing");
  return {schema_version:1,pages};
}
export async function generate(){
  const root=fileURLToPath(new URL("../../../",import.meta.url));
  const source=JSON.parse(await readFile(resolve(root,"config/site-map.json"),"utf8"));
  const data=preparePublicData(source);
  const explainers=JSON.parse(await readFile(resolve(root,"config/page-explainers.json"),"utf8"));
  const videoRegistry=JSON.parse(await readFile(resolve(root,"config/page-media-registry.json"),"utf8"));
  const checkedVideos=await prepareVideoAssets(videoRegistry,source,{publicRoot:resolve(root,"apps/web/public"),repositoryRoot:root,explainerPages:explainers.pages});
  data.videos=checkedVideos.byPage;
  data.videoModules=checkedVideos.byModule;
  const presenter=JSON.parse(await readFile(resolve(root,"config/presenter-system.json"),"utf8"));
  const publicIds=new Set(data.pages.map(page=>page.id));
  data.journeys=source.journeys.map(journey=>{
    if(!presenter.guide_labels[journey.id]||!Array.isArray(journey.steps)||journey.steps.length<2||journey.steps.some(id=>!publicIds.has(id)))throw new Error("Invalid public presenter journey");
    return {id:journey.id,label:localized(presenter.guide_labels[journey.id]),steps:journey.steps};
  });
  const approvedSources=JSON.parse(await readFile(resolve(root,"config/presenter-sources.json"),"utf8"));
  if(approvedSources.schema_version!==1||!Array.isArray(approvedSources.sources))throw new Error("Invalid presenter source inventory");
  const approvedHashes=new Map(approvedSources.sources.map(source=>[source.path,source.sha256]));
  if(approvedHashes.size!==approvedSources.sources.length)throw new Error("Duplicate presenter sources");
  const sourceInventory=new Map();
  const repositoryRoot=await realpath(root);
  for(const page of explainers.pages)for(const module of page.modules)for(const ref of module.source_refs||[]){
    if(typeof ref!=="string"||!approvedHashes.has(ref)||!ref||ref.startsWith("/")||ref.split("/").some(part=>!part||part==="."||part==="..")||/[\\\u0000-\u0020\u007f]/.test(ref))throw new Error("Invalid explainer source path");
    const actual=await realpath(resolve(root,ref));
    if(!actual.startsWith(repositoryRoot+"/")||!(await stat(actual)).isFile())throw new Error("Explainer source outside repository");
    const bytes=await readFile(actual);const hash=createHash("sha256").update(bytes).digest("hex");
    if(hash!==approvedHashes.get(ref))throw new Error("Explainer source hash changed; review and refresh approved inventory");
    if(!bytes.equals(await readFile(actual)))throw new Error("Explainer source changed during read");
    sourceInventory.set(ref,hash);
  }
  data.explainers=prepareExplainers(explainers,data.pages,sourceInventory,data.videos,data.videoModules);
  const publicRoot=await realpath(resolve(root,"apps/web/public"));
  const scenes=JSON.parse(await readFile(resolve(root,'config/interim-scene-images.json'),'utf8'));
  for(const speaker of ['pascal','nex','aifly']){
    const image=scenes.images?.[speaker];
    if(!image||!/^\/(?:portrait\.png|media\/presenters\/[a-z0-9-]+\.png)$/.test(image.src)||!/^[a-f0-9]{64}$/.test(image.sha256))throw new Error('Invalid interim scene image');
    const path=await realpath(resolve(publicRoot,image.src.slice(1)));
    if(!path.startsWith(publicRoot+'/')||createHash('sha256').update(await readFile(path)).digest('hex')!==image.sha256)throw new Error('Interim scene image drift');
  }
  for(const page of data.explainers)for(const module of page.modules){
    if(module.media.status!=="published")continue;
    for(const path of [module.media.src,...Object.values(module.media.captions)]){
      const actual=await realpath(resolve(publicRoot,path.slice(1)));
      if(!actual.startsWith(publicRoot+"/")||!(await stat(actual)).isFile()||(await stat(actual)).size===0)throw new Error("Published media asset missing or outside public root");
      if(path.endsWith(".vtt")&&!(await readFile(actual,"utf8")).replace(/^\uFEFF/,"").startsWith("WEBVTT"))throw new Error("Invalid caption asset");
    }
  }
  const target=resolve(root,"apps/site/.generated");
  await mkdir(target,{recursive:true});
  await writeFile(resolve(target,"video-coverage.json"),JSON.stringify(checkedVideos.coverage)+"\n");
  await writeFile(resolve(target,"explainer-provenance.json"),JSON.stringify(Object.fromEntries(sourceInventory))+"\n");
  await writeFile(resolve(target,"public-site.json"),JSON.stringify(data)+"\n");
  console.log(`Public build data: ${data.pages.length} pages; protected content excluded`);
  return data;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await generate();
