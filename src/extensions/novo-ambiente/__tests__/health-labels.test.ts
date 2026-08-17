import { describe, expect, it } from 'vitest'

import { hasLiveEvidence, healthDetail, layerLabel } from '../health-labels'

describe('Mission Control health labels', () => {
  it('does not expose internal enum names to the user', () => {
    expect(layerLabel('end_to_end')).toBe('Jornada completa')
    expect(healthDetail('unknown', 'no_recent_evidence')).toBe('Aguardando sinal')
    expect(healthDetail('unavailable', 'runtime_stopped')).toBe('Runtime parado')
  })

  it('distinguishes a manifest without telemetry from an observed agent', () => {
    expect(hasLiveEvidence([{ layer: 'runtime', status: 'unknown', observedAt: null, errorCode: 'no_recent_evidence' }])).toBe(false)
    expect(hasLiveEvidence([{ layer: 'runtime', status: 'healthy', observedAt: '2026-08-17T00:00:00Z', errorCode: null }])).toBe(true)
  })
})
