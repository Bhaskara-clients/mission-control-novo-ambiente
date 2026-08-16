import { proxyAdapter } from '@/extensions/novo-ambiente/api/route-helpers'

export async function GET(request: Request) {
  const environment = new URL(request.url).searchParams.get('environment') || 'staging'
  return proxyAdapter(request, 'admin', `/internal/v1/access?environment=${encodeURIComponent(environment)}`)
}
