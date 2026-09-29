import { useRef } from 'react'
import { Section } from '@/components/Section'
import type { TemplateSummary } from '@/core/template'

interface Props {
  summary: TemplateSummary
  isCustom: boolean
  filamentCount: number
  onImport: (files: FileList | null) => void
  onReset: () => void
}

export function SlicerTemplateSection({
  summary: tpl,
  isCustom,
  filamentCount,
  onImport,
  onReset,
}: Props) {
  const templateRef = useRef<HTMLInputElement>(null)
  return (
    <Section
      title="Slicer template"
      aside={
        isCustom ? (
          <button type="button" className="link-btn" onClick={onReset}>
            Reset
          </button>
        ) : undefined
      }
    >
      <div className="template-info">
        <strong>{tpl.printer}</strong>
        <span className="num">
          {tpl.application} · {tpl.filamentSlots} filament slots
        </span>
      </div>
      <div className="row-actions">
        <input
          ref={templateRef}
          type="file"
          accept=".3mf,model/3mf"
          className="sr-only"
          onChange={(e) => {
            onImport(e.target.files)
            e.target.value = ''
          }}
        />
        <button type="button" className="btn" onClick={() => templateRef.current?.click()}>
          Import template (.3mf)
        </button>
      </div>
      {tpl.filamentSlots < filamentCount && (
        <p className="status err">
          Template has {tpl.filamentSlots} slots but your stack uses {filamentCount}. Save a project
          with more filaments and import it.
        </p>
      )}
      <p className="hint">
        The Bambu export reuses a project you saved from your slicer, so the settings match your
        printer exactly. Save one with your printer, a 0.08 mm process, 100% infill and 1 wall, then
        import it here. Only the filament colours and layer height are changed per export.
      </p>
    </Section>
  )
}
