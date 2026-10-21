import Link from 'next/link'

import { currentUserId } from '@/server/session'

import { ProjectTool } from './ProjectTool'

export const dynamic = 'force-dynamic'

// Opens a saved project in the full tool. Sits OUTSIDE the library (browse) route group so the
// section header/chrome doesn't wrap the tool — just a thin back link + the tool island. Auth-gated.
export default async function OpenProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await currentUserId()
  const { id } = await params
  return (
    <>
      <div className="border-b border-line px-4 py-2">
        <Link href="/library/projects" className="text-caption text-muted hover:text-foreground">
          ← Projects
        </Link>
      </div>
      <ProjectTool projectId={id} />
    </>
  )
}
