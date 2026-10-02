import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { classifySaveError, zipWrap } from './platform'

describe('classifySaveError', () => {
  it('maps host error codes to a save reaction', () => {
    expect(classifySaveError('declined')).toBe('cancelled')
    expect(classifySaveError('rejected_extension')).toBe('retry-zip')
    expect(classifySaveError('something_else')).toBe('fail')
    expect(classifySaveError(undefined)).toBe('fail')
  })
})

describe('zipWrap', () => {
  it('wraps a file under a .zip name, storing the original inside', () => {
    const { name, bytes } = zipWrap('relief.3mf', new Uint8Array([1, 2, 3]))
    expect(name).toBe('relief.zip')
    const files = unzipSync(bytes)
    expect(Object.keys(files)).toEqual(['relief.3mf'])
    expect(Array.from(files['relief.3mf'])).toEqual([1, 2, 3])
  })

  it('encodes string payloads as UTF-8 inside the zip', () => {
    const { name, bytes } = zipWrap('notes.txt', 'swap to silver')
    expect(name).toBe('notes.zip')
    expect(strFromU8(unzipSync(bytes)['notes.txt'])).toBe('swap to silver')
  })
})
