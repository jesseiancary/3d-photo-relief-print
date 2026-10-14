import { NextResponse, type NextRequest } from 'next/server'

// Optimistic auth gate for /library (Next 16's proxy convention, formerly "middleware"). We use
// database sessions, which can't be validated on the edge (no DB access), so this only checks for
// the presence of a session cookie for a fast redirect; the authoritative `await auth()` check
// lives in app/library/layout.tsx.
const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token']

export function proxy(req: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name))
  if (!hasSession) {
    const url = new URL('/signin', req.url)
    url.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/library/:path*'] }
