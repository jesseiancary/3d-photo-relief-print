import { describe, expect, it } from 'vitest'

import { defaultSettings } from '@/core/defaults'
import type { Settings } from '@/core/types'
import { DEFAULT_PREFERENCES } from '@/lib/library-types'
import { filFromPresets } from '@/test/helpers'

import {
  filamentProfileToDTO,
  preferencesToDTO,
  printerProfileToDTO,
  settingsFromDoc,
  settingsToDoc,
  templateToDTO,
} from './mappers'

describe('settings mappers', () => {
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

describe('templateToDTO', () => {
  it('summarises from the British `filament_colour` key (byte-for-byte protocol key)', () => {
    const dto = templateToDTO({
      _id: 'abc',
      name: 'My P1S',
      application: 'BambuStudio-02.08.02.61',
      config: {
        printer_settings_id: 'Bambu Lab P1S',
        version: '1.9.0',
        filament_colour: ['#000000', '#FFFFFF', '#5B6579'],
      },
    })
    expect(dto).toEqual({
      id: 'abc',
      name: 'My P1S',
      application: 'BambuStudio-02.08.02.61',
      printer: 'Bambu Lab P1S',
      version: '1.9.0',
      filamentSlots: 3,
    })
  })

  it('reports 0 slots (and an Unknown printer) when the config lacks filament_colour', () => {
    const dto = templateToDTO({ _id: 'x', name: 'Bare', application: 'OrcaSlicer-2.0', config: {} })
    expect(dto.filamentSlots).toBe(0)
    expect(dto.printer).toBe('Unknown printer')
  })
})

describe('filamentProfileToDTO', () => {
  it('stringifies the id and keeps only the known filament fields', () => {
    const dto = filamentProfileToDTO({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      name: 'Grayscale',
      filaments: [
        { name: 'Black', color: '#111', td: 0.6, layers: null },
        // extra cruft from a lean sub-doc + a missing `layers`
        { name: 'White', color: '#fff', td: 5, $__: 'x' } as never,
      ],
    })
    expect(dto.id).toBe('507f1f77bcf86cd799439011')
    expect(dto.filaments).toEqual([
      { name: 'Black', color: '#111', td: 0.6, layers: null },
      { name: 'White', color: '#fff', td: 5, layers: null },
    ])
  })
})

describe('printerProfileToDTO', () => {
  it('maps the geometry fields and the id', () => {
    const dto = printerProfileToDTO({
      _id: 'p1',
      name: 'P1S',
      bedMm: 256,
      layerMm: 0.08,
      firstLayerMm: 0.16,
      pitchMm: 0.1,
      cornerRadius: 2,
    })
    expect(dto).toEqual({
      id: 'p1',
      name: 'P1S',
      bedMm: 256,
      layerMm: 0.08,
      firstLayerMm: 0.16,
      pitchMm: 0.1,
      cornerRadius: 2,
    })
  })
})

describe('preferencesToDTO', () => {
  it('returns defaults for a missing doc', () => {
    expect(preferencesToDTO(null)).toEqual(DEFAULT_PREFERENCES)
  })

  it('falls back to defaults for unrecognised enum values', () => {
    expect(preferencesToDTO({ theme: 'neon', units: 'furlongs' })).toEqual(DEFAULT_PREFERENCES)
  })

  it('passes through valid values', () => {
    expect(preferencesToDTO({ theme: 'dark', units: 'mm' })).toEqual({ theme: 'dark', units: 'mm' })
  })
})
