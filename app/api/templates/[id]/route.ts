import { templateRenameSchema } from '@/lib/library-types'
import { found, handle, objectId, parseBody, requireUserId } from '@/server/api'
import { deleteTemplate, getTemplate, renameTemplate } from '@/server/data'

// Full template (summary + verbatim config) — for the tool's template picker and reopening a project
// with its saved template. The list endpoint only returns summaries.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId()
    const id = objectId((await params).id)
    return found(await getTemplate(userId, id))
  })
}

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
