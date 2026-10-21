// Single source of truth for the server-backed library contract. Zod schemas defined here drive
// THREE things from one definition: the TypeScript DTO/input types (via z.infer), the server's
// inbound request validation (schemas parsed in the API route handlers), and the client's outbound
// response validation (schemas parsed in src/lib/store.ts). Framework-free — imported by both the
// client and the server — so keep it pure: no DB, no React, no `server-only`.

import { z } from 'zod'

import { MAX_FILAMENTS, MAX_TONES, MIN_FILAMENTS, MIN_TONES } from '@/core/defaults'

export const themePrefSchema = z.enum(['light', 'dark', 'system'])
export const unitsPrefSchema = z.enum(['mm', 'in'])
export type ThemePref = z.infer<typeof themePrefSchema>
export type UnitsPref = z.infer<typeof unitsPrefSchema>

// A stored filament — the volatile client-minted `id` is not part of the contract. Unknown keys
// (e.g. an `id` on a live stack) are stripped on parse; a missing `layers` defaults to null (auto).
export const filamentSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  td: z.number().positive(),
  layers: z.number().int().positive().nullable().default(null),
})

/* ---------------- DTOs: the wire shapes the API returns ---------------- */

export const filamentProfileDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  filaments: z.array(filamentSchema),
})
export type FilamentProfileDTO = z.infer<typeof filamentProfileDTOSchema>

export const templateDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  application: z.string(),
  printer: z.string(),
  version: z.string(),
  filamentSlots: z.number(),
})
export type TemplateDTO = z.infer<typeof templateDTOSchema>

export const printerProfileDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  bedMm: z.number(),
  layerMm: z.number(),
  firstLayerMm: z.number(),
  pitchMm: z.number(),
  cornerRadius: z.number(),
})
export type PrinterProfileDTO = z.infer<typeof printerProfileDTOSchema>

export const preferencesSchema = z.object({
  theme: themePrefSchema,
  units: unitsPrefSchema,
})
export type PreferencesDTO = z.infer<typeof preferencesSchema>

export const DEFAULT_PREFERENCES: PreferencesDTO = { theme: 'system', units: 'in' }

/* ---------------- request inputs: what the client sends / the server validates ---------------- */

// A real Bambu/Orca project config serialises to tens of KB; cap the serialised JSON length so a
// single request can't store an unbounded Mixed blob. Measured in characters (UTF-16 code units),
// not bytes — a loose guard, not an exact byte budget.
const MAX_CONFIG_CHARS = 2_000_000

/** A 24-hex Mongo ObjectId as a string (matches the server's objectId() path-param check). */
const objectIdString = z.string().regex(/^[a-f\d]{24}$/i, 'invalid id')

export const templateCreateSchema = z.object({
  name: z.string().min(1),
  application: z.string().min(1),
  // Verbatim slicer config: arbitrary values with keys preserved (the British `filament_colour` /
  // `colour` keys must survive untouched). z.record never renames or drops keys.
  config: z
    .record(z.string(), z.unknown())
    .refine((c) => JSON.stringify(c).length <= MAX_CONFIG_CHARS, 'Template config is too large'),
})
export type TemplateInput = z.infer<typeof templateCreateSchema>

export const templateRenameSchema = z.object({ name: z.string().min(1) })

export const filamentProfileCreateSchema = z.object({
  name: z.string().min(1),
  filaments: z.array(filamentSchema).min(MIN_FILAMENTS).max(MAX_FILAMENTS),
})
export type FilamentProfileInput = z.infer<typeof filamentProfileCreateSchema>
export const filamentProfileUpdateSchema = filamentProfileCreateSchema.partial()

export const printerInputSchema = z.object({
  name: z.string().min(1),
  bedMm: z.number().positive(),
  layerMm: z.number().positive(),
  firstLayerMm: z.number().positive(),
  pitchMm: z.number().positive(),
  // corner rounding as a percent of the longer footprint dimension (see PrintSettings.cornerRadius).
  cornerRadius: z.number().min(0).max(10),
})
export type PrinterInput = z.infer<typeof printerInputSchema>
export const printerUpdateSchema = printerInputSchema.partial()

export const preferencesUpdateSchema = preferencesSchema.partial()

/* ---------------- projects + export history ---------------- */

// A full app Settings as it crosses the wire. Filament ids are stripped by `filamentSchema` (they're
// re-minted client-side on load, via settingsFromDoc). Bounds mirror core/types.ts + the UI ranges.
export const settingsSchema = z.object({
  print: z.object({
    heightIn: z.number().positive(),
    baseMm: z.number().min(0),
    layerMm: z.number().positive(),
    firstLayerMm: z.number().positive(),
    pitchMm: z.number().positive(),
    cornerRadius: z.number().min(0).max(10),
  }),
  adjust: z.object({
    blurMm: z.number().min(0),
    blackPoint: z.number().min(0).max(255),
    whitePoint: z.number().min(0).max(255),
    gamma: z.number().positive(),
    sharpen: z.number().min(0),
  }),
  tones: z.object({
    mode: z.enum(['photo', 'graphic']),
    count: z.number().int().min(MIN_TONES).max(MAX_TONES),
  }),
  crop: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
  filaments: z.array(filamentSchema).min(MIN_FILAMENTS).max(MAX_FILAMENTS),
})

// The full slicer template (summary + verbatim config). Served by GET /api/templates/[id] for the
// tool's template picker and for reopening a project with its saved template.
export const templateFullSchema = z.object({
  id: z.string(),
  name: z.string(),
  application: z.string(),
  config: z.record(z.string(), z.unknown()),
})
export type TemplateFull = z.infer<typeof templateFullSchema>

export const projectDTOSchema = z.object({
  id: z.string(),
  // Client-generated UUID folder for this project's blobs (NOT the db id); see the Project model.
  assetKey: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  thumbUrl: z.string().nullable(),
  imageName: z.string().nullable(),
  imageSize: z.number().nullable(),
  settings: settingsSchema,
  templateId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type ProjectDTO = z.infer<typeof projectDTOSchema>

export const projectCreateSchema = z.object({
  // A crypto.randomUUID() minted client-side; namespaces this project's blob folder. Validated as a
  // UUID so it can't smuggle slashes/`..` into the blob path (it becomes a path prefix).
  assetKey: z.uuid(),
  name: z.string().min(1),
  imageUrl: z.url(),
  thumbUrl: z.url().nullable().default(null),
  imageName: z.string().nullable().default(null),
  imageSize: z.number().nullable().default(null),
  settings: settingsSchema,
  templateId: objectIdString.nullable().default(null),
})
export type ProjectInput = z.infer<typeof projectCreateSchema>
// assetKey is set once on create and is immutable — omit it from updates (zod then strips it if sent).
export const projectUpdateSchema = projectCreateSchema.omit({ assetKey: true }).partial()

export const exportDTOSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  filename: z.string(),
  threeMfUrl: z.string(),
  triangles: z.number(),
  byteSize: z.number(),
  createdAt: z.string(),
})
export type ExportDTO = z.infer<typeof exportDTOSchema>

export const exportCreateSchema = z.object({
  filename: z.string().min(1),
  threeMfUrl: z.url(),
  triangles: z.number().int().min(0).default(0),
  byteSize: z.number().int().min(0).default(0),
  settings: settingsSchema,
})
export type ExportInput = z.infer<typeof exportCreateSchema>
