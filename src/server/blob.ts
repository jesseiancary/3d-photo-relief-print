import 'server-only'

// Blob deletion behind a tiny interface so call sites never name the vendor (swapping to Cloudflare
// R2 later is an impl change here, not at the call sites). Uploads are NOT here: images/3MF go
// straight from the browser to Vercel Blob via @vercel/blob/client (see app/api/blob/upload), so the
// server only ever needs to *delete* — a single blob (replaced image on update, a removed export) or
// a whole project folder by prefix.

export interface BlobStore {
  del(key: string): Promise<void>
  /** Delete every blob whose key/path starts with `prefix` — wipes a project's whole asset folder. */
  delByPrefix(prefix: string): Promise<void>
}

/** No-op fallback when BLOB_READ_WRITE_TOKEN is unset (local dev without a store). Without a token,
 *  client uploads never succeed, so there is nothing stored to delete — these are safe no-ops. */
class NoopBlobStore implements BlobStore {
  async del(): Promise<void> {}
  async delByPrefix(): Promise<void> {}
}

/** Vercel Blob implementation. Reads BLOB_READ_WRITE_TOKEN from the env automatically. */
export class VercelBlobStore implements BlobStore {
  async del(key: string): Promise<void> {
    const { del } = await import('@vercel/blob')
    await del(key)
  }

  async delByPrefix(prefix: string): Promise<void> {
    const { list, del } = await import('@vercel/blob')
    let cursor: string | undefined
    do {
      const res = await list({ prefix, cursor, limit: 1000 })
      if (res.blobs.length) await del(res.blobs.map((b) => b.url))
      cursor = res.cursor
    } while (cursor)
  }
}

let cached: BlobStore | null = null

/** The process-wide BlobStore: Vercel when a token is present, else a no-op fallback. */
export function blobStore(): BlobStore {
  if (!cached) {
    cached = process.env.BLOB_READ_WRITE_TOKEN ? new VercelBlobStore() : new NoopBlobStore()
  }
  return cached
}
