import {readFile,mkdir,writeFile} from "node:fs/promises";
import {fileURLToPath,pathToFileURL} from "node:url";
import {resolve} from "node:path";

function localized(value){
  if(!value||["de","nl","fr"].some(locale=>typeof value[locale]!=="string"))throw new Error("Invalid public localization");
  return {de:value.de,nl:value.nl,fr:value.fr};
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
  const data=preparePublicData(source);const target=resolve(root,"apps/site/.generated");
  await mkdir(target,{recursive:true});await writeFile(resolve(target,"public-site.json"),JSON.stringify(data)+"\n");
  console.log(`Public build data: ${data.pages.length} pages; protected content excluded`);
  return data;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await generate();
