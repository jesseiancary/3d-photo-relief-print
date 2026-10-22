import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppToolbar } from '@/components/AppToolbar'
import { auth } from '@/server/auth'

export const dynamic = 'force-dynamic'

// Authoritative auth gate for the library (the edge middleware only does an optimistic cookie
// check). Renders a thin header with the account + sign-out; the sections render as children.
export default async function LibraryLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/signin?callbackUrl=/library')

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-line px-6 py-3">
        <Link href="/" className="text-title">
          Photo Relief
        </Link>
        <AppToolbar />
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
