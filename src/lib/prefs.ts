// Preferences storage + theme application. Split out from the React provider so the pure parts
// (reconcile, validated read) are unit-testable in Node without importing React/next-auth. Theme and
// units are stored as RAW strings (not JSON) so the no-flash inline script in app/layout.tsx can read
// the theme synchronously with a trivial getItem — see that script, which must stay in sync with
// THEME_KEY and the 'system' → no-attribute rule here.

import {
  DEFAULT_PREFERENCES,
  themePrefSchema,
  unitsPrefSchema,
  type PreferencesDTO,
  type ThemePref,
} from './library-types'

export const THEME_KEY = 'photo-relief.theme.v1'
export const UNITS_KEY = 'photo-relief.units.v1'

/** Reflect the theme pref onto `<html data-theme>`. 'system' removes the attribute so the
 *  prefers-color-scheme media query (wired in index.css) governs. Guarded for SSR. */
export function applyTheme(theme: ThemePref): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
}

/** The pre-hydration inline script (injected in app/layout.tsx) that sets `<html data-theme>` from the
 *  theme mirror before first paint, so signed-in dark users don't flash white. Built from THEME_KEY and
 *  mirrors applyTheme's rule (light|dark → set, 'system'/unknown → leave unset) so the two can't drift.
 *  Returns a self-contained IIFE string (no runtime references) safe to inline. */
export function themeNoFlashScript(): string {
  return `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}})()`
}

/** The prefs to use on load: the account doc wins for a signed-in user (server non-null), otherwise
 *  the locally-mirrored values. Pure — the sole decision point for the local↔account reconcile. */
export function reconcilePrefs(
  local: PreferencesDTO,
  server: PreferencesDTO | null,
): PreferencesDTO {
  return server ?? local
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore (private windows, SSR) */
  }
}

/** Read the locally-mirrored prefs, validating each against its Zod enum (unknown → default). */
export function readStoredPrefs(): PreferencesDTO {
  return {
    theme: themePrefSchema.catch(DEFAULT_PREFERENCES.theme).parse(readRaw(THEME_KEY)),
    units: unitsPrefSchema.catch(DEFAULT_PREFERENCES.units).parse(readRaw(UNITS_KEY)),
  }
}

export function writeStoredPrefs(prefs: PreferencesDTO): void {
  writeRaw(THEME_KEY, prefs.theme)
  writeRaw(UNITS_KEY, prefs.units)
}
