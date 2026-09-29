import { useEffect, useMemo, useState } from 'react'
import { defaultSettings } from '@/core/defaults'
import type { Settings } from '@/core/types'
import { readJSON, writeJSON } from '@/lib/platform'

const SETTINGS_KEY = 'photo-relief.settings.v1'

function loadSettings(): Settings {
  const d = defaultSettings()
  const s = readJSON<Partial<Settings>>(SETTINGS_KEY, {})
  return {
    print: { ...d.print, ...s.print },
    adjust: { ...d.adjust, ...s.adjust },
    tones: { ...d.tones, ...s.tones },
    filaments: s.filaments?.length ? s.filaments : d.filaments,
  }
}

/** The central `Settings` object: loaded from and persisted to localStorage, with slice updaters. */
export function useSettings() {
  const defs = useMemo(defaultSettings, [])
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    writeJSON(SETTINGS_KEY, settings)
  }, [settings])

  const set = <K extends 'print' | 'adjust' | 'tones'>(k: K, patch: Partial<Settings[K]>) =>
    setSettings((s) => ({ ...s, [k]: { ...s[k], ...patch } }))
  const setFilaments = (filaments: Settings['filaments']) =>
    setSettings((s) => ({ ...s, filaments }))

  return { settings, defs, set, setFilaments }
}
