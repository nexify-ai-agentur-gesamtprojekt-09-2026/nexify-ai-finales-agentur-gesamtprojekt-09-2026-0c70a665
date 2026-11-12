import {oracleSessionDigest} from './oracle-visitor-session.mjs';

// Deliberately not mounted. The application must provide an authenticated,
// bounded RPC adapter, a canonical trusted origin, tenant and budget gates.
// An injected adapter does not itself prove production database connectivity.
export function createOwnedConversationHandler({db, origin, now = () => Date.now(), allowLoopback = false, timeoutMs = 5000}) {
  const trusted = new URL(origin);
  if (trusted.origin !== origin || !(trusted.protocol === 'https:' || (allowLoopback && trusted.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(trusted.hostname)))) throw new TypeError('invalid_origin');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new TypeError('invalid_timeout');
  const response = (body, status) => Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});
  return async function handle(request) {
    if (request.method !== 'POST') return response({error:'method_not_allowed'},405);
    if (request.headers.get('origin') !== origin) return response({error:'origin_denied'},403);
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) return response({error:'unsupported_media_type'},415);
    const digest = oracleSessionDigest(request.headers.get('cookie'), now());
    if (!digest) return response({error:'session_required'},401);
    let body;
    const controller = new AbortController();
    let timer;
    const stop = () => controller.abort();
    if (request.signal.aborted) return response({error:'request_aborted'},400);
    request.signal.addEventListener('abort', stop, {once:true});
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {controller.abort(); reject(Error('deadline'));}, timeoutMs);
      controller.signal.addEventListener('abort', () => reject(Error('aborted')), {once:true});
    });
    try {
      const read = async () => {
        if (!request.body) throw Error('invalid_json');
        const reader = request.body.getReader(), chunks = []; let size = 0;
        try {
          while (true) {
            const part = await Promise.race([reader.read(), deadline]);
            if (part.done) break;
            size += part.value.byteLength;
            if (size > 4096) throw Error('too_large');
            chunks.push(part.value);
          }
        } finally { if (controller.signal.aborted || size > 4096) void reader.cancel().catch(()=>{}); }
        return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))));
      };
      body = await read();
    } catch (error) {
      clearTimeout(timer); request.signal.removeEventListener('abort',stop);
      return response({error:error?.message === 'too_large'?'body_too_large':controller.signal.aborted?'request_unavailable':'invalid_json'},error?.message === 'too_large'?413:controller.signal.aborted?503:400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      clearTimeout(timer); request.signal.removeEventListener('abort',stop);
      return response({error:'invalid_body'},400);
    }
    try {
      if (body.action === 'create') {
        if (Object.keys(body).some(key => !['action','locale','pagePath'].includes(key))) return response({error:'invalid_request'},422);
        if (!['de','nl','fr','en'].includes(body.locale) || typeof body.pagePath !== 'string' || !/^\/(?!\/)[^?#\s\\]{0,239}$/.test(body.pagePath)) return response({error:'invalid_request'},422);
        const id = await Promise.race([db.create(digest, body.locale, body.pagePath, {signal:controller.signal}),deadline]);
        if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw Error('invalid_adapter_response');
        return response({id},201);
      }
      if (body.action === 'read') {
        if (Object.keys(body).some(key => !['action','id'].includes(key))) return response({error:'invalid_request'},422);
        if (typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) return response({error:'invalid_request'},422);
        const row = await Promise.race([db.read(body.id, digest, {signal:controller.signal}),deadline]);
        if (!row) return response({error:'not_found'},404);
        if (row.id !== body.id || !['de','nl','fr','en'].includes(row.locale) || typeof row.page_path !== 'string' || !['open','closed','archived'].includes(row.status)) throw Error('invalid_adapter_response');
        return response({id:row.id,locale:row.locale,pagePath:row.page_path,status:row.status},200);
      }
      return response({error:'invalid_request'},422);
    } catch { return response({error:'conversation_unavailable', outcome:'unknown'},503); }
    finally {clearTimeout(timer); request.signal.removeEventListener('abort',stop);}
  };
}
