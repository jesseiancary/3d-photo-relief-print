import { useRef, useState } from 'react'
import { baseLayers, layerTop } from '@/core/tones'
import { AdjustSection, computeAutoLevels } from '@/features/adjust'
import { ExportCard } from '@/features/export'
import { FilamentsSection } from '@/features/filaments'
import { PhotoSection } from '@/features/photo'
import { StackDiagram, SwapTable } from '@/features/plan'
import { PreviewCard, type View } from '@/features/preview'
import { PrintGeometrySection } from '@/features/print'
import { SlicerTemplateSection } from '@/features/template'
import { TonesSection } from '@/features/tones'
import { useCanvasPreview, useReliefEngine, useSettings, useStatus, useTemplate } from '@/hooks'
import { slug } from '@/lib/slug'

const BED_MM = 250

export default function App() {
  const { status, say, clear } = useStatus()
  const { settings, defs, set, setFilaments } = useSettings()
  const { template, summary: tpl, isCustom, importTemplate, resetTemplate } = useTemplate(say)
  const engine = useReliefEngine({ settings, template, say, clear })

  const [view, setView] = useState<View>('print')
  const [dragging, setDragging] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useCanvasPreview(canvasRef, engine.preview, view)

  const autoLevels = () => {
    if (!engine.preview) return
    set('adjust', computeAutoLevels(engine.preview.hist))
  }

  const preview = engine.preview
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
            isSample={engine.isSample}
            imageName={engine.imageName}
            dragging={dragging}
            setDragging={setDragging}
            onFiles={engine.onFiles}
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
            isCustom={isCustom}
            filamentCount={settings.filaments.length}
            onImport={importTemplate}
            onReset={resetTemplate}
          />
        </aside>

        <section className="workspace" aria-label="Preview and Export">
          <PreviewCard
            view={view}
            setView={setView}
            hasPreview={!!preview}
            plan={plan}
            widthMm={widthMm}
            heightIn={p.heightIn}
            imageUrl={engine.imageUrl}
            isSample={engine.isSample}
            dragging={dragging}
            setDragging={setDragging}
            onFiles={engine.onFiles}
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
                <h3>Filament Swaps</h3>
                <SwapTable plan={plan} filaments={settings.filaments} />
                <p className="hint num">
                  Slicer: {p.layerMm} mm layers · {p.firstLayerMm} mm first layer · 100% infill · 1
                  wall
                </p>
              </div>
            </div>
          )}

          <ExportCard
            title={engine.title}
            setTitle={engine.setTitle}
            namePlaceholder={slug(engine.imageName)}
            busy={engine.busy}
            status={status}
            canExport={!!preview}
            printerName={tpl.printer}
            usingWorker={engine.usingWorker}
            onExport={() => engine.doExport()}
            onPlainExport={() => engine.doExport(true)}
            onWedge={engine.doWedge}
          />
        </section>
      </main>
    </div>
  )
}
