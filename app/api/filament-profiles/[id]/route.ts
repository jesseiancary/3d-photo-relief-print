import { filamentProfileUpdateSchema } from '@/lib/library-types'
import { found, handle, objectId, parseBody, requireUserId } from '@/server/api'
import { deleteFilamentProfile, updateFilamentProfile } from '@/server/data'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId()
    const id = objectId((await params).id)
    const patch = await parseBody(req, filamentProfileUpdateSchema)
    return found(await updateFilamentProfile(userId, id, patch))
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId()
    const id = objectId((await params).id)
    found(await deleteFilamentProfile(userId, id))
    return { ok: true }
  })
}
