import { FILAMENT_PRESETS } from '@/core/defaults'
import type { Gray } from '@/core/image'
import type { Filament } from '@/core/types'

/**
 * Shared deterministic test fixtures. These were previously duplicated inside each
 * core spec; collected here so new tests reuse one source of truth. The RNG and
 * generators reproduce the exact sequences the original specs relied on, so moving
 * a test onto them must not change any assertion.
 */

/** The classic glibc LCG used throughout the specs. Returns the next raw 31-bit int. */
export function lcg(seed: number): () => number {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff)
}

/** A `w`×`h` grey image of pseudo-random 0..255 bytes (matches image.test's `rand`). */
export function randGray(w: number, h: number, seed = 1): Gray {
  const next = lcg(seed)
  const data = new Uint8Array(w * h).map(() => (next() >> 8) & 255)
  return { w, h, data }
}

/** A `cols`×`rows` height grid of indices in 1..levels (matches mesh.test's `randGrid`). */
export function randGrid(cols: number, rows: number, levels: number, seed: number): Uint8Array {
  const next = lcg(seed)
  return new Uint8Array(cols * rows).map(() => 1 + ((next() >> 8) % levels))
}

/** Z-height array `[0, 0.56, 0.64, …]` for `n` terrace levels (matches mesh.test's `zsFor`). */
export const zsFor = (n: number): number[] => [
  0,
  ...Array.from({ length: n }, (_, i) => 0.56 + 0.08 * i),
]

/** Analytic volume of a terraced height grid: Σ zs[h]·pitch² over every cell. */
export function expectedVolume(H: Uint8Array, zs: number[], pitch: number): number {
  let v = 0
  for (const h of H) v += zs[h] * pitch * pitch
  return v
}

/** Reference O(n·r²) median filter with clamped edges — the oracle for `median`. */
export function bruteMedian(g: Gray, r: number): Uint8Array {
  const out = new Uint8Array(g.w * g.h)
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const v: number[] = []
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const yy = Math.min(g.h - 1, Math.max(0, y + dy)),
            xx = Math.min(g.w - 1, Math.max(0, x + dx))
          v.push(g.data[yy * g.w + xx])
        }
      v.sort((a, b) => a - b)
      out[y * g.w + x] = v[v.length >> 1]
    }
  return out
}

/** Build a `Filament[]` from preset indices with stable synthetic ids (matches tones.test's `fil`). */
export const filFromPresets = (indices: number[]): Filament[] =>
  indices.map((k, j) => ({ ...FILAMENT_PRESETS[k], id: `t${j}` }))
