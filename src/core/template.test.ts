import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { filFromPresets } from '@/test/helpers'

import { defaultSettings } from './defaults'
import {
  DEFAULT_TEMPLATE,
  parseTemplate,
  projectConfigFor,
  summarize,
  type SlicerTemplate,
} from './template'

// Build a minimal .3mf project zip for parseTemplate. Pass nulls to omit a part.
function makeProject(opts: {
  application?: string | null // the model's Application metadata tag
  config?: string | null // raw project_settings.config bytes (string)
}): Uint8Array {
  const files: Record<string, Uint8Array> = {}
  if (opts.config !== null) files['Metadata/project_settings.config'] = strToU8(opts.config ?? '{}')
  if (opts.application !== null)
    files['3D/3dmodel.model'] = strToU8(
      `<?xml version="1.0"?><model><metadata name="Application">${opts.application ?? 'BambuStudio-02.08.02.61'}</metadata></model>`,
    )
  return zipSync(files)
}

describe('parseTemplate', () => {
  it('rejects a file that is not a valid zip', () => {
    expect(() => parseTemplate(new Uint8Array([1, 2, 3, 4]))).toThrow(/valid 3MF/)
  })

  it('rejects a 3MF with no project settings', () => {
    const bytes = makeProject({ config: null })
    expect(() => parseTemplate(bytes)).toThrow(/No project settings/)
  })

  it('rejects an Application tag without a version', () => {
    expect(() => parseTemplate(makeProject({ application: 'BambuStudio' }))).toThrow(
      /must name a version/,
    )
  })

  it('rejects a 3MF missing the model part entirely (empty application)', () => {
    expect(() => parseTemplate(makeProject({ application: null }))).toThrow(/must name a version/)
  })

  it('rejects a model present but without an Application tag', () => {
    const bytes = zipSync({
      'Metadata/project_settings.config': strToU8('{}'),
      '3D/3dmodel.model': strToU8('<?xml version="1.0"?><model></model>'),
    })
    expect(() => parseTemplate(bytes)).toThrow(/must name a version/)
  })

  it('rejects project settings that are not valid JSON', () => {
    expect(() => parseTemplate(makeProject({ config: 'not json {' }))).toThrow(/not valid JSON/)
  })

  it('round-trips a valid project', () => {
    const bytes = makeProject({
      application: 'OrcaSlicer-02.01.00.59',
      config: JSON.stringify({ printer_settings_id: 'X1C', filament_colour: ['#000000'] }),
    })
    const t = parseTemplate(bytes)
    expect(t.application).toBe('OrcaSlicer-02.01.00.59')
    expect(t.config.printer_settings_id).toBe('X1C')
    expect(t.config.filament_colour).toEqual(['#000000'])
  })
})

describe('summarize', () => {
  it('reads printer, version and slot count from a real template', () => {
    const s = summarize(DEFAULT_TEMPLATE)
    expect(s.application).toBe(DEFAULT_TEMPLATE.application)
    // filament_colour is spelled British in the slicer config — load-bearing (see CLAUDE.md).
    const slots = (DEFAULT_TEMPLATE.config.filament_colour as string[]).length
    expect(s.filamentSlots).toBe(slots)
    expect(s.filamentSlots).toBeGreaterThan(0)
  })

  it('falls back when the config lacks the expected keys', () => {
    const s = summarize({ application: 'X-1', config: {} })
    expect(s).toEqual({
      application: 'X-1',
      printer: 'Unknown printer',
      version: '?',
      filamentSlots: 0, // filament_colour absent → not an array → 0
    })
  })
})

describe('projectConfigFor', () => {
  const p = defaultSettings().print

  it('recolors the first N slots and forces layer heights, registering the overrides', () => {
    const filaments = filFromPresets([0, 1, 3])
    const { text, warning } = projectConfigFor(DEFAULT_TEMPLATE, filaments, p)
    const c = JSON.parse(text)
    expect(warning).toBeUndefined()
    expect((c.filament_colour as string[])[0]).toBe(filaments[0].color.toUpperCase())
    expect(c.layer_height).toBe(String(p.layerMm))
    expect(c.initial_layer_print_height).toBe(String(p.firstLayerMm))
    const diff0: string = c.different_settings_to_system[0]
    expect(diff0.split(';')).toContain('layer_height')
    expect(diff0.split(';')).toContain('initial_layer_print_height')
  })

  it('warns when the stack has more filaments than the template has slots', () => {
    const template: SlicerTemplate = {
      application: 'BambuStudio-02.08.02.61',
      config: { filament_colour: ['#000000'] }, // one slot
    }
    const { warning } = projectConfigFor(template, filFromPresets([0, 1, 3]), p)
    expect(warning).toMatch(/3 filaments but the template has 1 slots/)
  })

  it('tolerates a config with no filament_colour or overrides array', () => {
    const template: SlicerTemplate = { application: 'BambuStudio-02.08.02.61', config: {} }
    const { text, warning } = projectConfigFor(template, filFromPresets([0, 1]), p)
    const c = JSON.parse(text)
    expect(c.filament_colour).toEqual([]) // no slots to recolor
    expect(c.different_settings_to_system[0].split(';')).toEqual(
      expect.arrayContaining(['layer_height', 'initial_layer_print_height']),
    )
    expect(warning).toMatch(/2 filaments but the template has 0 slots/)
  })
})
