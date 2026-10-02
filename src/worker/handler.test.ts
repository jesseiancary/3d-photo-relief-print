import { describe, expect, it } from 'vitest'

import { defaultSettings } from '@/core/defaults'
import type { Gray } from '@/core/image'

import { createHandler, type ToGray } from './handler'
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
})
