'use client'

import { useId, useState } from 'react'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Hint } from '@/components/Hint'
import { FILAMENT_PRESETS, MAX_FILAMENTS, MIN_FILAMENTS } from '@/core/defaults'
import type { Filament } from '@/core/types'
import type { FilamentProfileDTO } from '@/lib/library-types'
import { libraryApi } from '@/lib/store'

import { useAsync } from '../_components/useAsync'

type Stack = Omit<Filament, 'id'>[]

const blankStack = (): Stack => FILAMENT_PRESETS.slice(0, MIN_FILAMENTS).map((f) => ({ ...f }))

function FilamentForm({
  initialName,
  initialStack,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initialName: string
  initialStack: Stack
  submitLabel: string
  busy: boolean
  onSubmit: (name: string, stack: Stack) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [stack, setStack] = useState<Stack>(initialStack)

  const setRow = (i: number, patch: Partial<Omit<Filament, 'id'>>) =>
    setStack((s) => s.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const valid = stack.length >= MIN_FILAMENTS && stack.every((f) => f.name.trim() && f.td > 0)
  // Unique per form instance so an open "New" form and a row's "Edit" form never share an id.
  const nameId = useId()

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="grid gap-1">
        <label className="text-label" htmlFor={nameId}>
          Profile name
        </label>
        <input
          id={nameId}
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-2">
        {/* Column headers aligned to the row fields below: swatch = w-7.5 (30px), remove = w-6.5. */}
        <div className="flex items-center gap-2 text-caption text-muted">
          <span className="w-7.5 shrink-0">Color</span>
          <span className="min-w-0 flex-1">Filament name</span>
          <span className="w-20">TD (mm)</span>
          <span className="w-20">Layers</span>
          <span className="w-6.5 shrink-0" aria-hidden />
        </div>
        {stack.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Color"
              value={f.color}
              onChange={(e) => setRow(i, { color: e.target.value })}
              className="swatch-input"
            />
            <input
              type="text"
              aria-label="Filament name"
              value={f.name}
              placeholder="Filament name"
              onChange={(e) => setRow(i, { name: e.target.value })}
              className="min-w-0 flex-1"
            />
            <input
              type="number"
              aria-label="Transmission distance"
              value={f.td}
              min={0}
              step={0.1}
              onChange={(e) => setRow(i, { td: Number(e.target.value) })}
              className="w-20 font-mono"
            />
            <input
              type="number"
              aria-label="Layers (blank = auto)"
              value={f.layers ?? ''}
              min={1}
              step={1}
              placeholder="auto"
              onChange={(e) =>
                setRow(i, { layers: e.target.value === '' ? null : Number(e.target.value) })
              }
              className="w-20 font-mono"
            />
            <Button
              variant="icon"
              label="Remove filament"
              disabled={stack.length <= MIN_FILAMENTS}
              onClick={() => setStack((s) => s.filter((_, j) => j !== i))}
            >
              ✕
            </Button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Hint>TD = transmission distance (mm). Layers blank = auto (opaque).</Hint>
          <Button
            variant="ghost"
            disabled={stack.length >= MAX_FILAMENTS}
            onClick={() =>
              setStack((s) => [...s, { ...FILAMENT_PRESETS[s.length % FILAMENT_PRESETS.length] }])
            }
          >
            Add filament
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={() => onSubmit(name, stack)}
          disabled={busy || !valid || !name.trim()}
        >
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </Card>
  )
}

export function FilamentProfilesManager({ initial }: { initial: FilamentProfileDTO[] }) {
  const [items, setItems] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { busy, error, run } = useAsync()

  const sortIn = (xs: FilamentProfileDTO[]) => [...xs].sort((a, b) => a.name.localeCompare(b.name))

  async function create(name: string, filaments: Stack) {
    const created = await run(() =>
      libraryApi.filamentProfiles.create({ name: name.trim(), filaments }),
    )
    if (created) {
      setItems((xs) => sortIn([...xs, created]))
      setAdding(false)
    }
  }

  async function update(id: string, name: string, filaments: Stack) {
    const updated = await run(() =>
      libraryApi.filamentProfiles.update(id, { name: name.trim(), filaments }),
    )
    if (updated) {
      setItems((xs) => sortIn(xs.map((p) => (p.id === id ? updated : p))))
      setEditingId(null)
    }
  }

  async function remove(id: string, name: string) {
    // Placeholder: native confirm() until shadcn/ui lands and we swap in a styled dialog.
    if (!confirm(`Delete profile “${name}”?`)) return
    const ok = await run(() => libraryApi.filamentProfiles.remove(id))
    if (ok !== undefined) setItems((xs) => xs.filter((p) => p.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      {!adding && (
        <div>
          <Button variant="primary" onClick={() => setAdding(true)} disabled={busy}>
            New Profile
          </Button>
        </div>
      )}
      {error && <p className="text-caption text-destructive">{error}</p>}
      {adding && (
        <FilamentForm
          initialName=""
          initialStack={blankStack()}
          submitLabel="Create"
          busy={busy}
          onSubmit={create}
          onCancel={() => setAdding(false)}
        />
      )}

      {items.length === 0 && !adding ? (
        <p className="text-caption text-muted">No filament profiles yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((p) =>
            editingId === p.id ? (
              <li key={p.id}>
                <FilamentForm
                  initialName={p.name}
                  initialStack={p.filaments}
                  submitLabel="Save"
                  busy={busy}
                  onSubmit={(name, stack) => update(p.id, name, stack)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={p.id}>
                <Card className="flex items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex shrink-0 gap-1">
                      {p.filaments.map((f, i) => (
                        <span
                          key={i}
                          title={f.name}
                          className="h-5 w-5 rounded-sm border border-line"
                          style={{ background: f.color }}
                        />
                      ))}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-label">{p.name}</span>
                      <span className="text-caption text-muted">
                        {p.filaments.length} filaments
                      </span>
                    </div>
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
