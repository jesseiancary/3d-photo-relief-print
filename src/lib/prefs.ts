// Preferences storage + theme application. Split out from the React provider so the pure parts
// (reconcile, validated read, themeAttr) are unit-testable in Node without importing React/next-auth.
// Theme and units are mirrored to localStorage as RAW strings (not JSON); the theme is *also* mirrored
// to a cookie (writeThemeCookie) so the server can read it in app/layout.tsx and render <html
// data-theme> on first paint — matching the client with no flash and no hydration mismatch. The
// cookie value and server rendering both go through themeAttr, so the 'system' → no-attribute rule
// lives in one place.

import {
  DEFAULT_PREFERENCES,
  themePrefSchema,
  unitsPrefSchema,
  type PreferencesDTO,
  type ThemePref,
} from './library-types'

export const THEME_KEY = 'photo-relief.theme.v1'
export const UNITS_KEY = 'photo-relief.units.v1'

/** Map a stored theme (a DTO pref, or a raw cookie string that could be anything) to the `<html
 *  data-theme>` value: explicit light|dark set the attribute; 'system'/unknown/absent leave it unset so
 *  the prefers-color-scheme media query (wired in index.css) governs. The single source of the rule,
 *  used by both the server render (app/layout.tsx) and applyTheme below. */
export function themeAttr(theme: string | null | undefined): 'light' | 'dark' | undefined {
  return theme === 'light' || theme === 'dark' ? theme : undefined
}

/** Reflect the theme pref onto `<html data-theme>`. Guarded for SSR. */
export function applyTheme(theme: ThemePref): void {
  if (typeof document === 'undefined') return
  const attr = themeAttr(theme)
  if (attr) document.documentElement.dataset.theme = attr
  else delete document.documentElement.dataset.theme
}

/** Mirror the theme to a cookie so the server can render `<html data-theme>` on first paint (no flash,
 *  no hydration mismatch). Browser-only; guarded for SSR. 1-year, root-path, Lax; not HttpOnly — it's a
 *  display pref the client sets. The raw value is stored as-is and normalised server-side via themeAttr. */
export function writeThemeCookie(theme: ThemePref): void {
  if (typeof document === 'undefined') return
  document.cookie = `${THEME_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`
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
