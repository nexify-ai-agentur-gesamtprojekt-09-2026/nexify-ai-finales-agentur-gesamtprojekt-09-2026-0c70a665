import siteMap from "../../../config/site-map.json";
import data from "../../site/.generated/public-site.json";
import type {PublicExperienceData} from "../components/PublicExperience";
import type {PublicPage} from "./page-types";
export type {PublicPage,Localized,ContactChannel} from "./page-types";
// Both renderers consume the same fail-closed, public-only media projection.
export const publicExperienceData=data as unknown as PublicExperienceData;
export function publicPages():PublicPage[]{return publicExperienceData.pages;}
export function protectedRouteExists(path:string):boolean{return siteMap.pages.some(page=>page.path===path&&(page.access.visibility!=="public"||page.access.auth_required));}
