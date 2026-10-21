import { describe, expect, it } from 'vitest'

import { defaultSettings } from '@/core/defaults'

import {
  exportCreateSchema,
  filamentProfileCreateSchema,
  filamentSchema,
  preferencesUpdateSchema,
  projectCreateSchema,
  settingsSchema,
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
  const fil = { name: 'Black', color: '#111', td: 0.6 }

  it('rejects a stack below the two-filament minimum', () => {
    expect(filamentProfileCreateSchema.safeParse({ name: 'x', filaments: [] }).success).toBe(false)
    expect(filamentProfileCreateSchema.safeParse({ name: 'x', filaments: [fil] }).success).toBe(
      false,
    )
  })

  it('accepts a two-filament stack', () => {
    expect(
      filamentProfileCreateSchema.safeParse({ name: 'x', filaments: [fil, fil] }).success,
    ).toBe(true)
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

describe('settingsSchema', () => {
  it('accepts the default settings and strips filament ids', () => {
    const parsed = settingsSchema.parse(defaultSettings())
    expect(parsed.filaments.length).toBeGreaterThan(0)
    expect(parsed.filaments.every((f) => !('id' in f))).toBe(true)
  })

  it('rejects an empty filament stack', () => {
    expect(settingsSchema.safeParse({ ...defaultSettings(), filaments: [] }).success).toBe(false)
  })

  it('rejects an unknown tone mode', () => {
    const bad = { ...defaultSettings(), tones: { mode: 'sketch', count: 8 } }
    expect(settingsSchema.safeParse(bad).success).toBe(false)
  })
})

describe('projectCreateSchema', () => {
  const assetKey = 'f5983ebc-a5d8-42ff-a094-4da2dfbe427e'

  it('accepts a minimal project and defaults thumb/template/size to null', () => {
    const parsed = projectCreateSchema.parse({
      assetKey,
      name: 'x',
      imageUrl: 'https://blob.example/i',
      settings: defaultSettings(),
    })
    expect(parsed.thumbUrl).toBeNull()
    expect(parsed.templateId).toBeNull()
    expect(parsed.imageSize).toBeNull()
  })

  it('rejects a non-URL imageUrl', () => {
    const bad = { assetKey, name: 'x', imageUrl: 'not a url', settings: defaultSettings() }
    expect(projectCreateSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a non-UUID assetKey (it becomes a blob path prefix)', () => {
    const bad = {
      assetKey: '../escape',
      name: 'x',
      imageUrl: 'https://blob.example/i',
      settings: defaultSettings(),
    }
    expect(projectCreateSchema.safeParse(bad).success).toBe(false)
  })
})

describe('exportCreateSchema', () => {
  it('defaults triangles/byteSize to 0', () => {
    const parsed = exportCreateSchema.parse({
      filename: 'a.3mf',
      threeMfUrl: 'https://blob.example/3mf',
      settings: defaultSettings(),
    })
    expect(parsed.triangles).toBe(0)
    expect(parsed.byteSize).toBe(0)
  })

  it('rejects a non-URL threeMfUrl', () => {
    const bad = { filename: 'a.3mf', threeMfUrl: 'nope', settings: defaultSettings() }
    expect(exportCreateSchema.safeParse(bad).success).toBe(false)
  })
})
