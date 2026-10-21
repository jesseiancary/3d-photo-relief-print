import { upload } from '@vercel/blob/client'

// Upload a Blob straight from the browser to Vercel Blob, authorised by a short-lived token from
// /api/blob/upload (see that route). Bypasses the serverless request-body limit for large images and
// 3MF files. Returns the public URL to persist on a project/export doc.
//
// The stored path is `<prefix>/<random-uuid>.<ext>` — a fresh UUID per upload, so paths are always
// unique (no collisions/overwrites even for identically named uploads) and free of the user's raw
// filename (which can carry spaces/unicode). The friendly name lives on the doc (imageName) and the
// export re-download uses the `download` attribute, not the blob path, so nothing user-facing is lost.
export async function uploadBlob(file: Blob, prefix: string, filename: string): Promise<string> {
  const dot = filename.lastIndexOf('.')
  const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase() : ''
  const name = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID()
  const result = await upload(`${prefix}/${name}`, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload',
    contentType: file.type || undefined,
  })
  return result.url
}
