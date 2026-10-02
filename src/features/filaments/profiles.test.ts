import { describe, expect, it } from 'vitest'

import type { Filament } from '@/core/types'

import {
  defaultProfileName,
  instantiateProfile,
  mergeProfiles,
  parseProfiles,
  profileFromFilaments,
  removeProfile,
  upsertProfile,
  type Profile,
} from './profiles'

const fil = (name: string, color = '#000000'): Filament => ({
  id: `id-${name}`,
  name,
  color,
  td: 1,
  layers: null,
})
const prof = (name: string): Profile => ({
  name,
  filaments: [{ name, color: '#111', td: 1, layers: null }],
})

describe('profile helpers', () => {
  it('derives a default name from each filament’s last word', () => {
    expect(defaultProfileName([fil('Elegoo Black'), fil('Bambu Jade White')])).toBe('Black / White')
  })

  it('builds a profile from the stack, stripping ids and honouring a typed name', () => {
    const p = profileFromFilaments([fil('Elegoo Black')], '  My Stack  ')
    expect(p.name).toBe('My Stack')
    expect(p.filaments[0]).not.toHaveProperty('id')
    expect(p.filaments[0]).toMatchObject({ name: 'Elegoo Black' })
  })

  it('falls back to the derived name when the input is blank', () => {
    expect(profileFromFilaments([fil('Elegoo Black')], '   ').name).toBe('Black')
  })

  it('upsertProfile replaces a same-named entry and keeps the list sorted', () => {
    const existing = [prof('Bravo'), prof('Alpha')]
    const out = upsertProfile(existing, { name: 'Alpha', filaments: [] })
    expect(out.map((p) => p.name)).toEqual(['Alpha', 'Bravo'])
    expect(out.find((p) => p.name === 'Alpha')!.filaments).toEqual([]) // replaced
  })

  it('removeProfile drops the named entry', () => {
    expect(removeProfile([prof('A'), prof('B')], 'A').map((p) => p.name)).toEqual(['B'])
  })

  it('instantiateProfile mints fresh ids via the injected factory', () => {
    let n = 0
    const out = instantiateProfile(prof('X'), () => `new-${n++}`)
    expect(out[0].id).toBe('new-0')
    expect(out[0]).toMatchObject({ name: 'X' })
  })

  it('parseProfiles accepts a valid export and rejects malformed shapes', () => {
    expect(parseProfiles(JSON.stringify([prof('A')]))).toHaveLength(1)
    expect(() => parseProfiles('{}')).toThrow() // not an array
    expect(() => parseProfiles(JSON.stringify([{ name: 'x' }]))).toThrow() // filaments missing
    expect(() => parseProfiles(JSON.stringify([{ filaments: [] }]))).toThrow() // name missing
    expect(() => parseProfiles('not json')).toThrow()
  })

  it('mergeProfiles lets incoming win on a name clash and sorts the result', () => {
    const existing = [prof('Alpha'), prof('Zeta')]
    const incoming = [{ name: 'Alpha', filaments: [] }, prof('Mid')]
    const out = mergeProfiles(existing, incoming)
    expect(out.map((p) => p.name)).toEqual(['Alpha', 'Mid', 'Zeta'])
    expect(out.find((p) => p.name === 'Alpha')!.filaments).toEqual([]) // incoming replaced existing
  })
})
