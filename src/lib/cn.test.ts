import { describe, expect, it } from 'vitest'
import { cn } from './cn'

// These guard the silent tailwind-merge mis-merges documented in cn.ts: a custom
// token that shares a prefix with a default scale must be registered, or a size is
// dropped / an override silently fails / two shadows both survive.
describe('cn', () => {
  it('keeps a type role and a color together (different groups)', () => {
    const out = cn('text-caption', 'text-primary-accent')
    expect(out).toContain('text-caption')
    expect(out).toContain('text-primary-accent')
  })

  it('treats two type roles as conflicting — last wins', () => {
    expect(cn('text-body', 'text-caption')).toBe('text-caption')
  })

  it('lets a custom radius override replace the earlier one', () => {
    expect(cn('rounded-control', 'rounded-card')).toBe('rounded-card')
  })

  it('treats custom shadow roles as conflicting — last wins', () => {
    expect(cn('shadow-card', 'shadow-ring')).toBe('shadow-ring')
  })

  it('merges default utilities and honours clsx conditionals', () => {
    const wide = false
    expect(cn('px-3', 'px-4')).toBe('px-4')
    expect(cn('px-3', wide && 'px-4')).toBe('px-3')
    expect(cn('a', ['b', { c: true, d: false }])).toBe('a b c')
  })
})
