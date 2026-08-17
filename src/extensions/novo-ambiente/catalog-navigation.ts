export interface DashboardCatalogItem {
  key: string
  label: string
  url: string
}

interface DashboardCatalog {
  schemaVersion: number
  dashboards: DashboardCatalogItem[]
  sections?: DashboardCatalogSection[]
}

export interface DashboardCatalogLink extends DashboardCatalogItem {}

export interface DashboardCatalogDestination {
  key: string
  label: string
  description: string
  url: string
  links: DashboardCatalogLink[]
}

export interface DashboardCatalogSection {
  key: string
  label: string
  destinations: DashboardCatalogDestination[]
}

export function visibleSystems(value: unknown): DashboardCatalogItem[] {
  if (!value || typeof value !== 'object') return []
  const catalog = value as Partial<DashboardCatalog>
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.dashboards)) return []
  return catalog.dashboards.filter((item): item is DashboardCatalogItem => {
    if (!item || typeof item.key !== 'string' || typeof item.label !== 'string' || typeof item.url !== 'string') return false
    if (item.key === 'painel' || item.key === 'mission-control') return false
    try {
      return new URL(item.url).protocol === 'https:'
    } catch {
      return false
    }
  })
}

export function visibleNavigation(value: unknown): DashboardCatalogSection[] {
  if (!value || typeof value !== 'object') return []
  const catalog = value as Partial<DashboardCatalog>
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.sections)) return []
  return catalog.sections.flatMap((section) => {
    if (!section || typeof section.key !== 'string' || typeof section.label !== 'string' || !Array.isArray(section.destinations)) return []
    const destinations = section.destinations.flatMap((destination) => {
      if (!destination || typeof destination.key !== 'string' || typeof destination.label !== 'string' || typeof destination.description !== 'string' || !Array.isArray(destination.links)) return []
      const links = destination.links.filter((link): link is DashboardCatalogLink => {
        if (!link || typeof link.key !== 'string' || typeof link.label !== 'string' || typeof link.url !== 'string') return false
        try { return new URL(link.url).protocol === 'https:' } catch { return false }
      })
      if (!links.length || typeof destination.url !== 'string' || !links.some((link) => link.url === destination.url)) return []
      return [{ ...destination, links }]
    })
    return destinations.length ? [{ key: section.key, label: section.label, destinations }] : []
  })
}

export function systemsHubUrl(systems: DashboardCatalogItem[]): string | null {
  if (!systems[0]) return null
  return new URL('/painel/hub', systems[0].url).toString()
}
