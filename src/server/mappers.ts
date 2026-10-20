// Pure transforms between Mongo documents (lean, plain objects) and the client-safe DTOs. No DB and
// no `server-only` import here on purpose — these are unit-tested in Node, and they reuse the core
// engine's pure helpers (defaults, tolerant merge, template summary) rather than reinventing them.

import { defaultSettings, newId } from '@/core/defaults'
import { mergeSettings } from '@/core/settings'
import { summarize, type SlicerTemplate } from '@/core/template'
import type { Filament, Settings } from '@/core/types'
import {
  DEFAULT_PREFERENCES,
  themePrefSchema,
  unitsPrefSchema,
  type FilamentProfileDTO,
  type PreferencesDTO,
  type PrinterProfileDTO,
  type TemplateDTO,
} from '@/lib/library-types'

/** The filament shape stored on a project/profile doc — no volatile client-minted id. */
export type StoredFilament = Omit<Filament, 'id'>

/** A filament as it comes back from a Mongoose `.lean()` read: `layers` is optional (schema default
 *  null) and sub-docs may carry extra cruft. Normalised by `cleanFilament`. */
interface StoredFilamentLike {
  name: string
  color: string
  td: number
  layers?: number | null
}

const idOf = (doc: { _id: unknown }): string => String(doc._id)

export function stripFilamentId({ id: _id, ...rest }: Filament): StoredFilament {
  return rest
}

export function mintFilament(f: StoredFilament, mkId: () => string = newId): Filament {
  return { ...f, id: mkId() }
}

/** Keep only the known filament fields (drops Mongoose cruft; normalises a missing `layers` to null). */
function cleanFilament({ name, color, td, layers }: StoredFilamentLike): StoredFilament {
  return { name, color, td, layers: layers ?? null }
}

/** Settings → embeddable settings sub-doc (filament ids stripped — they're re-minted on load). */
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
  return mergeSettings(defaultSettings(), { ...partial, filaments })
}

interface TemplateDocLike {
  _id: unknown
  name: string
  application: string
  config: Record<string, unknown>
}

export function templateToDTO(doc: TemplateDocLike): TemplateDTO {
  const s = summarize({ application: doc.application, config: doc.config } satisfies SlicerTemplate)
  return {
    id: idOf(doc),
    name: doc.name,
    application: s.application,
    printer: s.printer,
    version: s.version,
    filamentSlots: s.filamentSlots,
  }
}

interface FilamentProfileDocLike {
  _id: unknown
  name: string
  filaments: StoredFilamentLike[]
}

export function filamentProfileToDTO(doc: FilamentProfileDocLike): FilamentProfileDTO {
  return { id: idOf(doc), name: doc.name, filaments: doc.filaments.map(cleanFilament) }
}

interface PrinterProfileDocLike {
  _id: unknown
  name: string
  bedMm: number
  layerMm: number
  firstLayerMm: number
  pitchMm: number
  cornerRadius: number
}

export function printerProfileToDTO(doc: PrinterProfileDocLike): PrinterProfileDTO {
  return {
    id: idOf(doc),
    name: doc.name,
    bedMm: doc.bedMm,
    layerMm: doc.layerMm,
    firstLayerMm: doc.firstLayerMm,
    pitchMm: doc.pitchMm,
    cornerRadius: doc.cornerRadius,
  }
}

// Lean reads widen the enum fields to plain `string`; validate against the shared Zod enums and fall
// back to the defaults for anything unrecognised (or a missing doc). `.catch` makes a parse failure
// yield the default rather than throw.
export function preferencesToDTO(doc: { theme?: unknown; units?: unknown } | null): PreferencesDTO {
  return {
    theme: themePrefSchema.catch(DEFAULT_PREFERENCES.theme).parse(doc?.theme),
    units: unitsPrefSchema.catch(DEFAULT_PREFERENCES.units).parse(doc?.units),
  }
}
