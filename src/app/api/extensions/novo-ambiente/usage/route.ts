import { proxyAdapter } from '@/extensions/novo-ambiente/api/route-helpers'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams
  const environment = query.get('environment') || 'staging'
  return proxyAdapter(request, 'viewer', `/internal/v1/usage?environment=${encodeURIComponent(environment)}`)
}
