'use client'

import Link from 'next/link'

import { AppToolbar } from '@/components/AppToolbar'

// Shared app header across every page (the tool and the library). A full-width sticky bar with a
// bottom border, whose contents — the 3-bar filament logo + "Photo Relief" wordmark linking home,
// and the account toolbar — stay confined to the same max-w-360 column as the page content. The
// bar needs bg-background so content scrolls under it; z-30 keeps it above page content (and above
// the AppToolbar dropdown's own z-20, which is a child here). The logo bars are the literal
// filament-stack mark (white/grey/black), not theme tokens.
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background">
      <div className="mx-auto flex max-w-360 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid w-5.5 gap-0.5" aria-hidden="true">
            <i className="block h-1.25 w-3/5 rounded-[1px] bg-[#f4f4f2] shadow-ring" />
            <i className="block h-1.25 w-4/5 rounded-[1px] bg-[#a8abb0]" />
            <i className="block h-1.25 w-full rounded-[1px] bg-[#161616]" />
          </span>
          <span className="font-display text-title">Photo Relief</span>
        </Link>
        <AppToolbar />
      </div>
    </header>
  )
}
