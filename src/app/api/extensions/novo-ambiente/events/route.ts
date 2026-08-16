import { readFileSync } from 'node:fs'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

function equalSecret(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const secretPath = (process.env.MC_ADAPTER_PUBLISHER_KEY_FILE || '').trim()
  const expected = secretPath ? readFileSync(secretPath, 'utf8').trim() : ''
  const provided = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!expected || !provided || !equalSecret(expected, provided)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || body.schemaVersion !== 1 || typeof body.eventId !== 'string' || typeof body.eventType !== 'string') {
    return NextResponse.json({ error: 'invalid_event' }, { status: 422 })
  }
  return NextResponse.json({ accepted: true }, { status: 202 })
}
