import { filFromPresets as fil } from '@/test/helpers'
import { describe, expect, it } from 'vitest'
import { defaultSettings } from './defaults'
import {
  autoLayers,
  baseLayers,
  hexToRgb,
  layerTop,
  linToSrgb,
  lstarGray,
  lstarLin,
  planTones,
  stackColorLin,
  toneLut,
} from './tones'

const s = defaultSettings()

describe('tone plan', () => {
  it('snaps the base to layer boundaries', () => {
    expect(baseLayers(s.print)).toBe(6)
    expect(layerTop(6, s.print)).toBe(0.56)
  })

  it('sizes bands from TD', () => {
    expect(autoLayers(3, s.print)).toBe(4) // 0.30 mm
    expect(autoLayers(5, s.print)).toBe(7) // 0.50 mm -> 0.56
    const p = planTones(fil([0, 2, 3]), s.print, { mode: 'photo', count: 8 })
    expect(p.bands.map((b) => [b.firstLayer, b.lastLayer])).toEqual([
      [1, 6],
      [7, 10],
      [11, 17],
    ])
  })

  it('picks distinct tones spread dark to light', () => {
    const p = planTones(fil([0, 2, 3]), s.print, { mode: 'photo', count: 8 })
    expect(p.tones).toHaveLength(8)
    expect(new Set(p.tones.map((t) => t.z)).size).toBe(8)
    for (let i = 1; i < p.tones.length; i++) expect(p.tones[i].L).toBeGreaterThan(p.tones[i - 1].L)
    expect(p.tones[0].z).toBe(0.56)
    expect(p.swaps.map((w) => [w.layer, w.z, w.filament])).toEqual([
      [7, 0.64, 1],
      [11, 0.96, 2],
    ])
  })

  it('graphic mode gives one fully built tone per filament', () => {
    const p = planTones(fil([0, 1, 3]), s.print, { mode: 'graphic', count: 3 })
    expect(p.tones.map((t) => t.z)).toEqual([0.56, p.bands[1].topZ, p.bands[2].topZ])
  })

  it('clamps the tone count to available heights and warns', () => {
    const f = fil([0, 3])
    f[1].layers = 3
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

  it('warns when two chosen tones look almost the same', () => {
    // two identical white filaments → both bands resolve to ~L*100
    const p = planTones(fil([3, 3]), s.print, { mode: 'graphic', count: 2 })
    expect(p.warnings.some((w) => w.includes('look almost the same'))).toBe(true)
  })
})

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

describe('color science', () => {
  it('hexToRgb expands 3-char shorthand like the full form', () => {
    expect(hexToRgb('#abc')).toEqual(hexToRgb('#aabbcc'))
    expect(hexToRgb('#fff')).toEqual([1, 1, 1])
    expect(hexToRgb('#000')).toEqual([0, 0, 0])
  })

  it('lstarLin hits both branches of the L* piecewise', () => {
    expect(lstarLin([1, 1, 1])).toBeCloseTo(100, 6)
    expect(lstarLin([0, 0, 0])).toBe(0)
    // very dark Y uses the linear branch: L = (24389/27)·Y
    expect(lstarLin([0.001, 0.001, 0.001])).toBeCloseTo((24389 / 27) * 0.001, 6)
  })

  it('linToSrgb hits the low linear knee and round-trips the ends', () => {
    expect(linToSrgb([0, 0, 0])).toEqual([0, 0, 0])
    linToSrgb([1, 1, 1]).forEach((c) => expect(c).toBeCloseTo(1, 6))
    // a tiny linear value uses the ×12.92 branch, not the power curve
    expect(linToSrgb([0.002, 0.002, 0.002])[0]).toBeCloseTo(0.002 * 12.92, 6)
  })

  it('lstarGray is monotonic from 0 to ~100', () => {
    expect(lstarGray(0)).toBe(0)
    expect(lstarGray(255)).toBeCloseTo(100, 6)
    for (let v = 1; v < 256; v++) expect(lstarGray(v)).toBeGreaterThanOrEqual(lstarGray(v - 1))
  })

  it('autoLayers clamps to the 1..25 range and floors tiny TD', () => {
    expect(autoLayers(0, s.print)).toBe(1) // floor at 1 layer
    expect(autoLayers(0.01, s.print)).toBe(autoLayers(0, s.print)) // td floored to 0.05
    expect(autoLayers(100, s.print)).toBe(25) // ceiling at 25
  })

  it('stackColorLin returns the base at z=0 and moves toward the top filament', () => {
    const fils = fil([0, 3]) // black base, jade white band
    const bands = planTones(fils, s.print, { mode: 'photo', count: 8 }).bands
    const base = hexToRgb(fils[0].color).map(toLin)
    expect(stackColorLin(0, bands, fils)).toEqual(base)
    const top = stackColorLin(bands[1].topZ, bands, fils)
    // white band brightens the black base
    expect(top[0]).toBeGreaterThan(base[0])
  })
})
