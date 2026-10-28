/** Public deployment has no visitor session. Answer 204 so clients stop probing a 404. */
const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function handler(request: Request): Response {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET, HEAD' } });
  }
  return new Response(null, { status: 204, headers: HEADERS });
}

export default { fetch: handler };
