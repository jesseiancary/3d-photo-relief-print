import { describe, expect, it } from 'vitest'

import { computeAutoLevels } from './autoLevels'

const spike = (at: number, count = 1000): number[] => {
  const h = Array.from({ length: 256 }, () => 0)
  h[at] = count
  return h
}

describe('computeAutoLevels', () => {
  it('returns the full range (and gamma 1) for an empty histogram', () => {
    expect(computeAutoLevels(Array.from({ length: 256 }, () => 0))).toEqual({
      blackPoint: 0,
      whitePoint: 255,
      gamma: 1,
    })
  })

  it('clips 0.5% off each end of a flat histogram', () => {
    const flat = Array.from({ length: 256 }, () => 100)
    const { blackPoint, whitePoint, gamma } = computeAutoLevels(flat)
    expect(blackPoint).toBe(1)
    expect(whitePoint).toBe(254)
    expect(gamma).toBe(1)
  })

  it('forces a minimum 30-unit gap above the black point', () => {
    // a single dark spike → lo = hi = 10, so whitePoint is floored to lo + 30
    expect(computeAutoLevels(spike(10))).toEqual({ blackPoint: 10, whitePoint: 40, gamma: 1 })
  })

  it('caps the black point at 200 for a bright image', () => {
    const { blackPoint } = computeAutoLevels(spike(255))
    expect(blackPoint).toBe(200)
  })
})
