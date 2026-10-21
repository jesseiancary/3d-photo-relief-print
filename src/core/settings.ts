import { defaultSettings as buildDefaults, newId } from './defaults'
import type { Filament, Settings } from './types'

/**
 * Merge a persisted (possibly partial/old) Settings over the defaults, slice by slice, so a missing
 * or empty slice falls back to defaults. Pure and framework-free — the client persistence hook
 * (useSettings) and the server mappers both use it to load tolerantly.
 */
export function mergeSettings(defaultSettings: Settings, settings: Partial<Settings>): Settings {
  return {
    print: { ...defaultSettings.print, ...settings.print },
    adjust: { ...defaultSettings.adjust, ...settings.adjust },
    tones: { ...defaultSettings.tones, ...settings.tones },
    crop: { ...defaultSettings.crop, ...settings.crop },
    filaments: settings.filaments?.length ? settings.filaments : defaultSettings.filaments,
  }
}

/* ---------------- settings (de)serialization ----------------
 * Pure transforms between the live `Settings` (filaments carry a volatile client-minted id) and the
 * id-less shape stored/sent over the wire. Shared by the server mappers and the client project hook,
 * so the id-strip/re-mint convention lives in exactly one place. */

/** The filament shape stored on a project/profile doc — no volatile client-minted id. */
export type StoredFilament = Omit<Filament, 'id'>

/** A filament as it comes back from a Mongoose `.lean()` read: `layers` is optional (schema default
 *  null) and sub-docs may carry extra cruft. Normalised by `cleanFilament`. */
export interface StoredFilamentLike {
  name: string
  color: string
  td: number
  layers?: number | null
}

export function stripFilamentId({ id: _id, ...rest }: Filament): StoredFilament {
  return rest
}

export function mintFilament(f: StoredFilament, mkId: () => string = newId): Filament {
  return { ...f, id: mkId() }
}

/** Keep only the known filament fields (drops cruft; normalises a missing `layers` to null). */
export function cleanFilament({ name, color, td, layers }: StoredFilamentLike): StoredFilament {
  return { name, color, td, layers: layers ?? null }
}

/** Settings → embeddable id-less sub-doc (filament ids stripped — they're re-minted on load). */
export function settingsToDoc(s: Settings): Omit<Settings, 'filaments'> & {
  filaments: StoredFilament[]
} {
  return { ...s, filaments: s.filaments.map(stripFilamentId) }
}

/** Stored settings → Settings, tolerant of partial/old shapes, re-minting fresh filament ids. */
export function settingsFromDoc(raw: unknown, mkId: () => string = newId): Settings {
  const partial = (raw ?? {}) as Partial<Settings> & { filaments?: StoredFilamentLike[] }
  const filaments = Array.isArray(partial.filaments)
    ? partial.filaments.map((f) => mintFilament(cleanFilament(f), mkId))
    : undefined
  return mergeSettings(buildDefaults(), { ...partial, filaments })
}

/** Stored settings → the id-less wire shape for a DTO: fills missing slices from defaults WITHOUT
 *  minting ids (the client re-mints on load via settingsFromDoc). */
export function settingsToWire(raw: unknown): ReturnType<typeof settingsToDoc> {
  const partial = (raw ?? {}) as Partial<Settings> & { filaments?: StoredFilamentLike[] }
  const filaments = partial.filaments?.length ? partial.filaments.map(cleanFilament) : undefined
  // mergeSettings never reads filament ids, so passing the id-less list through is safe.
  const merged = mergeSettings(buildDefaults(), { ...partial, filaments } as Partial<Settings>)
  return { ...merged, filaments: merged.filaments.map(cleanFilament) }
}
