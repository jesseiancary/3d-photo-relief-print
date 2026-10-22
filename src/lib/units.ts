// Model-size unit display helpers (the `units` preference, mm | in). Scope is deliberately narrow:
// only the overall model dimensions (height input, size readouts, bed warning) switch units — layer
// height, base, and pitch stay in mm everywhere (industry standard). Storage is unchanged; these only
// convert for display/entry. Pure and framework-free so they can be unit-tested directly.

import type { UnitsPref } from './library-types'

export const MM_PER_IN = 25.4

/** Short suffix shown next to a size field/readout. */
export const unitLabel = (units: UnitsPref): string => units

/** A canonical millimetre length → the number shown in the active unit. */
export const fromMm = (mm: number, units: UnitsPref): number =>
  units === 'mm' ? mm : mm / MM_PER_IN

/** A number entered in the active unit → canonical millimetres. */
export const toMm = (value: number, units: UnitsPref): number =>
  units === 'mm' ? value : value * MM_PER_IN

/** Decimal places for a size in the given unit: whole mm, hundredths of an inch. */
export const sizeDigits = (units: UnitsPref): number => (units === 'mm' ? 0 : 2)

/** Format a millimetre length for display, e.g. "203 mm" or "8.00 in". */
export const formatSize = (mm: number, units: UnitsPref): string =>
  `${fromMm(mm, units).toFixed(sizeDigits(units))} ${unitLabel(units)}`
