import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {PublicPage,Localized,ContactChannel} from "./page-types";
export type {PublicPage,Localized,ContactChannel} from "./page-types";
type SourcePage={contact_channels?:ContactChannel[];id:string;path:string;title:Localized;summary:Localized;site_context:string;sections:PublicPage["sections"];next_actions:PublicPage["actions"];prototype_page_ids:string[];access:{visibility:string;auth_required:boolean};implementation_status:string};
type SiteMap={pages:SourcePage[];navigation:string[];site_contexts?:Record<string,{navigation:string[]}>};
function siteMap():SiteMap{
  const root=process.env.NEXIFY_REPOSITORY_ROOT||resolve(process.cwd(),"../..");
  return JSON.parse(readFileSync(resolve(root,"config/site-map.json"),"utf8"));
}
export function publicPages():PublicPage[]{
  const map=siteMap();
  return map.pages.filter(page=>page.access.visibility==="public"&&!page.access.auth_required).map(page=>({contact_channels:page.contact_channels?.filter(channel=>channel.type==="email"&&/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(channel.address)),id:page.id,path:page.path,title:page.title.de,purpose:page.summary.de,sourceId:page.prototype_page_ids?.[0]||"native:"+page.id,role:page.id,site_context:page.site_context,localizedTitle:page.title,localizedSummary:page.summary,sections:page.sections||[],actions:page.next_actions||[],navigationContexts:Object.entries(map.site_contexts||{nexify:{navigation:map.navigation}}).filter(([,context])=>context.navigation.includes(page.id)).map(([id])=>id)}));
}
export function protectedRouteExists(path:string):boolean{return siteMap().pages.some(page=>page.path===path&&(page.access.visibility!=="public"||page.access.auth_required));}
