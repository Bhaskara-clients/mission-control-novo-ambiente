export type Environment = 'staging' | 'production'
export type HealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown' | 'not_applicable'

export interface HealthLayer {
  layer: 'runtime' | 'provider' | 'channel' | 'end_to_end'
  status: HealthStatus
  observedAt: string | null
  errorCode: string | null
}

export interface AgentSnapshot {
  schemaVersion: 1
  agentKey: string
  environment: Environment
  overallStatus: Exclude<HealthStatus, 'not_applicable'>
  layers: HealthLayer[]
  activeIncidentCount: number
  computedAt: string
}

export interface Incident {
  schemaVersion: 1
  id: string
  environment: Environment
  agentKey: string | null
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'acknowledged' | 'resolved'
  openedAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  evidenceIds: string[]
}

export interface Overview {
  schemaVersion: 1
  environment: Environment
  agents: AgentSnapshot[]
  activeIncidents: Incident[]
  generatedAt: string
}

export interface Connection {
  schemaVersion: 1
  connectionId: string
  agentKey: string
  environment: Environment
  kind: 'provider' | 'channel'
  provider: string
  configured: boolean
  authState: 'valid' | 'expired' | 'missing' | 'unknown'
  availability: Exclude<HealthStatus, 'not_applicable'>
  lastSuccessAt: string | null
  lastFailureAt: string | null
  expiresAt: string | null
  errorCode: string | null
  observedAt: string
}

export interface InventorySnapshot {
  schemaVersion: 1
  snapshotId: string
  agentKey: string
  environment: Environment
  observedAt: string
  skills: Array<{ key: string; versionHash: string; enabled: boolean }>
  crons: Array<{ key: string; scheduleHash: string; enabled: boolean; lastStatus: string; lastRunAt: string | null }>
  jobs: Array<{ key: string; enabled: boolean; lastStatus: string; lastRunAt: string | null }>
}

export interface UsageProjection {
  schemaVersion: 1
  environment: Environment
  status: 'available' | 'not_instrumented'
  totals: { inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number | null; coveragePercent: number | null }
  breakdown: Array<{ agentKey: string; provider: string; model: string; totalTokens: number; costUsd: number | null }>
  generatedAt: string
}

export interface AccessProjection {
  schemaVersion: 1
  dashboards: Array<{ dashboardKey: string; displayName: string; enabled: boolean; grantCount: number }>
  allowlist: Array<{ agentKey: string; activeCount: number; byKind: Array<{ kind: string; count: number }> }>
  generatedAt: string
}
