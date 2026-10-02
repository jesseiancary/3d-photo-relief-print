// @vitest-environment jsdom
import { defaultSettings } from '@/core/defaults'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useSettings } from './useSettings'

const KEY = 'photo-relief.settings.v1'

afterEach(() => localStorage.clear())

describe('useSettings', () => {
  it('starts from defaults when nothing is persisted', () => {
    const { result } = renderHook(() => useSettings())
    const d = defaultSettings()
    expect(result.current.settings.print).toEqual(d.print)
    expect(result.current.settings.adjust).toEqual(d.adjust)
    expect(result.current.settings.tones).toEqual(d.tones)
    // filament ids are freshly minted, so compare the id-independent shape
    const strip = (fs: typeof d.filaments) => fs.map(({ id: _id, ...rest }) => rest)
    expect(strip(result.current.settings.filaments)).toEqual(strip(d.filaments))
  })

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useSettings())
    act(() => result.current.set('print', { heightIn: 12 }))
    expect(result.current.settings.print.heightIn).toBe(12)
    const persisted = JSON.parse(localStorage.getItem(KEY)!)
    expect(persisted.print.heightIn).toBe(12)
  })

  it('merges a persisted (partial) value over defaults on load', () => {
    localStorage.setItem(KEY, JSON.stringify({ tones: { mode: 'graphic', count: 3 } }))
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings.tones).toEqual({ mode: 'graphic', count: 3 })
    expect(result.current.settings.print).toEqual(defaultSettings().print) // untouched slice
  })

  it('replaces the filament list via setFilaments', () => {
    const { result } = renderHook(() => useSettings())
    const custom = [{ id: 'a', name: 'A', color: '#000000', td: 1, layers: null }]
    act(() => result.current.setFilaments(custom))
    expect(result.current.settings.filaments).toEqual(custom)
  })
})
