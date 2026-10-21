'use client'

import { useState } from 'react'

/** Minimal async-action state for the library managers: a busy flag + the last error message. */
export function useAsync() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError((e as Error).message)
      return undefined
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, setError, run }
}
