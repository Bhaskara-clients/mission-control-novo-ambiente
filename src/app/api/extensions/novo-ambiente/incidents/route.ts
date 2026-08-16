import { proxyAdapter } from '@/extensions/novo-ambiente/api/route-helpers'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams
  const environment = query.get('environment') || 'staging'
  const status = query.get('status')
  const target = `/internal/v1/incidents?environment=${encodeURIComponent(environment)}${status ? `&status=${encodeURIComponent(status)}` : ''}`
  return proxyAdapter(request, 'viewer', target)
}
