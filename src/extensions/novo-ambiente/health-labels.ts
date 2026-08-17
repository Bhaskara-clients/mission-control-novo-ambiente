import type { HealthLayer, HealthStatus } from './contracts'

const layerLabels: Record<HealthLayer['layer'], string> = {
  runtime: 'Runtime',
  provider: 'Modelo',
  channel: 'Canal',
  end_to_end: 'Jornada completa',
}

const errorLabels: Record<string, string> = {
  token_expired: 'Token expirado',
  unauthorized: 'Autenticação recusada',
  rate_limited: 'Limite de uso atingido',
  dns_failure: 'Falha de DNS',
  timeout: 'Tempo limite excedido',
  provider_unavailable: 'Modelo indisponível',
  webhook_stale: 'Canal sem eventos recentes',
  no_recent_evidence: 'Aguardando sinal',
  collector_unavailable: 'Coletor indisponível',
  runtime_stopped: 'Runtime parado',
  contract_invalid: 'Sinal inválido',
}

export function layerLabel(layer: HealthLayer['layer']): string {
  return layerLabels[layer]
}

export function healthDetail(status: HealthStatus, errorCode: string | null): string {
  if (status === 'healthy') return 'Saudável'
  if (status === 'not_applicable') return 'Não aplicável'
  return errorCode ? errorLabels[errorCode] || 'Falha não classificada' : 'Sem evidência'
}

export function hasLiveEvidence(layers: HealthLayer[]): boolean {
  return layers.some((layer) => layer.observedAt !== null)
}
