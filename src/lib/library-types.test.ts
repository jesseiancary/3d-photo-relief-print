import { describe, expect, it } from 'vitest'

import {
  filamentProfileCreateSchema,
  filamentSchema,
  preferencesUpdateSchema,
  templateCreateSchema,
} from './library-types'

describe('templateCreateSchema', () => {
  it('preserves the verbatim config, including the British `filament_colour` keys', () => {
    const config = {
      filament_colour: ['#000000', '#FFFFFF'],
      filament_colour_type: ['0', '0'],
      extruder_colour: ['#111111'],
      default_filament_colour: [''],
      nested: { any: [1, 2, 3] },
    }
    const parsed = templateCreateSchema.parse({
      name: 'P1S',
      application: 'BambuStudio-02.08.02.61',
      config,
    })
    // No key renamed or dropped, values untouched — a `colour`→`color` rename would break this.
    expect(parsed.config).toEqual(config)
    expect(Object.keys(parsed.config)).toEqual(Object.keys(config))
  })

  it('rejects an empty name', () => {
    expect(templateCreateSchema.safeParse({ name: '', application: 'X', config: {} }).success).toBe(
      false,
    )
  })
})

describe('filamentSchema', () => {
  it('strips an unknown id and defaults a missing `layers` to null', () => {
    expect(filamentSchema.parse({ id: 'f1', name: 'Black', color: '#111', td: 0.6 })).toEqual({
      name: 'Black',
      color: '#111',
      td: 0.6,
      layers: null,
    })
  })

  it('keeps a provided `layers`', () => {
    expect(filamentSchema.parse({ name: 'W', color: '#fff', td: 5, layers: 4 }).layers).toBe(4)
  })
})

describe('filamentProfileCreateSchema', () => {
  it('requires at least one filament', () => {
    expect(filamentProfileCreateSchema.safeParse({ name: 'x', filaments: [] }).success).toBe(false)
  })
})

describe('preferencesUpdateSchema', () => {
  it('accepts a partial patch and an empty patch', () => {
    expect(preferencesUpdateSchema.parse({ theme: 'dark' })).toEqual({ theme: 'dark' })
    expect(preferencesUpdateSchema.parse({})).toEqual({})
  })

  it('rejects an unknown enum value', () => {
    expect(preferencesUpdateSchema.safeParse({ theme: 'neon' }).success).toBe(false)
  })
})
