import { getPreferences } from '@/server/data'
import { currentUserId } from '@/server/session'

import { SectionHeader } from '../_components/SectionHeader'
import { PreferencesForm } from './PreferencesForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const prefs = await getPreferences(await currentUserId())
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <SectionHeader title="Preferences" subtitle="Theme and measurement units for your account." />
      <PreferencesForm initial={prefs} />
    </div>
  )
}
