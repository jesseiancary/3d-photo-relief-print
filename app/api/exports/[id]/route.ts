import { found, handle, objectId, requireUserId } from '@/server/api'
import { deleteExport } from '@/server/data'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId()
    const id = objectId((await params).id)
    found(await deleteExport(userId, id))
    return { ok: true }
  })
}
