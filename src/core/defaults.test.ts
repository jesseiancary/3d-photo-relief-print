import { describe, expect, it } from 'vitest'

import {
  defaultFilaments,
  defaultSettings,
  MAX_FILAMENTS,
  MAX_TONES,
  MIN_FILAMENTS,
  MIN_TONES,
  newId,
} from './defaults'

describe('defaults', () => {
  it('newId produces unique ids across calls', () => {
    const ids = Array.from({ length: 100 }, () => newId())
    expect(new Set(ids).size).toBe(100)
  })

  it('defaultFilaments is a 3-filament stack with distinct ids', () => {
    const f = defaultFilaments()
    expect(f).toHaveLength(3)
    expect(new Set(f.map((x) => x.id)).size).toBe(3)
    expect(f.every((x) => typeof x.id === 'string' && x.id.length > 0)).toBe(true)
  })

  it('defaultSettings has the expected default shape', () => {
    const s = defaultSettings()
    expect(s.print.heightIn).toBe(8)
    expect(s.print.cornerRadius).toBe(0)
    expect(s.tones).toEqual({ mode: 'photo', count: 8 })
    expect(s.filaments).toHaveLength(3)
  })

  it('exposes the filament/tone bounds', () => {
    expect([MIN_FILAMENTS, MAX_FILAMENTS]).toEqual([2, 4])
    expect([MIN_TONES, MAX_TONES]).toEqual([2, 10])
  })
})
