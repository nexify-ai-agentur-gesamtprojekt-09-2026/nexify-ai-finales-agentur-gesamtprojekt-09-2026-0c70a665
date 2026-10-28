import installation from '../../.generated/installation.json';
export const dynamic='force-static';
export function GET(){
 return installation.enabled?new Response(installation.worker,{headers:{'Content-Type':'text/javascript','Cache-Control':'no-cache','Service-Worker-Allowed':'/'}}):new Response(null,{status:404});
}
