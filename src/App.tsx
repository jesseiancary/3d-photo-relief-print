import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultSettings } from '@/core/defaults'
import { DEFAULT_TEMPLATE, parseTemplate, type SlicerTemplate, summarize } from '@/core/template'
import { baseLayers, layerTop } from '@/core/tones'
import type { Settings } from '@/core/types'
import { AdjustSection, computeAutoLevels } from '@/features/adjust'
import { ExportCard } from '@/features/export'
import { FilamentsSection } from '@/features/filaments'
import { PhotoSection } from '@/features/photo'
import { StackDiagram, SwapTable } from '@/features/plan'
import { PreviewCard, type View } from '@/features/preview'
import { PrintGeometrySection } from '@/features/print'
import { SlicerTemplateSection } from '@/features/template'
import { TonesSection } from '@/features/tones'
import { readJSON, saveFile, writeJSON } from '@/lib/platform'
import { sampleImage } from '@/lib/sample'
import { slug } from '@/lib/slug'
import { Engine, type PreviewResult } from '@/worker/client'

const SETTINGS_KEY = 'photo-relief.settings.v1'
const BED_MM = 250

function loadSettings(): Settings {
  const d = defaultSettings()
  const s = readJSON<Partial<Settings>>(SETTINGS_KEY, {})
  return {
    print: { ...d.print, ...s.print },
    adjust: { ...d.adjust, ...s.adjust },
    tones: { ...d.tones, ...s.tones },
    filaments: s.filaments?.length ? s.filaments : d.filaments,
  }
}

const TEMPLATE_KEY = 'photo-relief.template.v1'
function loadTemplate(): SlicerTemplate {
  const raw = localStorage.getItem(TEMPLATE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as SlicerTemplate
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_TEMPLATE
}

export default function App() {
  const engine = useMemo(() => new Engine(), [])
  const defs = useMemo(defaultSettings, [])
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [template, setTemplate] = useState<SlicerTemplate>(loadTemplate)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string>('')
  const [isSample, setIsSample] = useState(true)
  const [imageVersion, setImageVersion] = useState(0)
  const [view, setView] = useState<View>('print')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState<{ stage: string; frac: number } | null>(null)
  const [status, setStatus] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null)
  const [dragging, setDragging] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const say = useCallback(
    (text: string, tone: 'ok' | 'err' = 'ok') => setStatus({ text, tone }),
    [],
  )

  useEffect(
    () =>
      engine.on((r) => {
        if (r.kind === 'loaded') setImageVersion((v) => v + 1)
        else if (r.kind === 'preview') setPreview(r)
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
        setStatus(null)
      } catch {
        say(
          `Couldn't read ${name}. Use a JPEG, PNG or WebP (iPhone HEIC photos need converting first).`,
          'err',
        )
      }
    },
    [engine, say],
  )

  useEffect(() => {
    void sampleImage().then((b) => loadImage(b, 'Sample scene', true))
  }, [loadImage])

  useEffect(() => {
    writeJSON(SETTINGS_KEY, settings)
    if (imageVersion > 0) engine.preview(settings)
  }, [settings, imageVersion, engine])

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
  }, [preview, view])

  const set = <K extends 'print' | 'adjust' | 'tones'>(k: K, patch: Partial<Settings[K]>) =>
    setSettings((s) => ({ ...s, [k]: { ...s[k], ...patch } }))
  const setFilaments = (filaments: Settings['filaments']) =>
    setSettings((s) => ({ ...s, filaments }))

  const onFiles = (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return say(`${f.name} isn't an image.`, 'err')
    void loadImage(f, f.name)
  }

  const autoLevels = () => {
    if (!preview) return
    set('adjust', computeAutoLevels(preview.hist))
  }

  const tpl = summarize(template)
  const applyTemplate = (t: SlicerTemplate) => {
    setTemplate(t)
    if (t === DEFAULT_TEMPLATE) localStorage.removeItem(TEMPLATE_KEY)
    else localStorage.setItem(TEMPLATE_KEY, JSON.stringify(t))
  }
  const resetTemplate = () => {
    applyTemplate(DEFAULT_TEMPLATE)
    say('Reverted to the built-in P2S template')
  }
  const onTemplate = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    try {
      const t = parseTemplate(new Uint8Array(await f.arrayBuffer()))
      applyTemplate(t)
      const s = summarize(t)
      say(`Template: ${s.printer} · ${s.application} · ${s.filamentSlots} slots`)
    } catch (e) {
      say((e as Error).message, 'err')
    }
  }

  const fileBase = title || slug(imageName)
  const doExport = async (plain = false) => {
    setBusy({ stage: 'Starting', frac: 0 })
    setStatus(null)
    try {
      const r = await engine.export(settings, fileBase, plain ? null : template, (stage, frac) =>
        setBusy({ stage, frac }),
      )
      setBusy({ stage: 'Saving', frac: 1 })
      const msg = await saveFile(`${fileBase}.3mf`, r.bytes)
      const mb = (r.bytes.length / 1048576).toFixed(1)
      say(`${msg} · ${(r.triangles / 1000).toFixed(0)}k triangles · ${mb} MB`)
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
      const name = `step-wedge-${settings.filaments
        .map((f) => slug(f.name.split(' ').pop() ?? ''))
        .join('-')
        .toLowerCase()}.3mf`
      say(
        `${await saveFile(name, r.bytes)} · ${r.sizeMm[0].toFixed(0)} × ${r.sizeMm[1].toFixed(0)} mm`,
      )
    } catch (e) {
      say((e as Error).message, 'err')
    } finally {
      setBusy(null)
    }
  }

  const p = settings.print
  const nBase = baseLayers(p)
  const actualBase = layerTop(nBase, p)
  const plan = preview?.plan
  const widthMm = preview?.widthMm ?? 0
  const heightMm = p.heightIn * 25.4
  const tooBig = widthMm > BED_MM || heightMm > BED_MM
  const warnings = [...(plan?.warnings ?? [])]
  if (tooBig)
    warnings.push(
      `At ${(widthMm / 25.4).toFixed(2)} × ${p.heightIn} in (${widthMm.toFixed(0)} × ${heightMm.toFixed(0)} mm) this is larger than a 256 mm bed.`,
    )

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <h1>Photo Relief</h1>
        </div>
        <p className="tagline">Photo in, layered filament relief out.</p>
      </header>

      <main className="layout">
        <aside className="controls" aria-label="Settings">
          <PhotoSection
            isSample={isSample}
            imageName={imageName}
            dragging={dragging}
            setDragging={setDragging}
            onFiles={onFiles}
          />

          <PrintGeometrySection
            print={p}
            defaults={defs.print}
            nBase={nBase}
            actualBase={actualBase}
            heightMm={heightMm}
            widthMm={widthMm}
            onChange={(patch) => set('print', patch)}
          />

          <AdjustSection
            adjust={settings.adjust}
            defaults={defs.adjust}
            canAutoLevel={!!preview}
            onChange={(patch) => set('adjust', patch)}
            onAutoLevels={autoLevels}
          />

          <TonesSection
            tones={settings.tones}
            defaults={defs.tones}
            filamentCount={settings.filaments.length}
            onChange={(patch) => set('tones', patch)}
          />

          <FilamentsSection
            filaments={settings.filaments}
            bands={plan?.bands ?? null}
            print={p}
            onChange={setFilaments}
            onStatus={(t) => say(t)}
          />

          <SlicerTemplateSection
            summary={tpl}
            isCustom={template !== DEFAULT_TEMPLATE}
            filamentCount={settings.filaments.length}
            onImport={onTemplate}
            onReset={resetTemplate}
          />
        </aside>

        <section className="workspace" aria-label="Preview and export">
          <PreviewCard
            view={view}
            setView={setView}
            hasPreview={!!preview}
            plan={plan}
            widthMm={widthMm}
            heightIn={p.heightIn}
            imageUrl={imageUrl}
            isSample={isSample}
            dragging={dragging}
            setDragging={setDragging}
            onFiles={onFiles}
            canvasRef={canvasRef}
          />

          {warnings.length > 0 && (
            <ul className="warnings" aria-live="polite">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {plan && preview && (
            <div className="plan-grid">
              <div className="panel">
                <h3>Tones</h3>
                <StackDiagram plan={plan} filaments={settings.filaments} counts={preview.counts} />
              </div>
              <div className="panel">
                <h3>Filament swaps</h3>
                <SwapTable plan={plan} filaments={settings.filaments} />
                <p className="hint num">
                  Slicer: {p.layerMm} mm layers · {p.firstLayerMm} mm first layer · 100% infill · 1
                  wall
                </p>
              </div>
            </div>
          )}

          <ExportCard
            title={title}
            setTitle={setTitle}
            namePlaceholder={slug(imageName)}
            busy={busy}
            status={status}
            canExport={!!preview}
            printerName={tpl.printer}
            usingWorker={engine.usingWorker}
            onExport={() => doExport()}
            onPlainExport={() => doExport(true)}
            onWedge={doWedge}
          />
        </section>
      </main>
    </div>
  )
}
