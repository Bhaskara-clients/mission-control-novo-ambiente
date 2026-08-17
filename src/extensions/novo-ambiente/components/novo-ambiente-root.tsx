'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { apiFetch } from '@/lib/api-client'
import { applicationPath } from '@/lib/base-path'
import type { CurrentUser } from '@/store'
import { systemsHubUrl, visibleNavigation, visibleSystems, type DashboardCatalogItem, type DashboardCatalogSection } from '../catalog-navigation'
import { MissionControlPanel, type NovoAmbienteView } from './mission-control-panel'

const views: Array<{ id: NovoAmbienteView; label: string }> = [
  { id: 'fleet', label: 'Frota' },
  { id: 'connections', label: 'Conexões' },
  { id: 'usage', label: 'Consumo' },
  { id: 'access', label: 'Acessos' },
]

export function NovoAmbienteRoot() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [systems, setSystems] = useState<DashboardCatalogItem[]>([])
  const [navigation, setNavigation] = useState<DashboardCatalogSection[]>([])
  const [systemsOpen, setSystemsOpen] = useState(false)

  useEffect(() => {
    apiFetch<{ user: CurrentUser }>('/api/auth/me')
      .then((value) => setUser(value.user))
      .catch(() => setUser(null))
  }, [])
  useEffect(() => {
    apiFetch<unknown>('/auth/catalog')
      .then((value) => {
        setSystems(visibleSystems(value))
        setNavigation(visibleNavigation(value))
      })
      .catch(() => {
        setSystems([])
        setNavigation([])
      })
  }, [])

  const allowedViews = user?.role === 'admin' ? views : views.filter((item) => item.id !== 'access')
  const requested = pathname === '/' ? 'fleet' : pathname.slice(1)
  const active = allowedViews.some((item) => item.id === requested) ? requested as NovoAmbienteView : 'fleet'
  const hub = systemsHubUrl(systems)
  const wms = systems.find((item) => item.key === 'wms')?.url || hub
  const initial = (user?.display_name || user?.username || 'U').slice(0, 1).toUpperCase()

  const navigate = (view: NovoAmbienteView) => router.push(view === 'fleet' ? '/' : `/${view}`)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <nav aria-label="Navegação principal" className="hidden w-[88px] shrink-0 flex-col border-r border-border bg-card md:flex">
        <a href={hub || applicationPath('/')} aria-label="Início" className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/70 text-base font-bold text-white">
          NA
        </a>
        <div className="mt-8 flex flex-col gap-2 px-2">
          {hub && <RailLink href={hub} mark="⌂" label="Início" />}
          {wms && <RailLink href={wms} mark="W" label="WMS" />}
          <RailLink href={applicationPath('/')} mark="IA" label="Agentes" active />
          <button type="button" aria-expanded={systemsOpen} onClick={() => setSystemsOpen((open) => !open)} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <span className="text-lg" aria-hidden="true">▦</span>
            <span className="text-[11px]">Sistemas</span>
          </button>
        </div>
        <div className="mt-auto flex flex-col items-center gap-4 pb-5">
          <span className="[writing-mode:vertical-rl] text-[10px] font-semibold tracking-[0.18em] text-amber-400">STAGING</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">{initial}</span>
        </div>
      </nav>

      {systemsOpen && (
        <><button aria-label="Fechar sistemas" className="fixed inset-0 z-30 bg-black/55" onClick={() => setSystemsOpen(false)} /><aside className="fixed inset-y-0 left-0 z-40 w-full max-w-lg overflow-y-auto border-r border-border bg-card p-5 shadow-2xl md:left-[88px]">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Novo Ambiente</p>
              <h2 className="mt-1 text-lg font-semibold">Sistemas liberados</h2>
            </div>
            <button type="button" onClick={() => setSystemsOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">Fechar</button>
          </div>
          <div className="mt-5 space-y-6">
            {navigation.map((section) => <section key={section.key}><h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section.label}</h3><div className="space-y-2">{section.destinations.map((destination) => <div key={destination.key} className="rounded-xl border border-border bg-background/40 p-3"><a href={destination.url} className="block rounded-md p-1 hover:text-cyan-300"><span className="font-medium text-foreground">{destination.label}</span>{destination.description && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{destination.description}</span>}</a>{destination.links.length > 1 && <div className="mt-3 flex flex-wrap gap-2">{destination.links.map((link) => <a key={link.key} href={link.url} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-cyan-500/40 hover:text-foreground">{link.label}</a>)}</div>}</div>)}</div></section>)}
            {navigation.length === 0 && <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Nenhum sistema liberado para este perfil.</p>}
          </div>
          {hub && <a href={hub} className="mt-4 block rounded-lg border border-border px-3 py-3 text-center text-sm text-cyan-400 hover:bg-secondary">Ver portal completo</a>}
        </aside></>
      )}

      <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-0">
        <nav aria-label="Seções do Mission Control" className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-5 py-3 backdrop-blur lg:px-8">
          {allowedViews.map((item) => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`rounded-full px-4 py-2 text-sm ${active === item.id ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:text-foreground'}`}>{item.label}</button>)}
        </nav>
        <MissionControlPanel view={active} />
      </main>

      <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border bg-card md:hidden">
        {hub && <MobileLink href={hub} mark="⌂" label="Início" />}
        {wms && <MobileLink href={wms} mark="W" label="WMS" />}
        <MobileLink href={applicationPath('/')} mark="IA" label="Agentes" active />
        <button type="button" aria-expanded={systemsOpen} onClick={() => setSystemsOpen((open) => !open)} className="flex h-full min-w-16 flex-col items-center justify-center text-muted-foreground"><span aria-hidden="true">▦</span><span className="text-[10px]">Sistemas</span></button>
      </nav>
    </div>
  )
}

function RailLink({ href, mark, label, active = false }: { href: string; mark: string; label: string; active?: boolean }) {
  return <a href={href} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 ${active ? 'bg-secondary text-amber-400' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}><span className="text-base font-semibold" aria-hidden="true">{mark}</span><span className="text-[11px]">{label}</span></a>
}

function MobileLink({ href, mark, label, active = false }: { href: string; mark: string; label: string; active?: boolean }) {
  return <a href={href} className={`flex h-full min-w-16 flex-col items-center justify-center ${active ? 'text-amber-400' : 'text-muted-foreground'}`}><span className="font-semibold" aria-hidden="true">{mark}</span><span className="text-[10px]">{label}</span></a>
}
