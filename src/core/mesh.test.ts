import { describe, expect, it } from 'vitest'
import { checkManifold, cornerMask, fixPinches, terraceMesh } from './mesh'

function randGrid(cols: number, rows: number, levels: number, seed: number) {
  let s = seed
  const H = new Uint8Array(cols * rows).map(
    () => 1 + (((s = (s * 1103515245 + 12345) & 0x7fffffff) >> 8) % levels),
  )
  return H
}
const zsFor = (n: number) => [0, ...Array.from({ length: n }, (_, i) => 0.56 + 0.08 * i)]

function expectedVolume(H: Uint8Array, zs: number[], pitch: number) {
  let v = 0
  for (const h of H) v += zs[h] * pitch * pitch
  return v
}

describe('terrace mesh', () => {
  it('flat plate is a closed box', () => {
    const H = new Uint8Array(12).fill(1)
    const m = terraceMesh(H, 4, 3, [0, 1], 1)
    const c = checkManifold(m)
    expect(c.ok).toBe(true)
    expect(c.volume).toBeCloseTo(12, 5)
  })

  it('pinch fix removes diagonal-only contacts', () => {
    const H = new Uint8Array([2, 1, 1, 2])
    expect(fixPinches(H, 2, 2)).toBeGreaterThan(0)
    expect(checkManifold(terraceMesh(H, 2, 2, zsFor(2), 1)).ok).toBe(true)
  })

  for (const [cols, rows, levels, seed] of [
    [7, 5, 2, 1],
    [16, 11, 4, 2],
    [40, 33, 10, 3],
    [3, 60, 6, 4],
  ] as const) {
    it(`random ${cols}x${rows} with ${levels} levels is watertight with the right volume`, () => {
      const H = randGrid(cols, rows, levels, seed)
      fixPinches(H, cols, rows)
      const zs = zsFor(levels)
      const m = terraceMesh(H, cols, rows, zs, 0.1)
      const c = checkManifold(m)
      expect(c.bad).toBe(0)
      expect(c.volume).toBeCloseTo(expectedVolume(H, zs, 0.1), 4)
    })
  }

  it('radius 0 keeps the full rectangle (no mask)', () => {
    expect(cornerMask(10, 10, 0)).toBeNull()
  })

  for (const [cols, rows, levels, seed, pct] of [
    [40, 33, 10, 3, 10],
    [30, 30, 4, 5, 20],
    [12, 48, 6, 7, 15],
  ] as const) {
    it(`rounded ${cols}x${rows} (${pct}% radius) is watertight with the right volume`, () => {
      const H = randGrid(cols, rows, levels, seed)
      const keep = cornerMask(cols, rows, (pct / 100) * Math.max(cols, rows))!
      expect(keep).not.toBeNull()
      expect(keep.some((k) => k === 0)).toBe(true) // corners were actually dropped
      for (let i = 0; i < H.length; i++) if (!keep[i]) H[i] = 0
      fixPinches(H, cols, rows)
      const zs = zsFor(levels)
      const m = terraceMesh(H, cols, rows, zs, 0.1)
      const c = checkManifold(m)
      expect(c.bad).toBe(0)
      expect(c.ok).toBe(true)
      expect(c.volume).toBeCloseTo(expectedVolume(H, zs, 0.1), 4)
    })
  }
})
