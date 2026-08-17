import { afterEach, describe, expect, it } from 'vitest'

import { mountHermesOverlay } from '../hermes-overlay'

describe('Hermes overlay', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('reuses the canonical portfolio assistant for Mission Control', () => {
    const unmount = mountHermesOverlay(document)
    const script = document.querySelector<HTMLScriptElement>('script[data-hermes-portfolio="mission-control"]')

    expect(script?.getAttribute('src')).toBe('/hermes/assets/portfolio-assistant.js')
    expect(script?.dataset).toMatchObject({
      dashboardId: 'mission-control',
      dashboardLabel: 'Mission Control',
      view: 'mission-control',
      screenId: 'mission-control',
    })

    unmount()
    expect(document.querySelector('script[data-hermes-portfolio="mission-control"]')).toBeNull()
  })

  it('does not install duplicate scripts', () => {
    mountHermesOverlay(document)
    mountHermesOverlay(document)
    expect(document.querySelectorAll('script[data-hermes-portfolio="mission-control"]')).toHaveLength(1)
  })
})
