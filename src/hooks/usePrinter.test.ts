// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_BED_MM } from '@/core/defaults'

import { usePrinter } from './usePrinter'

// usePrinter reads useSession (to decide whether to load the picker) and libraryApi.printers.list.
// Both are mocked: the session is a mutable ref, and the store is stubbed so no network is touched.
const h = vi.hoisted(() => ({
  session: { current: { status: 'unauthenticated' } as { status: string } },
  list: vi.fn(),
}))
vi.mock('next-auth/react', () => ({ useSession: () => h.session.current }))
vi.mock('@/lib/store', () => ({ libraryApi: { printers: { list: h.list } } }))

const ID_KEY = 'photo-relief.printerId.v1'
const mini = {
  id: 'p1',
  name: 'Mini',
  bedMm: 180,
  layerMm: 0.1,
  firstLayerMm: 0.2,
  pitchMm: 0.15,
  cornerRadius: 2,
}

beforeEach(() => {
  h.session.current = { status: 'unauthenticated' }
  h.list.mockReset().mockResolvedValue([])
})
afterEach(() => localStorage.clear())

describe('usePrinter', () => {
  it('loads no printers and keeps the default bed when signed out', () => {
    const { result } = renderHook(() => usePrinter(vi.fn(), vi.fn()))
    expect(result.current.printers).toEqual([])
    expect(result.current.bedMm).toBe(DEFAULT_BED_MM)
  })

  it('loads the saved printers when authenticated', async () => {
    h.session.current = { status: 'authenticated' }
    h.list.mockResolvedValue([mini])
    const { result } = renderHook(() => usePrinter(vi.fn(), vi.fn()))
    await waitFor(() => expect(result.current.printers).toHaveLength(1))
    expect(result.current.printers[0].name).toBe('Mini')
  })

  it('selectPrinter pushes geometry into print, exposes the bed, and persists the id', async () => {
    h.session.current = { status: 'authenticated' }
    h.list.mockResolvedValue([mini])
    const applyPrint = vi.fn()
    const say = vi.fn()
    const { result } = renderHook(() => usePrinter(applyPrint, say))
    await waitFor(() => expect(result.current.printers).toHaveLength(1))
    act(() => result.current.selectPrinter('p1'))
    expect(applyPrint).toHaveBeenCalledWith({
      layerMm: 0.1,
      firstLayerMm: 0.2,
      pitchMm: 0.15,
      cornerRadius: 2,
    })
    expect(result.current.bedMm).toBe(180)
    expect(result.current.printerId).toBe('p1')
    expect(localStorage.getItem(ID_KEY)).toBe('p1')
  })

  it('selectPrinter(null) returns to manual with the default bed', async () => {
    h.session.current = { status: 'authenticated' }
    h.list.mockResolvedValue([mini])
    const { result } = renderHook(() => usePrinter(vi.fn(), vi.fn()))
    await waitFor(() => expect(result.current.printers).toHaveLength(1))
    act(() => result.current.selectPrinter('p1'))
    act(() => result.current.selectPrinter(null))
    expect(result.current.printerId).toBeNull()
    expect(result.current.bedMm).toBe(DEFAULT_BED_MM)
    expect(localStorage.getItem(ID_KEY)).toBeNull()
  })

  it('restores the bed for a persisted selection without re-applying print fields', async () => {
    localStorage.setItem(ID_KEY, 'p1')
    h.session.current = { status: 'authenticated' }
    h.list.mockResolvedValue([mini])
    const applyPrint = vi.fn()
    const { result } = renderHook(() => usePrinter(applyPrint, vi.fn()))
    await waitFor(() => expect(result.current.bedMm).toBe(180))
    expect(result.current.printerId).toBe('p1')
    expect(applyPrint).not.toHaveBeenCalled()
  })

  it('resets to manual/default bed on sign-out, keeping the persisted id for re-sign-in', async () => {
    h.session.current = { status: 'authenticated' }
    h.list.mockResolvedValue([mini])
    const { result, rerender } = renderHook(() => usePrinter(vi.fn(), vi.fn()))
    await waitFor(() => expect(result.current.printers).toHaveLength(1))
    act(() => result.current.selectPrinter('p1'))
    expect(result.current.bedMm).toBe(180)
    h.session.current = { status: 'unauthenticated' }
    rerender()
    expect(result.current.printers).toEqual([])
    expect(result.current.printerId).toBeNull()
    expect(result.current.bedMm).toBe(DEFAULT_BED_MM)
    // localStorage id is retained so re-authenticating restores the selection.
    expect(localStorage.getItem(ID_KEY)).toBe('p1')
  })

  it('clears a persisted id that no longer exists on the server', async () => {
    localStorage.setItem(ID_KEY, 'gone')
    h.session.current = { status: 'authenticated' }
    h.list.mockResolvedValue([mini])
    const { result } = renderHook(() => usePrinter(vi.fn(), vi.fn()))
    await waitFor(() => expect(result.current.printers).toHaveLength(1))
    expect(result.current.printerId).toBeNull()
    expect(localStorage.getItem(ID_KEY)).toBeNull()
  })
})
