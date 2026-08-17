import { proxyAdapter } from '@/extensions/novo-ambiente/api/route-helpers'

export async function GET(request: Request, context: { params: Promise<{ dashboardKey: string }> }) {
  const environment = new URL(request.url).searchParams.get('environment') || 'staging'
  const { dashboardKey } = await context.params
  return proxyAdapter(
    request,
    'admin',
    `/internal/v1/access/${encodeURIComponent(dashboardKey)}?environment=${encodeURIComponent(environment)}`,
  )
}
