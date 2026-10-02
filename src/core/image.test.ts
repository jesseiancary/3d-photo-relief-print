import { bruteMedian, randGray } from '@/test/helpers'
import { describe, expect, it } from 'vitest'
import { adjust, gridFor, histogram, median, quantize, rgbaToGray, type Gray } from './image'

describe('image ops', () => {
  it('median matches brute force', () => {
    for (const r of [1, 2, 4]) {
      const g = randGray(23, 17, r)
      expect(Array.from(median(g, r).data)).toEqual(Array.from(bruteMedian(g, r)))
    }
  })

  it('levels stretch black/white points', () => {
    const g: Gray = { w: 3, h: 1, data: new Uint8Array([20, 128, 230]) }
    const out = adjust(g, { blurMm: 0, blackPoint: 20, whitePoint: 230, gamma: 1, sharpen: 0 }, 0.1)
    expect(out.data[0]).toBe(0)
    expect(out.data[2]).toBe(255)
    expect(out.data[1]).toBeGreaterThan(120)
  })

  it('sizes the grid from print height and pitch', () => {
    const s = gridFor(2000, 3000, 203.2, 0.1)
    expect(s.rows).toBe(2032)
    expect(s.cols).toBe(1355)
    expect(s.widthMm).toBeCloseTo(135.5, 1)
  })

  it('floors tiny grids at 8 cells and honours a finite maxRows', () => {
    const tiny = gridFor(1, 1000, 0.1, 0.1) // 1 row by raw math → floored to 8
    expect(tiny.rows).toBe(8)
    expect(tiny.cols).toBe(8)
    const capped = gridFor(2000, 3000, 203.2, 0.1, 100)
    expect(capped.rows).toBe(100)
  })

  it('median with r < 1 returns a copy, not the same buffer', () => {
    const g = randGray(5, 5, 9)
    const out = median(g, 0)
    expect(Array.from(out.data)).toEqual(Array.from(g.data))
    expect(out.data).not.toBe(g.data)
  })

  it('applies the sharpen (unsharp) path and stays in range', () => {
    const g = randGray(40, 40, 3)
    const a = { blurMm: 0, blackPoint: 0, whitePoint: 255, gamma: 1, sharpen: 1 }
    const sharp = adjust(g, a, 0.1)
    const flat = adjust(g, { ...a, sharpen: 0 }, 0.1)
    expect(sharp.data).toHaveLength(g.data.length)
    expect(Array.from(sharp.data).every((v) => v >= 0 && v <= 255)).toBe(true)
    // sharpening must actually change a non-flat image
    expect(Array.from(sharp.data)).not.toEqual(Array.from(flat.data))
  })

  it('clamps inverted/equal black & white points and a zero gamma without NaN', () => {
    const g: Gray = { w: 3, h: 1, data: new Uint8Array([20, 128, 230]) }
    const inverted = adjust(
      g,
      { blurMm: 0, blackPoint: 200, whitePoint: 50, gamma: 0, sharpen: 0 },
      0.1,
    )
    expect(Array.from(inverted.data).every((v) => Number.isFinite(v) && v >= 0 && v <= 255)).toBe(
      true,
    )
  })

  it('histogram counts every grey value into 256 bins', () => {
    const g: Gray = { w: 5, h: 1, data: new Uint8Array([0, 0, 0, 7, 255]) }
    const h = histogram(g)
    expect(h).toHaveLength(256)
    expect(h[0]).toBe(3)
    expect(h[7]).toBe(1)
    expect(h[255]).toBe(1)
    expect(h.reduce((a, b) => a + b, 0)).toBe(g.data.length)
  })

  it('quantize maps each grey through the LUT', () => {
    const lut = new Uint8Array(256)
    for (let v = 0; v < 256; v++) lut[v] = v >> 5 // 0..7 bands
    const out = quantize({ w: 4, h: 1, data: new Uint8Array([0, 31, 32, 255]) }, lut)
    expect(Array.from(out)).toEqual([0, 0, 1, 7])
  })

  it('rgbaToGray composites alpha over white (transparent → white)', () => {
    // opaque black, opaque white, 50% black over white, fully transparent
    const rgba = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 128, 7, 9, 11, 0,
    ])
    const g = rgbaToGray(rgba, 4, 1)
    expect(g.data[0]).toBe(0)
    expect(g.data[1]).toBe(255)
    expect(g.data[2]).toBe(Math.round(255 * (1 - 128 / 255))) // ~128
    expect(g.data[3]).toBe(255) // transparent reads as white regardless of rgb
  })
})
