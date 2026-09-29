import { adjust, quantize, type Gray } from './image'
import { cornerMask, fixPinches, terraceMesh, type Mesh } from './mesh'
import { planTones, toneLut, type TonePlan } from './tones'
import type { Settings } from './types'

export interface Processed {
  plan: TonePlan
  /** adjusted grey (after blur/levels/sharpen) */
  adjusted: Gray
  /** tone index per pixel, into plan.tones */
  tones: Uint8Array
  /** pixel count per tone */
  counts: number[]
}

export function process(src: Gray, s: Settings, mmPerPx: number): Processed {
  const plan = planTones(s.filaments, s.print, s.tones)
  const adjusted = adjust(src, s.adjust, mmPerPx)
  const tones = quantize(adjusted, toneLut(plan))
  const counts = Array.from({ length: plan.tones.length }, () => 0)
  for (const t of tones) counts[t]++
  return { plan, adjusted, tones, counts }
}

export function simulatedRGBA(tones: Uint8Array, plan: TonePlan): Uint8ClampedArray {
  const pal = plan.tones.map((t) => t.rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255)))
  const out = new Uint8ClampedArray(tones.length * 4)
  for (let i = 0, j = 0; i < tones.length; i++, j += 4) {
    const c = pal[tones[i]]
    out[j] = c[0]
    out[j + 1] = c[1]
    out[j + 2] = c[2]
    out[j + 3] = 255
  }
  return out
}

export function grayRGBA(g: Gray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(g.data.length * 4)
  for (let i = 0, j = 0; i < g.data.length; i++, j += 4) {
    out[j] = out[j + 1] = out[j + 2] = g.data[i]
    out[j + 3] = 255
  }
  return out
}

/** tone indices → height indices (1..n, ordered by z) and the matching z table */
export function heightsFor(tones: Uint8Array, plan: TonePlan): { H: Uint8Array; zs: number[] } {
  const zsSorted = [...new Set(plan.tones.map((t) => t.z))].sort((a, b) => a - b)
  const map = plan.tones.map((t) => 1 + zsSorted.indexOf(t.z))
  const H = new Uint8Array(tones.length)
  for (let i = 0; i < H.length; i++) H[i] = map[tones[i]]
  return { H, zs: [0, ...zsSorted] }
}

export function buildMesh(
  tones: Uint8Array,
  cols: number,
  rows: number,
  plan: TonePlan,
  pitch: number,
  cornerPct = 0,
): { mesh: Mesh; pinches: number } {
  const { H, zs } = heightsFor(tones, plan)
  const keep = cornerMask(cols, rows, (cornerPct / 100) * Math.max(cols, rows))
  if (keep) for (let i = 0; i < H.length; i++) if (!keep[i]) H[i] = 0
  const pinches = fixPinches(H, cols, rows)
  return { mesh: terraceMesh(H, cols, rows, zs, pitch), pinches }
}

/**
 * Calibration strip: one row per filament band (bottom filament excluded), one 8 mm patch per layer of that band,
 * left → right = 1, 2, 3 … layers of that filament over everything below it. Background is the base.
 */
export function stepWedge(s: Settings): { mesh: Mesh; plan: TonePlan; sizeMm: [number, number] } {
  const plan0 = planTones(s.filaments, s.print, { mode: 'photo', count: 999 })
  const plan: TonePlan = {
    ...plan0,
    tones: [...plan0.candidates].sort((a, b) => a.z - b.z),
    maxZ: Math.max(...plan0.candidates.map((c) => c.z)),
    swaps: plan0.bands.slice(1).map((b) => ({
      layer: b.firstLayer,
      z: plan0.candidates.find((c) => c.layer === b.firstLayer)!.z,
      filament: b.filament,
    })),
    warnings: [],
  }
  const pitch = 0.25,
    patch = 32,
    gap = 8,
    margin = 12 // cells
  const bands = plan.bands.slice(1)
  const maxN = Math.max(...bands.map((b) => b.lastLayer - b.firstLayer + 1))
  const cols = margin * 2 + maxN * patch + (maxN - 1) * gap
  const rows = margin * 2 + bands.length * patch + (bands.length - 1) * gap
  const zs = [0, ...plan.tones.map((t) => t.z)]
  const hOf = (layer: number) => 1 + plan.tones.findIndex((t) => t.layer === layer)
  const baseH = hOf(plan.bands[0].lastLayer)
  const H = new Uint8Array(cols * rows).fill(baseH)
  bands.forEach((b, r) => {
    for (let j = 0; j <= b.lastLayer - b.firstLayer; j++) {
      const h = hOf(b.firstLayer + j)
      const y0 = margin + r * (patch + gap),
        x0 = margin + j * (patch + gap)
      for (let y = y0; y < y0 + patch; y++) H.fill(h, y * cols + x0, y * cols + x0 + patch)
    }
  })
  return { mesh: terraceMesh(H, cols, rows, zs, pitch), plan, sizeMm: [cols * pitch, rows * pitch] }
}
