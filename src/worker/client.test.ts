import { defaultSettings } from '@/core/defaults'
import type { Settings } from '@/core/types'
import { describe, expect, it, vi } from 'vitest'
import { Engine } from './client'
import type { Request, Response } from './protocol'

// A controllable stand-in for the real Web Worker. Tests drive responses via reply()/crash().
class FakeWorker {
  onmessage: ((e: MessageEvent<Response>) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  posted: Request[] = []
  postMessage(req: Request) {
    this.posted.push(req)
  }
  terminate() {}
  reply(data: Response) {
    this.onmessage?.({ data } as MessageEvent<Response>)
  }
  crash() {
    this.onerror?.(new Error('worker error'))
  }
  previews() {
    return this.posted.filter(
      (p): p is Extract<Request, { kind: 'preview' }> => p.kind === 'preview',
    )
  }
}

const asWorker = (f: FakeWorker) => () => f as unknown as Worker
const withCount = (count: number): Settings => ({
  ...defaultSettings(),
  tones: { mode: 'photo', count },
})
const previewReply: Response = { kind: 'preview', reqId: -2 } as unknown as Response

describe('Engine preview queue', () => {
  it('keeps at most one preview in flight and one queued (latest wins)', () => {
    const w = new FakeWorker()
    const engine = new Engine({ workerFactory: asWorker(w) })
    engine.preview(withCount(2)) // sent immediately
    engine.preview(withCount(3)) // queued
    engine.preview(withCount(4)) // overwrites the queued one
    expect(w.previews()).toHaveLength(1)
    expect(w.previews()[0].settings.tones.count).toBe(2)

    w.reply(previewReply) // the in-flight one finishes → the queued (latest) one fires
    expect(w.previews()).toHaveLength(2)
    expect(w.previews()[1].settings.tones.count).toBe(4) // 3 was dropped
  })
})

describe('Engine load', () => {
  it('decodes the blob and posts a load request with the bitmap', async () => {
    const w = new FakeWorker()
    const bitmap = { width: 4, height: 4, close() {} } as unknown as ImageBitmap
    const engine = new Engine({ workerFactory: asWorker(w), decode: async () => bitmap })
    await engine.load(new Blob([new Uint8Array([1])]))
    const load = w.posted.find((p) => p.kind === 'load')
    expect(load).toMatchObject({ kind: 'load' })
    expect((load as Extract<Request, { kind: 'load' }>).bitmap).toBe(bitmap)
  })
})

describe('Engine request/response correlation', () => {
  it('resolves export with the matching reqId and forwards progress', async () => {
    const w = new FakeWorker()
    const engine = new Engine({ workerFactory: asWorker(w) })
    const onProgress = vi.fn()
    const p = engine.export(defaultSettings(), 'title', null, onProgress)
    const req = w.posted.find((r) => r.kind === 'export') as Extract<Request, { kind: 'export' }>
    w.reply({ kind: 'progress', reqId: req.reqId, stage: 'Writing', frac: 0.5 })
    w.reply({
      kind: 'exported',
      reqId: req.reqId,
      bytes: new Uint8Array([1, 2]),
      triangles: 1,
      pinches: 0,
      sizeMm: [1, 1],
      plan: {} as never,
    })
    await expect(p).resolves.toMatchObject({ kind: 'exported', triangles: 1 })
    expect(onProgress).toHaveBeenCalledWith('Writing', 0.5)
  })

  it('rejects export on an error response', async () => {
    const w = new FakeWorker()
    const engine = new Engine({ workerFactory: asWorker(w) })
    const p = engine.export(defaultSettings(), 'title', null)
    const req = w.posted.find((r) => r.kind === 'export') as Extract<Request, { kind: 'export' }>
    w.reply({ kind: 'error', reqId: req.reqId, message: 'nope' })
    await expect(p).rejects.toThrow('nope')
  })
})

describe('Engine main-thread fallback', () => {
  it('falls back when the worker constructor throws', () => {
    const engine = new Engine({
      workerFactory: () => {
        throw new Error('workers blocked')
      },
    })
    expect(engine.usingWorker).toBe(false)
  })

  it('falls back on a first-start worker error (before any message)', () => {
    const w = new FakeWorker()
    const engine = new Engine({ workerFactory: asWorker(w) })
    w.crash()
    expect(engine.usingWorker).toBe(false)
  })

  it('dispatches an error (not a fallback) once the worker has spoken', () => {
    const w = new FakeWorker()
    const engine = new Engine({ workerFactory: asWorker(w) })
    const got: Response[] = []
    engine.on((r) => got.push(r))
    w.reply({ kind: 'loaded', w: 1, h: 1 }) // now heardFromWorker
    w.crash()
    expect(engine.usingWorker).toBe(true)
    expect(got.some((r) => r.kind === 'error' && r.reqId === -2)).toBe(true)
  })
})
