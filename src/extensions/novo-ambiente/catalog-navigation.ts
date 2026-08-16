export interface DashboardCatalogItem {
  key: string
  label: string
  url: string
}

interface DashboardCatalog {
  schemaVersion: number
  dashboards: DashboardCatalogItem[]
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

export function systemsHubUrl(systems: DashboardCatalogItem[]): string | null {
  if (!systems[0]) return null
  return new URL('/painel/hub', systems[0].url).toString()
}
