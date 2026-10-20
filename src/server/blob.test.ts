import { describe, expect, it, vi } from 'vitest'

// `server-only` is a marker module that throws when imported outside the Next server bundler; stub
// it so blob.ts can be exercised under Node. `@vercel/blob` is dynamically imported by
// VercelBlobStore — stub its `put` so we can assert the exact body bytes it hands the SDK.
vi.mock('server-only', () => ({}))

const put = vi.fn(async (key: string, _body: unknown, _opts?: unknown) => ({
  pathname: key,
  url: `https://blob.test/${key}`,
}))
vi.mock('@vercel/blob', () => ({
  put,
  head: vi.fn(async (key: string) => ({ url: `https://blob.test/${key}` })),
  del: vi.fn(async () => {}),
}))

const { MemoryBlobStore, VercelBlobStore } = await import('./blob')

const decode = (b: Uint8Array | undefined) => new TextDecoder().decode(b)

describe('MemoryBlobStore', () => {
  it('stores a string as UTF-8 bytes and reads them back', async () => {
    const store = new MemoryBlobStore()
    const res = await store.put('a.txt', 'héllo')
    expect(res).toEqual({ key: 'a.txt', url: 'memory://a.txt' })
    expect(decode(store.get('a.txt'))).toBe('héllo')
  })

  it('stores an ArrayBuffer verbatim', async () => {
    const store = new MemoryBlobStore()
    const buf = new TextEncoder().encode('abc').buffer
    await store.put('b.bin', buf)
    expect(decode(store.get('b.bin'))).toBe('abc')
  })

  it('stores only a typed-array view window, not the whole backing buffer', async () => {
    const store = new MemoryBlobStore()
    const full = new TextEncoder().encode('0123456789')
    const view = full.subarray(2, 5) // "234"
    await store.put('c.bin', view)
    const stored = store.get('c.bin')
    expect(stored).toHaveLength(3)
    expect(decode(stored)).toBe('234')
  })

  it('reports a url only for an existing key and forgets it on delete', async () => {
    const store = new MemoryBlobStore()
    await store.put('d.bin', 'x')
    expect(await store.url('d.bin')).toBe('memory://d.bin')
    await store.del('d.bin')
    expect(store.get('d.bin')).toBeUndefined()
    await expect(store.url('d.bin')).rejects.toThrow(/no blob/)
  })
})

describe('VercelBlobStore', () => {
  it('sends only the view window as a non-shared ArrayBuffer, and maps the SDK result', async () => {
    put.mockClear()
    const store = new VercelBlobStore()
    const full = new TextEncoder().encode('0123456789')
    const view = full.subarray(2, 5) // "234"

    const res = await store.put('p.bin', view, { contentType: 'application/octet-stream' })

    expect(res).toEqual({ key: 'p.bin', url: 'https://blob.test/p.bin' })
    const [, body, opts] = put.mock.calls[0]
    expect(body).toBeInstanceOf(ArrayBuffer)
    expect((body as ArrayBuffer).byteLength).toBe(3)
    expect(decode(new Uint8Array(body as ArrayBuffer))).toBe('234')
    expect(opts).toMatchObject({ access: 'public', addRandomSuffix: false })
  })
})
