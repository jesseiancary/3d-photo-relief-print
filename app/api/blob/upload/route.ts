import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'

import { auth } from '@/server/auth'

// Token endpoint for browser → Vercel Blob direct uploads (@vercel/blob/client `upload()`). Large
// images and 3MF files go straight to Blob, bypassing the serverless request-body limit; the client
// then persists the returned URL on a project/export doc via the JSON API. Blob pathnames are
// client-chosen random UUIDs, so the resulting public URLs are unguessable; ownership is enforced on
// the Mongo docs.
//
// Because we don't register onUploadCompleted (our docs carry client-only data the webhook can't
// know, so the client persists them), the ONLY request that reaches this route is the browser's
// token request — which carries the session cookie. So we gate auth up front and return a clean 401.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = (await req.json()) as HandleUploadBody
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'model/3mf',
          'application/octet-stream',
        ],
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
      }),
    })
    return NextResponse.json(json)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
