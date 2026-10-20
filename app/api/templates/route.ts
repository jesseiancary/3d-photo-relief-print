import { templateCreateSchema } from '@/lib/library-types'
import { handle, parseBody, requireUserId } from '@/server/api'
import { createTemplate, listTemplates } from '@/server/data'

export async function GET() {
  return handle(async () => listTemplates(await requireUserId()))
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId()
    return createTemplate(userId, await parseBody(req, templateCreateSchema))
  })
}
