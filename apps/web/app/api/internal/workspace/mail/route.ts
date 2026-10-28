// Protected by the existing /api/internal/workspace proxy boundary.
// A verified provider subject alone never grants business mailbox membership.
// No live resolver/connector is registered; local fixtures are test-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function unavailable() {
  return Response.json({error:'mail_binding_not_configured'}, {
    status:503,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Authorization'},
  });
}
export async function GET(){return unavailable();}
export async function POST(){return unavailable();}
