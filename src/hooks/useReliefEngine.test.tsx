// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultSettings } from '@/core/defaults'
import { DEFAULT_TEMPLATE } from '@/core/template'
import { saveFile } from '@/lib/platform'
import type { Engine } from '@/worker/client'
import type { Response } from '@/worker/protocol'

import { useReliefEngine } from './useReliefEngine'

vi.mock('@/lib/sample', () => ({ sampleImage: vi.fn(async () => new Blob([new Uint8Array([1])])) }))
vi.mock('@/lib/platform', () => ({ saveFile: vi.fn(async () => 'Saved relief.3mf') }))

// Minimal controllable stand-in for the real Engine.
class FakeEngine {
  usingWorker = true
  listeners = new Set<(r: Response) => void>()
  on(fn: (r: Response) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  emit(r: Response) {
    this.listeners.forEach((l) => l(r))
  }
  load = vi.fn(async () => {
    this.emit({ kind: 'loaded', w: 1, h: 1 })
  })
  preview = vi.fn()
  export = vi.fn(async () => ({
    kind: 'exported' as const,
    reqId: 1,
    bytes: new Uint8Array([1, 2, 3]),
    triangles: 1000,
    pinches: 0,
    sizeMm: [10, 20] as [number, number],
    plan: {} as never,
  }))
  wedge = vi.fn(async () => ({
    kind: 'exported' as const,
    reqId: 2,
    bytes: new Uint8Array([1]),
    triangles: 1,
    pinches: 0,
    sizeMm: [10, 20] as [number, number],
    plan: {} as never,
  }))
}

function setup() {
  const say = vi.fn()
  const clear = vi.fn()
  const engine = new FakeEngine()
  const hook = renderHook(() =>
    useReliefEngine({
      settings: defaultSettings(),
      template: DEFAULT_TEMPLATE,
      say,
      clear,
      engineFactory: () => engine as unknown as Engine,
    }),
  )
  return { say, clear, engine, hook }
}

beforeEach(() => {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:x')
  globalThis.URL.revokeObjectURL = vi.fn()
  vi.clearAllMocks()
})

describe('useReliefEngine', () => {
  it('loads the sample image on mount', async () => {
    const { engine } = setup()
    await waitFor(() => expect(engine.load).toHaveBeenCalled())
  })

  it('rejects a non-image file via onFiles', async () => {
    const { say, engine, hook } = setup()
    await waitFor(() => expect(engine.load).toHaveBeenCalledTimes(1)) // the sample
    const files = { 0: new File(['x'], 'notes.txt', { type: 'text/plain' }), length: 1 }
    act(() => hook.result.current.onFiles(files as unknown as FileList))
    expect(say).toHaveBeenCalledWith(expect.stringMatching(/isn't an image/), 'err')
    expect(engine.load).toHaveBeenCalledTimes(1) // no extra load for a rejected file
  })

  it('exports a 3MF and reports a summary', async () => {
    const { say, engine, hook } = setup()
    await waitFor(() => expect(engine.load).toHaveBeenCalled())
    await act(async () => {
      await hook.result.current.doExport()
    })
    expect(engine.export).toHaveBeenCalled()
    expect(saveFile).toHaveBeenCalledWith(expect.stringContaining('.3mf'), expect.anything())
    expect(say).toHaveBeenCalledWith(expect.stringContaining('k triangles'))
  })
})
