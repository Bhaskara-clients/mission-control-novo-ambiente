import { readFileSync } from 'node:fs'

import type { User } from '@/lib/auth'

function adapterBaseUrl(): string {
  const value = (process.env.MC_ADAPTER_URL || '').trim()
  if (!/^https?:\/\//.test(value)) throw new Error('MC_ADAPTER_URL inválida')
  return value.replace(/\/$/, '')
}

function readerKey(): string {
  const path = (process.env.MC_ADAPTER_READER_KEY_FILE || '').trim()
  if (!path) throw new Error('MC_ADAPTER_READER_KEY_FILE ausente')
  const value = readFileSync(path, 'utf8').trim()
  if (!value) throw new Error('reader key vazia')
  return value
}

export async function requestAdapter(
  user: User,
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; requestId?: string } = {},
): Promise<Response> {
  if (!path.startsWith('/internal/v1/')) throw new Error('rota do adapter fora da allowlist')
  return fetch(`${adapterBaseUrl()}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${readerKey()}`,
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      'X-MC-Actor-Id': user.username,
      'X-MC-Actor-Role': user.role,
      'X-MC-Request-Id': options.requestId || crypto.randomUUID(),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  })
}
