import { SectionHeader } from '../_components/SectionHeader'
import { PreferencesForm } from './PreferencesForm'

export const dynamic = 'force-dynamic'

// The form reads/writes prefs through the client PreferencesProvider (shared with the header theme
// toggle), so the page itself needs no server read.
export default function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <SectionHeader title="Preferences" subtitle="Theme and measurement units for your account." />
      <PreferencesForm />
    </div>
  )
}
