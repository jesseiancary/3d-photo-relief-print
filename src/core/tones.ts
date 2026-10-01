/**
 * Tone model: which colors a stack of filaments can produce at each layer height, which heights we print,
 * and where the filament swaps go.
 *
 * Stack model (HueForge-style approximation): the first filament is the base and is treated as opaque.
 * Each later filament is a "band" of layers. A layer of thickness d of filament f over color c gives
 *   c' = c·(1−a) + f·a,   a = min(1, d / (TD × 0.1 mm))
 * blended in linear light. So a filament reaches full coverage at ≈ TD/10 mm. It is an approximation —
 * the step wedge exists to check it against real prints.
 */
import type { Filament, PrintSettings, RGB, ToneSettings } from './types'

export interface Band {
  filament: number
  /** 1-based layer numbers, inclusive */
  firstLayer: number
  lastLayer: number
  /** z at the bottom of the band and the top of its last layer */
  bottomZ: number
  topZ: number
}

export interface Level {
  /** layer number whose top surface is this level */
  layer: number
  z: number
  rgb: RGB
  /** CIE L* 0..100 */
  L: number
}

export interface Swap {
  layer: number
  /** top z of the first layer printed in the new filament */
  z: number
  filament: number
}

export interface TonePlan {
  bands: Band[]
  /** every printable top height, bottom to top */
  candidates: Level[]
  /** the heights actually used, sorted dark → light (by L*) */
  tones: Level[]
  maxZ: number
  swaps: Swap[]
  warnings: string[]
}

const round3 = (x: number) => Math.round(x * 1000) / 1000
export const layerTop = (layer: number, p: PrintSettings) =>
  round3(p.firstLayerMm + (layer - 1) * p.layerMm)

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const v = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  )
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)
export const linToSrgb = (c: RGB): RGB => [toSrgb(c[0]), toSrgb(c[1]), toSrgb(c[2])]

/** CIE L* of a linear-light RGB color */
export function lstarLin(c: RGB): number {
  const Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  return Y > 216 / 24389 ? 116 * Math.cbrt(Y) - 16 : (24389 / 27) * Y
}
/** CIE L* of an sRGB grey value 0..255 */
export const lstarGray = (v: number) => lstarLin([toLin(v / 255), toLin(v / 255), toLin(v / 255)])

/** layers needed for a filament to reach full coverage */
export const autoLayers = (td: number, p: PrintSettings) =>
  Math.max(1, Math.min(25, Math.ceil((Math.max(td, 0.05) * 0.1) / p.layerMm - 1e-9)))

export function baseLayers(p: PrintSettings): number {
  return Math.max(1, Math.round((p.baseMm - p.firstLayerMm) / p.layerMm) + 1)
}

export function buildBands(filaments: Filament[], p: PrintSettings): Band[] {
  const bands: Band[] = []
  const nb = baseLayers(p)
  bands.push({ filament: 0, firstLayer: 1, lastLayer: nb, bottomZ: 0, topZ: layerTop(nb, p) })
  let last = nb
  for (let k = 1; k < filaments.length; k++) {
    const f = filaments[k]
    const n = f.layers && f.layers > 0 ? Math.round(f.layers) : autoLayers(f.td, p)
    bands.push({
      filament: k,
      firstLayer: last + 1,
      lastLayer: last + n,
      bottomZ: layerTop(last, p),
      topZ: layerTop(last + n, p),
    })
    last += n
  }
  return bands
}

/** simulated linear-light color looking down at a column printed up to height z */
export function stackColorLin(z: number, bands: Band[], filaments: Filament[]): RGB {
  const base = hexToRgb(filaments[0].color).map(toLin) as RGB
  let c: RGB = [...base]
  for (let k = 1; k < bands.length; k++) {
    const b = bands[k]
    const d = Math.min(z, b.topZ) - b.bottomZ
    if (d <= 1e-6) break
    const f = hexToRgb(filaments[b.filament].color).map(toLin)
    const a = Math.min(1, d / (Math.max(filaments[b.filament].td, 0.05) * 0.1))
    c = [c[0] * (1 - a) + f[0] * a, c[1] * (1 - a) + f[1] * a, c[2] * (1 - a) + f[2] * a]
  }
  return c
}

export function planTones(filaments: Filament[], p: PrintSettings, t: ToneSettings): TonePlan {
  const warnings: string[] = []
  const bands = buildBands(filaments, p)
  const mk = (layer: number): Level => {
    const z = layerTop(layer, p)
    const lin = stackColorLin(z, bands, filaments)
    return { layer, z, rgb: linToSrgb(lin), L: lstarLin(lin) }
  }
  const candidates: Level[] = [mk(bands[0].lastLayer)]
  for (let k = 1; k < bands.length; k++)
    for (let l = bands[k].firstLayer; l <= bands[k].lastLayer; l++) candidates.push(mk(l))

  let chosen: Level[]
  if (t.mode === 'graphic') {
    chosen = bands.map((b) => candidates.find((c) => c.layer === b.lastLayer)!)
  } else {
    const n = Math.min(Math.max(2, Math.round(t.count)), candidates.length)
    if (n < t.count)
      warnings.push(
        `Only ${candidates.length} distinct heights are available with these bands — using ${n} tones. Add layers to a band or lower the tone count.`,
      )
    const Ls = candidates.map((c) => c.L)
    const lo = Math.min(...Ls),
      hi = Math.max(...Ls)
    const used = new Set<number>()
    chosen = []
    for (let i = 0; i < n; i++) {
      const target = lo + ((hi - lo) * i) / (n - 1)
      let best = -1,
        bd = Infinity
      candidates.forEach((c, j) => {
        const d = Math.abs(c.L - target)
        if (!used.has(j) && d < bd) {
          bd = d
          best = j
        }
      })
      used.add(best)
      chosen.push(candidates[best])
    }
  }
  const tones = [...chosen].sort((a, b) => a.L - b.L || a.z - b.z)
  for (let i = 1; i < tones.length; i++)
    if (tones[i].L - tones[i - 1].L < 2)
      warnings.push(
        `Two tones (${tones[i - 1].z.toFixed(2)} mm and ${tones[i].z.toFixed(2)} mm) will look almost the same.`,
      )

  const maxZ = Math.max(...tones.map((c) => c.z))
  const swaps: Swap[] = bands
    .slice(1)
    .filter((b) => layerTop(b.firstLayer, p) <= maxZ + 1e-6)
    .map((b) => ({ layer: b.firstLayer, z: layerTop(b.firstLayer, p), filament: b.filament }))

  const pureL = filaments.map((f) => lstarLin(hexToRgb(f.color).map(toLin) as RGB))
  for (let k = 1; k < pureL.length; k++)
    if (pureL[k] < pureL[k - 1] - 1)
      warnings.push(
        `${filaments[k].name} is darker than the filament below it. Stacks usually go dark → light; fine for an accent, but tones may not follow the photo.`,
      )

  return { bands, candidates, tones, maxZ, swaps, warnings }
}

/** gray (0..255, after adjustments) → index into plan.tones */
export function toneLut(plan: TonePlan): Uint8Array {
  const lut = new Uint8Array(256)
  const lo = plan.tones[0].L,
    hi = plan.tones[plan.tones.length - 1].L
  for (let v = 0; v < 256; v++) {
    const target = lo + (lstarGray(v) / 100) * (hi - lo)
    let best = 0,
      bd = Infinity
    plan.tones.forEach((t, i) => {
      const d = Math.abs(t.L - target)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    lut[v] = best
  }
  return lut
}
