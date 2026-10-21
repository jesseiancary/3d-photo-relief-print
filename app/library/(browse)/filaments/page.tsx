import { listFilamentProfiles } from '@/server/data'
import { currentUserId } from '@/server/session'

import { SectionHeader } from '../_components/SectionHeader'
import { FilamentProfilesManager } from './FilamentProfilesManager'

export const dynamic = 'force-dynamic'

export default async function FilamentsPage() {
  const items = await listFilamentProfiles(await currentUserId())
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <SectionHeader
        title="Filament profiles"
        subtitle="Saved filament stacks. Loading one into the tool mints fresh ids for its filaments."
      />
      <FilamentProfilesManager initial={items} />
    </div>
  )
}
