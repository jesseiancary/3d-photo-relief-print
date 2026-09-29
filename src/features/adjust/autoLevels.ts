import type { AdjustSettings } from '@/core/types'

/**
 * Derive black/white points (and reset gamma) from a 256-bin grey histogram by clipping
 * 0.5% of the pixels at each end. Pure — the caller applies the result to settings.
 */
export function computeAutoLevels(
  hist: number[],
): Pick<AdjustSettings, 'blackPoint' | 'whitePoint' | 'gamma'> {
  const n = hist.reduce((a, b) => a + b, 0)
  let acc = 0,
    lo = 0,
    hi = 255
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (acc >= n * 0.005) {
      lo = v
      break
    }
  }
  acc = 0
  for (let v = 255; v >= 0; v--) {
    acc += hist[v]
    if (acc >= n * 0.005) {
      hi = v
      break
    }
  }
  return { blackPoint: Math.min(lo, 200), whitePoint: Math.max(hi, lo + 30), gamma: 1 }
}
