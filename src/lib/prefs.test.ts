// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import type { PreferencesDTO } from './library-types'
import {
  applyTheme,
  readStoredPrefs,
  reconcilePrefs,
  THEME_KEY,
  themeNoFlashScript,
  writeStoredPrefs,
} from './prefs'

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

const prefs = (theme: PreferencesDTO['theme'], units: PreferencesDTO['units']): PreferencesDTO => ({
  theme,
  units,
})

describe('reconcilePrefs', () => {
  it('prefers the account doc when present, else the local mirror', () => {
    const local = prefs('dark', 'mm')
    const server = prefs('light', 'in')
    expect(reconcilePrefs(local, server)).toBe(server)
    expect(reconcilePrefs(local, null)).toBe(local)
  })
})

describe('applyTheme', () => {
  it('sets data-theme for light/dark and removes it for system', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    applyTheme('system')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })
})

describe('themeNoFlashScript', () => {
  it('reads the mirror under THEME_KEY and only sets the attribute for light/dark', () => {
    const script = themeNoFlashScript()
    // Built from THEME_KEY so the inline script can't drift from the stored key.
    expect(script).toContain(THEME_KEY)
    expect(script).toContain("t==='light'")
    expect(script).toContain("t==='dark'")
    expect(script).toContain('document.documentElement.dataset.theme')
    // No 'system' branch — matches applyTheme leaving the attribute unset for system/unknown.
    expect(script).not.toContain('system')
  })
})

describe('stored prefs mirror', () => {
  it('round-trips validated values', () => {
    writeStoredPrefs(prefs('dark', 'mm'))
    expect(readStoredPrefs()).toEqual(prefs('dark', 'mm'))
  })

  it('falls back to defaults for an unknown stored value', () => {
    localStorage.setItem(THEME_KEY, 'neon')
    expect(readStoredPrefs().theme).toBe('system')
  })
})
