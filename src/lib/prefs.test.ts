// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import type { PreferencesDTO } from './library-types'
import {
  applyTheme,
  readStoredPrefs,
  reconcilePrefs,
  THEME_KEY,
  themeAttr,
  writeStoredPrefs,
  writeThemeCookie,
} from './prefs'

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  // Expire the theme cookie between specs.
  document.cookie = `${THEME_KEY}=; path=/; max-age=0`
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

describe('themeAttr', () => {
  it('maps light/dark to themselves and system/unknown/absent to undefined', () => {
    expect(themeAttr('light')).toBe('light')
    expect(themeAttr('dark')).toBe('dark')
    expect(themeAttr('system')).toBeUndefined()
    expect(themeAttr('neon')).toBeUndefined()
    expect(themeAttr(null)).toBeUndefined()
    expect(themeAttr(undefined)).toBeUndefined()
  })
})

describe('writeThemeCookie', () => {
  it('writes the raw theme under THEME_KEY so the server can read it', () => {
    writeThemeCookie('dark')
    expect(document.cookie).toContain(`${THEME_KEY}=dark`)
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
