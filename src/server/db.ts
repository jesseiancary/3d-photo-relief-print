import 'server-only'

import type { MongoClient } from 'mongodb'
import mongoose from 'mongoose'

// Serverless-safe Mongoose connection. On Vercel/Lambda a module is re-evaluated across invocations
// but the process (and its sockets) can be reused, so we cache the connection on `globalThis` to
// avoid opening a new pool on every request / hot reload. The Auth.js MongoDB adapter shares this
// same pool via getMongoClient() rather than opening a second client.

interface ConnCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const g = globalThis as unknown as { _mongoose?: ConnCache }
const cache: ConnCache = (g._mongoose ??= { conn: null, promise: null })

/** Connect (once) and return the Mongoose instance. Throws if MONGODB_URI is unset — lazily, so a
 *  build without env never crashes at import time. */
export async function connectMongoose(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { bufferCommands: false })
  }
  cache.conn = await cache.promise
  return cache.conn
}

/** The underlying MongoClient, for the Auth.js adapter. Lazy: nothing connects until first use. */
export async function getMongoClient(): Promise<MongoClient> {
  const m = await connectMongoose()
  // Mongoose 9 bundles the mongodb v6 driver; its client is the same shape the adapter expects.
  return m.connection.getClient() as unknown as MongoClient
}
