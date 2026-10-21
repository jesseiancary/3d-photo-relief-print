// Build a small thumbnail Blob from the simulated-print preview (RGBA at preview resolution), for a
// project card. Uses OffscreenCanvas so it's independent of the on-screen canvas and the current
// view — client-only (the tool is a client island).
export async function thumbnailFromPreview(
  sim: Uint8ClampedArray,
  cols: number,
  rows: number,
  max = 320,
): Promise<Blob> {
  const scale = Math.min(1, max / Math.max(cols, rows))
  const w = Math.max(1, Math.round(cols * scale))
  const h = Math.max(1, Math.round(rows * scale))

  const full = new OffscreenCanvas(cols, rows)
  full.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(sim), cols, rows), 0, 0)

  const out = new OffscreenCanvas(w, h)
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(full, 0, 0, w, h)
  return out.convertToBlob({ type: 'image/webp', quality: 0.85 })
}
