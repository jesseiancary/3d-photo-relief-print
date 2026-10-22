import '@/index.css'

import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'

import { THEME_KEY, themeAttr } from '@/lib/prefs'

import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Photo Relief',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Render <html data-theme> from the theme cookie so the server HTML matches the client (no flash,
  // no hydration mismatch). The cookie is written client-side by the preferences provider; reading it
  // here opts the app into dynamic rendering, which is already the case (auth + client-only home).
  const theme = themeAttr((await cookies()).get(THEME_KEY)?.value)
  return (
    <html lang="en" data-theme={theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
