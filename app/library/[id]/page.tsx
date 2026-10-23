import { currentUserId } from '@/server/session'

import { ProjectTool } from './ProjectTool'

export const dynamic = 'force-dynamic'

// Opens a saved project in the full tool. Sits OUTSIDE the library (browse) route group so the
// section header/chrome doesn't wrap the tool — just the tool island, which carries the shared
// AppHeader itself. Auth-gated.
export default async function OpenProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await currentUserId()
  const { id } = await params
  return <ProjectTool projectId={id} />
}
