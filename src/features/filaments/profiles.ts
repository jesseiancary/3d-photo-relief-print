import { newId } from '@/core/defaults'
import type { Filament } from '@/core/types'

/** A saved filament stack (ids stripped — they're minted fresh when loaded). */
export interface Profile {
  name: string
  filaments: Omit<Filament, 'id'>[]
}

const byName = (a: Profile, b: Profile) => a.name.localeCompare(b.name)

/** Default profile name from the stack: each filament's last word joined by " / ". */
export function defaultProfileName(filaments: Filament[]): string {
  return filaments.map((f) => f.name.split(' ').pop()).join(' / ')
}

/** Build a profile entry from the current stack, stripping volatile ids. */
export function profileFromFilaments(filaments: Filament[], nameInput: string): Profile {
  const name = nameInput.trim() || defaultProfileName(filaments)
  return { name, filaments: filaments.map(({ id: _id, ...rest }) => rest) }
}

/** Replace any same-named profile with `entry`, kept sorted by name. */
export function upsertProfile(profiles: Profile[], entry: Profile): Profile[] {
  return [...profiles.filter((p) => p.name !== entry.name), entry].sort(byName)
}

export function removeProfile(profiles: Profile[], name: string): Profile[] {
  return profiles.filter((p) => p.name !== name)
}

/** Turn a saved profile back into a live stack, minting fresh ids. */
export function instantiateProfile(profile: Profile, mkId: () => string = newId): Filament[] {
  return profile.filaments.map((f) => ({ ...f, id: mkId() }))
}

/** Parse & validate a profiles-JSON export; throws if the shape is wrong. */
export function parseProfiles(text: string): Profile[] {
  const incoming = JSON.parse(text) as Profile[]
  if (!Array.isArray(incoming) || !incoming.every((p) => p.name && Array.isArray(p.filaments)))
    throw new Error('not a filament profile export')
  return incoming
}

/** Merge imported profiles over existing ones (incoming wins on name clash), sorted by name. */
export function mergeProfiles(existing: Profile[], incoming: Profile[]): Profile[] {
  return [...existing.filter((p) => !incoming.some((q) => q.name === p.name)), ...incoming].sort(
    byName,
  )
}
