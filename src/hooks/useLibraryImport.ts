import { useSession } from 'next-auth/react'
import { useState } from 'react'

import { summarize } from '@/core/template'
import { hasImported, markImported, planProfileImport, readLocalLibrary } from '@/lib/libraryImport'
import { libraryApi } from '@/lib/store'

/**
 * Offers a one-time import of the anonymous tool's local library (filament profiles + an unlinked
 * custom template) into the signed-in account. `pending` drives a dismissible prompt; both Import and
 * Dismiss mark the (user, device) so it never nags again. Profiles are deduped by name against the
 * account; the template is created under a derived name.
 */
export function useLibraryImport() {
  const { data, status } = useSession()
  const userId = data?.user?.id ?? null
  // Snapshot the local library once on mount (it doesn't change under us during a session).
  const [local] = useState(readLocalLibrary)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasLocal = local.profiles.length > 0 || !!local.template
  const offered = userId ? hasImported(userId) : true
  const pending = status === 'authenticated' && !!userId && hasLocal && !offered && !done
  const counts = { profiles: local.profiles.length, template: local.template ? 1 : 0 }

  const dismiss = () => {
    if (userId) markImported(userId)
    setDone(true)
  }

  const run = async () => {
    if (!userId) return
    setBusy(true)
    setError(null)
    try {
      const existing = await libraryApi.filamentProfiles.list()
      const toCreate = planProfileImport(
        local.profiles,
        existing.map((p) => p.name),
      )
      for (const p of toCreate) {
        await libraryApi.filamentProfiles.create({ name: p.name, filaments: p.filaments })
      }
      if (local.template) {
        await libraryApi.templates.create({
          name: `${summarize(local.template).printer} (imported)`,
          application: local.template.application,
          config: local.template.config,
        })
      }
      markImported(userId)
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return { pending, counts, busy, error, run, dismiss }
}
