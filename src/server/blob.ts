import 'server-only'

// Blob storage behind a tiny interface so call sites never name the vendor. The default impl is
// Vercel Blob; swapping to Cloudflare R2 later (if egress bites) is a config/impl change here, not a
// change at any call site. Bytes (images, 3MF, thumbnails) live in blob storage; Mongo stores only
// the returned key/url. Large browser→blob uploads go direct via @vercel/blob/client (Phase 4);
// this server interface covers server-originated writes and deletes.

export interface PutResult {
  /** stable storage key, persisted on the Mongo doc */
  key: string
  /** public URL for reads */
  url: string
}

export interface BlobStore {
  put(
    key: string,
    data: Blob | ArrayBuffer | ArrayBufferView | string,
    opts?: { contentType?: string },
  ): Promise<PutResult>
  url(key: string): Promise<string>
  del(key: string): Promise<void>
}

/** In-memory store for unit tests and local runs without a blob token. Not for production. */
export class MemoryBlobStore implements BlobStore {
  private readonly blobs = new Map<string, Uint8Array>()

  async put(key: string, data: Blob | ArrayBuffer | ArrayBufferView | string): Promise<PutResult> {
    const bytes =
      typeof data === 'string'
        ? new TextEncoder().encode(data)
        : data instanceof Blob
          ? new Uint8Array(await data.arrayBuffer())
          : data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    this.blobs.set(key, bytes)
    return { key, url: `memory://${key}` }
  }

  /** Read back stored bytes. Not part of BlobStore — a convenience for tests and local runs. */
  get(key: string): Uint8Array | undefined {
    return this.blobs.get(key)
  }

  async url(key: string): Promise<string> {
    if (!this.blobs.has(key)) throw new Error(`no blob at ${key}`)
    return `memory://${key}`
  }

  async del(key: string): Promise<void> {
    this.blobs.delete(key)
  }
}

/** Vercel Blob implementation. Reads BLOB_READ_WRITE_TOKEN from the env automatically. */
export class VercelBlobStore implements BlobStore {
  async put(
    key: string,
    data: Blob | ArrayBuffer | ArrayBufferView | string,
    opts?: { contentType?: string },
  ): Promise<PutResult> {
    const { put } = await import('@vercel/blob')
    // Normalise to a body type the SDK accepts (string | Blob | ArrayBuffer); copy out of a typed
    // array view so only its bytes are sent, never the whole backing buffer. `.slice()` on a fresh
    // Uint8Array view copies into its own plain ArrayBuffer, so this is safe even if the view is
    // backed by a SharedArrayBuffer (no unsound cast, and the SDK never sees shared memory).
    const body: string | Blob | ArrayBuffer =
      typeof data === 'string' || data instanceof Blob || data instanceof ArrayBuffer
        ? data
        : (new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice()
            .buffer as ArrayBuffer)
    const res = await put(key, body, {
      access: 'public',
      addRandomSuffix: false,
      contentType: opts?.contentType,
    })
    return { key: res.pathname, url: res.url }
  }

  async url(key: string): Promise<string> {
    const { head } = await import('@vercel/blob')
    const res = await head(key)
    return res.url
  }

  async del(key: string): Promise<void> {
    const { del } = await import('@vercel/blob')
    await del(key)
  }
}

let cached: BlobStore | null = null

/** The process-wide BlobStore: Vercel when a token is present, else the in-memory fallback. */
export function blobStore(): BlobStore {
  if (!cached) {
    cached = process.env.BLOB_READ_WRITE_TOKEN ? new VercelBlobStore() : new MemoryBlobStore()
  }
  return cached
}
