// The current proxy requires authentication AND verified business membership.
// No production identity-to-local-controller adapter is registered. Never use
// caller headers, cookies, query tenant or fixture sessions as that authority.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({error:'workspace_binding_not_configured'}, {
    status:503, headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Authorization'},
  });
}
