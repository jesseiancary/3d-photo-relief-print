'use client'

import { Card } from '@/components/Card'
import { Hint } from '@/components/Hint'
import { Segmented } from '@/components/Segmented'
import { usePreferences } from '@/hooks/usePreferences'
import type { ThemePref, UnitsPref } from '@/lib/library-types'

// Thin consumer of the shared PreferencesProvider: changes apply live (theme reflects immediately,
// units re-label the tool) and the provider persists them — mirror + account PATCH. No local save
// button, so this form and the header theme toggle can't drift apart.
export function PreferencesForm() {
  const { theme, units, setTheme, setUnits, syncError } = usePreferences()
  return (
    <Card className="flex max-w-md flex-col gap-4 p-4">
      <div className="grid gap-1.5">
        <span className="text-label">Theme</span>
        <Segmented<ThemePref>
          label="Theme"
          value={theme}
          onChange={setTheme}
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
          value={units}
          onChange={setUnits}
          options={[
            { value: 'in', label: 'Inches' },
            { value: 'mm', label: 'Millimeters' },
          ]}
        />
      </div>
      {syncError && <p className="text-caption text-destructive">{syncError}</p>}
      <Hint>Changes apply immediately; signed-in accounts also sync across devices.</Hint>
    </Card>
  )
}
