import { describe, expect, it } from 'vitest'
import { adjust, gridFor, median, type Gray } from './image'

function rand(w: number, h: number, seed = 1): Gray {
  let s = seed
  const data = new Uint8Array(w * h).map(() => ((s = (s * 1103515245 + 12345) & 0x7fffffff) >> 8) & 255)
  return { w, h, data }
}
function bruteMedian(g: Gray, r: number): Uint8Array {
  const out = new Uint8Array(g.w * g.h)
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const v: number[] = []
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const yy = Math.min(g.h - 1, Math.max(0, y + dy)), xx = Math.min(g.w - 1, Math.max(0, x + dx))
          v.push(g.data[yy * g.w + xx])
        }
      v.sort((a, b) => a - b)
      out[y * g.w + x] = v[v.length >> 1]
    }
  return out
}

describe('image ops', () => {
  it('median matches brute force', () => {
    for (const r of [1, 2, 4]) {
      const g = rand(23, 17, r)
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
})
