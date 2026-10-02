// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readJSON, writeJSON } from './platform'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  delete (window as unknown as { claude?: unknown }).claude
})

describe('readJSON / writeJSON', () => {
  it('round-trips a value', () => {
    writeJSON('k', { a: 1 })
    expect(readJSON('k', null)).toEqual({ a: 1 })
  })

  it('returns the fallback for a missing or corrupt value', () => {
    expect(readJSON('missing', 'fb')).toBe('fb')
    localStorage.setItem('bad', '{not json')
    expect(readJSON('bad', 'fb')).toBe('fb')
  })
})

// saveFile memoizes its host probe at module load, so each test gets a fresh module
// instance (after the host is set up) via resetModules + dynamic import.
async function loadSaveFile() {
  vi.resetModules()
  return (await import('./platform')).saveFile
}
const setHost = (save: (r: { filename: string; data: unknown }) => Promise<{ status: string }>) => {
  ;(window as unknown as { claude: unknown }).claude = { use: async () => ({ save }) }
}

describe('saveFile', () => {
  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('uses the anchor download when no host is present', async () => {
    const saveFile = await loadSaveFile()
    expect(await saveFile('relief.3mf', new Uint8Array([1, 2, 3]))).toBe('Saved relief.3mf')
  })

  it('saves through a host that accepts the file', async () => {
    const save = vi.fn(async () => ({ status: 'ok' }))
    setHost(save)
    const saveFile = await loadSaveFile()
    expect(await saveFile('relief.3mf', 'data')).toBe('Saved relief.3mf')
    expect(save).toHaveBeenCalled()
  })

  it('wraps the file in a .zip when the host rejects the extension', async () => {
    const save = vi.fn(async (r: { filename: string }) => {
      if (r.filename.endsWith('.3mf')) throw { code: 'rejected_extension' }
      return { status: 'ok' }
    })
    setHost(save)
    const saveFile = await loadSaveFile()
    expect(await saveFile('relief.3mf', new Uint8Array([1]))).toBe(
      'Saved relief.zip — unzip it to get relief.3mf',
    )
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('reports a cancelled save when the host declines', async () => {
    const save = vi.fn(async () => {
      throw { code: 'declined' }
    })
    setHost(save)
    const saveFile = await loadSaveFile()
    expect(await saveFile('relief.3mf', 'x')).toBe('Save cancelled')
  })
})
