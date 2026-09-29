import { type RefObject, useEffect } from 'react'
import type { View } from '@/features/preview'
import type { PreviewResult } from '@/worker/client'

/** Paints the simulated-print or adjusted-grey preview onto the canvas whenever it (or the view) changes. */
export function useCanvasPreview(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  preview: PreviewResult | null,
  view: View,
) {
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !preview || view === 'original') return
    c.width = preview.cols
    c.height = preview.rows
    const data = view === 'print' ? preview.sim : preview.adj
    c.getContext('2d')!.putImageData(
      new ImageData(new Uint8ClampedArray(data), preview.cols, preview.rows),
      0,
      0,
    )
  }, [canvasRef, preview, view])
}
