import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { SlicerTemplate } from '@/core/template'
import type { Settings } from '@/core/types'
import { saveFile } from '@/lib/platform'
import { sampleImage } from '@/lib/sample'
import { slug } from '@/lib/slug'
import { Engine, type PreviewResult } from '@/worker/client'

import { exportSummary, wedgeFilename } from './exportFormat'
import type { Say } from './useStatus'

export interface Busy {
  stage: string
  frac: number
}

interface Params {
  settings: Settings
  template: SlicerTemplate
  say: Say
  clear: () => void
  /** How to construct the processing engine; defaults to a real Engine. Injectable for tests. */
  engineFactory?: () => Engine
  /** Called whenever a new image finishes loading (used to reset per-image state like the crop). */
  onImageLoad?: () => void
}

/**
 * Owns the processing `Engine` and everything that talks to it: image loading, the reactive
 * preview trigger, and the 3MF / step-wedge exports. Previews stay "latest wins" (handled inside
 * `Engine`); the main-thread fallback is reported via `usingWorker`.
 */
export function useReliefEngine({
  settings,
  template,
  say,
  clear,
  engineFactory,
  onImageLoad,
}: Params) {
  // The engine is constructed once for the component's lifetime; engineFactory is read only on that
  // first render, so it is intentionally omitted from the deps.
  const engine = useMemo(() => (engineFactory ?? (() => new Engine()))(), [])
  // Held in a ref so the (identity-unstable) callback never churns the engine.on effect deps.
  const onImageLoadRef = useRef(onImageLoad)
  onImageLoadRef.current = onImageLoad
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string>('')
  const [isSample, setIsSample] = useState(true)
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null)
  const [imageVersion, setImageVersion] = useState(0)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState<Busy | null>(null)

  useEffect(
    () =>
      engine.on((r) => {
        if (r.kind === 'loaded') {
          setImageVersion((v) => v + 1)
          setImageSize({ w: r.w, h: r.h })
          onImageLoadRef.current?.()
        } else if (r.kind === 'preview') setPreview(r)
        else if (r.kind === 'error' && r.reqId === -2) say(r.message, 'err')
      }),
    [engine, say],
  )

  const loadImage = useCallback(
    async (blob: Blob, name: string, sample = false) => {
      try {
        await engine.load(blob)
        setImageUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return URL.createObjectURL(blob)
        })
        setImageName(name)
        setIsSample(sample)
        if (!sample) setTitle(slug(name))
        clear()
      } catch {
        say(
          `Couldn't read ${name}. Use a JPEG, PNG or WebP (iPhone HEIC photos need converting first).`,
          'err',
        )
      }
    },
    [engine, say, clear],
  )

  useEffect(() => {
    void sampleImage().then((b) => loadImage(b, 'Sample Scene', true))
  }, [loadImage])

  useEffect(() => {
    if (imageVersion > 0) engine.preview(settings)
  }, [settings, imageVersion, engine])

  const onFiles = (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return say(`${f.name} isn't an image.`, 'err')
    void loadImage(f, f.name)
  }

  const fileBase = title || slug(imageName)
  const doExport = async (plain = false) => {
    setBusy({ stage: 'Starting', frac: 0 })
    clear()
    try {
      const r = await engine.export(settings, fileBase, plain ? null : template, (stage, frac) =>
        setBusy({ stage, frac }),
      )
      setBusy({ stage: 'Saving', frac: 1 })
      const msg = await saveFile(`${fileBase}.3mf`, r.bytes)
      say(exportSummary(msg, r.triangles, r.bytes.length))
    } catch (e) {
      say((e as Error).message, 'err')
    } finally {
      setBusy(null)
    }
  }
  const doWedge = async () => {
    setBusy({ stage: 'Building step wedge', frac: 0.5 })
    try {
      const r = await engine.wedge(settings, 'step-wedge', template)
      const name = wedgeFilename(settings.filaments)
      say(
        `${await saveFile(name, r.bytes)} · ${r.sizeMm[0].toFixed(0)} × ${r.sizeMm[1].toFixed(0)} mm`,
      )
    } catch (e) {
      say((e as Error).message, 'err')
    } finally {
      setBusy(null)
    }
  }

  return {
    preview,
    imageUrl,
    imageName,
    imageSize,
    isSample,
    usingWorker: engine.usingWorker,
    loadImage,
    onFiles,
    busy,
    title,
    setTitle,
    fileBase,
    doExport,
    doWedge,
  }
}
