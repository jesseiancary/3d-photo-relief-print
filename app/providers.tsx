'use client'

import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

import { PreferencesProvider } from '@/hooks/usePreferences'

// Client-side session context so components (account menu, save-to-project) can read auth state.
// PreferencesProvider sits inside it so theme/units can sync to the signed-in account.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <PreferencesProvider>{children}</PreferencesProvider>
    </SessionProvider>
  )
}
