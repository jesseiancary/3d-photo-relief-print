import { useState } from 'react'
import { Button } from '@/components/Button'
import { Hint } from '@/components/Hint'
import { FILAMENT_PRESETS, MAX_FILAMENTS, MIN_FILAMENTS, newId } from '@/core/defaults'
import { autoLayers, type Band } from '@/core/tones'
import type { Filament, PrintSettings } from '@/core/types'
import { pickTextFile, readJSON, saveFile, writeJSON } from '@/lib/platform'
import {
  instantiateProfile,
  mergeProfiles,
  parseProfiles,
  profileFromFilaments,
  removeProfile,
  upsertProfile,
  type Profile,
} from './profiles'

const PROFILES_KEY = 'photo-relief.profiles.v1'

export interface FilamentStackProps {
  filaments: Filament[]
  bands: Band[] | null
  print: PrintSettings
  onChange: (f: Filament[]) => void
  onStatus: (msg: string) => void
}

export function FilamentStack({ filaments, bands, print, onChange, onStatus }: FilamentStackProps) {
  const [profiles, setProfiles] = useState<Profile[]>(() => readJSON<Profile[]>(PROFILES_KEY, []))
  const [profileName, setProfileName] = useState('')

  const update = (i: number, patch: Partial<Filament>) =>
    onChange(filaments.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= filaments.length) return
    const next = [...filaments]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const remove = (i: number) => onChange(filaments.filter((_, j) => j !== i))
  const add = (presetIdx: number) => {
    if (filaments.length >= MAX_FILAMENTS) return
    const p = FILAMENT_PRESETS[presetIdx] ?? {
      name: 'Accent',
      color: '#C12E1F',
      td: 4,
      layers: null,
    }
    onChange([...filaments, { ...p, id: newId() }])
  }

  const saveProfiles = (p: Profile[]) => {
    setProfiles(p)
    writeJSON(PROFILES_KEY, p)
  }
  const saveProfile = () => {
    const entry = profileFromFilaments(filaments, profileName)
    saveProfiles(upsertProfile(profiles, entry))
    setProfileName('')
    onStatus(`Saved filament profile “${entry.name}”`)
  }
  const loadProfile = (name: string) => {
    const p = profiles.find((x) => x.name === name)
    if (p) onChange(instantiateProfile(p))
  }

  const rows = filaments.map((f, i) => ({ f, i })).reverse() // top of the print first

  return (
    <div className="grid gap-2.5">
      <ol className="m-0 grid list-none gap-1.5 p-0">
        {rows.map(({ f, i }) => {
          const b = bands?.[i]
          const isBase = i === 0
          return (
            <li
              key={f.id}
              className="grid gap-1.5 rounded-control border border-line bg-surface-2 p-2"
            >
              <div className="flex items-center gap-1.5">
                <input
                  id={`fil-color-${f.id}`}
                  className="swatch-input"
                  type="color"
                  value={f.color.length === 7 ? f.color : '#888888'}
                  aria-label={`${f.name} color`}
                  onChange={(e) => update(i, { color: e.target.value.toUpperCase() })}
                />
                <input
                  id={`fil-name-${f.id}`}
                  className="grow bg-surface! font-medium"
                  value={f.name}
                  aria-label="Filament Name"
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                <div className="flex flex-none">
                  <Button
                    variant="icon"
                    label="Move Up"
                    disabled={i === filaments.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="icon"
                    label="Move Down"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="icon"
                    label={`Remove ${f.name}`}
                    disabled={filaments.length <= MIN_FILAMENTS}
                    onClick={() => remove(i)}
                  >
                    ×
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.25 text-caption text-muted">
                  <span>TD</span>
                  <input
                    id={`fil-td-${f.id}`}
                    type="number"
                    min={0.1}
                    max={50}
                    step={0.1}
                    value={f.td}
                    className="h-7 w-18 bg-surface font-mono"
                    onChange={(e) =>
                      update(i, { td: Math.max(0.1, Number(e.target.value) || 0.1) })
                    }
                  />
                </label>
                {isBase ? (
                  <span className="ml-auto text-caption text-muted">
                    Base · layers 1–{b?.lastLayer ?? '–'}
                  </span>
                ) : (
                  <>
                    <label className="flex items-center gap-1.25 text-caption text-muted">
                      <span>Layers</span>
                      <input
                        id={`fil-layers-${f.id}`}
                        type="number"
                        min={1}
                        max={25}
                        step={1}
                        placeholder={`${autoLayers(f.td, print)}`}
                        value={f.layers ?? ''}
                        className="h-7 w-18 bg-surface font-mono"
                        onChange={(e) =>
                          update(i, {
                            layers:
                              e.target.value === ''
                                ? null
                                : Math.max(1, Math.round(Number(e.target.value))),
                          })
                        }
                      />
                    </label>
                    {b && (
                      <span className="num ml-auto text-caption text-muted">
                        L{b.firstLayer}–{b.lastLayer} · {b.bottomZ.toFixed(2)}–{b.topZ.toFixed(2)}{' '}
                        mm
                      </span>
                    )}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap gap-2">
        <select
          id="add-filament"
          aria-label="Add Filament"
          className="grow basis-40"
          value=""
          disabled={filaments.length >= MAX_FILAMENTS}
          onChange={(e) => add(Number(e.target.value))}
        >
          <option value="" disabled>
            {filaments.length >= MAX_FILAMENTS ? 'Stack is full (4)' : '+ Add filament on top…'}
          </option>
          {FILAMENT_PRESETS.map((p, k) => (
            <option key={p.name} value={k}>
              {p.name}
            </option>
          ))}
          <option value={-1}>Accent color</option>
        </select>
      </div>

      <details>
        <summary className="cursor-pointer text-body font-medium text-foreground">
          Filament Profiles
        </summary>
        <div className="mt-2.5 grid gap-2.5">
          <div className="flex flex-wrap gap-2">
            <select
              id="load-profile"
              aria-label="Load Profile"
              className="grow basis-40"
              value=""
              disabled={!profiles.length}
              onChange={(e) => loadProfile(e.target.value)}
            >
              <option value="" disabled>
                {profiles.length ? 'Load a saved profile…' : 'No saved profiles yet'}
              </option>
              {profiles.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              id="profile-name"
              placeholder="Profile Name"
              className="grow basis-40"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
            <Button onClick={saveProfile}>Save Current</Button>
          </div>
          {profiles.length > 0 && (
            <ul className="m-0 grid list-none gap-1 p-0">
              {profiles.map((p) => (
                <li key={p.name} className="flex items-center gap-2 text-body">
                  <span className="inline-flex gap-0.5">
                    {p.filaments.map((f, k) => (
                      <i
                        key={k}
                        className="inline-block h-2.5 w-2.5 rounded-full shadow-swatch"
                        style={{ background: f.color }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1 wrap-anywhere">{p.name}</span>
                  <Button
                    variant="link"
                    onClick={() => saveProfiles(removeProfile(profiles, p.name))}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() =>
                saveFile(
                  'filament-profiles.json',
                  JSON.stringify(profiles, null, 2),
                  'application/json',
                ).then(onStatus, (e) => onStatus(e.message))
              }
            >
              Export JSON
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                const text = await pickTextFile('.json,application/json')
                if (!text) return
                try {
                  const incoming = parseProfiles(text)
                  saveProfiles(mergeProfiles(profiles, incoming))
                  onStatus(`Imported ${incoming.length} profile${incoming.length === 1 ? '' : 's'}`)
                } catch {
                  onStatus('That file is not a filament profile export')
                }
              }}
            >
              Import JSON
            </Button>
          </div>
          <Hint>Profiles are kept in this browser only.</Hint>
        </div>
      </details>
    </div>
  )
}
