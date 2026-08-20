import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { visibleNavigation, visibleSystems } from '../catalog-navigation'

describe('Novo Ambiente catalog navigation', () => {
  it('keeps authorized absolute dashboard links and excludes the replaced legacy panel', () => {
    expect(visibleSystems({
      schemaVersion: 1,
      dashboards: [
        { key: 'painel', label: 'Painel de Agentes', url: 'https://staging.example.com/painel' },
        { key: 'wms', label: 'WMS', url: 'https://staging.example.com/wms' },
        { key: 'produtos', label: 'Produtos', url: 'https://staging.example.com/dash_produtos' },
      ],
    })).toEqual([
      { key: 'wms', label: 'WMS', url: 'https://staging.example.com/wms' },
      { key: 'produtos', label: 'Produtos', url: 'https://staging.example.com/dash_produtos' },
    ])
  })

  it('rejects relative and non-HTTPS links at the browser boundary', () => {
    expect(visibleSystems({
      schemaVersion: 1,
      dashboards: [
        { key: 'relative', label: 'Relative', url: '/wms' },
        { key: 'script', label: 'Script', url: 'javascript:alert(1)' },
      ],
    })).toEqual([])
  })

  it('renders only curated authorized navigation groups', () => {
    expect(visibleNavigation({
      schemaVersion: 1,
      sections: [{
        key: 'operacao', label: 'Operação', destinations: [{
          key: 'wms', label: 'WMS', description: 'Estoque e pedidos', url: 'https://staging.example/wms',
          links: [
            { key: 'wms', label: 'Consulta', url: 'https://staging.example/wms' },
            { key: 'unsafe', label: 'Unsafe', url: 'javascript:alert(1)' },
          ],
        }],
      }],
    })).toEqual([{ key: 'operacao', label: 'Operação', destinations: [{
      key: 'wms', label: 'WMS', description: 'Estoque e pedidos', url: 'https://staging.example/wms',
      links: [{ key: 'wms', label: 'Consulta', url: 'https://staging.example/wms' }],
    }] }])
  })

  it('delegates global navigation to the canonical portal shell', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/extensions/novo-ambiente/components/novo-ambiente-root.tsx'),
      'utf8',
    )
    expect(source).toContain('src="/painel/static/portal-shell.js"')
    expect(source).not.toContain('aria-label="Navegação principal"')
    expect(source).not.toContain('Sistemas')
    expect(source).not.toContain('Assistente')
  })
})
