import 'server-only'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from './auth'

// Small helpers shared by the library API route handlers: authenticate, validate the request body
// against a Zod schema, and turn thrown errors into JSON responses with the right status. Keeps
// every handler a thin, uniform shell.

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** The signed-in user's id, or a 401 (caught by `handle`). Every mutating/listing route gates here. */
export async function requireUserId(): Promise<string> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) throw new ApiError(401, 'Not signed in')
  return id
}

/** Run a handler, serialising its result as JSON and mapping ApiError → its status, else → 500. */
export async function handle(fn: () => Promise<unknown>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn())
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[api]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** Parse + validate a JSON request body against a Zod schema (→ 400 with the field errors on fail). */
export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<z.output<S>> {
  const raw = await req.json().catch(() => null)
  const result = schema.safeParse(raw)
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ')
    throw new ApiError(400, msg || 'Invalid request body')
  }
  return result.data
}

/** Require a value found in a lookup (update/delete on a non-existent / not-owned id → 404). */
export function found<T>(v: T | null | false, what = 'Not found'): T {
  if (v === null || v === false) throw new ApiError(404, what)
  return v
}

const OBJECT_ID = /^[a-f\d]{24}$/i

/** Validate a path-param document id BEFORE it reaches a query. A malformed id would otherwise make
 *  Mongoose throw a CastError, which `handle` maps to a 500 — so reject it here as a clean 404. */
export function objectId(id: string): string {
  if (!OBJECT_ID.test(id)) throw new ApiError(404, 'Not found')
  return id
}
