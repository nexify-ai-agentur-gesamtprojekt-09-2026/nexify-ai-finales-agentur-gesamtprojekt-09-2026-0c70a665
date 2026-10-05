import { cockpit } from '../../../lib/cockpit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const tenant = new URL(request.url).searchParams.get('tenant') ?? 'nexify'
  const data = await cockpit(tenant)
  return Response.json(data, {
    headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  })
}
