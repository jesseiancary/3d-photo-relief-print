import type { SlicerTemplate } from '../core/template'
import type { TonePlan } from '../core/tones'
import type { Settings } from '../core/types'

export type Request =
  | { kind: 'load'; bitmap: ImageBitmap }
  | { kind: 'preview'; reqId: number; settings: Settings }
  | {
      kind: 'export'
      reqId: number
      settings: Settings
      title: string
      template: SlicerTemplate | null
    }
  | {
      kind: 'wedge'
      reqId: number
      settings: Settings
      title: string
      template: SlicerTemplate | null
    }

export interface PreviewResult {
  kind: 'preview'
  reqId: number
  cols: number
  rows: number
  /** full print size */
  widthMm: number
  heightMm: number
  /** simulated print, RGBA at preview resolution */
  sim: Uint8ClampedArray
  /** adjusted grey, RGBA at preview resolution */
  adj: Uint8ClampedArray
  plan: TonePlan
  counts: number[]
  /** 256-bin histogram of the unadjusted grey */
  hist: number[]
}

export interface ExportResult {
  kind: 'exported'
  reqId: number
  bytes: Uint8Array
  triangles: number
  pinches: number
  sizeMm: [number, number]
  plan: TonePlan
}

export type Response =
  | { kind: 'loaded'; w: number; h: number }
  | PreviewResult
  | ExportResult
  | { kind: 'progress'; reqId: number; stage: string; frac: number }
  | { kind: 'error'; reqId: number; message: string }
