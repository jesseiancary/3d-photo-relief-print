// Single source of truth for the server-backed library contract. Zod schemas defined here drive
// THREE things from one definition: the TypeScript DTO/input types (via z.infer), the server's
// inbound request validation (schemas parsed in the API route handlers), and the client's outbound
// response validation (schemas parsed in src/lib/store.ts). Framework-free — imported by both the
// client and the server — so keep it pure: no DB, no React, no `server-only`.

import { z } from 'zod'

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

// A real Bambu/Orca project config serialises to tens of KB; cap at 2 MB so a single request can't
// store an unbounded Mixed blob. The limit is on the serialised size, not key count.
const MAX_CONFIG_BYTES = 2_000_000

export const templateCreateSchema = z.object({
  name: z.string().min(1),
  application: z.string().min(1),
  // Verbatim slicer config: arbitrary values with keys preserved (the British `filament_colour` /
  // `colour` keys must survive untouched). z.record never renames or drops keys.
  config: z
    .record(z.string(), z.unknown())
    .refine((c) => JSON.stringify(c).length <= MAX_CONFIG_BYTES, 'Template config is too large'),
})
export type TemplateInput = z.infer<typeof templateCreateSchema>

export const templateRenameSchema = z.object({ name: z.string().min(1) })

export const filamentProfileCreateSchema = z.object({
  name: z.string().min(1),
  filaments: z.array(filamentSchema).min(1),
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
