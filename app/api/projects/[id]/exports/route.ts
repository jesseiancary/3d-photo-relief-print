import { exportCreateSchema } from '@/lib/library-types'
import { found, handle, objectId, parseBody, requireUserId } from '@/server/api'
import { createExport, listExports } from '@/server/data'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId()
    const projectId = objectId((await params).id)
    return listExports(userId, projectId)
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId()
    const projectId = objectId((await params).id)
    const input = await parseBody(req, exportCreateSchema)
    return found(await createExport(userId, projectId, input))
  })
}
