'use client'

import { useRef, useState } from 'react'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Hint } from '@/components/Hint'
import { parseTemplate, summarize, type SlicerTemplate } from '@/core/template'
import type { TemplateDTO } from '@/lib/library-types'
import { libraryApi } from '@/lib/store'

import { useAsync } from '../_components/useAsync'

interface Parsed {
  template: SlicerTemplate
  name: string
  slots: number
}

export function TemplatesManager({ initial }: { initial: TemplateDTO[] }) {
  const [items, setItems] = useState(initial)
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { busy, error, setError, run } = useAsync()

  async function onFile(files: FileList | null) {
    const f = files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!f) return
    setError(null)
    try {
      const template = parseTemplate(new Uint8Array(await f.arrayBuffer()))
      const s = summarize(template)
      setParsed({ template, name: s.printer, slots: s.filamentSlots })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function saveParsed() {
    if (!parsed) return
    const created = await run(() =>
      libraryApi.templates.create({
        name: parsed.name,
        application: parsed.template.application,
        config: parsed.template.config,
      }),
    )
    if (created) {
      setItems((xs) => [...xs, created].sort((a, b) => a.name.localeCompare(b.name)))
      setParsed(null)
    }
  }

  async function saveRename() {
    if (!editing?.name.trim()) return
    const updated = await run(() => libraryApi.templates.rename(editing.id, editing.name.trim()))
    if (updated) {
      setItems((xs) =>
        xs
          .map((t) => (t.id === updated.id ? updated : t))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
      setEditing(null)
    }
  }

  async function remove(id: string, name: string) {
    // Placeholder: native confirm() until shadcn/ui lands and we swap in a styled dialog.
    if (!confirm(`Delete template “${name}”?`)) return
    const ok = await run(() => libraryApi.templates.remove(id))
    if (ok !== undefined) setItems((xs) => xs.filter((t) => t.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".3mf"
          className="hidden"
          onChange={(e) => onFile(e.target.files)}
        />
        <Button variant="primary" onClick={() => fileRef.current?.click()} disabled={busy}>
          Import Template (.3mf)
        </Button>
        <Hint>Save a project from Bambu Studio / OrcaSlicer, then import it here.</Hint>
      </div>

      {error && <p className="text-caption text-destructive">{error}</p>}

      {parsed && (
        <Card className="flex flex-col gap-2 p-4">
          <p className="text-caption text-muted">
            {parsed.template.application} · {parsed.slots} filament slots
          </p>
          <label className="text-label" htmlFor="tpl-name">
            Name
          </label>
          <input
            id="tpl-name"
            type="text"
            value={parsed.name}
            onChange={(e) => setParsed({ ...parsed, name: e.target.value })}
            className="w-full"
          />
          <div className="flex gap-2">
            <Button variant="primary" onClick={saveParsed} disabled={busy || !parsed.name.trim()}>
              Save to library
            </Button>
            <Button variant="ghost" onClick={() => setParsed(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {items.length === 0 && !parsed ? (
        <p className="text-caption text-muted">No templates yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((t) => (
            <li key={t.id}>
              <Card className="flex items-center justify-between gap-3 p-3">
                {editing?.id === t.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={editing.name}
                    onChange={(e) => setEditing({ id: t.id, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                    className="w-full"
                  />
                ) : (
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-label">{t.name}</span>
                    <span className="text-caption text-muted">
                      {t.printer} · {t.application} · {t.filamentSlots} slots
                    </span>
                  </div>
                )}
                <div className="flex shrink-0 gap-1">
                  {editing?.id === t.id ? (
                    <>
                      <Button variant="ghost" onClick={saveRename} disabled={busy}>
                        Save
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => setEditing({ id: t.id, name: t.name })}
                      >
                        Rename
                      </Button>
                      <Button variant="ghost" onClick={() => remove(t.id, t.name)} disabled={busy}>
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
