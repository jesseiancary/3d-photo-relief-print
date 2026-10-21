import { useEffect, useRef } from 'react'

import type { LoadedProject } from './useProject'
import type { Say } from './useStatus'

interface HydrationOpts {
  /** the project to open on mount; undefined on the plain `/` tool (no hydration) */
  projectId?: string
  /** flag App's onImageLoad reads to skip the per-image crop reset for the hydration load */
  hydratingRef: { current: boolean }
  load: (id: string) => Promise<LoadedProject>
  /** apply the loaded project to the tool (settings + image + template) */
  apply: (p: LoadedProject) => void
  say: Say
}

/**
 * Loads a saved project into the tool once, for the `/library/[id]` route. Lives in a hook (not in
 * App) so the composition root stays effect-free. The `hydratingRef` lets App suppress the default
 * crop reset that fires on image load, so the project's saved crop survives.
 */
export function useProjectHydration(opts: HydrationOpts) {
  const ref = useRef(opts)
  ref.current = opts

  useEffect(() => {
    const o = ref.current
    if (!o.projectId) return
    o.hydratingRef.current = true
    let cancelled = false
    o.load(o.projectId)
      .then((p) => {
        if (!cancelled) o.apply(p)
      })
      .catch((e) => {
        o.hydratingRef.current = false
        o.say((e as Error).message, 'err')
      })
    return () => {
      cancelled = true
    }
  }, [opts.projectId])
}
