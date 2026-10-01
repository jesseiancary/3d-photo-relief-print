import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { defaultSettings } from './defaults'
import { gridFor } from './image'
import { checkManifold } from './mesh'
import { buildMesh, process, stepWedge } from './pipeline'
import { DEFAULT_TEMPLATE } from './template'
import { write3mf } from './threemf'

describe('end to end', () => {
  it('gradient image → watertight mesh → 3MF with swaps', () => {
    const s = defaultSettings()
    s.print.heightIn = 1
    const g = gridFor(300, 200, s.print.heightIn * 25.4, 0.2)
    const data = new Uint8Array(g.cols * g.rows)
    for (let y = 0; y < g.rows; y++)
      for (let x = 0; x < g.cols; x++)
        data[y * g.cols + x] = Math.round(
          ((255 * x) / (g.cols - 1)) * (0.5 + 0.5 * Math.sin(y / 5)),
        )
    const p = process({ w: g.cols, h: g.rows, data }, s, g.mmPerPx)
    expect(p.counts.filter((c) => c > 0).length).toBeGreaterThan(4)
    const { mesh } = buildMesh(p.tones, g.cols, g.rows, p.plan, g.mmPerPx)
    const c = checkManifold(mesh)
    expect(c.bad).toBe(0)
    expect(c.volume).toBeGreaterThan(0)

    // Bambu project export (reuses the slicer template)
    const z = write3mf({
      mesh,
      title: 'Test & <co>',
      plan: p.plan,
      filaments: s.filaments,
      print: s.print,
      template: DEFAULT_TEMPLATE,
      sizeMm: [g.widthMm, g.heightMm],
    })
    const files = unzipSync(z)
    expect(Object.keys(files).sort()).toEqual([
      '3D/3dmodel.model',
      '3D/Objects/object_1.model',
      '3D/_rels/3dmodel.model.rels',
      'Metadata/custom_gcode_per_layer.xml',
      'Metadata/model_settings.config',
      'Metadata/project_settings.config',
      'Metadata/slice_info.config',
      '[Content_Types].xml',
      '_rels/.rels',
      'swap-instructions.txt',
    ])
    // the model's Application tag must name the slicer, or Bambu drops all config
    const model = strFromU8(files['3D/3dmodel.model'])
    expect(model).toContain('Test &amp; &lt;co&gt;')
    expect(model).toContain(`name="Application">${DEFAULT_TEMPLATE.application}<`)
    // Content_Types must NOT declare the JSON project_settings.config as xml
    expect(strFromU8(files['[Content_Types].xml'])).not.toContain('project_settings.config')
    const object = strFromU8(files['3D/Objects/object_1.model'])
    expect((object.match(/<triangle /g) ?? []).length).toBe(mesh.triangles.length / 3)
    // project config is the template recolored to our stack, with our layer height
    const cfg = JSON.parse(strFromU8(files['Metadata/project_settings.config']))
    expect(cfg.filament_colour.slice(0, s.filaments.length)).toEqual(
      s.filaments.map((f) => f.color.toUpperCase()),
    )
    expect(cfg.layer_height).toBe(String(s.print.layerMm))
    expect(cfg.initial_layer_print_height).toBe(String(s.print.firstLayerMm))
    // the layer heights must be registered as overrides or Bambu reverts them to the preset
    const overrides = (cfg.different_settings_to_system[0] as string).split(';')
    expect(overrides).toContain('layer_height')
    expect(overrides).toContain('initial_layer_print_height')
    expect(strFromU8(files['Metadata/custom_gcode_per_layer.xml'])).toContain('top_z="0.6400"')
    expect(strFromU8(files['swap-instructions.txt'])).toContain('swap to Elegoo Silk Silver')

    // plain geometry export (no template) for other slicers
    const plain = unzipSync(
      write3mf({
        mesh,
        title: 'Plain',
        plan: p.plan,
        filaments: s.filaments,
        print: s.print,
        template: null,
        sizeMm: [g.widthMm, g.heightMm],
      }),
    )
    expect(Object.keys(plain).sort()).toEqual([
      '3D/3dmodel.model',
      '[Content_Types].xml',
      '_rels/.rels',
      'swap-instructions.txt',
    ])
    expect((strFromU8(plain['3D/3dmodel.model']).match(/<triangle /g) ?? []).length).toBe(
      mesh.triangles.length / 3,
    )
  })

  it('step wedge is watertight and covers every band layer', () => {
    const s = defaultSettings()
    const w = stepWedge(s)
    expect(checkManifold(w.mesh).bad).toBe(0)
    expect(w.plan.tones.length).toBe(w.plan.candidates.length)
  })
})
