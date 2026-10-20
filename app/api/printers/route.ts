import { printerInputSchema } from '@/lib/library-types'
import { handle, parseBody, requireUserId } from '@/server/api'
import { createPrinterProfile, listPrinterProfiles } from '@/server/data'

export async function GET() {
  return handle(async () => listPrinterProfiles(await requireUserId()))
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId()
    return createPrinterProfile(userId, await parseBody(req, printerInputSchema))
  })
}
