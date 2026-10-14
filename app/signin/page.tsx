import { redirect } from 'next/navigation'

import { Button } from '@/components/Button'
import { auth, signIn } from '@/server/auth'

export const dynamic = 'force-dynamic'

// Sign-in screen. Already-authenticated users are bounced straight to their destination. The
// Google button posts to a server action that kicks off the OAuth flow.
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl } = await searchParams
  const redirectTo = callbackUrl ?? '/library'

  const session = await auth()
  if (session?.user) redirect(redirectTo)

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-card bg-surface p-8 shadow-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-title">Photo Relief</h1>
          <p className="text-caption text-muted">
            Sign in to save projects, filaments, and slicer templates to your account.
          </p>
        </div>
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo })
          }}
        >
          <Button variant="primary" type="submit" className="w-full">
            Sign in with Google
          </Button>
        </form>
      </div>
    </main>
  )
}
