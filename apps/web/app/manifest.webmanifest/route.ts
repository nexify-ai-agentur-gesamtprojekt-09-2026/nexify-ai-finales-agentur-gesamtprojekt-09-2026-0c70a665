import installation from '../../.generated/installation.json';
export const dynamic='force-static';
export function GET(){
 return installation.enabled?Response.json(installation.manifest,{headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-cache'}}):new Response(null,{status:404});
}
