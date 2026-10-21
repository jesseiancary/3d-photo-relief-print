import { listProjects } from '@/server/data'
import { currentUserId } from '@/server/session'

import { SectionHeader } from '../_components/SectionHeader'
import { ProjectsGallery } from './ProjectsGallery'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const items = await listProjects(await currentUserId())
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Projects"
        subtitle="Reopen a saved project in the tool, or delete it (its image and exports go too)."
      />
      <ProjectsGallery initial={items} />
    </div>
  )
}
