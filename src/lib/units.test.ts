import { describe, expect, it } from 'vitest'

import { formatSize, fromMm, MM_PER_IN, sizeDigits, toMm, unitLabel } from './units'

describe('units', () => {
  it('passes millimetres through unchanged', () => {
    expect(fromMm(203.2, 'mm')).toBe(203.2)
    expect(toMm(100, 'mm')).toBe(100)
    expect(unitLabel('mm')).toBe('mm')
    expect(sizeDigits('mm')).toBe(0)
  })

  it('converts to/from inches', () => {
    expect(fromMm(MM_PER_IN, 'in')).toBeCloseTo(1, 10)
    expect(toMm(8, 'in')).toBeCloseTo(203.2, 10)
    expect(unitLabel('in')).toBe('in')
    expect(sizeDigits('in')).toBe(2)
  })

  it('round-trips a millimetre length through either unit', () => {
    for (const mm of [25.4, 100, 203.2, 304.8]) {
      expect(toMm(fromMm(mm, 'in'), 'in')).toBeCloseTo(mm, 10)
      expect(toMm(fromMm(mm, 'mm'), 'mm')).toBe(mm)
    }
  })

  it('formats with the unit-appropriate precision and suffix', () => {
    expect(formatSize(203.2, 'mm')).toBe('203 mm')
    expect(formatSize(203.2, 'in')).toBe('8.00 in')
    expect(formatSize(100, 'in')).toBe('3.94 in')
  })
})
