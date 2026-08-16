import { proxyAdapter } from '@/extensions/novo-ambiente/api/route-helpers'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams
  const environment = query.get('environment') || 'staging'
  const agentKey = query.get('agentKey')
  const target = `/internal/v1/overview?environment=${encodeURIComponent(environment)}${agentKey ? `&agentKey=${encodeURIComponent(agentKey)}` : ''}`
  return proxyAdapter(request, 'viewer', target)
}
