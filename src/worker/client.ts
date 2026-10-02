import type { SlicerTemplate } from '../core/template'
import type { Settings } from '../core/types'
import { createHandler } from './handler'
import type { ExportResult, PreviewResult, Request, Response } from './protocol'
import ReliefWorker from './relief.worker?worker&inline'

type Listener = (r: Response) => void

export interface EngineDeps {
  /** How to create the worker; defaults to the inlined ReliefWorker. Injectable for tests. */
  workerFactory?: () => Worker
  /** How to decode a Blob into an ImageBitmap; defaults to createImageBitmap. Injectable for tests. */
  decode?: (image: Blob) => Promise<ImageBitmap>
}

/**
 * Talks to the processing worker. Previews are "latest wins": at most one in flight and one queued,
 * so dragging a slider never builds a backlog. If the worker can't start (some sandboxes block them),
 * processing falls back to the main thread.
 */
export class Engine {
  private send!: (req: Request, transfer?: Transferable[]) => void
  private listeners = new Set<Listener>()
  private nextId = 1
  private previewBusy = false
  private queued: Settings | null = null
  private lastSettings: Settings | null = null
  private image: Blob | null = null
  private heardFromWorker = false
  private decode: (image: Blob) => Promise<ImageBitmap>
  usingWorker = true

  constructor(deps: EngineDeps = {}) {
    const makeWorker = deps.workerFactory ?? (() => new ReliefWorker())
    this.decode = deps.decode ?? ((image) => createImageBitmap(image))
    try {
      const w = makeWorker()
      w.onmessage = (e: MessageEvent<Response>) => {
        this.heardFromWorker = true
        this.dispatch(e.data)
      }
      w.onerror = () => {
        if (!this.heardFromWorker) this.fallBack()
        else this.dispatch({ kind: 'error', reqId: -2, message: 'Processing failed' })
      }
      this.send = (req, t) => w.postMessage(req, t ?? [])
    } catch {
      this.fallBack()
    }
  }

  private fallBack() {
    this.usingWorker = false
    const handle = createHandler((m) => setTimeout(() => this.dispatch(m), 0))
    this.send = (req) => setTimeout(() => handle(req), 0)
    this.previewBusy = false
    if (this.image)
      void this.load(this.image).then(() => this.lastSettings && this.preview(this.lastSettings))
  }

  on(fn: Listener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private dispatch(r: Response) {
    if (r.kind === 'preview' || (r.kind === 'error' && r.reqId === -2)) {
      this.previewBusy = false
      if (this.queued) {
        const s = this.queued
        this.queued = null
        this.preview(s)
      }
    }
    this.listeners.forEach((l) => l(r))
  }

  async load(image: Blob) {
    this.image = image
    const bitmap = await this.decode(image)
    this.send({ kind: 'load', bitmap }, [bitmap])
  }

  preview(settings: Settings) {
    this.lastSettings = settings
    if (this.previewBusy) {
      this.queued = settings
      return
    }
    this.previewBusy = true
    this.send({ kind: 'preview', reqId: -2, settings })
  }

  private request(
    req: Request & { reqId: number },
    onProgress?: (stage: string, f: number) => void,
  ): Promise<ExportResult> {
    return new Promise((resolve, reject) => {
      const off = this.on((r) => {
        if (!('reqId' in r) || r.reqId !== req.reqId) return
        if (r.kind === 'progress') onProgress?.(r.stage, r.frac)
        else if (r.kind === 'error') {
          off()
          reject(new Error(r.message))
        } else if (r.kind === 'exported') {
          off()
          resolve(r)
        }
      })
      this.send(req)
    })
  }

  export(
    settings: Settings,
    title: string,
    template: SlicerTemplate | null,
    onProgress?: (stage: string, f: number) => void,
  ) {
    return this.request(
      { kind: 'export', reqId: this.nextId++, settings, title, template },
      onProgress,
    )
  }

  wedge(settings: Settings, title: string, template: SlicerTemplate | null) {
    return this.request({ kind: 'wedge', reqId: this.nextId++, settings, title, template })
  }
}

export type { PreviewResult, ExportResult }
