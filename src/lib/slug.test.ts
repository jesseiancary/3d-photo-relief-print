import { describe, expect, it } from 'vitest'
import { slug } from './slug'

describe('slug', () => {
  it('hyphenates and strips a file extension', () => {
    expect(slug('My Photo.JPG')).toBe('My-Photo')
    expect(slug('a plain name')).toBe('a-plain-name')
  })

  it('collapses runs of whitespace into single hyphens', () => {
    expect(slug('a   b\t c')).toBe('a-b-c')
  })

  it('drops characters outside [word, dash, space]', () => {
    expect(slug('hello! (world) #1')).toBe('hello-world-1')
    expect(slug('café')).toBe('caf') // non-ASCII letters are not \w
  })

  it('falls back to "relief" when nothing survives', () => {
    expect(slug('')).toBe('relief')
    expect(slug('   ')).toBe('relief')
    expect(slug('!!!')).toBe('relief')
  })

  it('caps the length at 60 characters', () => {
    expect(slug('x'.repeat(100))).toHaveLength(60)
  })
})
