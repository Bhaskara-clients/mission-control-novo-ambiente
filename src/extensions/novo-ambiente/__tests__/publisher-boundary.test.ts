import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { POST } from '@/app/api/extensions/novo-ambiente/events/route'
import { proxy } from '@/proxy'

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'mc-publisher-'))
  process.env.MC_NOVO_AMBIENTE_LOCKDOWN = '1'
  process.env.MC_BASE_PATH = '/mission-control'
})

afterEach(() => {
  delete process.env.MC_ADAPTER_PUBLISHER_KEY_FILE
  delete process.env.MC_NOVO_AMBIENTE_LOCKDOWN
  delete process.env.MC_BASE_PATH
  rmSync(directory, { recursive: true, force: true })
})

function request(path: string, method = 'GET') {
  return new NextRequest(`http://localhost${path}`, { method })
}

describe('adapter publisher boundary', () => {
  it('exempts only the exact publisher POST from session authentication', () => {
    expect(proxy(request('/mission-control/api/extensions/novo-ambiente/events', 'POST')).headers.get('x-middleware-next')).toBe('1')
    expect(proxy(request('/mission-control/api/extensions/novo-ambiente/events')).status).toBe(401)
    expect(proxy(request('/mission-control/api/extensions/novo-ambiente/events/neighbor', 'POST')).status).toBe(401)
    expect(proxy(request('/api/extensions/novo-ambiente/events', 'POST')).status).toBe(401)
  })

  it('rejects missing and incorrect publisher credentials', async () => {
    const body = JSON.stringify({ schemaVersion: 1, eventId: 'evt-1', eventType: 'health.changed' })
    expect((await POST(new Request('http://localhost/events', { method: 'POST', body }))).status).toBe(401)

    const secret = join(directory, 'publisher.key')
    writeFileSync(secret, 'publisher-secret')
    process.env.MC_ADAPTER_PUBLISHER_KEY_FILE = secret
    const response = await POST(new Request('http://localhost/events', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
      body,
    }))
    expect(response.status).toBe(401)
  })

  it('accepts a valid publisher credential and event contract', async () => {
    const secret = join(directory, 'publisher.key')
    writeFileSync(secret, 'publisher-secret')
    process.env.MC_ADAPTER_PUBLISHER_KEY_FILE = secret
    const response = await POST(new Request('http://localhost/events', {
      method: 'POST',
      headers: { authorization: 'Bearer publisher-secret' },
      body: JSON.stringify({ schemaVersion: 1, eventId: 'evt-1', eventType: 'health.changed' }),
    }))
    expect(response.status).toBe(202)
  })
})
