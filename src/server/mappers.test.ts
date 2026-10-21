import { describe, expect, it } from 'vitest'

import { defaultSettings } from '@/core/defaults'
import { settingsToDoc } from '@/core/settings'
import { DEFAULT_PREFERENCES } from '@/lib/library-types'
import { filFromPresets } from '@/test/helpers'

import {
  exportToDTO,
  filamentProfileToDTO,
  preferencesToDTO,
  printerProfileToDTO,
  projectToDTO,
  templateToDTO,
} from './mappers'

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

describe('projectToDTO', () => {
  it('maps fields, stringifies id/templateId/dates, and returns id-less settings', () => {
    const created = new Date('2026-01-02T03:04:05.000Z')
    const dto = projectToDTO({
      _id: 'p1',
      assetKey: 'folder-uuid',
      name: 'Dog',
      imageUrl: 'https://blob/img',
      thumbUrl: 'https://blob/thumb',
      imageName: 'dog.jpg',
      imageSize: 1234,
      settings: settingsToDoc({ ...defaultSettings(), filaments: filFromPresets([0, 1, 3]) }),
      templateId: { toString: () => 'abc' },
      createdAt: created,
      updatedAt: created,
    })
    expect(dto.id).toBe('p1')
    expect(dto.assetKey).toBe('folder-uuid')
    expect(dto.imageUrl).toBe('https://blob/img')
    expect(dto.thumbUrl).toBe('https://blob/thumb')
    expect(dto.imageSize).toBe(1234)
    expect(dto.templateId).toBe('abc')
    expect(dto.createdAt).toBe('2026-01-02T03:04:05.000Z')
    expect(dto.settings.filaments).toHaveLength(3)
    expect(dto.settings.filaments.every((f) => !('id' in f))).toBe(true)
  })

  it('defaults a missing image/thumb/templateId', () => {
    const now = new Date()
    const dto = projectToDTO({
      _id: 'p2',
      name: 'x',
      settings: settingsToDoc(defaultSettings()),
      createdAt: now,
      updatedAt: now,
    })
    expect(dto.imageUrl).toBe('')
    expect(dto.thumbUrl).toBeNull()
    expect(dto.templateId).toBeNull()
    expect(dto.assetKey).toBe('') // missing assetKey → empty string
  })
})

describe('exportToDTO', () => {
  it('maps fields and stringifies id/projectId/date', () => {
    expect(
      exportToDTO({
        _id: 'e1',
        projectId: { toString: () => 'p1' },
        filename: 'dog.3mf',
        threeMfUrl: 'https://blob/3mf',
        triangles: 1000,
        byteSize: 5000,
        createdAt: new Date('2026-01-02T03:04:05.000Z'),
      }),
    ).toEqual({
      id: 'e1',
      projectId: 'p1',
      filename: 'dog.3mf',
      threeMfUrl: 'https://blob/3mf',
      triangles: 1000,
      byteSize: 5000,
      createdAt: '2026-01-02T03:04:05.000Z',
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
