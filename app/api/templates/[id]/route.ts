import { templateRenameSchema } from '@/lib/library-types'
import { found, handle, objectId, parseBody, requireUserId } from '@/server/api'
import { deleteTemplate, renameTemplate } from '@/server/data'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId()
    const id = objectId((await params).id)
    const { name } = await parseBody(req, templateRenameSchema)
    return found(await renameTemplate(userId, id, name))
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId()
    const id = objectId((await params).id)
    found(await deleteTemplate(userId, id))
    return { ok: true }
  })
}
