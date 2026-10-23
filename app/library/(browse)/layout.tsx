import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppHeader } from '@/components/AppHeader'
import { auth } from '@/server/auth'

export const dynamic = 'force-dynamic'

// Authoritative auth gate for the library (the edge middleware only does an optimistic cookie
// check). Renders the shared app header; the sections render as children in the same confined
// column as the main tool page.
export default async function LibraryLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/signin?callbackUrl=/library')

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-360 px-4 pb-12 pt-4">{children}</main>
    </div>
  )
}
