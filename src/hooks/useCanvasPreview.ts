import { useEffect, type RefObject } from 'react'

import type { View } from '@/features/preview'
import type { PreviewResult } from '@/worker/client'

/** Paints the simulated-print or adjusted-grey preview onto the canvas whenever it (or the view) changes. */
export function useCanvasPreview(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  preview: PreviewResult | null,
  view: View,
  // The canvas is unmounted while cropping; depend on `cropping` so leaving crop mode repaints the
  // freshly remounted canvas (otherwise it stays blank until the next preview/view change).
  cropping: boolean,
) {
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !preview || view === 'original' || cropping) return
    c.width = preview.cols
    c.height = preview.rows
    const data = view === 'print' ? preview.sim : preview.adj
    c.getContext('2d')!.putImageData(
      new ImageData(new Uint8ClampedArray(data), preview.cols, preview.rows),
      0,
      0,
    )
  }, [canvasRef, preview, view, cropping])
}
