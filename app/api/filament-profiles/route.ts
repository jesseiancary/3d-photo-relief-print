import { filamentProfileCreateSchema } from '@/lib/library-types'
import { handle, parseBody, requireUserId } from '@/server/api'
import { createFilamentProfile, listFilamentProfiles } from '@/server/data'

export async function GET() {
  return handle(async () => listFilamentProfiles(await requireUserId()))
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId()
    return createFilamentProfile(userId, await parseBody(req, filamentProfileCreateSchema))
  })
}
