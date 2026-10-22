import { useRef, useState } from 'react'

import { AppToolbar } from '@/components/AppToolbar'
import { Hint } from '@/components/Hint'
import { Panel } from '@/components/Panel'
import { baseLayers, layerTop } from '@/core/tones'
import { AdjustSection, computeAutoLevels } from '@/features/adjust'
import { useCropEditor } from '@/features/crop'
import { ExportCard } from '@/features/export'
import { FilamentsSection } from '@/features/filaments'
import { ImportPrompt } from '@/features/import'
import { PhotoSection } from '@/features/photo'
import { StackDiagram, SwapTable } from '@/features/plan'
import { PreviewCard, type View } from '@/features/preview'
import { PrintGeometrySection } from '@/features/print'
import { ProjectSection } from '@/features/project'
import { SlicerTemplateSection } from '@/features/template'
import { TonesSection } from '@/features/tones'
import {
  useCanvasPreview,
  useLibraryImport,
  usePreferences,
  usePrinter,
  useProject,
  useProjectHydration,
  useReliefEngine,
  useSettings,
  useStatus,
  useTemplate,
} from '@/hooks'
import { slug } from '@/lib/slug'
import { formatSize, MM_PER_IN } from '@/lib/units'

export default function App({ projectId }: { projectId?: string }) {
  const { status, say, clear } = useStatus()
  const { units } = usePreferences()
  const { settings, defs, set, setFilaments, replaceSettings } = useSettings()
  const printer = usePrinter((patch) => set('print', patch), say)
  const project = useProject()
  const imp = useLibraryImport()
  const {
    template,
    templateId,
    templates,
    summary: tpl,
    isCustom,
    importTemplate,
    resetTemplate,
    selectTemplate,
  } = useTemplate(say)

  // Hydrating a saved project should keep its stored crop; this flag lets onImageLoad skip the reset
  // once, for the hydration load. Ordering matters: hydratingRef → onImageLoad → engine → hydration.
  const hydratingRef = useRef(false)
  const onImageLoad = () => {
    if (hydratingRef.current) {
      hydratingRef.current = false
      return
    }
    set('crop', defs.crop)
  }
  const engine = useReliefEngine({
    settings,
    template,
    bedMm: printer.bedMm,
    say,
    clear,
    onImageLoad,
    skipSample: !!projectId,
  })
  useProjectHydration({
    projectId,
    hydratingRef,
    load: project.load,
    apply: (p) => {
      replaceSettings(p.settings)
      void engine.loadImage(p.image.blob, p.image.name)
      void selectTemplate(p.templateId)
    },
    say,
  })

  const onSaveProject = async () => {
    const blob = engine.getImageBlob()
    if (!blob || !engine.preview || !project.name.trim()) return
    await project.save({
      name: project.name.trim(),
      settings,
      templateId,
      imageBlob: blob,
      imageName: engine.imageName,
      preview: engine.preview,
    })
  }
  const onSaveExport = async () => {
    const le = engine.lastExport
    if (le) await project.saveExport(le.bytes, le.filename, le.triangles, le.settings)
  }

  const [view, setView] = useState<View>('print')
  const [dragging, setDragging] = useState(false)
  const [cropping, setCropping] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useCanvasPreview(canvasRef, engine.preview, view, cropping)

  const imgAspect = engine.imageSize ? engine.imageSize.w / engine.imageSize.h : 1
  const cropCtl = useCropEditor({
    imgAspect,
    crop: settings.crop,
    onChange: (rect) => set('crop', rect),
    fullFrame: defs.crop,
  })

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
  const heightMm = p.heightIn * MM_PER_IN
  const bedMm = printer.bedMm
  const tooBig = widthMm > bedMm || heightMm > bedMm
  const warnings = [...(plan?.warnings ?? [])]
  if (tooBig)
    warnings.push(
      `At ${formatSize(widthMm, units)} × ${formatSize(heightMm, units)} this is larger than the ${bedMm} mm bed.`,
    )

  return (
    <div className="mx-auto max-w-360 px-4 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pb-4 pt-4.5">
        <div className="flex items-center gap-2.5">
          <span className="grid w-5.5 gap-0.5" aria-hidden="true">
            <i className="block h-1.25 w-3/5 rounded-[1px] bg-[#f4f4f2] shadow-ring" />
            <i className="block h-1.25 w-4/5 rounded-[1px] bg-[#a8abb0]" />
            <i className="block h-1.25 w-full rounded-[1px] bg-[#161616]" />
          </span>
          <h1 className="m-0 font-display text-title">Photo Relief</h1>
        </div>
        <AppToolbar />
      </header>

      {imp.pending && (
        <div className="pb-4">
          <ImportPrompt
            profiles={imp.counts.profiles}
            template={imp.counts.template}
            busy={imp.busy}
            error={imp.error}
            onImport={imp.run}
            onDismiss={imp.dismiss}
          />
        </div>
      )}

      <main className="grid grid-cols-1 items-start gap-5 side:grid-cols-[minmax(300px,370px)_minmax(0,1fr)]">
        <aside className="grid gap-3" aria-label="Settings">
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
            units={units}
            printers={printer.printers}
            printerId={printer.printerId}
            onSelectPrinter={printer.selectPrinter}
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
            templates={templates}
            templateId={templateId}
            onSelect={selectTemplate}
          />

          <ProjectSection
            isAuthed={project.isAuthed}
            projectId={project.projectId}
            name={project.name}
            onName={project.setName}
            busy={project.busy}
            error={project.error}
            canSave={!!engine.preview}
            onSave={onSaveProject}
            exports={project.exports}
            lastExport={engine.lastExport}
            onSaveExport={onSaveExport}
            onRemoveExport={project.removeExport}
          />
        </aside>

        <section
          className="grid min-w-0 gap-3.5 max-side:-order-1 side:sticky side:top-[calc(env(safe-area-inset-top,0px)+12px)]"
          aria-label="Preview and Export"
        >
          <PreviewCard
            view={view}
            setView={setView}
            hasPreview={!!preview}
            plan={plan}
            widthMm={widthMm}
            heightIn={p.heightIn}
            units={units}
            imageUrl={engine.imageUrl}
            isSample={engine.isSample}
            dragging={dragging}
            setDragging={setDragging}
            onFiles={engine.onFiles}
            canvasRef={canvasRef}
            cropping={cropping}
            setCropping={setCropping}
            crop={settings.crop}
            onCrop={(rect) => set('crop', rect)}
            cropCtl={cropCtl}
          />

          {warnings.length > 0 && (
            <ul className="m-0 grid list-none gap-1.5 p-0" aria-live="polite">
              {warnings.map((w) => (
                <li
                  key={w}
                  className="rounded-control bg-warn-bg px-3 py-2 text-body text-warn-ink"
                >
                  {w}
                </li>
              ))}
            </ul>
          )}

          {plan && preview && (
            <div className="grid grid-cols-1 gap-3.5 wide:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Panel title="Tones">
                <StackDiagram plan={plan} filaments={settings.filaments} counts={preview.counts} />
              </Panel>
              <Panel title="Filament Swaps">
                <SwapTable plan={plan} filaments={settings.filaments} />
                <Hint className="num">
                  Slicer: {p.layerMm} mm layers · {p.firstLayerMm} mm first layer · 100% infill · 1
                  wall
                </Hint>
              </Panel>
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
