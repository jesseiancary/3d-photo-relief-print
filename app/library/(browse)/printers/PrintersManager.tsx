'use client'

import { useId, useState } from 'react'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { NumberField } from '@/components/NumberField'
import { DEFAULT_BED_MM } from '@/core/defaults'
import type { PrinterProfileDTO } from '@/lib/library-types'
import { libraryApi, type PrinterInput } from '@/lib/store'

import { useAsync } from '../_components/useAsync'

// Defaults for a new printer: the app's print defaults plus the tool's fallback bed (DEFAULT_BED_MM),
// which the profile makes into saveable per-user config once selected in the tool.
const BLANK: PrinterInput = {
  name: '',
  bedMm: DEFAULT_BED_MM,
  layerMm: 0.08,
  firstLayerMm: 0.16,
  pitchMm: 0.1,
  cornerRadius: 0,
}

const NUM: { key: keyof Omit<PrinterInput, 'name'>; label: string; step: number; unit: string }[] =
  [
    { key: 'bedMm', label: 'Bed size', step: 1, unit: 'mm' },
    { key: 'layerMm', label: 'Layer height', step: 0.01, unit: 'mm' },
    { key: 'firstLayerMm', label: 'First layer', step: 0.01, unit: 'mm' },
    { key: 'pitchMm', label: 'Pixel pitch', step: 0.01, unit: 'mm' },
    { key: 'cornerRadius', label: 'Corner radius', step: 1, unit: '%' },
  ]

function PrinterForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: PrinterInput
  submitLabel: string
  busy: boolean
  onSubmit: (v: PrinterInput) => void
  onCancel?: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const valid = draft.name.trim() && NUM.every(({ key }) => Number.isFinite(draft[key]))
  // Unique per form instance so an open "New" form and a row's "Edit" form never share an id
  // (duplicate ids make a <label> focus the wrong field).
  const baseId = useId()

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="grid gap-1">
        <label className="text-label" htmlFor={`${baseId}-name`}>
          Name
        </label>
        <input
          id={`${baseId}-name`}
          type="text"
          autoFocus
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="w-full"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {NUM.map(({ key, label, step, unit }) => (
          <NumberField
            key={key}
            id={`${baseId}-${key}`}
            label={label}
            value={draft[key]}
            step={step}
            unit={unit}
            onChange={(v) => setDraft({ ...draft, [key]: v ?? 0 })}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => onSubmit(draft)} disabled={busy || !valid}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </Card>
  )
}

const summary = (p: PrinterProfileDTO) =>
  `${p.bedMm}mm bed · ${p.layerMm}/${p.firstLayerMm}mm layers · ${p.pitchMm}mm pitch`

export function PrintersManager({ initial }: { initial: PrinterProfileDTO[] }) {
  const [items, setItems] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { busy, error, run } = useAsync()

  const sortIn = (xs: PrinterProfileDTO[]) => [...xs].sort((a, b) => a.name.localeCompare(b.name))

  async function create(v: PrinterInput) {
    const created = await run(() => libraryApi.printers.create({ ...v, name: v.name.trim() }))
    if (created) {
      setItems((xs) => sortIn([...xs, created]))
      setAdding(false)
    }
  }

  async function update(id: string, v: PrinterInput) {
    const updated = await run(() => libraryApi.printers.update(id, { ...v, name: v.name.trim() }))
    if (updated) {
      setItems((xs) => sortIn(xs.map((p) => (p.id === id ? updated : p))))
      setEditingId(null)
    }
  }

  async function remove(id: string, name: string) {
    // Placeholder: native confirm() until shadcn/ui lands and we swap in a styled dialog.
    if (!confirm(`Delete printer “${name}”?`)) return
    const ok = await run(() => libraryApi.printers.remove(id))
    if (ok !== undefined) setItems((xs) => xs.filter((p) => p.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      {!adding && (
        <div>
          <Button variant="primary" onClick={() => setAdding(true)} disabled={busy}>
            New printer
          </Button>
        </div>
      )}
      {error && <p className="text-caption text-destructive">{error}</p>}
      {adding && (
        <PrinterForm
          initial={BLANK}
          submitLabel="Create"
          busy={busy}
          onSubmit={create}
          onCancel={() => setAdding(false)}
        />
      )}

      {items.length === 0 && !adding ? (
        <p className="text-caption text-muted">No printers yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((p) =>
            editingId === p.id ? (
              <li key={p.id}>
                <PrinterForm
                  initial={p}
                  submitLabel="Save"
                  busy={busy}
                  onSubmit={(v) => update(p.id, v)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={p.id}>
                <Card className="flex items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-label">{p.name}</span>
                    <span className="text-caption text-muted">{summary(p)}</span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" onClick={() => setEditingId(p.id)} disabled={busy}>
                      Edit
                    </Button>
                    <Button variant="ghost" onClick={() => remove(p.id, p.name)} disabled={busy}>
                      Delete
                    </Button>
                  </div>
                </Card>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}
