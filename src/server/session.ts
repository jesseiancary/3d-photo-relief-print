import 'server-only'

import { redirect } from 'next/navigation'

import { auth } from './auth'

// The signed-in user's id for a server component. The library layout already gates, but each page
// re-reads the session to scope its data query; this narrows the session so call sites need no
// non-null assertion. `redirect()` returns `never`, so if there's no session the id is unreachable.
export async function currentUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin?callbackUrl=/library')
  return session.user.id
}
