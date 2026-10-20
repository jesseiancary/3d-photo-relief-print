// Client-side data layer for the server-backed library. The relief tool keeps its own local working
// copy in localStorage (useSettings / useTemplate / FilamentStack) and is unchanged; this module is
// the typed fetch client the signed-in library screens use to talk to the /api routes. Responses are
// validated against the SAME Zod schemas the server validates inbound with (library-types.ts), so a
// wrong-shaped payload fails loudly here instead of being trusted via a cast. The library is behind
// the auth gate, so logged-out users never reach these calls.

import type { z } from 'zod'

import {
  filamentProfileDTOSchema,
  preferencesSchema,
  printerProfileDTOSchema,
  templateDTOSchema,
  type FilamentProfileInput,
  type PreferencesDTO,
  type PrinterInput,
  type TemplateInput,
} from './library-types'

export type { FilamentProfileInput, PrinterInput, TemplateInput }

async function req<S extends z.ZodType>(
  url: string,
  schema: S,
  init?: RequestInit,
): Promise<z.output<S>> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok)
    throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`)
  return schema.parse(data)
}

/** DELETE routes return `{ ok: true }`; callers don't need the body, so skip response validation.
 *  Resolves to `true` on success so the caller's `useAsync.run` (which returns `undefined` on
 *  failure) can distinguish a completed delete from a failed one and update the list accordingly. */
async function del(url: string): Promise<true> {
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`)
  }
  return true
}

const post = (v: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(v) })
const patch = (v: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(v) })

export const libraryApi = {
  templates: {
    list: () => req('/api/templates', templateDTOSchema.array()),
    create: (input: TemplateInput) => req('/api/templates', templateDTOSchema, post(input)),
    rename: (id: string, name: string) =>
      req(`/api/templates/${id}`, templateDTOSchema, patch({ name })),
    remove: (id: string) => del(`/api/templates/${id}`),
  },
  filamentProfiles: {
    list: () => req('/api/filament-profiles', filamentProfileDTOSchema.array()),
    create: (input: FilamentProfileInput) =>
      req('/api/filament-profiles', filamentProfileDTOSchema, post(input)),
    update: (id: string, patchBody: Partial<FilamentProfileInput>) =>
      req(`/api/filament-profiles/${id}`, filamentProfileDTOSchema, patch(patchBody)),
    remove: (id: string) => del(`/api/filament-profiles/${id}`),
  },
  printers: {
    list: () => req('/api/printers', printerProfileDTOSchema.array()),
    create: (input: PrinterInput) => req('/api/printers', printerProfileDTOSchema, post(input)),
    update: (id: string, patchBody: Partial<PrinterInput>) =>
      req(`/api/printers/${id}`, printerProfileDTOSchema, patch(patchBody)),
    remove: (id: string) => del(`/api/printers/${id}`),
  },
  prefs: {
    get: () => req('/api/prefs', preferencesSchema),
    update: (patchBody: Partial<PreferencesDTO>) =>
      req('/api/prefs', preferencesSchema, patch(patchBody)),
  },
}
