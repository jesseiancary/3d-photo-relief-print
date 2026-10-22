// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PreferencesProvider, usePreferences } from './usePreferences'

// The provider reads useSession (to sync with the account) and libraryApi.prefs (get/update). Both
// are mocked; the session is a mutable ref so a spec can run anonymous or authenticated.
const h = vi.hoisted(() => ({
  session: { current: { status: 'unauthenticated' } as { status: string } },
  get: vi.fn(),
  update: vi.fn(),
}))
vi.mock('next-auth/react', () => ({ useSession: () => h.session.current }))
vi.mock('@/lib/store', () => ({ libraryApi: { prefs: { get: h.get, update: h.update } } }))

const THEME_KEY = 'photo-relief.theme.v1'
const UNITS_KEY = 'photo-relief.units.v1'
const wrapper = ({ children }: { children: ReactNode }) => (
  <PreferencesProvider>{children}</PreferencesProvider>
)

beforeEach(() => {
  h.session.current = { status: 'unauthenticated' }
  h.get.mockReset().mockResolvedValue({ theme: 'system', units: 'in' })
  h.update.mockReset().mockResolvedValue({ theme: 'system', units: 'in' })
})
afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('usePreferences', () => {
  it('applies + mirrors a change locally, without touching the account when signed out', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper })
    act(() => result.current.setTheme('dark'))
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(h.update).not.toHaveBeenCalled()
  })

  it('adopts the account doc on sign-in and mirrors it locally', async () => {
    h.session.current = { status: 'authenticated' }
    h.get.mockResolvedValue({ theme: 'dark', units: 'mm' })
    const { result } = renderHook(() => usePreferences(), { wrapper })
    await waitFor(() => expect(result.current.theme).toBe('dark'))
    expect(result.current.units).toBe('mm')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('PATCHes the account when a signed-in user changes a pref', async () => {
    h.session.current = { status: 'authenticated' }
    const { result } = renderHook(() => usePreferences(), { wrapper })
    await waitFor(() => expect(h.get).toHaveBeenCalled())
    act(() => result.current.setUnits('mm'))
    expect(result.current.units).toBe('mm')
    expect(h.update).toHaveBeenCalledWith({ units: 'mm' })
  })

  it('surfaces a syncError when the account PATCH fails, but still applies the change locally', async () => {
    h.session.current = { status: 'authenticated' }
    h.update.mockRejectedValue(new Error('500'))
    const { result } = renderHook(() => usePreferences(), { wrapper })
    await waitFor(() => expect(h.get).toHaveBeenCalled())
    act(() => result.current.setUnits('mm'))
    expect(result.current.units).toBe('mm')
    expect(localStorage.getItem(UNITS_KEY)).toBe('mm')
    await waitFor(() => expect(result.current.syncError).toBeTruthy())
  })

  // Note: the GET-failure path (the provider's `.catch` reconciling against null) isn't tested at this
  // seam — the hook initializes from the mirror via useState, so a GET failure has no observable
  // post-state distinct from mount, making a provider-level test a false-green. The decision itself
  // (reconcilePrefs(local, null) === local) is unit-tested directly in src/lib/prefs.test.ts.
})
