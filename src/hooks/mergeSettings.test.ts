import { describe, expect, it } from 'vitest'

import { defaultSettings } from '@/core/defaults'
import type { Settings } from '@/core/types'

import { mergeSettings } from './useSettings'

describe('mergeSettings', () => {
  it('returns the defaults when the persisted value is empty', () => {
    const d = defaultSettings()
    expect(mergeSettings(d, {})).toEqual(d)
  })

  it('overlays persisted slices onto the defaults field by field', () => {
    const d = defaultSettings()
    const merged = mergeSettings(d, { print: { heightIn: 12 } as Settings['print'] })
    expect(merged.print.heightIn).toBe(12) // overridden
    expect(merged.print.pitchMm).toBe(d.print.pitchMm) // untouched field kept
    expect(merged.adjust).toEqual(d.adjust) // untouched slice kept
  })

  it('falls back to default filaments when the persisted list is missing or empty', () => {
    const d = defaultSettings()
    expect(mergeSettings(d, { filaments: [] }).filaments).toBe(d.filaments)
    expect(mergeSettings(d, {}).filaments).toBe(d.filaments)
  })

  it('keeps a non-empty persisted filament list', () => {
    const d = defaultSettings()
    const custom = [{ id: 'x', name: 'Custom', color: '#abcdef', td: 1, layers: null }]
    expect(mergeSettings(d, { filaments: custom }).filaments).toBe(custom)
  })
})
