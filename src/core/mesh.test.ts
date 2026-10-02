import { describe, expect, it } from 'vitest'

import { expectedVolume, randGrid, zsFor } from '@/test/helpers'

import { checkManifold, cornerMask, fixPinches, terraceMesh } from './mesh'

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

  it('throws when given more than 15 heights', () => {
    expect(() =>
      terraceMesh(
        new Uint8Array(1),
        1,
        1,
        Array.from({ length: 17 }, () => 0),
        1,
      ),
    ).toThrow(/at most 15 heights/)
  })
})

describe('checkManifold', () => {
  it('flags a non-watertight mesh (a lone triangle)', () => {
    // one triangle: directed edges have no matching reverse → every edge is "bad"
    const m = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      triangles: new Uint32Array([0, 1, 2]),
    }
    const c = checkManifold(m)
    expect(c.ok).toBe(false)
    expect(c.bad).toBeGreaterThan(0)
  })
})
