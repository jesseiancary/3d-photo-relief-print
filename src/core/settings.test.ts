import { describe, expect, it } from 'vitest'

import { filFromPresets } from '@/test/helpers'

import { defaultSettings } from './defaults'
import { mergeSettings, settingsFromDoc, settingsToDoc } from './settings'
import type { Settings } from './types'

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

  it('gives old persisted settings a full-frame crop default', () => {
    const d = defaultSettings()
    // A value persisted before the crop slice existed carries no `crop`.
    const legacy = { print: { heightIn: 6 } } as Partial<Settings>
    expect(mergeSettings(d, legacy).crop).toEqual({ x: 0, y: 0, w: 1, h: 1 })
  })

  it('keeps a persisted crop rectangle', () => {
    const d = defaultSettings()
    const crop = { x: 0.1, y: 0.2, w: 0.5, h: 0.6 }
    expect(mergeSettings(d, { crop }).crop).toEqual(crop)
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

describe('settings (de)serialization', () => {
  it('round-trips Settings through a doc, re-minting fresh filament ids', () => {
    const s: Settings = { ...defaultSettings(), filaments: filFromPresets([0, 1, 3]) }
    const doc = settingsToDoc(s)

    // Stored filaments carry no volatile id.
    expect(doc.filaments.every((f) => !('id' in f))).toBe(true)
    expect(doc.filaments).toHaveLength(3)

    let seq = 0
    const back = settingsFromDoc(doc, () => `m${seq++}`)

    // Fresh ids, minted by the injected generator (not the originals).
    expect(back.filaments.map((f) => f.id)).toEqual(['m0', 'm1', 'm2'])
    // Everything except the id is preserved field-for-field.
    expect(back.filaments.map(({ id: _id, ...rest }) => rest)).toEqual(
      s.filaments.map(({ id: _id, ...rest }) => rest),
    )
    expect(back.print).toEqual(s.print)
    expect(back.adjust).toEqual(s.adjust)
    expect(back.tones).toEqual(s.tones)
    expect(back.crop).toEqual(s.crop)
  })

  it('fills missing slices from defaults (tolerant of partial/old docs)', () => {
    const d = defaultSettings()
    const back = settingsFromDoc({ print: { heightIn: 12 } })
    expect(back.print.heightIn).toBe(12) // the stored field wins
    expect(back.print.pitchMm).toBe(d.print.pitchMm) // missing field falls back
    expect(back.adjust).toEqual(d.adjust) // missing slice falls back
    expect(back.filaments).toHaveLength(d.filaments.length) // no stored filaments → defaults
  })

  it('normalises an undefined stored `layers` to null', () => {
    const back = settingsFromDoc({ filaments: [{ name: 'X', color: '#fff', td: 2 }] })
    expect(back.filaments[0].layers).toBeNull()
  })
})
