'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { ThemeToggle } from '@/components/ThemeToggle'

const links = [
  { href: '/library', label: 'Library' },
  { href: '/library/projects', label: 'Projects' },
  { href: '/library/templates', label: 'Template' },
  { href: '/library/filaments', label: 'Filaments' },
  { href: '/library/printers', label: 'Printers' },
]

const item =
  'block w-full rounded-control px-3 py-1.5 text-left text-label text-muted hover:text-foreground'

// Shared account/nav cluster for the app header. Reads auth client-side (SessionProvider is
// app-wide), so it works on the client-only main screen and in the server-gated library layout
// alike: signed in → the email as a dropdown trigger holding the library nav, Settings, and Sign
// Out; signed out → a sign-in link + the theme toggle (signed-in users pick their theme in
// Preferences, which syncs to the account). While the session resolves nothing shows, to avoid a
// theme-toggle/account flicker. The dropdown is self-contained (no shared menu primitive yet —
// deferred to shadcn), built from existing tokens.
export function AppToolbar() {
  const { status, data } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Dismiss on outside pointerdown or Escape, only while open.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
      {status === 'authenticated' && (
        <div ref={ref} className="relative">
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="text-label text-muted hover:text-foreground hover:cursor-pointer"
          >
            {data?.user?.email}
          </button>
          {open && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-card border border-line bg-surface p-1 shadow-card">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className={item} onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              ))}
              <hr className="my-1 border-line" />
              <Link href="/library/settings" className={item} onClick={() => setOpen(false)}>
                Settings
              </Link>
              <button
                type="button"
                className={item}
                onClick={() => {
                  setOpen(false)
                  signOut({ callbackUrl: '/' })
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
      {status === 'unauthenticated' && (
        <>
          <Link
            href="/signin?callbackUrl=/"
            className="text-label text-muted hover:text-foreground"
          >
            Sign in / Create account
          </Link>
          <ThemeToggle />
        </>
      )}
    </div>
  )
}
