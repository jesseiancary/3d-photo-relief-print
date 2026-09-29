import { useCallback, useState } from 'react'

export interface Status {
  text: string
  tone: 'ok' | 'err'
}

/** The single status line at the bottom of the export card, with stable set/clear callbacks. */
export function useStatus() {
  const [status, setStatus] = useState<Status | null>(null)
  const say = useCallback(
    (text: string, tone: 'ok' | 'err' = 'ok') => setStatus({ text, tone }),
    [],
  )
  const clear = useCallback(() => setStatus(null), [])
  return { status, say, clear }
}

export type Say = ReturnType<typeof useStatus>['say']
