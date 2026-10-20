import { printerUpdateSchema } from '@/lib/library-types'
import { found, handle, objectId, parseBody, requireUserId } from '@/server/api'
import { deletePrinterProfile, updatePrinterProfile } from '@/server/data'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId()
    const id = objectId((await params).id)
    const patch = await parseBody(req, printerUpdateSchema)
    return found(await updatePrinterProfile(userId, id, patch))
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId()
    const id = objectId((await params).id)
    found(await deletePrinterProfile(userId, id))
    return { ok: true }
  })
}
