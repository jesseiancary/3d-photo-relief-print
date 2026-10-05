/** Runs in the Web Worker (or on the main thread as a fallback when workers are unavailable). */
import { applyCornerAlpha, gridFor, histogram, rgbaToGray, type Gray } from '../core/image'
import { cornerMask } from '../core/mesh'
import { buildMesh, grayRGBA, process, simulatedRGBA, stepWedge } from '../core/pipeline'
import { write3mf } from '../core/threemf'
import type { CropSettings } from '../core/types'
import type { Request, Response } from './protocol'

export const PREVIEW_ROWS = 900

type Post = (msg: Response, transfer?: Transferable[]) => void

/** A source-pixel rectangle to sample from the bitmap. */
export interface SrcRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

/** Rasterize a region of the loaded bitmap to a cols×rows grey buffer. */
export type ToGray = (bitmap: ImageBitmap, cols: number, rows: number, rect?: SrcRect) => Gray

export interface HandlerDeps {
  /** How to rasterize the bitmap; defaults to an OffscreenCanvas path (overridable in tests). */
  toGray?: ToGray
}

/** The production rasterizer: draw over white onto an OffscreenCanvas, then read it back. */
const canvasToGray: ToGray = (source, cols, rows, rect) => {
  const c = new OffscreenCanvas(cols, rows)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, cols, rows)
  const r = rect ?? { sx: 0, sy: 0, sw: source.width, sh: source.height }
  ctx.drawImage(source, r.sx, r.sy, r.sw, r.sh, 0, 0, cols, rows)
  return rgbaToGray(ctx.getImageData(0, 0, cols, rows).data, cols, rows)
}

/**
 * Resolve a normalized crop to an integer source-pixel rectangle within the bitmap. Origin and far
 * edge are rounded from the same fractions and both clamped to the bitmap, so a rounded `sx+sw`
 * can't overshoot the width by a pixel (which would sample the white fill and leave a base-tone
 * sliver on the right/bottom edge).
 */
const cropRect = (source: ImageBitmap, crop: CropSettings): SrcRect => {
  const axis = (origin: number, extent: number, size: number) => {
    const lo = Math.min(size - 1, Math.max(0, Math.round(origin * size)))
    const hi = Math.min(size, Math.round((origin + extent) * size))
    return { lo, len: Math.max(1, hi - lo) }
  }
  const x = axis(crop.x, crop.w, source.width)
  const y = axis(crop.y, crop.h, source.height)
  return { sx: x.lo, sy: y.lo, sw: x.len, sh: y.len }
}

export function createHandler(post: Post, deps: HandlerDeps = {}) {
  const toGray = deps.toGray ?? canvasToGray
  let source: ImageBitmap | null = null
  const cache = new Map<string, Gray>()

  const grayAt = (cols: number, rows: number, rect: SrcRect): Gray => {
    const key = `${cols}x${rows}@${rect.sx},${rect.sy},${rect.sw},${rect.sh}`
    let g = cache.get(key)
    if (!g) {
      if (!source) throw new Error('No image loaded')
      g = toGray(source, cols, rows, rect)
      if (cache.size > 3) cache.clear()
      cache.set(key, g)
    }
    return g
  }

  return (req: Request) => {
    const reqId = 'reqId' in req ? req.reqId : -1
    try {
      if (req.kind === 'load') {
        source?.close()
        source = req.bitmap
        cache.clear()
        post({ kind: 'loaded', w: source.width, h: source.height })
        return
      }
      const s = req.settings
      const heightMm = s.print.heightIn * 25.4

      if (req.kind === 'preview') {
        if (!source) return
        const rect = cropRect(source, s.crop)
        const full = gridFor(rect.sw, rect.sh, heightMm, s.print.pitchMm)
        const g = gridFor(rect.sw, rect.sh, heightMm, s.print.pitchMm, PREVIEW_ROWS)
        const src = grayAt(g.cols, g.rows, rect)
        const p = process(src, s, g.mmPerPx)
        const hist = histogram(src)
        const sim = simulatedRGBA(p.tones, p.plan)
        const keep = cornerMask(
          g.cols,
          g.rows,
          (s.print.cornerRadius / 100) * Math.max(g.cols, g.rows),
        )
        applyCornerAlpha(sim, keep)
        const adj = grayRGBA(p.adjusted)
        post(
          {
            kind: 'preview',
            reqId,
            cols: g.cols,
            rows: g.rows,
            widthMm: full.widthMm,
            heightMm,
            sim,
            adj,
            plan: p.plan,
            counts: p.counts,
            hist,
          },
          [sim.buffer, adj.buffer],
        )
        return
      }

      if (req.kind === 'export') {
        if (!source) throw new Error('Upload a photo first')
        const rect = cropRect(source, s.crop)
        const g = gridFor(rect.sw, rect.sh, heightMm, s.print.pitchMm)
        post({ kind: 'progress', reqId, stage: 'Processing image', frac: 0.05 })
        const p = process(grayAt(g.cols, g.rows, rect), s, g.mmPerPx)
        post({ kind: 'progress', reqId, stage: 'Building mesh', frac: 0.25 })
        const { mesh, pinches } = buildMesh(
          p.tones,
          g.cols,
          g.rows,
          p.plan,
          g.mmPerPx,
          s.print.cornerRadius,
        )
        const sizeMm: [number, number] = [g.widthMm, g.heightMm]
        const bytes = write3mf(
          {
            mesh,
            title: req.title,
            plan: p.plan,
            filaments: s.filaments,
            print: s.print,
            template: req.template,
            sizeMm,
          },
          (f) => post({ kind: 'progress', reqId, stage: 'Writing 3MF', frac: 0.4 + 0.6 * f }),
        )
        post(
          {
            kind: 'exported',
            reqId,
            bytes,
            triangles: mesh.triangles.length / 3,
            pinches,
            sizeMm,
            plan: p.plan,
          },
          [bytes.buffer],
        )
        return
      }

      if (req.kind === 'wedge') {
        const w = stepWedge(s)
        const bytes = write3mf({
          mesh: w.mesh,
          title: req.title,
          plan: w.plan,
          filaments: s.filaments,
          print: s.print,
          template: req.template,
          sizeMm: w.sizeMm,
        })
        post(
          {
            kind: 'exported',
            reqId,
            bytes,
            triangles: w.mesh.triangles.length / 3,
            pinches: 0,
            sizeMm: w.sizeMm,
            plan: w.plan,
          },
          [bytes.buffer],
        )
      }
    } catch (e) {
      post({ kind: 'error', reqId, message: e instanceof Error ? e.message : String(e) })
    }
  }
}
