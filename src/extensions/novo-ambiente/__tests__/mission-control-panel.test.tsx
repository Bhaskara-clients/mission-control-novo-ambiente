// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
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

  it('loads dashboard profiles only after an admin opens its detail', async () => {
    vi.mocked(apiFetch).mockImplementation((url) => {
      if (String(url).includes('/access/wms?environment=production')) {
        return Promise.resolve({
          schemaVersion: 1,
          environment: 'production',
          dashboardKey: 'wms',
          displayName: 'WMS',
          profiles: ['admin@novoambiente.com.br', 'user@novoambiente.com.br'],
          generatedAt: '2026-08-17T17:30:00.000Z',
        })
      }
      if (String(url).includes('/access?environment=production')) return Promise.resolve(access)
      return Promise.resolve([])
    })

    render(<MissionControlPanel view="access" />)
    fireEvent.click(await screen.findByRole('button', { name: /WMS/ }))

    expect(await screen.findByText('admin@novoambiente.com.br')).toBeTruthy()
    expect(screen.getByText('user@novoambiente.com.br')).toBeTruthy()
    expect(apiFetch).toHaveBeenCalledWith('/api/extensions/novo-ambiente/access/wms?environment=production')
  })

  it('renders canonical usage coverage, breakdown and timeseries and changes the window', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      schemaVersion: 1,
      environment: 'production',
      days: 30,
      overview: {
        schemaVersion: 1,
        environment: 'production',
        status: 'available',
        totals: { inputTokens: 80, outputTokens: 20, totalTokens: 100, costUsd: null, coveragePercent: 75, reportedEvents: 3, totalEvents: 4 },
        generatedAt: '2026-08-18T10:00:00.000Z',
      },
      breakdown: { dimension: 'agent', items: [{ key: 'comercial', totalTokens: 100, costUsd: null, coveragePercent: 75 }] },
      timeseries: { interval: 'day', items: [{ bucket: '2026-08-18T00:00:00.000Z', totalTokens: 100, coveragePercent: 75 }] },
    })

    render(<MissionControlPanel view="usage" />)

    expect((await screen.findAllByText('75%')).length).toBeGreaterThan(0)
    expect(screen.getByText('3/4')).toBeTruthy()
    expect(screen.getByText('Por agente')).toBeTruthy()
    expect(screen.getByText('Série diária')).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: 'Período' }), { target: { value: '7' } })
    expect(apiFetch).toHaveBeenCalledWith('/api/extensions/novo-ambiente/usage?environment=production&days=7')
  })
})
