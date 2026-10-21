import { listTemplates } from '@/server/data'
import { currentUserId } from '@/server/session'

import { SectionHeader } from '../_components/SectionHeader'
import { TemplatesManager } from './TemplatesManager'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const items = await listTemplates(await currentUserId())
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <SectionHeader
        title="Slicer templates"
        subtitle="Saved Bambu / Orca projects whose settings are reused for every 3MF export."
      />
      <TemplatesManager initial={items} />
    </div>
  )
}
