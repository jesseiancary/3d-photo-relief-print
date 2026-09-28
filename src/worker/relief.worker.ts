import { createHandler } from './handler'
import type { Request, Response } from './protocol'

const ctx = self as unknown as {
  postMessage(m: Response, t?: Transferable[]): void
  onmessage: ((e: MessageEvent<Request>) => void) | null
}
const handle = createHandler((m, t) => ctx.postMessage(m, t ?? []))
ctx.onmessage = (e) => handle(e.data)
