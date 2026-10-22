import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { DEFAULT_BED_MM } from '@/core/defaults'
import type { PrintSettings } from '@/core/types'
import type { PrinterProfileDTO } from '@/lib/library-types'
import { libraryApi } from '@/lib/store'

import type { Say } from './useStatus'

const PRINTER_ID_KEY = 'photo-relief.printerId.v1'

function loadPrinterId(): string | null {
  try {
    return localStorage.getItem(PRINTER_ID_KEY)
  } catch {
    return null
  }
}

function persistPrinterId(id: string | null) {
  try {
    if (id) localStorage.setItem(PRINTER_ID_KEY, id)
    else localStorage.removeItem(PRINTER_ID_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * The selected printer profile. Mirrors useTemplate: holds the user's saved printers (empty when
 * signed out) and the active selection (persisted to localStorage). Selecting a profile pushes its
 * geometry (`layer/firstLayer/pitch/cornerRadius`) into `settings.print` via the injected `applyPrint`
 * and exposes `bedMm` (which lives outside Settings) for the oversize warning + 3MF plate centering.
 * `baseMm`/`heightIn` are per-image and never overridden. Falls back to DEFAULT_BED_MM when manual.
 */
export function usePrinter(applyPrint: (patch: Partial<PrintSettings>) => void, say: Say) {
  const { status } = useSession()
  const [printers, setPrinters] = useState<PrinterProfileDTO[]>([])
  const [printerId, setPrinterId] = useState<string | null>(loadPrinterId)
  const [bedMm, setBedMm] = useState<number>(DEFAULT_BED_MM)

  // Keep the caller's callbacks in refs so selectPrinter can stay referentially stable across renders
  // (App passes fresh inline closures each render) without re-subscribing the load effect.
  const applyPrintRef = useRef(applyPrint)
  applyPrintRef.current = applyPrint
  const sayRef = useRef(say)
  sayRef.current = say

  // Load saved printers (only when signed in — the route is auth-gated). On load, restore the bed for
  // a persisted selection but DON'T re-apply the print fields: those were written to settings.print
  // when the profile was first picked, so they're already in the persisted working copy.
  useEffect(() => {
    if (status !== 'authenticated') {
      // Signed out: no picker, so return to manual/default mode. Keep the persisted id in localStorage
      // so re-signing-in restores the selection.
      setPrinters([])
      setPrinterId(null)
      setBedMm(DEFAULT_BED_MM)
      return
    }
    let live = true
    void libraryApi.printers
      .list()
      .then((ps) => {
        if (!live) return
        setPrinters(ps)
        const stored = loadPrinterId()
        const active = stored ? ps.find((p) => p.id === stored) : null
        if (active) setBedMm(active.bedMm)
        else if (stored) {
          // The saved id no longer exists (deleted elsewhere) — clear it.
          setPrinterId(null)
          persistPrinterId(null)
        }
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [status])

  const selectPrinter = useCallback(
    (id: string | null) => {
      if (!id) {
        setPrinterId(null)
        persistPrinterId(null)
        setBedMm(DEFAULT_BED_MM)
        sayRef.current('Printer: manual (no profile)')
        return
      }
      const p = printers.find((x) => x.id === id)
      if (!p) return
      setPrinterId(id)
      persistPrinterId(id)
      setBedMm(p.bedMm)
      applyPrintRef.current({
        layerMm: p.layerMm,
        firstLayerMm: p.firstLayerMm,
        pitchMm: p.pitchMm,
        cornerRadius: p.cornerRadius,
      })
      sayRef.current(`Printer: ${p.name} · ${p.bedMm} mm bed`)
    },
    [printers],
  )

  return useMemo(
    () => ({ printers, printerId, bedMm, selectPrinter }),
    [printers, printerId, bedMm, selectPrinter],
  )
}
