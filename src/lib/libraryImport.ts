// First-login import of the anonymous tool's local library (filament profiles + an unlinked custom
// template) into the signed-in account. The server can't read localStorage, so this runs client-side,
// offered once per (user, device) via a marker. Pure helpers here are unit-tested; the React wiring
// lives in src/hooks/useLibraryImport.ts.

import { MAX_FILAMENTS, MIN_FILAMENTS } from '@/core/defaults'
import type { SlicerTemplate } from '@/core/template'
import type { Profile } from '@/features/filaments/profiles'
import { readJSON, writeJSON } from '@/lib/platform'

// Local library keys — owned by FilamentStack + useTemplate; referenced here (read-only) for the
// one-time import. Keep in sync with those modules.
const PROFILES_KEY = 'photo-relief.profiles.v1'
const TEMPLATE_KEY = 'photo-relief.template.v1'
const TEMPLATE_ID_KEY = 'photo-relief.templateId.v1'
const IMPORTED_KEY = 'photo-relief.imported.v1'

export interface LocalLibrary {
  profiles: Profile[]
  /** a custom template not yet linked to a library row, or null */
  template: SlicerTemplate | null
}

/** Read the anonymous tool's local library: saved filament profiles + an unlinked custom template. */
export function readLocalLibrary(): LocalLibrary {
  const profiles = readJSON<Profile[]>(PROFILES_KEY, [])
  let template: SlicerTemplate | null = null
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY)
    const linked = localStorage.getItem(TEMPLATE_ID_KEY)
    // A stored template is always custom (useTemplate removes the key on reset to default); skip it if
    // it's already linked to a library row — it came from the library, so there's nothing to import.
    if (raw && !linked) template = JSON.parse(raw) as SlicerTemplate
  } catch {
    /* ignore (private windows, corrupt JSON) */
  }
  return { profiles, template }
}

/** True once this user has been offered the import on this device (imported or dismissed). */
export function hasImported(userId: string): boolean {
  return !!readJSON<Record<string, boolean>>(IMPORTED_KEY, {})[userId]
}

export function markImported(userId: string): void {
  const map = readJSON<Record<string, boolean>>(IMPORTED_KEY, {})
  map[userId] = true
  writeJSON(IMPORTED_KEY, map)
}

/**
 * Which local profiles to create on the server: those with a name not already present and a filament
 * count within the server's bounds (malformed / out-of-range entries are skipped so a create can't
 * 400). Pure — the import dedup decision point.
 */
export function planProfileImport(local: Profile[], serverNames: string[]): Profile[] {
  const taken = new Set(serverNames)
  return local.filter(
    (p) =>
      !!p.name &&
      Array.isArray(p.filaments) &&
      p.filaments.length >= MIN_FILAMENTS &&
      p.filaments.length <= MAX_FILAMENTS &&
      !taken.has(p.name),
  )
}
