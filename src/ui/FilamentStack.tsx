import { useState } from 'react'
import { FILAMENT_PRESETS, MAX_FILAMENTS, MIN_FILAMENTS, newId } from '../core/defaults'
import { autoLayers, type Band } from '../core/tones'
import type { Filament, PrintSettings } from '../core/types'
import { pickTextFile, readJSON, saveFile, writeJSON } from './platform'

const PROFILES_KEY = 'photo-relief.profiles.v1'
interface Profile { name: string; filaments: Omit<Filament, 'id'>[] }

interface Props {
  filaments: Filament[]
  bands: Band[] | null
  print: PrintSettings
  onChange: (f: Filament[]) => void
  onStatus: (msg: string) => void
}

export function FilamentStack({ filaments, bands, print, onChange, onStatus }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>(() => readJSON<Profile[]>(PROFILES_KEY, []))
  const [profileName, setProfileName] = useState('')

  const update = (i: number, patch: Partial<Filament>) => onChange(filaments.map((f, j) => (j === i ? { ...f, ...patch } : f)))
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
    const p = FILAMENT_PRESETS[presetIdx] ?? { name: 'Accent', color: '#C12E1F', td: 4, layers: null }
    onChange([...filaments, { ...p, id: newId() }])
  }

  const saveProfiles = (p: Profile[]) => { setProfiles(p); writeJSON(PROFILES_KEY, p) }
  const saveProfile = () => {
    const name = profileName.trim() || filaments.map((f) => f.name.split(' ').pop()).join(' / ')
    const entry: Profile = { name, filaments: filaments.map(({ id: _id, ...rest }) => rest) }
    saveProfiles([...profiles.filter((p) => p.name !== name), entry].sort((a, b) => a.name.localeCompare(b.name)))
    setProfileName('')
    onStatus(`Saved filament profile “${name}”`)
  }
  const loadProfile = (name: string) => {
    const p = profiles.find((x) => x.name === name)
    if (p) onChange(p.filaments.map((f) => ({ ...f, id: newId() })))
  }

  const rows = filaments.map((f, i) => ({ f, i })).reverse() // top of the print first

  return (
    <div className="stack-editor">
      <ol className="filaments">
        {rows.map(({ f, i }) => {
          const b = bands?.[i]
          const isBase = i === 0
          return (
            <li key={f.id} className="filament">
              <div className="fil-top">
                <input
                  id={`fil-color-${f.id}`}
                  className="swatch-input"
                  type="color"
                  value={f.color.length === 7 ? f.color : '#888888'}
                  aria-label={`${f.name} colour`}
                  onChange={(e) => update(i, { color: e.target.value.toUpperCase() })}
                />
                <input id={`fil-name-${f.id}`} className="fil-name" value={f.name} aria-label="Filament name" onChange={(e) => update(i, { name: e.target.value })} />
                <div className="fil-order">
                  <button type="button" className="icon-btn" aria-label="Move up" disabled={i === filaments.length - 1} onClick={() => move(i, 1)}>↑</button>
                  <button type="button" className="icon-btn" aria-label="Move down" disabled={i === 0} onClick={() => move(i, -1)}>↓</button>
                  <button type="button" className="icon-btn" aria-label={`Remove ${f.name}`} disabled={filaments.length <= MIN_FILAMENTS} onClick={() => remove(i)}>×</button>
                </div>
              </div>
              <div className="fil-bottom">
                <label className="mini">
                  <span>TD</span>
                  <input id={`fil-td-${f.id}`} type="number" min={0.1} max={50} step={0.1} value={f.td} onChange={(e) => update(i, { td: Math.max(0.1, Number(e.target.value) || 0.1) })} />
                </label>
                {isBase ? (
                  <span className="band-note">Base · layers 1–{b?.lastLayer ?? '–'}</span>
                ) : (
                  <>
                    <label className="mini">
                      <span>Layers</span>
                      <input
                        id={`fil-layers-${f.id}`}
                        type="number"
                        min={1}
                        max={25}
                        step={1}
                        placeholder={`auto ${autoLayers(f.td, print)}`}
                        value={f.layers ?? ''}
                        onChange={(e) => update(i, { layers: e.target.value === '' ? null : Math.max(1, Math.round(Number(e.target.value))) })}
                      />
                    </label>
                    {b && (
                      <span className="band-note num">
                        L{b.firstLayer}–{b.lastLayer} · {b.bottomZ.toFixed(2)}–{b.topZ.toFixed(2)} mm
                      </span>
                    )}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="row-actions">
        <select
          id="add-filament"
          aria-label="Add filament"
          value=""
          disabled={filaments.length >= MAX_FILAMENTS}
          onChange={(e) => add(Number(e.target.value))}
        >
          <option value="" disabled>{filaments.length >= MAX_FILAMENTS ? 'Stack is full (4)' : '+ Add filament on top…'}</option>
          {FILAMENT_PRESETS.map((p, k) => <option key={p.name} value={k}>{p.name}</option>)}
          <option value={-1}>Accent colour</option>
        </select>
      </div>

      <details className="profiles">
        <summary>Filament profiles</summary>
        <div className="profiles-body">
          <div className="row-actions">
            <select id="load-profile" aria-label="Load profile" value="" disabled={!profiles.length} onChange={(e) => loadProfile(e.target.value)}>
              <option value="" disabled>{profiles.length ? 'Load a saved profile…' : 'No saved profiles yet'}</option>
              {profiles.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="row-actions">
            <input id="profile-name" placeholder="Profile name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            <button type="button" className="btn" onClick={saveProfile}>Save current</button>
          </div>
          {profiles.length > 0 && (
            <ul className="profile-list">
              {profiles.map((p) => (
                <li key={p.name}>
                  <span className="dots">{p.filaments.map((f, k) => <i key={k} style={{ background: f.color }} />)}</span>
                  <span className="pname">{p.name}</span>
                  <button type="button" className="link-btn" onClick={() => saveProfiles(profiles.filter((x) => x.name !== p.name))}>Delete</button>
                </li>
              ))}
            </ul>
          )}
          <div className="row-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => saveFile('filament-profiles.json', JSON.stringify(profiles, null, 2), 'application/json').then(onStatus, (e) => onStatus(e.message))}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={async () => {
                const text = await pickTextFile('.json,application/json')
                if (!text) return
                try {
                  const incoming = JSON.parse(text) as Profile[]
                  if (!Array.isArray(incoming) || !incoming.every((p) => p.name && Array.isArray(p.filaments))) throw new Error()
                  const merged = [...profiles.filter((p) => !incoming.some((q) => q.name === p.name)), ...incoming]
                  saveProfiles(merged.sort((a, b) => a.name.localeCompare(b.name)))
                  onStatus(`Imported ${incoming.length} profile${incoming.length === 1 ? '' : 's'}`)
                } catch {
                  onStatus('That file is not a filament profile export')
                }
              }}
            >
              Import JSON
            </button>
          </div>
          <p className="hint">Profiles are kept in this browser only.</p>
        </div>
      </details>
    </div>
  )
}
