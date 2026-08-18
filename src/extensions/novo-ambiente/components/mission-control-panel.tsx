'use client'

import { useCallback, useEffect, useState } from 'react'

import { apiFetch, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import type { AccessProjection, Connection, DashboardAccessDetail, Environment, Incident, InventorySnapshot, Overview, UsageDashboard } from '../contracts'
import { hasLiveEvidence, healthDetail, layerLabel } from '../health-labels'
import { StatusBadge } from './status-badge'

export type NovoAmbienteView = 'fleet' | 'connections' | 'usage' | 'access'

function endpoint(view: NovoAmbienteView, environment: Environment, usageDays: number): string {
  const path = `/api/extensions/novo-ambiente/${view === 'fleet' ? 'overview' : view}?environment=${environment}`
  return view === 'usage' ? `${path}&days=${usageDays}` : path
}

function date(value: string | null): string {
  return value ? new Date(value).toLocaleString('pt-BR') : 'Sem evidência'
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-6">
      <p className="font-medium text-red-300">Não foi possível carregar esta projeção.</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-4" variant="outline" size="sm" onClick={retry}>Tentar novamente</Button>
    </div>
  )
}

export function MissionControlPanel({ view }: { view: NovoAmbienteView }) {
  const [environment, setEnvironment] = useState<Environment>('production')
  const [usageDays, setUsageDays] = useState(30)
  const request = endpoint(view, environment, usageDays)
  const [result, setResult] = useState<{ request: string; data?: unknown; error?: string } | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [inventory, setInventory] = useState<InventorySnapshot[]>([])

  const load = useCallback(async () => {
    setResult({ request })
    try {
      const data = await apiFetch(request)
      setResult((current) => current?.request === request ? { request, data } : current)
    } catch (cause) {
      const error = cause instanceof ApiError ? cause.message : 'Falha de rede'
      setResult((current) => current?.request === request ? { request, error } : current)
    }
  }, [request])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!selectedAgent) return
    apiFetch<InventorySnapshot[]>(`/api/extensions/novo-ambiente/inventory?environment=${environment}&agentKey=${encodeURIComponent(selectedAgent)}`)
      .then(setInventory)
      .catch(() => setInventory([]))
  }, [environment, selectedAgent])

  const ready = result?.request === request && Object.hasOwn(result, 'data')
  const data = ready ? result.data : null
  const error = result?.request === request ? result.error : undefined

  return (
    <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-5 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Novo Ambiente · Mission Control</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{({ fleet: 'Frota', connections: 'Conexões', usage: 'Consumo', access: 'Acessos' } as const)[view]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fonte canônica via adapter; o painel não acessa Docker, homes ou secrets.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm text-muted-foreground">
          Ambiente
          <select className="rounded-md border border-border bg-card px-3 py-2 text-foreground" value={environment} onChange={(event) => setEnvironment(event.target.value as Environment)}>
            <option value="staging">Staging</option>
            <option value="production">Produção</option>
          </select>
        </label>{view === 'usage' && <label className="flex items-center gap-2 text-sm text-muted-foreground">Período<select aria-label="Período" className="rounded-md border border-border bg-card px-3 py-2 text-foreground" value={usageDays} onChange={(event) => setUsageDays(Number(event.target.value))}><option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option></select></label>}</div>
      </header>
      {!ready && !error ? <div className="h-48 animate-pulse rounded-xl border border-border bg-card" /> : error ? <ErrorState message={error} retry={() => void load()} /> : null}
      {ready && view === 'fleet' && <FleetView data={data as Overview} environment={environment} onSelect={setSelectedAgent} />}
      {ready && view === 'connections' && <ConnectionsView data={data as Connection[]} />}
      {ready && view === 'usage' && <UsageView data={data as UsageDashboard} />}
      {ready && view === 'access' && <AccessView data={data as AccessProjection} environment={environment} />}
      {selectedAgent && <AgentDrawer agentKey={selectedAgent} inventory={inventory} close={() => setSelectedAgent(null)} />}
    </section>
  )
}

function FleetView({ data, environment, onSelect }: { data: Overview; environment: Environment; onSelect: (agentKey: string) => void }) {
  const [incidents, setIncidents] = useState(data.activeIncidents)
  const observedAgents = data.agents.filter((agent) => hasLiveEvidence(agent.layers)).length
  async function acknowledge(incident: Incident) {
    const updated = await apiFetch<Incident>(`/api/extensions/novo-ambiente/incidents/${incident.id}/acknowledge?environment=${environment}`, { method: 'POST' })
    setIncidents((current) => current.map((item) => item.id === updated.id ? updated : item))
  }
  async function resolve(incident: Incident) {
    const updated = await apiFetch<Incident>(`/api/extensions/novo-ambiente/incidents/${incident.id}/resolve?environment=${environment}`, {
      method: 'POST',
      body: JSON.stringify({ resolutionCode: 'recovered' }),
    })
    setIncidents((current) => current.filter((item) => item.id !== updated.id))
  }
  return (
    <>
      {data.agents.length > 0 && observedAgents === 0 && <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5"><h2 className="font-medium text-amber-300">Monitoramento ainda não ativado neste ambiente</h2><p className="mt-1 text-sm text-muted-foreground">Os agentes foram cadastrados, mas o Mission Control ainda não recebeu nenhum sinal operacional.</p></div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.agents.map((agent) => (
          <button key={agent.agentKey} onClick={() => onSelect(agent.agentKey)} className="rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-cyan-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{agent.displayName || agent.agentKey}</h2><p className="text-xs text-muted-foreground">{agent.ownerTeam || agent.agentKey} · atualizado {date(agent.computedAt)}</p></div><StatusBadge status={agent.overallStatus} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2">{agent.layers.map((layer) => <div key={layer.layer} className="rounded-lg border border-border/70 bg-background/50 p-2"><p className="text-xs uppercase tracking-wide text-muted-foreground">{layerLabel(layer.layer)}</p><p className="mt-1 text-sm">{healthDetail(layer.status, layer.errorCode)}</p></div>)}</div>
            <p className="mt-4 text-xs text-muted-foreground">{agent.activeIncidentCount} incidente(s) ativo(s)</p>
          </button>
        ))}
      </div>
      {data.agents.length === 0 && <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Nenhum agente habilitado neste ambiente.</p>}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Incidentes ativos</h2></div>
        <div className="divide-y divide-border">{incidents.map((incident) => <div key={incident.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium">{incident.title}</p><p className="text-xs text-muted-foreground">{incident.agentKey || 'Frota'} · {incident.severity} · {date(incident.openedAt)}</p></div>{incident.status === 'open' ? <Button variant="outline" size="sm" onClick={() => void acknowledge(incident)}>Reconhecer</Button> : incident.status === 'acknowledged' ? <Button variant="outline" size="sm" onClick={() => void resolve(incident)}>Resolver</Button> : null}</div>)}{incidents.length === 0 && <p className="p-5 text-sm text-muted-foreground">Nenhum incidente ativo.</p>}</div>
      </div>
    </>
  )
}

function ConnectionsView({ data }: { data: Connection[] }) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[850px] text-sm"><thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-4">Agente</th><th>Conexão</th><th>Tipo</th><th>Autenticação</th><th>Disponibilidade</th><th>Último sucesso</th><th>Expira</th></tr></thead><tbody className="divide-y divide-border">{data.map((item) => <tr key={`${item.agentKey}:${item.connectionId}`}><td className="p-4 font-medium">{item.agentKey}</td><td>{item.provider}</td><td>{item.kind}</td><td>{item.authState}</td><td><StatusBadge status={item.availability} /></td><td>{date(item.lastSuccessAt)}</td><td>{date(item.expiresAt)}</td></tr>)}</tbody></table>{data.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhuma conexão reportada.</p>}</div>
}

function UsageView({ data }: { data: UsageDashboard }) {
  const overview = data.overview
  if (overview.status === 'not_instrumented') return <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-6"><h2 className="font-semibold text-amber-300">Telemetria ainda não instrumentada</h2><p className="mt-1 text-sm text-muted-foreground">{overview.totals.totalEvents} evento(s) esperado(s), cobertura {overview.totals.coveragePercent ?? 0}%. O painel não inventa custo ou tokens ausentes.</p></div>
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tokens" value={overview.totals.totalTokens.toLocaleString('pt-BR')} /><Metric label="Cobertura" value={overview.totals.coveragePercent === null ? 'Desconhecida' : `${overview.totals.coveragePercent}%`} /><Metric label="Eventos reportados" value={`${overview.totals.reportedEvents}/${overview.totals.totalEvents}`} /><Metric label="Custo conhecido" value={overview.totals.costUsd === null ? 'Desconhecido' : `US$ ${overview.totals.costUsd.toFixed(2)}`} /></div><div className="grid gap-4 xl:grid-cols-2"><div className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Por agente</h2>{data.breakdown.items.map((item) => <div key={item.key} className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-sm"><span>{item.key}</span><span>{item.totalTokens.toLocaleString('pt-BR')} tokens</span><span>{item.coveragePercent ?? 0}% cobertura</span></div>)}</div><div className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Série diária</h2>{data.timeseries.items.map((item) => <div key={item.bucket} className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-sm"><span>{new Date(item.bucket).toLocaleDateString('pt-BR')}</span><span>{item.totalTokens.toLocaleString('pt-BR')}</span><span>{item.coveragePercent ?? 0}%</span></div>)}</div></div></>
}

function AccessView({ data, environment }: { data: AccessProjection; environment: Environment }) {
  const [selection, setSelection] = useState<{ dashboardKey: string; detail?: DashboardAccessDetail; error?: string } | null>(null)
  useEffect(() => setSelection(null), [environment])

  async function toggleDashboard(dashboardKey: string) {
    if (selection?.dashboardKey === dashboardKey) {
      setSelection(null)
      return
    }
    setSelection({ dashboardKey })
    try {
      const detail = await apiFetch<DashboardAccessDetail>(`/api/extensions/novo-ambiente/access/${encodeURIComponent(dashboardKey)}?environment=${environment}`)
      setSelection((current) => current?.dashboardKey === dashboardKey ? { dashboardKey, detail } : current)
    } catch (cause) {
      const error = cause instanceof ApiError ? cause.message : 'Falha de rede'
      setSelection((current) => current?.dashboardKey === dashboardKey ? { dashboardKey, error } : current)
    }
  }

  return <div className="grid gap-5 xl:grid-cols-2"><div className="rounded-xl border border-border bg-card"><h2 className="border-b border-border p-4 font-semibold">Dashboards e perfis</h2>{data.dashboards.map((item) => <div key={item.dashboardKey} className="border-b border-border/70 last:border-0"><button type="button" aria-expanded={selection?.dashboardKey === item.dashboardKey} aria-label={`Ver perfis de ${item.displayName}`} onClick={() => void toggleDashboard(item.dashboardKey)} className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400"><div><p className="font-medium">{item.displayName}</p><p className="text-xs text-muted-foreground">{item.dashboardKey}</p></div><span className="text-sm text-muted-foreground">{item.grantCount} acessos</span></button>{selection?.dashboardKey === item.dashboardKey && <div className="border-t border-border/70 bg-background/35 px-4 py-3">{selection.error ? <p className="text-sm text-red-300">{selection.error}</p> : selection.detail ? <div className="flex flex-wrap gap-2">{selection.detail.profiles.map((profile) => <span key={profile} className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground">{profile}</span>)}{selection.detail.profiles.length === 0 && <p className="text-sm text-muted-foreground">Nenhum perfil liberado.</p>}</div> : <p className="text-sm text-muted-foreground">Carregando perfis…</p>}</div>}</div>)}</div><div className="rounded-xl border border-border bg-card"><h2 className="border-b border-border p-4 font-semibold">Allowlist por agente</h2>{data.allowlist.map((item) => <div key={item.agentKey} className="border-b border-border/70 p-4 last:border-0"><div className="flex justify-between"><p className="font-medium">{item.agentKey}</p><span>{item.activeCount} ativos</span></div><p className="mt-1 text-xs text-muted-foreground">{item.byKind.map((kind) => `${kind.kind}: ${kind.count}`).join(' · ')}</p></div>)}{data.allowlist.length === 0 && <p className="p-5 text-sm text-muted-foreground">Nenhuma entrada ativa na fonte atual.</p>}</div></div>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div> }

function AgentDrawer({ agentKey, inventory, close }: { agentKey: string; inventory: InventorySnapshot[]; close: () => void }) {
  const latest = inventory[0]
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/55" onClick={close}><aside className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background p-6" onClick={(event) => event.stopPropagation()}><div className="flex justify-between"><div><p className="text-xs uppercase tracking-wide text-cyan-400">Detalhe do agente</p><h2 className="mt-1 text-xl font-semibold">{agentKey}</h2></div><Button variant="ghost" onClick={close}>Fechar</Button></div><p className="mt-6 text-sm text-muted-foreground">Inventário mais recente: {date(latest?.observedAt || null)}</p><InventoryGroup title="Skills" items={latest?.skills.map((item) => item.key) || []} /><InventoryGroup title="Crons" items={latest?.crons.map((item) => item.key) || []} /><InventoryGroup title="Jobs" items={latest?.jobs.map((item) => item.key) || []} /></aside></div>
}

function InventoryGroup({ title, items }: { title: string; items: string[] }) { return <div className="mt-5 rounded-xl border border-border bg-card p-4"><h3 className="font-medium">{title} <span className="text-muted-foreground">({items.length})</span></h3><div className="mt-3 flex flex-wrap gap-2">{items.slice(0, 100).map((item) => <span key={item} title={item} className="max-w-full truncate rounded border border-border px-2 py-1 text-xs text-muted-foreground">{item}</span>)}{items.length === 0 && <span className="text-sm text-muted-foreground">Sem snapshot.</span>}</div></div> }
