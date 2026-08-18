import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('usage route contract', () => {
  it('consumes the three canonical readers and never falls back to legacy usage', () => {
    const source = readFileSync(resolve('src/app/api/extensions/novo-ambiente/usage/route.ts'), 'utf8')
    expect(source).toContain('/internal/v1/usage/overview?')
    expect(source).toContain('/internal/v1/usage/breakdown?')
    expect(source).toContain('/internal/v1/usage/timeseries?')
    expect(source).not.toMatch(/requestAdapter\([^\n]+`\/internal\/v1\/usage\?environment/)
  })
})
