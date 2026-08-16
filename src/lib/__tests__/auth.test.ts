import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { hasTrustedNovoAmbienteAssertion, safeCompare, requireRole } from '@/lib/auth'

// Mock dependencies that auth.ts imports
vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(),
}))

vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn((p: string) => `hashed:${p}`),
  verifyPassword: vi.fn(() => false),
}))

// Prevent event-bus singleton side-effects
vi.mock('@/lib/event-bus', () => ({
  eventBus: { broadcast: vi.fn(), on: vi.fn(), emit: vi.fn() },
}))

describe('safeCompare', () => {
  it('returns true for matching strings', () => {
    expect(safeCompare('abc123', 'abc123')).toBe(true)
  })

  it('returns false for non-matching strings of same length', () => {
    expect(safeCompare('abc123', 'xyz789')).toBe(false)
  })

  it('returns false for different length strings', () => {
    expect(safeCompare('short', 'muchlonger')).toBe(false)
  })

  it('returns true for two empty strings', () => {
    expect(safeCompare('', '')).toBe(true)
  })

  it('returns false when one string is empty', () => {
    expect(safeCompare('', 'notempty')).toBe(false)
    expect(safeCompare('notempty', '')).toBe(false)
  })

  it('returns false for non-string inputs', () => {
    expect(safeCompare(null as any, 'a')).toBe(false)
    expect(safeCompare('a', undefined as any)).toBe(false)
  })
})

describe('Novo Ambiente trusted proxy assertion', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MC_NOVO_AMBIENTE_LOCKDOWN: '1',
      MC_PROXY_AUTH_HEADER: 'X-Auth-Actor',
      MC_PROXY_AUTH_ROLE_HEADER: 'X-Auth-Mc-Role',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('requires the gateway marker in addition to actor and role', () => {
    const spoofed = new Request('http://localhost', {
      headers: {
        'X-Auth-Actor': 'attacker',
        'X-Auth-Mc-Role': 'admin',
      },
    })
    const asserted = new Request('http://localhost', {
      headers: {
        'X-Auth-Actor': 'tenant:object',
        'X-Auth-Mc-Role': 'operator',
        'X-Auth-Proxy-Verified': 'entra-auth-gateway',
      },
    })

    expect(hasTrustedNovoAmbienteAssertion(spoofed)).toBe(false)
    expect(hasTrustedNovoAmbienteAssertion(asserted)).toBe(true)
  })

  it('rejects missing actors and unknown roles', () => {
    expect(hasTrustedNovoAmbienteAssertion(new Request('http://localhost', {
      headers: {
        'X-Auth-Mc-Role': 'admin',
        'X-Auth-Proxy-Verified': 'entra-auth-gateway',
      },
    }))).toBe(false)
    expect(hasTrustedNovoAmbienteAssertion(new Request('http://localhost', {
      headers: {
        'X-Auth-Actor': 'tenant:object',
        'X-Auth-Mc-Role': 'owner',
        'X-Auth-Proxy-Verified': 'entra-auth-gateway',
      },
    }))).toBe(false)
  })
})

describe('requireRole', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, API_KEY: 'test-api-key-secret' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function makeRequest(headers: Record<string, string> = {}): Request {
    return new Request('http://localhost/api/test', {
      headers: new Headers(headers),
    })
  }

  it('returns 401 when no authentication is provided', () => {
    const result = requireRole(makeRequest(), 'viewer')
    expect(result.status).toBe(401)
    expect(result.error).toBe('Authentication required')
    expect(result.user).toBeUndefined()
  })

  it('returns 401 when API key is wrong', () => {
    const result = requireRole(
      makeRequest({ 'x-api-key': 'wrong-key' }),
      'viewer',
    )
    expect(result.status).toBe(401)
    expect(result.error).toBe('Authentication required')
  })

  it('returns user when API key is valid and role is sufficient', () => {
    const result = requireRole(
      makeRequest({ 'x-api-key': 'test-api-key-secret' }),
      'admin',
    )
    expect(result.status).toBeUndefined()
    expect(result.error).toBeUndefined()
    expect(result.user).toBeDefined()
    expect(result.user!.username).toBe('api')
    expect(result.user!.role).toBe('admin')
  })

  it('returns user for lower role requirement with API key (admin >= viewer)', () => {
    const result = requireRole(
      makeRequest({ 'x-api-key': 'test-api-key-secret' }),
      'viewer',
    )
    expect(result.user).toBeDefined()
    expect(result.user!.role).toBe('admin')
  })

  it('returns user for operator role requirement with API key (admin >= operator)', () => {
    const result = requireRole(
      makeRequest({ 'x-api-key': 'test-api-key-secret' }),
      'operator',
    )
    expect(result.user).toBeDefined()
  })

  it('accepts Authorization Bearer API key', () => {
    const result = requireRole(
      makeRequest({ authorization: 'Bearer test-api-key-secret' }),
      'admin',
    )
    expect(result.user).toBeDefined()
    expect(result.user!.username).toBe('api')
  })

  it('rejects API key auth when API_KEY is not configured', () => {
    process.env = { ...originalEnv, API_KEY: '' }
    const result = requireRole(
      makeRequest({ 'x-api-key': 'test-api-key-secret' }),
      'viewer',
    )
    expect(result.status).toBe(401)
    expect(result.user).toBeUndefined()
  })
})
