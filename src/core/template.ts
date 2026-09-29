/**
 * A "slicer template" is a real Bambu Studio / OrcaSlicer project the user saved once, whose
 * settings we reuse for every export. This is the only reliable way to make a 3MF that the slicer
 * accepts: the loader ignores config unless the model's Application tag names the slicer (e.g.
 * "BambuStudio-02.08.02.61"), and the project config must be the slicer's own complete, versioned
 * schema. We can't synthesise that, so we carry a template and change only the filament-dependent
 * bits (colours) plus the layer height at export time.
 */
import { strFromU8, unzipSync } from 'fflate'
import defaultTemplate from './defaultTemplate.json'
import type { Filament, PrintSettings } from './types'

export interface SlicerTemplate {
  /** the 3D/3dmodel.model Application tag, e.g. "BambuStudio-02.08.02.61" — reused verbatim */
  application: string
  /** the parsed project_settings.config */
  config: Record<string, unknown>
}

export interface TemplateSummary {
  application: string
  printer: string
  version: string
  filamentSlots: number
}

export const DEFAULT_TEMPLATE = defaultTemplate as SlicerTemplate

export function summarize(t: SlicerTemplate): TemplateSummary {
  const c = t.config
  return {
    application: t.application,
    printer: String(c.printer_settings_id ?? 'Unknown printer'),
    version: String(c.version ?? '?'),
    filamentSlots: Array.isArray(c.filament_colour) ? c.filament_colour.length : 0,
  }
}

/** Extract a template from an imported .3mf project the user saved from their slicer. */
export function parseTemplate(bytes: Uint8Array): SlicerTemplate {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new Error("That file isn't a valid 3MF.")
  }
  const cfgRaw = files['Metadata/project_settings.config']
  if (!cfgRaw)
    throw new Error(
      'No project settings in that 3MF. Save it as a project from Bambu Studio / OrcaSlicer (File → Save Project), not as an STL/geometry export.',
    )
  const model = files['3D/3dmodel.model']
  const application = model
    ? (strFromU8(model).match(/name="Application">([^<]+)</)?.[1] ?? '')
    : ''
  if (!application.includes('-'))
    throw new Error(
      `That project's Application tag is "${application || 'missing'}". It must name a version, like "BambuStudio-02.08.02.61", or the slicer ignores the settings.`,
    )
  let config: Record<string, unknown>
  try {
    config = JSON.parse(strFromU8(cfgRaw))
  } catch {
    throw new Error('The project settings in that 3MF are not valid JSON.')
  }
  return { application, config }
}

/**
 * project_settings.config for an export: the template's config with the first N filament slots
 * recoloured to the stack and the layer height forced to ours (so the swap heights land on layer
 * boundaries). Slots beyond the stack are left as the template had them (unused by the print).
 */
export function projectConfigFor(
  t: SlicerTemplate,
  filaments: Filament[],
  p: PrintSettings,
): { text: string; warning?: string } {
  const c: Record<string, unknown> = { ...t.config }
  const slots = Array.isArray(c.filament_colour) ? (c.filament_colour as string[]).length : 0
  const colour = Array.isArray(c.filament_colour) ? [...(c.filament_colour as string[])] : []
  filaments.forEach((f, i) => {
    if (i < colour.length) colour[i] = f.color.toUpperCase()
  })
  c.filament_colour = colour
  c.layer_height = String(p.layerMm)
  c.initial_layer_print_height = String(p.firstLayerMm)
  // Bambu reloads the named process preset on import and only honours keys listed in
  // different_settings_to_system as overrides; keys absent from it snap back to the preset's
  // value. Register our layer heights (the process slot is index 0) or they'd be ignored.
  const diffs = Array.isArray(c.different_settings_to_system)
    ? [...(c.different_settings_to_system as string[])]
    : ['']
  const process = new Set((diffs[0] ?? '').split(';').filter(Boolean))
  process.add('layer_height')
  process.add('initial_layer_print_height')
  diffs[0] = [...process].join(';')
  c.different_settings_to_system = diffs
  const warning =
    filaments.length > slots
      ? `The stack has ${filaments.length} filaments but the template has ${slots} slots. Save a template with at least ${filaments.length} filaments and import it, or the extra colours won't be set.`
      : undefined
  return { text: JSON.stringify(c), warning }
}
