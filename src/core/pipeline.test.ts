import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { defaultSettings } from './defaults'
import { applyCornerAlpha, gridFor } from './image'
import { checkManifold } from './mesh'
import { buildMesh, grayRGBA, heightsFor, process, simulatedRGBA, stepWedge } from './pipeline'
import { DEFAULT_TEMPLATE } from './template'
import { write3mf } from './threemf'
import { planTones, type TonePlan } from './tones'

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

    // the writer reports monotonic progress through 1 when given a callback
    const fracs: number[] = []
    write3mf(
      {
        mesh,
        title: 'Progress',
        plan: p.plan,
        filaments: s.filaments,
        print: s.print,
        template: DEFAULT_TEMPLATE,
        sizeMm: [g.widthMm, g.heightMm],
      },
      (f) => fracs.push(f),
    )
    expect(fracs.length).toBeGreaterThan(0)
    expect(fracs[fracs.length - 1]).toBeCloseTo(1, 5)
    for (let i = 1; i < fracs.length; i++) expect(fracs[i]).toBeGreaterThanOrEqual(fracs[i - 1])
  })

  it('step wedge is watertight and covers every band layer', () => {
    const s = defaultSettings()
    const w = stepWedge(s)
    expect(checkManifold(w.mesh).bad).toBe(0)
    expect(w.plan.tones.length).toBe(w.plan.candidates.length)
  })
})

describe('pipeline rasterizers & helpers', () => {
  const s = defaultSettings()
  const plan = planTones(s.filaments, s.print, s.tones)

  it('simulatedRGBA paints each pixel from the tone palette, opaque', () => {
    const tones = new Uint8Array([0, 1, 2, plan.tones.length - 1])
    const rgba = simulatedRGBA(tones, plan)
    expect(rgba).toHaveLength(tones.length * 4)
    for (let j = 3; j < rgba.length; j += 4) expect(rgba[j]).toBe(255) // alpha
    const last = plan.tones[plan.tones.length - 1].rgb.map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255),
    )
    expect([rgba[12], rgba[13], rgba[14]]).toEqual(last)
  })

  it('applyCornerAlpha zeroes dropped pixels and no-ops on a null mask', () => {
    const rgba = new Uint8ClampedArray([1, 1, 1, 255, 2, 2, 2, 255])
    applyCornerAlpha(rgba, null) // no rounding → unchanged
    expect([rgba[3], rgba[7]]).toEqual([255, 255])
    applyCornerAlpha(rgba, new Uint8Array([1, 0])) // drop pixel 1
    expect(rgba[3]).toBe(255)
    expect(rgba[7]).toBe(0)
  })

  it('grayRGBA expands grey to opaque RGBA', () => {
    const rgba = grayRGBA({ w: 2, h: 1, data: new Uint8Array([0, 255]) })
    expect(Array.from(rgba)).toEqual([0, 0, 0, 255, 255, 255, 255, 255])
  })

  it('heightsFor de-dups equal z values into shared height indices', () => {
    const fake = { tones: [{ z: 0.56 }, { z: 0.64 }, { z: 0.64 }] } as unknown as TonePlan
    const { H, zs } = heightsFor(new Uint8Array([0, 1, 2]), fake)
    expect(zs).toEqual([0, 0.56, 0.64])
    expect(Array.from(H)).toEqual([1, 2, 2])
  })

  it('buildMesh with cornerPct > 0 rounds the corners and stays watertight', () => {
    const cols = 24,
      rows = 24
    // a uniform mid-tone fills the plate; corner rounding zeroes cells near the corners
    const mid = Math.min(2, plan.tones.length - 1)
    const tones = new Uint8Array(cols * rows).fill(mid)
    const { mesh, pinches } = buildMesh(tones, cols, rows, plan, 0.1, 15)
    expect(pinches).toBeGreaterThanOrEqual(0)
    expect(checkManifold(mesh).ok).toBe(true)
  })
})
