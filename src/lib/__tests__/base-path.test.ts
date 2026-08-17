import { afterEach, describe, expect, it, vi } from 'vitest'

describe('application base path', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_MC_BASE_PATH
    vi.resetModules()
  })

  it('keeps root deployment paths unchanged', async () => {
    const { applicationPath } = await import('../base-path')
    expect(applicationPath('/api/health')).toBe('/api/health')
  })

  it('prefixes absolute paths for the same-origin Mission Control deployment', async () => {
    process.env.NEXT_PUBLIC_MC_BASE_PATH = '/mission-control'
    const { applicationPath } = await import('../base-path')
    expect(applicationPath('/api/health')).toBe('/mission-control/api/health')
    expect(applicationPath('/connections')).toBe('/mission-control/connections')
    expect(applicationPath('/')).toBe('/mission-control')
  })

  it('rejects relative paths', async () => {
    const { applicationPath } = await import('../base-path')
    expect(() => applicationPath('api/health')).toThrow('absolute')
  })
})
