import type { Settings } from './types'

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
