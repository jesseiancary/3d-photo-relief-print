import { listPrinterProfiles } from '@/server/data'
import { currentUserId } from '@/server/session'

import { SectionHeader } from '../_components/SectionHeader'
import { PrintersManager } from './PrintersManager'

export const dynamic = 'force-dynamic'

export default async function PrintersPage() {
  const items = await listPrinterProfiles(await currentUserId())
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <SectionHeader
        title="Printer profiles"
        subtitle="Bed size and layer geometry per printer — the basis for fitting a relief to the bed."
      />
      <PrintersManager initial={items} />
    </div>
  )
}
