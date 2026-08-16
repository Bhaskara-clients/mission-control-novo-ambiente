import { NextResponse } from 'next/server'

import { getUserFromRequest, requireRole, type User } from '@/lib/auth'
import { requestAdapter } from './adapter-client'

export function authenticatedUser(request: Request, role: User['role']): User | NextResponse {
  const auth = requireRole(request, role)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const user = getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (user.id === 0) return NextResponse.json({ error: 'Global API key is not accepted by Novo Ambiente routes' }, { status: 403 })
  return user
}

export async function proxyAdapter(
  request: Request,
  role: User['role'],
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<NextResponse> {
  const user = authenticatedUser(request, role)
  if (user instanceof NextResponse) return user
  try {
    const response = await requestAdapter(user, path, {
      ...options,
      requestId: request.headers.get('x-request-id') || crypto.randomUUID(),
    })
    const payload = await response.json().catch(() => ({ error: 'adapter_invalid_response' }))
    return NextResponse.json(payload, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'mission_control_adapter_unavailable' }, { status: 503 })
  }
}
