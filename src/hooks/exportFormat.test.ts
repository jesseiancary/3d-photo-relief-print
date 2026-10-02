import type { Filament } from '@/core/types'
import { describe, expect, it } from 'vitest'
import { exportSummary, wedgeFilename } from './exportFormat'

const fil = (name: string): Filament => ({ id: name, name, color: '#000000', td: 1, layers: null })

describe('exportSummary', () => {
  it('formats the save message with triangle count (k) and size (MB)', () => {
    expect(exportSummary('Saved relief.3mf', 125_000, 2 * 1048576)).toBe(
      'Saved relief.3mf · 125k triangles · 2.0 MB',
    )
  })
})

describe('wedgeFilename', () => {
  it('builds a lowercased slug from each filament’s last word', () => {
    expect(wedgeFilename([fil('Elegoo Black'), fil('Bambu Jade White')])).toBe(
      'step-wedge-black-white.3mf',
    )
  })
})
