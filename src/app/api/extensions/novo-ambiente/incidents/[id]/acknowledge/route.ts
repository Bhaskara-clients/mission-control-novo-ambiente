import { proxyAdapter } from '@/extensions/novo-ambiente/api/route-helpers'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return proxyAdapter(request, 'operator', `/internal/v1/incidents/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' })
}
