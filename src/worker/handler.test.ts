import { describe, expect, it } from 'vitest'

import { defaultSettings } from '@/core/defaults'
import type { Gray } from '@/core/image'

import { createHandler, type SrcRect, type ToGray } from './handler'
import type { Response } from './protocol'

// A fake bitmap + an injected rasterizer let us drive the handler in Node with no
// OffscreenCanvas. The rasterizer returns a uniform grey of the requested size.
const fakeBitmap = { width: 300, height: 200, close() {} } as unknown as ImageBitmap
const uniformGray: ToGray = (_b, cols, rows) => ({
  w: cols,
  h: rows,
  data: new Uint8Array(cols * rows).fill(128) as Gray['data'],
})

function harness() {
  const posts: Response[] = []
  const handle = createHandler((m) => posts.push(m), { toGray: uniformGray })
  return { posts, handle }
}

const smallSettings = () => {
  const s = defaultSettings()
  s.print.heightIn = 1 // keep the grid small for the test
  return s
}

describe('createHandler', () => {
  it('reports image dimensions on load', () => {
    const { posts, handle } = harness()
    handle({ kind: 'load', bitmap: fakeBitmap })
    expect(posts).toEqual([{ kind: 'loaded', w: 300, h: 200 }])
  })

  it('produces a preview with a histogram summing to the pixel count', () => {
    const { posts, handle } = harness()
    handle({ kind: 'load', bitmap: fakeBitmap })
    handle({ kind: 'preview', reqId: 1, settings: smallSettings() })
    const preview = posts.find((p) => p.kind === 'preview')
    expect(preview).toBeDefined()
    if (preview?.kind !== 'preview') throw new Error('no preview')
    expect(preview.hist).toHaveLength(256)
    expect(preview.hist.reduce((a, b) => a + b, 0)).toBe(preview.cols * preview.rows)
    expect(preview.sim).toHaveLength(preview.cols * preview.rows * 4)
    expect(preview.counts.length).toBe(preview.plan.tones.length)
  })

  it('ignores a preview request before any image is loaded', () => {
    const { posts, handle } = harness()
    handle({ kind: 'preview', reqId: 1, settings: smallSettings() })
    expect(posts).toEqual([])
  })

  it('emits progress then an export with 3MF bytes', () => {
    const { posts, handle } = harness()
    handle({ kind: 'load', bitmap: fakeBitmap })
    handle({ kind: 'export', reqId: 2, settings: smallSettings(), title: 'x', template: null })
    expect(posts.some((p) => p.kind === 'progress')).toBe(true)
    const done = posts.find((p) => p.kind === 'exported')
    if (done?.kind !== 'exported') throw new Error('no export')
    expect(done.bytes.byteLength).toBeGreaterThan(0)
    expect(done.triangles).toBeGreaterThan(0)
  })

  it('reports an error when exporting with no image loaded', () => {
    const { posts, handle } = harness()
    handle({ kind: 'export', reqId: 3, settings: smallSettings(), title: 'x', template: null })
    const err = posts.find((p) => p.kind === 'error')
    expect(err).toMatchObject({ kind: 'error', reqId: 3 })
  })

  it('builds a step wedge export', () => {
    const { posts, handle } = harness()
    handle({ kind: 'wedge', reqId: 4, settings: smallSettings(), title: 'wedge', template: null })
    const done = posts.find((p) => p.kind === 'exported')
    if (done?.kind !== 'exported') throw new Error('no wedge export')
    expect(done.bytes.byteLength).toBeGreaterThan(0)
  })

  it('passes the crop rectangle to the rasterizer in source pixels', () => {
    const rects: (SrcRect | undefined)[] = []
    const recording: ToGray = (_b, cols, rows, rect) => {
      rects.push(rect)
      return { w: cols, h: rows, data: new Uint8Array(cols * rows).fill(128) as Gray['data'] }
    }
    const posts: Response[] = []
    const handle = createHandler((m) => posts.push(m), { toGray: recording })
    handle({ kind: 'load', bitmap: fakeBitmap })
    const s = smallSettings()
    s.crop = { x: 0.25, y: 0.1, w: 0.5, h: 0.5 } // of a 300×200 bitmap
    handle({ kind: 'preview', reqId: 1, settings: s })
    expect(rects.at(-1)).toEqual({ sx: 75, sy: 20, sw: 150, sh: 100 })
  })

  it('keeps the crop source rect within the bitmap (no rounding overshoot)', () => {
    const rects: (SrcRect | undefined)[] = []
    const recording: ToGray = (_b, cols, rows, rect) => {
      rects.push(rect)
      return { w: cols, h: rows, data: new Uint8Array(cols * rows).fill(128) as Gray['data'] }
    }
    const posts: Response[] = []
    const handle = createHandler((m) => posts.push(m), { toGray: recording })
    // A tiny 10×10 source is where independent rounding of origin/extent would overshoot by 1px.
    const tiny = { width: 10, height: 10, close() {} } as unknown as ImageBitmap
    handle({ kind: 'load', bitmap: tiny })
    const s = smallSettings()
    s.crop = { x: 0.15, y: 0.15, w: 0.85, h: 0.85 }
    handle({ kind: 'preview', reqId: 1, settings: s })
    const r = rects.at(-1)
    if (!r) throw new Error('rasterizer not called')
    expect(r.sx).toBeGreaterThanOrEqual(0)
    expect(r.sy).toBeGreaterThanOrEqual(0)
    expect(r.sw).toBeGreaterThanOrEqual(1)
    expect(r.sh).toBeGreaterThanOrEqual(1)
    expect(r.sx + r.sw).toBeLessThanOrEqual(10)
    expect(r.sy + r.sh).toBeLessThanOrEqual(10)
  })

  it('derives the print footprint from the cropped aspect, not the full image', () => {
    const { posts, handle } = harness()
    handle({ kind: 'load', bitmap: fakeBitmap })
    handle({ kind: 'preview', reqId: 1, settings: smallSettings() })
    const cropped = smallSettings()
    cropped.crop = { x: 0, y: 0, w: 0.5, h: 1 } // keep the left half → half the width
    handle({ kind: 'preview', reqId: 2, settings: cropped })
    const fullP = posts.find((p) => p.kind === 'preview' && p.reqId === 1)
    const cropP = posts.find((p) => p.kind === 'preview' && p.reqId === 2)
    if (fullP?.kind !== 'preview' || cropP?.kind !== 'preview') throw new Error('missing previews')
    expect(cropP.heightMm).toBeCloseTo(fullP.heightMm) // guard: crop never scales physical height
    expect(cropP.widthMm).toBeLessThan(fullP.widthMm)
    expect(cropP.widthMm).toBeCloseTo(fullP.widthMm / 2, 0) // ~half the width
  })
})
