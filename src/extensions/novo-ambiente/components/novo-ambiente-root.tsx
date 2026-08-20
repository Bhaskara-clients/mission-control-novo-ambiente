'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Script from 'next/script'

import { apiFetch } from '@/lib/api-client'
import type { CurrentUser } from '@/store'
import { mountHermesOverlay } from '../hermes-overlay'
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

  useEffect(() => {
    apiFetch<{ user: CurrentUser }>('/api/auth/me')
      .then((value) => setUser(value.user))
      .catch(() => setUser(null))
  }, [])
  useEffect(() => mountHermesOverlay(document), [])

  const allowedViews = user?.role === 'admin' ? views : views.filter((item) => item.id !== 'access')
  const requested = pathname === '/' ? 'fleet' : pathname.slice(1)
  const active = allowedViews.some((item) => item.id === requested) ? requested as NovoAmbienteView : 'fleet'
  const navigate = (view: NovoAmbienteView) => router.push(view === 'fleet' ? '/' : `/${view}`)

  return (
    <>
      <Script src="/painel/static/portal-shell.js" type="module" strategy="afterInteractive" />
      <div className="flex h-screen overflow-hidden bg-background">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <nav aria-label="Seções do Mission Control" className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-5 py-3 backdrop-blur lg:px-8">
            {allowedViews.map((item) => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`rounded-full px-4 py-2 text-sm ${active === item.id ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:text-foreground'}`}>{item.label}</button>)}
          </nav>
          <MissionControlPanel view={active} />
        </main>
      </div>
    </>
  )
}
