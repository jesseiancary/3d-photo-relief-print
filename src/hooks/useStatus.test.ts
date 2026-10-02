// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useStatus } from './useStatus'

describe('useStatus', () => {
  it('sets and clears the status line', () => {
    const { result } = renderHook(() => useStatus())
    expect(result.current.status).toBeNull()
    act(() => result.current.say('Saved'))
    expect(result.current.status).toEqual({ text: 'Saved', tone: 'ok' })
    act(() => result.current.say('Boom', 'err'))
    expect(result.current.status).toEqual({ text: 'Boom', tone: 'err' })
    act(() => result.current.clear())
    expect(result.current.status).toBeNull()
  })

  it('keeps say/clear referentially stable across renders', () => {
    const { result, rerender } = renderHook(() => useStatus())
    const { say, clear } = result.current
    rerender()
    expect(result.current.say).toBe(say)
    expect(result.current.clear).toBe(clear)
  })
})
