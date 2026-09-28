import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultSettings, MAX_TONES, MIN_TONES } from './core/defaults'
import { DEFAULT_TEMPLATE, parseTemplate, type SlicerTemplate, summarize } from './core/template'
import { baseLayers, layerTop } from './core/tones'
import type { Settings } from './core/types'
import { Engine, type PreviewResult } from './worker/client'
import { NumberField, Section, Segmented, Slider } from './ui/controls'
import { FilamentStack } from './ui/FilamentStack'
import { StackDiagram, SwapTable } from './ui/StackDiagram'
import { readJSON, saveFile, writeJSON } from './ui/platform'
import { sampleImage } from './ui/sample'

const SETTINGS_KEY = 'photo-relief.settings.v1'
const BED_MM = 250
type View = 'print' | 'adjusted' | 'original'

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
  if (raw) { try { return JSON.parse(raw) as SlicerTemplate } catch { /* fall through */ } }
  return DEFAULT_TEMPLATE
}

const slug = (s: string) => s.trim().replace(/\.[a-z0-9]+$/i, '').replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').slice(0, 60) || 'relief'

export default function App() {
  const engine = useMemo(() => new Engine(), [])
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
  const fileRef = useRef<HTMLInputElement>(null)
  const templateRef = useRef<HTMLInputElement>(null)

  const say = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => setStatus({ text, tone }), [])

  useEffect(() => engine.on((r) => {
    if (r.kind === 'loaded') setImageVersion((v) => v + 1)
    else if (r.kind === 'preview') setPreview(r)
    else if (r.kind === 'error' && r.reqId === -2) say(r.message, 'err')
  }), [engine, say])

  const loadImage = useCallback(async (blob: Blob, name: string, sample = false) => {
    try {
      await engine.load(blob)
      setImageUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob) })
      setImageName(name)
      setIsSample(sample)
      if (!sample) setTitle(slug(name))
      setStatus(null)
    } catch {
      say(`Couldn't read ${name}. Use a JPEG, PNG or WebP (iPhone HEIC photos need converting first).`, 'err')
    }
  }, [engine, say])

  useEffect(() => { void sampleImage().then((b) => loadImage(b, 'Sample scene', true)) }, [loadImage])

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
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data), preview.cols, preview.rows), 0, 0)
  }, [preview, view])

  const set = <K extends 'print' | 'adjust' | 'tones'>(k: K, patch: Partial<Settings[K]>) =>
    setSettings((s) => ({ ...s, [k]: { ...s[k], ...patch } }))
  const setFilaments = (filaments: Settings['filaments']) => setSettings((s) => ({ ...s, filaments }))

  const onFiles = (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return say(`${f.name} isn't an image.`, 'err')
    void loadImage(f, f.name)
  }

  const autoLevels = () => {
    if (!preview) return
    const n = preview.hist.reduce((a, b) => a + b, 0)
    let acc = 0, lo = 0, hi = 255
    for (let v = 0; v < 256; v++) { acc += preview.hist[v]; if (acc >= n * 0.005) { lo = v; break } }
    acc = 0
    for (let v = 255; v >= 0; v--) { acc += preview.hist[v]; if (acc >= n * 0.005) { hi = v; break } }
    set('adjust', { blackPoint: Math.min(lo, 200), whitePoint: Math.max(hi, lo + 30), gamma: 1 })
  }

  const tpl = summarize(template)
  const applyTemplate = (t: SlicerTemplate) => {
    setTemplate(t)
    if (t === DEFAULT_TEMPLATE) localStorage.removeItem(TEMPLATE_KEY)
    else localStorage.setItem(TEMPLATE_KEY, JSON.stringify(t))
  }
  const resetTemplate = () => { applyTemplate(DEFAULT_TEMPLATE); say('Reverted to the built-in P2S template') }
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
      const r = await engine.export(settings, fileBase, plain ? null : template, (stage, frac) => setBusy({ stage, frac }))
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
      const name = `step-wedge-${settings.filaments.map((f) => slug(f.name.split(' ').pop() ?? '')).join('-').toLowerCase()}.3mf`
      say(`${await saveFile(name, r.bytes)} · ${r.sizeMm[0].toFixed(0)} × ${r.sizeMm[1].toFixed(0)} mm`)
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
  if (tooBig) warnings.push(`At ${(widthMm / 25.4).toFixed(2)} × ${p.heightIn} in (${widthMm.toFixed(0)} × ${heightMm.toFixed(0)} mm) this is larger than a 256 mm bed.`)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <h1>Photo Relief</h1>
        </div>
        <p className="tagline">Photo in, layered filament relief out.</p>
      </header>

      <main className="layout">
        <aside className="controls" aria-label="Settings">
          <Section title="Photo">
            <div
              className={`dropzone${dragging ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
            >
              <input ref={fileRef} id="photo-input" type="file" accept="image/*" className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
              <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Choose photo</button>
              <span className="drop-note">{isSample ? 'or drop one here · showing a sample scene' : imageName}</span>
            </div>
          </Section>

          <Section title="Print size">
            <div className="grid2">
              <NumberField id="height-in" label="Height" unit="in" value={p.heightIn} min={1} max={12} step={0.25}
                note={<span className="num">{heightMm.toFixed(1)} × {widthMm ? widthMm.toFixed(1) : '–'} mm wide</span>}
                onChange={(v) => v && v > 0 && set('print', { heightIn: Math.min(12, v) })} />
              <NumberField id="base-mm" label="Base (first filament)" unit="mm" value={p.baseMm} min={p.firstLayerMm} max={3} step={p.layerMm}
                note={<span className="num">{nBase} layers → {actualBase.toFixed(2)} mm</span>}
                onChange={(v) => v && set('print', { baseMm: Math.max(p.firstLayerMm, v) })} />
            </div>
            <details className="more">
              <summary>Layer settings</summary>
              <div className="grid2">
                <NumberField id="layer-mm" label="Layer height" unit="mm" value={p.layerMm} min={0.04} max={0.3} step={0.02}
                  onChange={(v) => v && v >= 0.04 && set('print', { layerMm: Math.min(0.3, v) })} />
                <NumberField id="first-layer-mm" label="First layer" unit="mm" value={p.firstLayerMm} min={0.08} max={0.4} step={0.02}
                  onChange={(v) => v && v >= 0.08 && set('print', { firstLayerMm: Math.min(0.4, v) })} />
              </div>
              <div className="field">
                <label htmlFor="pitch">Model detail</label>
                <select id="pitch" value={p.pitchMm} onChange={(e) => set('print', { pitchMm: Number(e.target.value) })}>
                  <option value={0.1}>Fine · 0.10 mm grid</option>
                  <option value={0.15}>Medium · 0.15 mm grid</option>
                  <option value={0.2}>Coarse · 0.20 mm grid (smaller file)</option>
                </select>
              </div>
              <p className="hint">Set the same layer heights in your slicer. The 3MF carries the swaps, not the layer height.</p>
            </details>
          </Section>

          <Section title="Adjust" aside={<button type="button" className="link-btn" onClick={autoLevels} disabled={!preview}>Auto levels</button>}>
            <Slider id="blur" label="Smooth" unit=" mm" digits={2} min={0} max={1.5} step={0.05} value={settings.adjust.blurMm}
              hint="Median blur at print size. Removes speckle like wall texture; faces keep their edges."
              onChange={(v) => set('adjust', { blurMm: v })} />
            <Slider id="black" label="Black point" min={0} max={200} step={1} value={settings.adjust.blackPoint} onChange={(v) => set('adjust', { blackPoint: Math.min(v, settings.adjust.whitePoint - 10) })} />
            <Slider id="white" label="White point" min={55} max={255} step={1} value={settings.adjust.whitePoint} onChange={(v) => set('adjust', { whitePoint: Math.max(v, settings.adjust.blackPoint + 10) })} />
            <Slider id="gamma" label="Midtones" digits={2} min={0.4} max={2.5} step={0.05} value={settings.adjust.gamma}
              hint="Above 1 brightens, below 1 darkens." onChange={(v) => set('adjust', { gamma: v })} />
            <Slider id="sharpen" label="Sharpen" digits={1} min={0} max={2} step={0.1} value={settings.adjust.sharpen} onChange={(v) => set('adjust', { sharpen: v })} />
          </Section>

          <Section title="Tones">
            <Segmented
              label="Tone mode"
              value={settings.tones.mode}
              options={[{ value: 'photo', label: 'Photo · blended' }, { value: 'graphic', label: 'Graphic · 1 per filament' }]}
              onChange={(mode) => set('tones', { mode })}
            />
            {settings.tones.mode === 'photo' ? (
              <Slider id="tones" label="Tones" min={MIN_TONES} max={MAX_TONES} step={1} value={settings.tones.count} onChange={(v) => set('tones', { count: v })} />
            ) : (
              <p className="hint">Each filament printed fully opaque: a crisp poster look with {settings.filaments.length} tones.</p>
            )}
          </Section>

          <Section title="Filaments" aside={<span className="aside-note">top of print first</span>}>
            <FilamentStack filaments={settings.filaments} bands={plan?.bands ?? null} print={p} onChange={setFilaments} onStatus={(t) => say(t)} />
            <p className="hint">
              TD is the HueForge transmission distance. A filament reaches full coverage at about TD × 0.1 mm. Check your values with a printed step wedge.
            </p>
          </Section>

          <Section title="Slicer template" aside={template !== DEFAULT_TEMPLATE ? <button type="button" className="link-btn" onClick={resetTemplate}>Reset</button> : undefined}>
            <div className="template-info">
              <strong>{tpl.printer}</strong>
              <span className="num">{tpl.application} · {tpl.filamentSlots} filament slots</span>
            </div>
            <div className="row-actions">
              <input ref={templateRef} type="file" accept=".3mf,model/3mf" className="sr-only" onChange={(e) => { onTemplate(e.target.files); e.target.value = '' }} />
              <button type="button" className="btn" onClick={() => templateRef.current?.click()}>Import template (.3mf)</button>
            </div>
            {tpl.filamentSlots < settings.filaments.length && (
              <p className="status err">Template has {tpl.filamentSlots} slots but your stack uses {settings.filaments.length}. Save a project with more filaments and import it.</p>
            )}
            <p className="hint">
              The Bambu export reuses a project you saved from your slicer, so the settings match your printer exactly. Save one with your printer, a 0.08 mm process, 100% infill and 1 wall, then import it here. Only the filament colours and layer height are changed per export.
            </p>
          </Section>
        </aside>

        <section className="workspace" aria-label="Preview and export">
          <div className="preview-card">
            <div className="preview-head">
              <Segmented label="Preview" value={view} options={[{ value: 'print', label: 'Print' }, { value: 'adjusted', label: 'Adjusted' }, { value: 'original', label: 'Original' }]} onChange={setView} />
              {preview && (
                <span className="dims num">
                  {(widthMm / 25.4).toFixed(2)} × {p.heightIn.toFixed(2)} in · {plan ? plan.maxZ.toFixed(2) : '–'} mm tall
                </span>
              )}
            </div>
            <div
              className={`stage${dragging ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
            >
              {view === 'original' && imageUrl ? <img src={imageUrl} alt="Original" /> : <canvas ref={canvasRef} aria-label="Preview" />}
              {!preview && <p className="stage-empty">Preparing preview…</p>}
              {isSample && preview && <span className="sample-tag">Sample scene · choose a photo to start</span>}
            </div>
          </div>

          {warnings.length > 0 && (
            <ul className="warnings" aria-live="polite">
              {warnings.map((w) => <li key={w}>{w}</li>)}
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
                <p className="hint num">Slicer: {p.layerMm} mm layers · {p.firstLayerMm} mm first layer · 100% infill · 1 wall</p>
              </div>
            </div>
          )}

          <div className="export-card">
            <div className="field grow">
              <label htmlFor="file-title">File name</label>
              <div className="input-unit">
                <input id="file-title" value={title} placeholder={slug(imageName)} onChange={(e) => setTitle(e.target.value)} />
                <span className="unit">.3mf</span>
              </div>
            </div>
            <div className="export-actions">
              <button type="button" className="btn primary" disabled={!!busy || !preview} onClick={() => doExport()}>Export 3MF</button>
              <button type="button" className="btn ghost" disabled={!!busy || !preview} onClick={() => doExport(true)} title="Geometry only, for other slicers">Plain 3MF</button>
              <button type="button" className="btn ghost" disabled={!!busy} onClick={doWedge}>Step wedge</button>
            </div>
            {busy && (
              <div className="progress" role="progressbar" aria-valuenow={Math.round(busy.frac * 100)} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${Math.max(4, busy.frac * 100)}%` }} />
                <em>{busy.stage}…</em>
              </div>
            )}
            {status && <p className={`status ${status.tone}`} role="status">{status.text}</p>}
            <p className="hint">
              Export 3MF builds a {tpl.printer} project with the swaps loaded. Plain 3MF is geometry only, plus a swap-instructions.txt, for other slicers. The step wedge prints one patch per layer of each filament so you can check TD values.
              {!engine.usingWorker && ' Processing is running on the main thread in this browser, so large exports may pause the page.'}
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
