import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requestAdapter } from '../api/adapter-client'

const user = {
  id: 1,
  username: 'tenant:operator',
  display_name: 'Operator',
  role: 'admin' as const,
  workspace_id: 1,
  tenant_id: 1,
  created_at: 0,
  updated_at: 0,
  last_login_at: null,
}

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'mc-adapter-routing-'))
  const stagingKey = join(directory, 'staging.key')
  const productionKey = join(directory, 'production.key')
  writeFileSync(stagingKey, 'staging-reader')
  writeFileSync(productionKey, 'production-reader')
  process.env.MC_STAGING_ADAPTER_URL = 'http://mission-control-adapter:8080'
  process.env.MC_STAGING_ADAPTER_READER_KEY_FILE = stagingKey
  process.env.MC_PRODUCTION_ADAPTER_URL = 'http://host.docker.internal:8096'
  process.env.MC_PRODUCTION_ADAPTER_READER_KEY_FILE = productionKey
})

afterEach(() => {
  vi.unstubAllGlobals()
  for (const name of [
    'MC_STAGING_ADAPTER_URL',
    'MC_STAGING_ADAPTER_READER_KEY_FILE',
    'MC_PRODUCTION_ADAPTER_URL',
    'MC_PRODUCTION_ADAPTER_READER_KEY_FILE',
  ]) delete process.env[name]
  rmSync(directory, { recursive: true, force: true })
})

describe('Mission Control adapter routing', () => {
  it.each([
    ['staging', 'http://mission-control-adapter:8080', 'staging-reader'],
    ['production', 'http://host.docker.internal:8096', 'production-reader'],
  ] as const)('routes %s only to its server-side reader', async (environment, baseUrl, expectedKey) => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(`${baseUrl}/internal/v1/overview?environment=${environment}`)
      expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${expectedKey}`)
      return new Response('{}')
    })
    vi.stubGlobal('fetch', fetchMock)

    await requestAdapter(user, `/internal/v1/overview?environment=${environment}`)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('fails closed before fetch when environment is missing or outside the allowlist', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(requestAdapter(user, '/internal/v1/overview')).rejects.toThrow('environment do adapter inválido')
    await expect(requestAdapter(user, '/internal/v1/overview?environment=development')).rejects.toThrow('environment do adapter inválido')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserves target 401 when a reader is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const key = new Headers(init?.headers).get('Authorization')
      return new Response('{}', { status: key === 'Bearer production-reader' ? 200 : 401 })
    }))

    const response = await requestAdapter(user, '/internal/v1/overview?environment=production')
    expect(response.status).toBe(200)
    process.env.MC_PRODUCTION_ADAPTER_READER_KEY_FILE = process.env.MC_STAGING_ADAPTER_READER_KEY_FILE
    const rejected = await requestAdapter(user, '/internal/v1/overview?environment=production')
    expect(rejected.status).toBe(401)
  })
})
