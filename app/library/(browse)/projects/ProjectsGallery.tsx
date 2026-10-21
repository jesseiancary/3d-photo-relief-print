'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import type { ProjectDTO } from '@/lib/library-types'
import { libraryApi } from '@/lib/store'

import { useAsync } from '../_components/useAsync'

export function ProjectsGallery({ initial }: { initial: ProjectDTO[] }) {
  const [items, setItems] = useState(initial)
  const { busy, error, run } = useAsync()

  async function remove(id: string, name: string) {
    if (!confirm(`Delete project “${name}”? Its saved image and exports are removed too.`)) return
    const ok = await run(() => libraryApi.projects.remove(id))
    if (ok !== undefined) setItems((xs) => xs.filter((p) => p.id !== id))
  }

  if (items.length === 0)
    return (
      <p className="text-caption text-muted">
        No saved projects yet. Open the tool, load a photo, and “Save project”.
      </p>
    )

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-caption text-destructive">{error}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <li key={p.id}>
            <Card className="flex h-full flex-col overflow-hidden">
              <Link href={`/library/${p.id}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- blob thumbnail, no next/image */}
                <img
                  src={p.thumbUrl ?? p.imageUrl}
                  alt={p.name}
                  className="aspect-[4/3] w-full bg-surface-2 object-cover"
                />
              </Link>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="flex min-w-0 flex-col">
                  <Link
                    href={`/library/${p.id}`}
                    className="truncate text-label text-primary-accent"
                  >
                    {p.name}
                  </Link>
                  <span className="text-caption text-muted">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <Button variant="ghost" onClick={() => remove(p.id, p.name)} disabled={busy}>
                  Delete
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
