'use client'

import { useState } from 'react'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Segmented } from '@/components/Segmented'
import type { PreferencesDTO, ThemePref, UnitsPref } from '@/lib/library-types'
import { libraryApi } from '@/lib/store'

import { useAsync } from '../_components/useAsync'

export function PreferencesForm({ initial }: { initial: PreferencesDTO }) {
  const [prefs, setPrefs] = useState(initial)
  const [saved, setSaved] = useState<PreferencesDTO>(initial)
  const { busy, error, run } = useAsync()
  const dirty = prefs.theme !== saved.theme || prefs.units !== saved.units

  async function save() {
    const next = await run(() => libraryApi.prefs.update(prefs))
    if (next) {
      setSaved(next)
      setPrefs(next)
    }
  }

  return (
    <Card className="flex max-w-md flex-col gap-4 p-4">
      <div className="grid gap-1.5">
        <span className="text-label">Theme</span>
        <Segmented<ThemePref>
          label="Theme"
          value={prefs.theme}
          onChange={(theme) => setPrefs({ ...prefs, theme })}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </div>
      <div className="grid gap-1.5">
        <span className="text-label">Units</span>
        <Segmented<UnitsPref>
          label="Units"
          value={prefs.units}
          onChange={(units) => setPrefs({ ...prefs, units })}
          options={[
            { value: 'in', label: 'Inches' },
            { value: 'mm', label: 'Millimeters' },
          ]}
        />
      </div>
      {error && <p className="text-caption text-destructive">{error}</p>}
      <div>
        <Button variant="primary" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </Card>
  )
}
