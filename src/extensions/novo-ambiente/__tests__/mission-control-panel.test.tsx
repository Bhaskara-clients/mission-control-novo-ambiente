// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiFetch } from '@/lib/api-client'
import { MissionControlPanel } from '../components/mission-control-panel'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

const overview = {
  schemaVersion: 1,
  environment: 'production',
  agents: [],
  activeIncidents: [],
  generatedAt: '2026-08-17T17:30:00.000Z',
}

const access = {
  schemaVersion: 1,
  environment: 'production',
  dashboards: [{ dashboardKey: 'wms', displayName: 'WMS', enabled: true, grantCount: 2 }],
  allowlist: [],
  generatedAt: '2026-08-17T17:30:00.000Z',
  source: 'canonical_access_projection',
}

describe('MissionControlPanel', () => {
  afterEach(() => vi.clearAllMocks())

  it('defaults to production and does not render data from the previous view', async () => {
    let resolveAccess: (value: unknown) => void = () => undefined
    vi.mocked(apiFetch).mockImplementation((url) => {
      if (String(url).includes('/overview?environment=production')) return Promise.resolve(overview)
      if (String(url).includes('/access?environment=production')) {
        return new Promise((resolve) => { resolveAccess = resolve })
      }
      return Promise.resolve([])
    })

    const { rerender } = render(<MissionControlPanel view="fleet" />)
    expect(await screen.findByText('Nenhum agente habilitado neste ambiente.')).toBeTruthy()

    rerender(<MissionControlPanel view="access" />)
    expect(screen.queryByText('Dashboards e perfis')).toBeNull()

    resolveAccess(access)
    expect(await screen.findByText('Dashboards e perfis')).toBeTruthy()
    expect(screen.getByRole('combobox')).toHaveValue('production')
  })
})
