import { projectCreateSchema } from '@/lib/library-types'
import { handle, parseBody, requireUserId } from '@/server/api'
import { createProject, listProjects } from '@/server/data'

export async function GET() {
  return handle(async () => listProjects(await requireUserId()))
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId()
    return createProject(userId, await parseBody(req, projectCreateSchema))
  })
}
