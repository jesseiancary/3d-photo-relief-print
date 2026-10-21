import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { Button } from '@/components/Button'
import { auth, signOut } from '@/server/auth'

export const dynamic = 'force-dynamic'

// Authoritative auth gate for the library (the edge middleware only does an optimistic cookie
// check). Renders a thin header with the account + sign-out; the sections render as children.
export default async function LibraryLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/signin?callbackUrl=/library')

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-line px-6 py-3">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/" className="text-title">
            Photo Relief
          </Link>
          <Link href="/library" className="text-label text-muted hover:text-foreground">
            Library
          </Link>
          <Link href="/library/projects" className="text-label text-muted hover:text-foreground">
            Projects
          </Link>
          <Link href="/library/templates" className="text-label text-muted hover:text-foreground">
            Templates
          </Link>
          <Link href="/library/filaments" className="text-label text-muted hover:text-foreground">
            Filaments
          </Link>
          <Link href="/library/printers" className="text-label text-muted hover:text-foreground">
            Printers
          </Link>
          <Link href="/library/settings" className="text-label text-muted hover:text-foreground">
            Preferences
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-caption text-muted">{session.user.email}</span>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/' })
            }}
          >
            <Button variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
