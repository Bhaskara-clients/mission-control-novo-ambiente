import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('incident mutation routes', () => {
  it.each(['acknowledge', 'resolve'])('%s forwards the explicit environment to the adapter selector', (action) => {
    const source = readFileSync(
      resolve(`src/app/api/extensions/novo-ambiente/incidents/[id]/${action}/route.ts`),
      'utf8',
    )
    expect(source).toContain("new URL(request.url).searchParams.get('environment')")
    expect(source).toContain(`/${action}?environment=`)
  })
})
