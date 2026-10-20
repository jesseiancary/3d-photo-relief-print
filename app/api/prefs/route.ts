import { preferencesUpdateSchema } from '@/lib/library-types'
import { handle, parseBody, requireUserId } from '@/server/api'
import { getPreferences, updatePreferences } from '@/server/data'

export async function GET() {
  return handle(async () => getPreferences(await requireUserId()))
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const userId = await requireUserId()
    return updatePreferences(userId, await parseBody(req, preferencesUpdateSchema))
  })
}
