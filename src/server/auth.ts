import 'server-only'

import { MongoDBAdapter } from '@auth/mongodb-adapter'
import NextAuth from 'next-auth'

import { authConfig } from './auth.config'
import { getMongoClient } from './db'

// Expose the authenticated user's id on the session for ownership checks in later phases.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

// Full (Node-runtime) Auth.js instance: the edge-safe base + the MongoDB adapter and database
// sessions. getMongoClient is passed as a thunk so no connection opens until the adapter is used.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(getMongoClient),
  session: { strategy: 'database' },
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id
      return session
    },
  },
})
