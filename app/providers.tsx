'use client'

import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

// Client-side session context so components (account menu, save-to-project) can read auth state.
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
