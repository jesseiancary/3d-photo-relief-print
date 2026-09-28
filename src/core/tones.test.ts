import { describe, expect, it } from 'vitest'
import { defaultSettings, FILAMENT_PRESETS } from './defaults'
import { autoLayers, baseLayers, layerTop, planTones, toneLut } from './tones'
import type { Filament } from './types'

const s = defaultSettings()
const fil = (i: number[]): Filament[] => i.map((k, j) => ({ ...FILAMENT_PRESETS[k], id: `t${j}` }))

describe('tone plan', () => {
  it('snaps the base to layer boundaries', () => {
    expect(baseLayers(s.print)).toBe(6)
    expect(layerTop(6, s.print)).toBe(0.56)
  })

  it('sizes bands from TD', () => {
    expect(autoLayers(3, s.print)).toBe(4) // 0.30 mm
    expect(autoLayers(5, s.print)).toBe(7) // 0.50 mm -> 0.56
    const p = planTones(fil([0, 2, 3]), s.print, { mode: 'photo', count: 8 })
    expect(p.bands.map((b) => [b.firstLayer, b.lastLayer])).toEqual([[1, 6], [7, 10], [11, 17]])
  })

  it('picks distinct tones spread dark to light', () => {
    const p = planTones(fil([0, 2, 3]), s.print, { mode: 'photo', count: 8 })
    expect(p.tones).toHaveLength(8)
    expect(new Set(p.tones.map((t) => t.z)).size).toBe(8)
    for (let i = 1; i < p.tones.length; i++) expect(p.tones[i].L).toBeGreaterThan(p.tones[i - 1].L)
    expect(p.tones[0].z).toBe(0.56)
    expect(p.swaps.map((w) => [w.layer, w.z, w.filament])).toEqual([[7, 0.64, 1], [11, 0.96, 2]])
  })

  it('graphic mode gives one fully built tone per filament', () => {
    const p = planTones(fil([0, 1, 3]), s.print, { mode: 'graphic', count: 3 })
    expect(p.tones.map((t) => t.z)).toEqual([0.56, p.bands[1].topZ, p.bands[2].topZ])
  })

  it('clamps the tone count to available heights and warns', () => {
    const f = fil([0, 3]); f[1].layers = 3
    const p = planTones(f, s.print, { mode: 'photo', count: 10 })
    expect(p.tones).toHaveLength(4)
    expect(p.warnings.some((w) => w.includes('Only 4'))).toBe(true)
  })

  it('maps black to the darkest tone and white to the lightest', () => {
    const p = planTones(fil([0, 1, 3]), s.print, { mode: 'photo', count: 6 })
    const lut = toneLut(p)
    expect(lut[0]).toBe(0)
    expect(lut[255]).toBe(p.tones.length - 1)
    for (let v = 1; v < 256; v++) expect(lut[v]).toBeGreaterThanOrEqual(lut[v - 1])
  })

  it('warns when a filament is darker than the one below', () => {
    const p = planTones(fil([3, 0]), s.print, { mode: 'photo', count: 4 })
    expect(p.warnings.some((w) => w.includes('darker'))).toBe(true)
  })
})
