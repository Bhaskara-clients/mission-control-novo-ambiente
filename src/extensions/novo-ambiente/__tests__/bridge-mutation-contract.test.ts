import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requestAdapter } from '../api/adapter-client'

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'mc-bridge-'))
  const keyFile = join(directory, 'reader.key')
  writeFileSync(keyFile, 'reader-secret')
  process.env.MC_ADAPTER_READER_KEY_FILE = keyFile
  process.env.MC_ADAPTER_URL = 'http://mission-control-adapter:8080'
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.MC_ADAPTER_READER_KEY_FILE
  delete process.env.MC_ADAPTER_URL
  rmSync(directory, { recursive: true, force: true })
})

describe('email bridge mutation contract', () => {
  it('sends the bridge actor to the adapter and preserves its canonical-actor rejection', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('X-MC-Actor-Id')).toBe('user@novoambiente.com.br')
      expect(headers.get('X-MC-Actor-Role')).toBe('viewer')
      return new Response(JSON.stringify({ error: 'role insuficiente' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await requestAdapter({
      id: 7,
      username: 'user@novoambiente.com.br',
      display_name: 'Bridge User',
      role: 'viewer',
      workspace_id: 1,
      tenant_id: 1,
      created_at: 0,
      updated_at: 0,
      last_login_at: null,
    }, '/internal/v1/incidents/incident-1/acknowledge', { method: 'POST' })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'role insuficiente' })
  })
})
