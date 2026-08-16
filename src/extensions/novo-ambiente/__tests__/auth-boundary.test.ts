import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { proxy } from '@/proxy'

function request(path: string, method = 'GET', headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { host: 'localhost', ...headers },
  })
}

const assertionHeaders = {
  'X-Auth-Actor': '11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222',
  'X-Auth-Mc-Role': 'admin',
  'X-Auth-Proxy-Verified': 'entra-auth-gateway',
}

describe('Novo Ambiente authentication boundary', () => {
  beforeEach(() => {
    process.env.MC_NOVO_AMBIENTE_LOCKDOWN = '1'
    process.env.MC_PROXY_AUTH_HEADER = 'X-Auth-Actor'
    process.env.MC_PROXY_AUTH_ROLE_HEADER = 'X-Auth-Mc-Role'
  })

  afterEach(() => {
    delete process.env.MC_NOVO_AMBIENTE_LOCKDOWN
    delete process.env.MC_PROXY_AUTH_HEADER
    delete process.env.MC_PROXY_AUTH_ROLE_HEADER
  })

  it('accepts a gateway assertion and rejects spoofed identity headers without its marker', () => {
    const asserted = proxy(request('/', 'GET', assertionHeaders))
    const spoofed = proxy(request('/', 'GET', {
      'X-Auth-Actor': 'attacker',
      'X-Auth-Mc-Role': 'admin',
    }))

    expect(asserted.headers.get('x-middleware-next')).toBe('1')
    expect(spoofed.status).toBe(401)
  })

  it('does not accept a legacy local session without the gateway assertion', () => {
    const response = proxy(request('/', 'GET', { cookie: 'mc_session=legacy-session' }))
    expect(response.status).toBe(401)
  })

  it.each([
    ['/api/auth/login', 'POST'],
    ['/api/auth/logout', 'POST'],
    ['/api/auth/google', 'POST'],
    ['/api/auth/google/disconnect', 'POST'],
    ['/api/auth/users', 'GET'],
    ['/api/auth/users', 'POST'],
    ['/api/auth/access-requests', 'GET'],
    ['/api/setup', 'POST'],
  ])('does not publish inherited auth route %s %s', (path, method) => {
    const response = proxy(request(path, method, assertionHeaders))
    expect(response.status).toBe(404)
  })

  it('keeps only the read side of /api/auth/me for the asserted user', () => {
    expect(proxy(request('/api/auth/me', 'GET', assertionHeaders)).headers.get('x-middleware-next')).toBe('1')
    expect(proxy(request('/api/auth/me', 'PATCH', assertionHeaders)).status).toBe(404)
  })
})
