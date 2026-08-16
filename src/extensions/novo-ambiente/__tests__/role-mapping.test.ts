import { describe, expect, it } from 'vitest'

import { mapAppRolesToBuilderzRole } from '../auth/role-mapping'

describe('Novo Ambiente role mapping', () => {
  it('uses fixed privilege precedence', () => {
    expect(mapAppRolesToBuilderzRole(['agentes.viewer', 'agentes.admin'])).toBe('admin')
    expect(mapAppRolesToBuilderzRole(['agentes.editor'])).toBe('operator')
    expect(mapAppRolesToBuilderzRole(['agentes.viewer'])).toBe('viewer')
    expect(mapAppRolesToBuilderzRole([])).toBeNull()
  })
})
