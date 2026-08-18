import { NextResponse } from 'next/server'

import { requestAdapter } from '@/extensions/novo-ambiente/api/adapter-client'
import { authenticatedUser } from '@/extensions/novo-ambiente/api/route-helpers'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams
  const environment = query.get('environment') || 'staging'
  const days = Number(query.get('days') || '30')
  if (![7, 30, 90].includes(days)) return NextResponse.json({ error: 'invalid_usage_window' }, { status: 422 })
  const user = authenticatedUser(request, 'viewer')
  if (user instanceof NextResponse) return user
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1_000)
  const base = `environment=${encodeURIComponent(environment)}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
  try {
    const responses = await Promise.all([
      requestAdapter(user, `/internal/v1/usage/overview?${base}`),
      requestAdapter(user, `/internal/v1/usage/breakdown?${base}&dimension=agent`),
      requestAdapter(user, `/internal/v1/usage/timeseries?${base}&interval=day`),
    ])
    const payloads = await Promise.all(responses.map((response) => response.json()))
    const failed = responses.findIndex((response) => !response.ok)
    if (failed >= 0) return NextResponse.json(payloads[failed], { status: responses[failed].status })
    return NextResponse.json({ schemaVersion: 1, environment, days, overview: payloads[0], breakdown: payloads[1], timeseries: payloads[2] })
  } catch {
    return NextResponse.json({ error: 'mission_control_adapter_unavailable' }, { status: 503 })
  }
}
