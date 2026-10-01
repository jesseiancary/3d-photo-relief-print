import { useRef } from 'react'
import { Button } from '@/components/Button'
import { Hint } from '@/components/Hint'
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
      title="Slicer Template"
      aside={
        isCustom ? (
          <Button variant="link" onClick={onReset}>
            Reset
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-0.5">
        <strong className="text-body">{tpl.printer}</strong>
        <span className="num text-caption text-muted">
          {tpl.application} · {tpl.filamentSlots} filament slots
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
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
        <Button onClick={() => templateRef.current?.click()}>Import Template (.3mf)</Button>
      </div>
      {tpl.filamentSlots < filamentCount && (
        <p className="m-0 text-body text-danger">
          Template has {tpl.filamentSlots} slots but your stack uses {filamentCount}. Save a project
          with more filaments and import it.
        </p>
      )}
      <Hint>
        The Bambu export reuses a project you saved from your slicer, so the settings match your
        printer exactly. Save one with your printer, a 0.08 mm process, 100% infill and 1 wall, then
        import it here. Only the filament colours and layer height are changed per export.
      </Hint>
    </Section>
  )
}
