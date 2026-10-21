import { describe, expect, it, vi } from 'vitest'

// `server-only` is a marker module that throws when imported outside the Next server bundler; stub
// it so blob.ts can be exercised under Node. `@vercel/blob` is dynamically imported by
// VercelBlobStore — stub `list`/`del` so we can assert the prefix-sweep behaviour.
vi.mock('server-only', () => ({}))

const del = vi.fn(async () => {})
const list = vi.fn()
vi.mock('@vercel/blob', () => ({ del, list }))

const { VercelBlobStore } = await import('./blob')

describe('VercelBlobStore.delByPrefix', () => {
  it('lists by prefix across pages and deletes every blob url', async () => {
    del.mockClear()
    list
      .mockResolvedValueOnce({ blobs: [{ url: 'u1' }, { url: 'u2' }], cursor: 'c1' })
      .mockResolvedValueOnce({ blobs: [{ url: 'u3' }], cursor: undefined })
    const store = new VercelBlobStore()

    await store.delByPrefix('folder/')

    expect(list).toHaveBeenCalledTimes(2)
    expect(list.mock.calls[0][0]).toMatchObject({ prefix: 'folder/' })
    expect(list.mock.calls[1][0]).toMatchObject({ prefix: 'folder/', cursor: 'c1' }) // follows cursor
    expect(del).toHaveBeenNthCalledWith(1, ['u1', 'u2'])
    expect(del).toHaveBeenNthCalledWith(2, ['u3'])
  })

  it('skips the delete call for an empty page', async () => {
    del.mockClear()
    list.mockResolvedValueOnce({ blobs: [], cursor: undefined })
    const store = new VercelBlobStore()

    await store.delByPrefix('empty/')

    expect(del).not.toHaveBeenCalled()
  })
})
