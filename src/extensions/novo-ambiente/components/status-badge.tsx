import type { HealthStatus } from '../contracts'

const styles: Record<HealthStatus, string> = {
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  degraded: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  unavailable: 'border-red-500/30 bg-red-500/10 text-red-300',
  unknown: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  not_applicable: 'border-slate-500/20 bg-transparent text-slate-500',
}

const labels: Record<HealthStatus, string> = {
  healthy: 'Saudável',
  degraded: 'Degradado',
  unavailable: 'Indisponível',
  unknown: 'Sem evidência',
  not_applicable: 'Não aplicável',
}

export function StatusBadge({ status }: { status: HealthStatus }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>
}
