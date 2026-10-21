import { useRef } from 'react'

import { Button } from '@/components/Button'
import { Hint } from '@/components/Hint'
import { Section } from '@/components/Section'
import type { TemplateSummary } from '@/core/template'
import type { TemplateDTO } from '@/lib/library-types'

interface Props {
  summary: TemplateSummary
  isCustom: boolean
  filamentCount: number
  onImport: (files: FileList | null) => void
  onReset: () => void
  /** The user's saved templates (empty when signed out) + the active selection, for the picker. */
  templates: TemplateDTO[]
  templateId: string | null
  onSelect: (id: string | null) => void
}

export function SlicerTemplateSection({
  summary: tpl,
  isCustom,
  filamentCount,
  onImport,
  onReset,
  templates,
  templateId,
  onSelect,
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
      {templates.length > 0 && (
        <div className="grid gap-1">
          <label htmlFor="template-select" className="text-label">
            Saved template
          </label>
          <select
            id="template-select"
            value={templateId ?? ''}
            onChange={(e) => onSelect(e.target.value || null)}
            className="w-full"
          >
            <option value="">Built-in P2S template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
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
        <p className="m-0 text-body text-destructive">
          Template has {tpl.filamentSlots} slots but your stack uses {filamentCount}. Save a project
          with more filaments and import it.
        </p>
      )}
      <Hint>
        The Bambu export reuses a project you saved from your slicer, so the settings match your
        printer exactly. Save one with your printer, a 0.08 mm process, 100% infill and 1 wall, then
        import it here. Only the filament colors and layer height are changed per export. Save it to
        your library (Library → Templates) to pick it here and attach it to a project.
      </Hint>
    </Section>
  )
}
