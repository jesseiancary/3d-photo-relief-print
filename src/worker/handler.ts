/** Runs in the Web Worker (or on the main thread as a fallback when workers are unavailable). */
import { gridFor, rgbaToGray, type Gray } from '../core/image'
import { buildMesh, grayRGBA, process, simulatedRGBA, stepWedge } from '../core/pipeline'
import { write3mf } from '../core/threemf'
import type { Request, Response } from './protocol'

export const PREVIEW_ROWS = 900

type Post = (msg: Response, transfer?: Transferable[]) => void

export function createHandler(post: Post) {
  let source: ImageBitmap | null = null
  const cache = new Map<string, Gray>()

  const grayAt = (cols: number, rows: number): Gray => {
    const key = `${cols}x${rows}`
    let g = cache.get(key)
    if (!g) {
      if (!source) throw new Error('No image loaded')
      const c = new OffscreenCanvas(cols, rows)
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, cols, rows)
      ctx.drawImage(source, 0, 0, cols, rows)
      g = rgbaToGray(ctx.getImageData(0, 0, cols, rows).data, cols, rows)
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
        const full = gridFor(source.width, source.height, heightMm, s.print.pitchMm)
        const g = gridFor(source.width, source.height, heightMm, s.print.pitchMm, PREVIEW_ROWS)
        const src = grayAt(g.cols, g.rows)
        const p = process(src, s, g.mmPerPx)
        const hist = Array.from({ length: 256 }, () => 0)
        for (const v of src.data) hist[v]++
        const sim = simulatedRGBA(p.tones, p.plan)
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
        const g = gridFor(source.width, source.height, heightMm, s.print.pitchMm)
        post({ kind: 'progress', reqId, stage: 'Processing image', frac: 0.05 })
        const p = process(grayAt(g.cols, g.rows), s, g.mmPerPx)
        post({ kind: 'progress', reqId, stage: 'Building mesh', frac: 0.25 })
        const { mesh, pinches } = buildMesh(p.tones, g.cols, g.rows, p.plan, g.mmPerPx)
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
