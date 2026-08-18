import { readFileSync } from 'node:fs'

import type { User } from '@/lib/auth'

type Environment = 'staging' | 'production'

function environmentFromPath(path: string): Environment {
  const url = new URL(path, 'http://mission-control.internal')
  if (!url.pathname.startsWith('/internal/v1/')) throw new Error('rota do adapter fora da allowlist')
  const environment = url.searchParams.get('environment')
  if (environment !== 'staging' && environment !== 'production') throw new Error('environment do adapter inválido')
  return environment
}

function adapterConfig(environment: Environment): { baseUrl: string; readerKey: string } {
  const prefix = environment === 'staging' ? 'MC_STAGING_ADAPTER' : 'MC_PRODUCTION_ADAPTER'
  const baseUrl = (process.env[`${prefix}_URL`] || '').trim()
  if (!/^https?:\/\//.test(baseUrl)) throw new Error(`${prefix}_URL inválida`)
  const path = (process.env[`${prefix}_READER_KEY_FILE`] || '').trim()
  if (!path) throw new Error(`${prefix}_READER_KEY_FILE ausente`)
  const value = readFileSync(path, 'utf8').trim()
  if (!value) throw new Error('reader key vazia')
  return { baseUrl: baseUrl.replace(/\/$/, ''), readerKey: value }
}

export async function requestAdapter(
  user: User,
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; requestId?: string } = {},
): Promise<Response> {
  const config = adapterConfig(environmentFromPath(path))
  return fetch(`${config.baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${config.readerKey}`,
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
