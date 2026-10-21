import Link from 'next/link'

import { Button } from '@/components/Button'
import { Hint } from '@/components/Hint'
import { Section } from '@/components/Section'
import type { ExportDTO } from '@/lib/library-types'

interface ProjectSectionProps {
  isAuthed: boolean
  projectId: string | null
  name: string
  onName: (v: string) => void
  busy: boolean
  error: string | null
  /** a preview + source image exist, so there is something to save */
  canSave: boolean
  onSave: () => void
  exports: ExportDTO[]
  lastExport: { filename: string } | null
  onSaveExport: () => void
  onRemoveExport: (id: string) => void
}

const when = (iso: string) => new Date(iso).toLocaleString()

export function ProjectSection({
  isAuthed,
  projectId,
  name,
  onName,
  busy,
  error,
  canSave,
  onSave,
  exports,
  lastExport,
  onSaveExport,
  onRemoveExport,
}: ProjectSectionProps) {
  if (!isAuthed)
    return (
      <Section title="Project">
        <Hint>
          <Link href="/signin?callbackUrl=/" className="text-label text-primary-accent">
            Sign in
          </Link>{' '}
          to save this image, settings, and template as a project and reopen it on any device.
        </Hint>
      </Section>
    )

  return (
    <Section title="Project">
      <div className="grid gap-1">
        <label htmlFor="project-name" className="text-label">
          Project name
        </label>
        <input
          id="project-name"
          type="text"
          value={name}
          placeholder="Untitled"
          onChange={(e) => onName(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={onSave} disabled={busy || !canSave || !name.trim()}>
          {projectId ? 'Update project' : 'Save project'}
        </Button>
        {projectId && <span className="text-caption text-muted">Saved to your library</span>}
      </div>

      {error && <p className="text-caption text-destructive">{error}</p>}

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 uppercase text-heading text-muted">Export history</h3>
          <Button
            variant="ghost"
            onClick={onSaveExport}
            disabled={busy || !projectId || !lastExport}
          >
            Save last export
          </Button>
        </div>
        {!projectId ? (
          <Hint>Save the project first to keep a history of its 3MF exports.</Hint>
        ) : exports.length === 0 ? (
          <Hint>No saved exports yet. Export a 3MF, then “Save last export”.</Hint>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {exports.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-control border border-line px-3 py-2"
              >
                <span className="flex min-w-0 flex-col">
                  <a
                    href={e.threeMfUrl}
                    download={e.filename}
                    className="truncate text-label text-primary-accent"
                  >
                    {e.filename}
                  </a>
                  <span className="text-caption text-muted">{when(e.createdAt)}</span>
                </span>
                <Button
                  variant="icon"
                  label="Delete export"
                  onClick={() =>
                    confirm(`Are you sure you want to delete export “${e.filename}”?`) &&
                    onRemoveExport(e.id)
                  }
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}
