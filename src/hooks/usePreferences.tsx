'use client'

import { useSession } from 'next-auth/react'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import type { PreferencesDTO, ThemePref, UnitsPref } from '@/lib/library-types'
import {
  applyTheme,
  readStoredPrefs,
  reconcilePrefs,
  writeStoredPrefs,
  writeThemeCookie,
} from '@/lib/prefs'
import { libraryApi } from '@/lib/store'

interface PreferencesCtx {
  theme: ThemePref
  units: UnitsPref
  setTheme: (t: ThemePref) => void
  setUnits: (u: UnitsPref) => void
  /** Set when a signed-in account PATCH fails; the change is still applied + mirrored locally. */
  syncError: string | null
}

const Ctx = createContext<PreferencesCtx | null>(null)

/**
 * App-wide theme + units preferences. Single source of truth for both the header theme toggle and the
 * library settings form. Anonymous users are served the localStorage mirror; signing in adopts the
 * account doc (it wins), which is mirrored back locally so the next load — and the no-flash script —
 * match. Changes apply immediately, write the mirror, and PATCH the account when signed in.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [prefs, setPrefs] = useState<PreferencesDTO>(readStoredPrefs)
  const [syncError, setSyncError] = useState<string | null>(null)

  // On sign-in, the account doc is authoritative: adopt it and mirror it locally. Reads the mirror
  // fresh (not via closure) so the effect depends only on auth status. A failed GET reconciles against
  // null — i.e. keep the local mirror — so a transient outage never blocks the tool.
  useEffect(() => {
    if (status !== 'authenticated') return
    let live = true
    void libraryApi.prefs
      .get()
      .then((server) => {
        if (!live) return
        const next = reconcilePrefs(readStoredPrefs(), server)
        setPrefs(next)
        writeStoredPrefs(next)
      })
      .catch(() => {
        if (!live) return
        setPrefs(reconcilePrefs(readStoredPrefs(), null))
      })
    return () => {
      live = false
    }
  }, [status])

  // Keep <html data-theme> in sync (covers the first client render + every change) and refresh the
  // cookie the server reads on the next load, so SSR renders the right theme with no flash. Writing on
  // mount also back-fills the cookie for users who only have the older localStorage mirror.
  useEffect(() => {
    applyTheme(prefs.theme)
    writeThemeCookie(prefs.theme)
  }, [prefs.theme])

  const update = (patch: Partial<PreferencesDTO>) => {
    // Functional update so two setters firing in one tick can't clobber via a stale closure; the
    // mirror write is idempotent, so a StrictMode double-invoke is harmless.
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      writeStoredPrefs(next)
      return next
    })
    if (status === 'authenticated') {
      setSyncError(null)
      void libraryApi.prefs
        .update(patch)
        .catch(() =>
          setSyncError("Couldn't save to your account — changes are kept on this device."),
        )
    }
  }

  const value: PreferencesCtx = {
    theme: prefs.theme,
    units: prefs.units,
    setTheme: (theme) => update({ theme }),
    setUnits: (units) => update({ units }),
    syncError,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePreferences(): PreferencesCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
