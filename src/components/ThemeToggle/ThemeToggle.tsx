'use client'

import { Segmented } from '@/components/Segmented'
import { usePreferences } from '@/hooks/usePreferences'
import type { ThemePref } from '@/lib/library-types'

// Universal theme switch (header). Drives the shared PreferencesProvider, so it works logged out
// (localStorage mirror) and syncs to the account when signed in.
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = usePreferences()
  return (
    <Segmented<ThemePref>
      label="Theme"
      value={theme}
      onChange={setTheme}
      className={className}
      options={[
        { value: 'system', label: 'Auto' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ]}
    />
  )
}
