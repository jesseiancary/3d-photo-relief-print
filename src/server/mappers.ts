// Mapping between Mongo documents (lean, plain objects) and the client-safe DTOs. No DB and no
// `server-only` import on purpose — these are unit-tested in Node. The pure settings (de)serialization
// (id strip/re-mint, tolerant merge) lives in @/core/settings; this module is just the doc↔DTO layer
// on top of it, reusing the core template summary too.

import { cleanFilament, settingsToWire, type StoredFilamentLike } from '@/core/settings'
import { summarize, type SlicerTemplate } from '@/core/template'
import {
  DEFAULT_PREFERENCES,
  themePrefSchema,
  unitsPrefSchema,
  type ExportDTO,
  type FilamentProfileDTO,
  type PreferencesDTO,
  type PrinterProfileDTO,
  type ProjectDTO,
  type TemplateDTO,
} from '@/lib/library-types'

const idOf = (doc: { _id: unknown }): string => String(doc._id)

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

// Mongoose `timestamps` always set these, but the lean type marks them optional — guard so a
// missing/unparseable value yields a valid ISO string (now) instead of throwing on Invalid Date.
function iso(d: unknown): string {
  const date = d instanceof Date ? d : new Date(d as string)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

interface ProjectDocLike {
  _id: unknown
  assetKey?: string | null
  name: string
  imageUrl?: string | null
  thumbUrl?: string | null
  imageName?: string | null
  imageSize?: number | null
  settings: unknown
  templateId?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

export function projectToDTO(doc: ProjectDocLike): ProjectDTO {
  return {
    id: idOf(doc),
    assetKey: doc.assetKey ?? '',
    name: doc.name,
    imageUrl: doc.imageUrl ?? '',
    thumbUrl: doc.thumbUrl ?? null,
    imageName: doc.imageName ?? null,
    imageSize: doc.imageSize ?? null,
    settings: settingsToWire(doc.settings),
    templateId: doc.templateId ? String(doc.templateId) : null,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  }
}

interface ExportDocLike {
  _id: unknown
  projectId: unknown
  filename: string
  threeMfUrl: string
  triangles?: number
  byteSize?: number
  createdAt?: unknown
}

export function exportToDTO(doc: ExportDocLike): ExportDTO {
  return {
    id: idOf(doc),
    projectId: String(doc.projectId),
    filename: doc.filename,
    threeMfUrl: doc.threeMfUrl,
    triangles: doc.triangles ?? 0,
    byteSize: doc.byteSize ?? 0,
    createdAt: iso(doc.createdAt),
  }
}
