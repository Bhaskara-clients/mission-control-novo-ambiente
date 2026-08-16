import type { User } from '@/lib/auth'

export function mapAppRolesToBuilderzRole(appRoles: string[]): User['role'] | null {
  if (appRoles.includes('agentes.admin')) return 'admin'
  if (appRoles.includes('agentes.editor')) return 'operator'
  if (appRoles.includes('agentes.viewer')) return 'viewer'
  return null
}
