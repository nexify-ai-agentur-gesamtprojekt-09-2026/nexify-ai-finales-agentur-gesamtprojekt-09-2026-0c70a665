// Unmounted server-only PostgREST adapter. Caller must independently verify
// destination, tenant, budget and retry controls before use in any runtime.
export function createConversationRpcAdapter({baseUrl, allowedOrigin, serviceKey, fetchImpl = fetch, allowLoopback = false}) {
 const base = new URL(baseUrl);
 if (typeof allowedOrigin !== 'string' || base.origin !== allowedOrigin || base.username || base.password || base.search || base.hash || base.pathname !== '/' ||
     !(base.protocol === 'https:' || (allowLoopback && base.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(base.hostname)))) throw new TypeError('invalid_database_url');
 if (typeof serviceKey !== 'string' || !serviceKey) throw new TypeError('missing_server_credential');
 async function rpc(name, input, signal) {
  if (!signal || signal.aborted) throw new Error('request_unavailable');
  let r;
  try { r = await fetchImpl(new URL(`/rest/v1/rpc/${name}`,base), {
   method:'POST', signal, redirect:'error', cache:'no-store',
   headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json','Accept-Profile':'chat','Content-Profile':'chat'},
   body:JSON.stringify(input),
  }); } catch { throw new Error('database_unavailable'); }
  if (!r.ok || r.redirected || !r.body) throw new Error('database_unavailable');
  const reader=r.body.getReader(), chunks=[]; let size=0;
  let abortRead;
  const aborted=new Promise((_,reject)=>{abortRead=()=>reject(new Error('database_unavailable'));signal.addEventListener('abort',abortRead,{once:true});});
  try {
   while (true) {
    if (signal.aborted) throw new Error('database_unavailable');
    const part=await Promise.race([reader.read(),aborted]); if (part.done) break;
    size+=part.value.byteLength;
    if(size>4096) throw new Error('database_unavailable');
    chunks.push(part.value);
   }
   return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks.map(c=>Buffer.from(c)))));
  } catch { void reader.cancel().catch(()=>{}); throw new Error('database_unavailable'); }
  finally {signal.removeEventListener('abort',abortRead);}
 }
 function digest(value) {
  if (!Buffer.isBuffer(value) || value.length !== 32) throw new TypeError('invalid_owner_digest');
  return '\\x'+value.toString('hex');
 }
 return {
  async create(owner,locale,pagePath,{signal}={}) {
   const id=await rpc('create_owned_conversation',{p_owner_digest:digest(owner),p_locale:locale,p_page_path:pagePath},signal);
   if (typeof id !== 'string') throw new Error('invalid_database_response');
   return id;
  },
  async read(id,owner,{signal}={}) {
   const rows=await rpc('read_owned_conversation',{p_conversation_id:id,p_owner_digest:digest(owner)},signal);
   if (!Array.isArray(rows) || rows.length > 1) throw new Error('invalid_database_response');
   return rows[0] ?? null;
  },
 };
}
