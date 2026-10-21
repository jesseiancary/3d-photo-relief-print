import { handle, requireUserId } from '@/server/api'
import { blobStore } from '@/server/blob'

// Best-effort blob deletion, used by the client to clean up an orphaned image/thumb/3MF when the
// follow-up doc write fails (client uploads can't delete — no write token in the browser). Auth is
// required; no per-user ownership check because blob URLs are unguessable random UUIDs and del() is
// idempotent, so the worst case is a no-op. The authoritative cleanup still happens on project
// delete (data.ts cascade).
export async function DELETE(req: Request) {
  return handle(async () => {
    await requireUserId()
    const url = new URL(req.url).searchParams.get('url')
    if (url) await blobStore().del(url)
    return { ok: true }
  })
}
