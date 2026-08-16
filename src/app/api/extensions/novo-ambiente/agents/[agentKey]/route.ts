import { proxyAdapter } from '@/extensions/novo-ambiente/api/route-helpers'

export async function GET(request: Request, context: { params: Promise<{ agentKey: string }> }) {
  const { agentKey } = await context.params
  const environment = new URL(request.url).searchParams.get('environment') || 'staging'
  return proxyAdapter(request, 'viewer', `/internal/v1/agents/${encodeURIComponent(agentKey)}?environment=${encodeURIComponent(environment)}`)
}
