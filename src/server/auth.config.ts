import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

// Edge-safe base config: providers + routing only, NO database adapter. This is what the (edge)
// middleware can import. The full config in auth.ts layers the MongoDB adapter + database sessions
// on top. Google client id/secret are read from AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET by convention.
export const authConfig: NextAuthConfig = {
  providers: [Google],
  pages: { signIn: '/signin' },
  // Allow the app to run behind localhost / self-hosted origins (Vercel auto-detects its host).
  trustHost: true,
}
