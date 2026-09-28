/** Pure image operations on 8-bit grey buffers (row-major, width w, height h). */
import type { AdjustSettings } from './types'

export interface Gray {
  w: number
  h: number
  data: Uint8Array
}

export function rgbaToGray(rgba: Uint8ClampedArray, w: number, h: number): Gray {
  const data = new Uint8Array(w * h)
  for (let i = 0, j = 0; i < data.length; i++, j += 4) {
    // Rec.709 luma on sRGB values; transparent pixels read as white
    const a = rgba[j + 3] / 255
    const y = 0.2126 * rgba[j] + 0.7152 * rgba[j + 1] + 0.0722 * rgba[j + 2]
    data[i] = Math.round(y * a + 255 * (1 - a))
  }
  return { w, h, data }
}

/**
 * Median filter with a (2r+1)² square window, Huang's sliding-histogram algorithm (O(r) per pixel).
 * Edges are clamped.
 */
export function median(src: Gray, r: number): Gray {
  const { w, h, data } = src
  if (r < 1) return { w, h, data: data.slice() }
  const out = new Uint8Array(w * h)
  const hist = new Int32Array(256)
  const half = ((2 * r + 1) * (2 * r + 1)) >> 1
  const cx = (x: number) => (x < 0 ? 0 : x >= w ? w - 1 : x)
  const rowOff = new Int32Array(2 * r + 1)
  for (let y = 0; y < h; y++) {
    for (let k = -r; k <= r; k++) rowOff[k + r] = (y + k < 0 ? 0 : y + k >= h ? h - 1 : y + k) * w
    hist.fill(0)
    for (const o of rowOff) for (let dx = -r; dx <= r; dx++) hist[data[o + cx(dx)]]++
    let med = 0,
      lt = 0
    while (lt + hist[med] <= half) {
      lt += hist[med]
      med++
    }
    out[y * w] = med
    for (let x = 1; x < w; x++) {
      const xo = cx(x - r - 1),
        xi = cx(x + r)
      for (const o of rowOff) {
        const v = data[o + xo]
        hist[v]--
        if (v < med) lt--
        const u = data[o + xi]
        hist[u]++
        if (u < med) lt++
      }
      if (lt > half) {
        do {
          med--
          lt -= hist[med]
        } while (lt > half)
      } else {
        while (lt + hist[med] <= half) {
          lt += hist[med]
          med++
        }
      }
      out[y * w + x] = med
    }
  }
  return { w, h, data: out }
}

/** separable box blur via running sums, edges clamped; returns floats */
function boxBlur(src: Gray, r: number): Float32Array {
  const { w, h, data } = src
  const tmp = new Float32Array(w * h),
    out = new Float32Array(w * h)
  const n = 2 * r + 1
  for (let y = 0; y < h; y++) {
    const o = y * w
    let s = 0
    for (let k = -r; k <= r; k++) s += data[o + Math.min(w - 1, Math.max(0, k))]
    for (let x = 0; x < w; x++) {
      tmp[o + x] = s / n
      s += data[o + Math.min(w - 1, x + r + 1)] - data[o + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let k = -r; k <= r; k++) s += tmp[Math.min(h - 1, Math.max(0, k)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / n
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
    }
  }
  return out
}

/** blur → levels → sharpen, sized for a grid where one pixel is `mmPerPx` millimetres */
export function adjust(src: Gray, a: AdjustSettings, mmPerPx: number): Gray {
  let g = median(src, Math.round(a.blurMm / mmPerPx))
  const bp = Math.min(a.blackPoint, a.whitePoint - 1),
    wp = Math.max(a.whitePoint, bp + 1)
  const inv = 1 / Math.max(0.05, a.gamma)
  const lut = new Uint8Array(256)
  for (let v = 0; v < 256; v++)
    lut[v] = Math.round(255 * Math.min(1, Math.max(0, (v - bp) / (wp - bp))) ** inv)
  const lv = new Uint8Array(g.data.length)
  for (let i = 0; i < lv.length; i++) lv[i] = lut[g.data[i]]
  g = { w: g.w, h: g.h, data: lv }
  if (a.sharpen > 0) {
    const b = boxBlur(g, Math.max(1, Math.round(0.3 / mmPerPx)))
    const d = new Uint8Array(lv.length)
    for (let i = 0; i < d.length; i++) {
      const v = lv[i] + a.sharpen * (lv[i] - b[i])
      d[i] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
    }
    g = { w: g.w, h: g.h, data: d }
  }
  return g
}

/** grey → tone index via a 256-entry lookup table */
export function quantize(g: Gray, lut: Uint8Array): Uint8Array {
  const out = new Uint8Array(g.data.length)
  for (let i = 0; i < out.length; i++) out[i] = lut[g.data[i]]
  return out
}

export interface GridSize {
  cols: number
  rows: number
  widthMm: number
  heightMm: number
  mmPerPx: number
}

export function gridFor(
  imgW: number,
  imgH: number,
  heightMm: number,
  pitchMm: number,
  maxRows = Infinity,
): GridSize {
  const rows = Math.max(8, Math.min(maxRows, Math.round(heightMm / pitchMm)))
  const cols = Math.max(8, Math.round((rows * imgW) / imgH))
  const mmPerPx = heightMm / rows
  return { cols, rows, widthMm: cols * mmPerPx, heightMm, mmPerPx }
}
