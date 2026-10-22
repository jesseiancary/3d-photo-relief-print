import { describe, expect, it } from 'vitest'

import type { Profile } from '@/features/filaments/profiles'

import { planProfileImport } from './libraryImport'

// A profile with `n` filler filaments (content is irrelevant to the import plan — only the count and
// name matter). Two filaments is the server minimum; one or zero must be rejected.
const prof = (name: string, n: number): Profile => ({
  name,
  filaments: Array.from({ length: n }, (_, i) => ({
    name: `f${i}`,
    color: '#111',
    td: 1,
    layers: null,
  })),
})

describe('planProfileImport', () => {
  it('keeps only profiles whose name is not already on the server', () => {
    const local = [prof('Mono', 2), prof('Duo', 3)]
    const plan = planProfileImport(local, ['Mono'])
    expect(plan.map((p) => p.name)).toEqual(['Duo'])
  })

  it('skips profiles outside the server filament bounds (2..MAX)', () => {
    const local = [prof('TooFew', 1), prof('Empty', 0), prof('Ok', 2), prof('TooMany', 5)]
    expect(planProfileImport(local, []).map((p) => p.name)).toEqual(['Ok'])
  })

  it('skips malformed entries (missing name or non-array filaments)', () => {
    const local = [
      { name: '', filaments: [{}, {}] },
      { filaments: [{}, {}] },
      { name: 'NoArray', filaments: null },
    ] as unknown as Profile[]
    expect(planProfileImport(local, [])).toEqual([])
  })

  it('returns everything when the server is empty', () => {
    const local = [prof('A', 2), prof('B', 4)]
    expect(planProfileImport(local, []).map((p) => p.name)).toEqual(['A', 'B'])
  })
})
