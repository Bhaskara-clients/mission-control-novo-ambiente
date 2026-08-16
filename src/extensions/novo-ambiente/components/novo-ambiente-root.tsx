'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { MissionControlPanel, type NovoAmbienteView } from './mission-control-panel'
import { apiFetch } from '@/lib/api-client'
import type { CurrentUser } from '@/store'

const views: Array<{ id: NovoAmbienteView; label: string; description: string }> = [
  { id: 'fleet', label: 'Frota', description: 'Saúde e incidentes' },
  { id: 'connections', label: 'Conexões', description: 'Provedores e canais' },
  { id: 'usage', label: 'Consumo', description: 'Tokens e custo' },
  { id: 'access', label: 'Acessos', description: 'Perfis e allowlist' },
]

export function NovoAmbienteRoot() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  useEffect(() => { apiFetch<{ user: CurrentUser }>('/api/auth/me').then((value) => setUser(value.user)).catch(() => setUser(null)) }, [])
  const allowedViews = user?.role === 'admin' ? views : views.filter((item) => item.id !== 'access')
  const requested = pathname === '/' ? 'fleet' : pathname.slice(1)
  const active = allowedViews.some((item) => item.id === requested) ? requested as NovoAmbienteView : 'fleet'
  return <div className="flex h-screen overflow-hidden bg-background"><nav aria-label="Mission Control" className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex"><div className="border-b border-border p-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Novo Ambiente</p><p className="mt-1 font-semibold">Mission Control</p><p className="mt-1 text-xs text-muted-foreground">Frota Hermes</p></div><div className="flex flex-col gap-1 p-3">{allowedViews.map((item) => <button key={item.id} onClick={() => router.push(item.id === 'fleet' ? '/' : `/${item.id}`)} className={`rounded-lg px-3 py-3 text-left ${active === item.id ? 'bg-cyan-500/10 text-cyan-300' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}><span className="block text-sm font-medium">{item.label}</span><span className="block text-xs opacity-70">{item.description}</span></button>)}</div><div className="mt-auto border-t border-border p-4 text-xs text-muted-foreground">Painel legado em fallback temporário durante o shadow.</div></nav><main className="min-w-0 flex-1 overflow-y-auto"><div className="flex gap-2 overflow-x-auto border-b border-border p-3 md:hidden">{allowedViews.map((item) => <button key={item.id} onClick={() => router.push(item.id === 'fleet' ? '/' : `/${item.id}`)} className={`rounded-md px-3 py-2 text-sm ${active === item.id ? 'bg-cyan-500/10 text-cyan-300' : 'text-muted-foreground'}`}>{item.label}</button>)}</div><MissionControlPanel view={active} /></main></div>
}
