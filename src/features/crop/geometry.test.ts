import { describe, expect, it } from 'vitest'

import {
  applyAspect,
  ASPECTS,
  FULL,
  isFullFrame,
  moveWithinBounds,
  resizeFromHandle,
  swapOrientation,
  type Rect,
} from './geometry'

/** A rect is in-bounds iff it sits fully inside the unit square. */
const inBounds = (r: Rect) =>
  r.x >= -1e-9 && r.y >= -1e-9 && r.x + r.w <= 1 + 1e-9 && r.y + r.h <= 1 + 1e-9

/** The displayed aspect (w:h in pixels) of a crop over an image of the given pixel aspect. */
const displayedAspect = (r: Rect, imgAspect: number) => (r.w * imgAspect) / r.h

describe('swapOrientation', () => {
  it('inverts a ratio and leaves null (free) and square alone', () => {
    expect(swapOrientation(16 / 9)).toBeCloseTo(9 / 16)
    expect(swapOrientation(null)).toBeNull()
    expect(swapOrientation(1)).toBe(1)
  })
})

describe('applyAspect', () => {
  it('returns the full frame for a null (free) ratio', () => {
    expect(applyAspect(null, 1.5)).toEqual(FULL)
  })

  it('centers a max-fit rect of the requested displayed aspect, in bounds', () => {
    const imgAspect = 3 / 2 // a 300×200 image
    for (const ratio of [16 / 9, 5 / 4, 4 / 3, 3 / 2, 1]) {
      const r = applyAspect(ratio, imgAspect)
      expect(inBounds(r)).toBe(true)
      expect(displayedAspect(r, imgAspect)).toBeCloseTo(ratio)
      // centered
      expect(r.x + r.w / 2).toBeCloseTo(0.5)
      expect(r.y + r.h / 2).toBeCloseTo(0.5)
      // maximal: at least one dimension fills the frame
      expect(Math.max(r.w, r.h)).toBeCloseTo(1)
    }
  })

  it('fills the full frame when the ratio matches the image aspect', () => {
    const r = applyAspect(3 / 2, 3 / 2)
    expect(r).toEqual(FULL)
  })
})

describe('moveWithinBounds', () => {
  const r: Rect = { x: 0.3, y: 0.3, w: 0.4, h: 0.4 }

  it('translates by the given delta when it stays inside', () => {
    const out = moveWithinBounds(r, 0.1, -0.1)
    expect(out.x).toBeCloseTo(0.4)
    expect(out.y).toBeCloseTo(0.2)
    expect(out.w).toBeCloseTo(0.4)
    expect(out.h).toBeCloseTo(0.4)
  })

  it('clamps at the edges without changing size', () => {
    const pushed = moveWithinBounds(r, 1, 1)
    expect(pushed.x).toBeCloseTo(0.6) // flush to bottom-right
    expect(pushed.y).toBeCloseTo(0.6)
    const pulled = moveWithinBounds(r, -1, -1)
    expect(pulled.x).toBeCloseTo(0) // flush to top-left
    expect(pulled.y).toBeCloseTo(0)
    expect(pulled.w).toBeCloseTo(0.4) // size unchanged
    expect(pulled.h).toBeCloseTo(0.4)
  })
})

describe('resizeFromHandle (free)', () => {
  const r: Rect = { x: 0.2, y: 0.2, w: 0.6, h: 0.6 }

  it('moves only the dragged edge, anchoring the opposite one', () => {
    const out = resizeFromHandle(r, 'e', 0.1, 0, null)
    expect(out.x).toBeCloseTo(0.2) // west edge fixed
    expect(out.w).toBeCloseTo(0.7)
    expect(out.y).toBeCloseTo(0.2)
    expect(out.h).toBeCloseTo(0.6)
  })

  it('clamps to the 5% minimum size instead of inverting', () => {
    const out = resizeFromHandle(r, 'w', 1, 0, null) // drag west edge way past east
    expect(out.w).toBeCloseTo(0.05) // pinned to MIN, not just positive
    expect(out.x).toBeCloseTo(0.75) // east edge (0.8) stayed anchored
    expect(inBounds(out)).toBe(true)
  })

  it('clamps to the image bounds', () => {
    const out = resizeFromHandle(r, 'se', 1, 1, null)
    expect(inBounds(out)).toBe(true)
  })
})

describe('resizeFromHandle (locked aspect)', () => {
  const imgAspect = 3 / 2
  const ratio = ASPECTS['4:3']
  const fracAspect = ratio / imgAspect
  const start = applyAspect(ratio, imgAspect)

  it('preserves the displayed aspect ratio while dragging a corner', () => {
    const out = resizeFromHandle(start, 'se', -0.1, -0.1, fracAspect)
    expect(displayedAspect(out, imgAspect)).toBeCloseTo(ratio)
    expect(inBounds(out)).toBe(true)
    expect(out.w).toBeLessThan(start.w) // shrunk
  })

  it('preserves the aspect while dragging an edge and stays in bounds', () => {
    const out = resizeFromHandle(start, 'w', 0.1, 0, fracAspect)
    expect(displayedAspect(out, imgAspect)).toBeCloseTo(ratio)
    expect(inBounds(out)).toBe(true)
  })
})

describe('isFullFrame', () => {
  it('recognises the full frame and rejects a crop', () => {
    expect(isFullFrame(FULL)).toBe(true)
    expect(isFullFrame({ x: 0.1, y: 0, w: 0.9, h: 1 })).toBe(false)
  })
})
