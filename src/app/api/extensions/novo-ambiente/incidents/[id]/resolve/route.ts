import { proxyAdapter } from '@/extensions/novo-ambiente/api/route-helpers'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await request.json().catch(() => ({}))
  return proxyAdapter(request, 'operator', `/internal/v1/incidents/${encodeURIComponent(id)}/resolve`, { method: 'POST', body })
}
