export function mountHermesOverlay(document: Document): () => void {
  const selector = 'script[data-hermes-portfolio="mission-control"]'
  if (document.querySelector(selector)) return () => undefined

  const slot = document.createElement('section')
  slot.dataset.hermesSlotId = 'primary'
  slot.dataset.hermesComponentId = 'primary-component'

  const script = document.createElement('script')
  script.src = '/hermes/assets/portfolio-assistant.js'
  script.async = true
  script.dataset.hermesPortfolio = 'mission-control'
  script.dataset.dashboardId = 'mission-control'
  script.dataset.dashboardLabel = 'Mission Control'
  script.dataset.view = 'mission-control'
  script.dataset.screenId = 'mission-control'
  script.dataset.slotId = 'primary'
  document.body.append(slot, script)

  return () => {
    script.remove()
    slot.remove()
    document.querySelector('.hermes-portfolio-launcher')?.remove()
    document.querySelector('.hermes-portfolio-drawer')?.remove()
  }
}
