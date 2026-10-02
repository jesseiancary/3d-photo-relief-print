import { zipSync } from 'fflate'

/* ---------- browser storage (may be unavailable: private windows, sandboxes) ---------- */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
export function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/* ---------- saving files ---------- */
interface DownloadsNs {
  save(r: { filename: string; data: Blob | string }): Promise<{ status: string }>
}
interface ClaudeHost {
  use(name: string): Promise<unknown>
}

let downloadsP: Promise<DownloadsNs | null> | null = null
function downloads(): Promise<DownloadsNs | null> {
  if (!downloadsP) {
    // Guarded for non-browser contexts (SSR, the Node CLI, tests) where `window` is absent.
    const host =
      typeof window !== 'undefined'
        ? (window as unknown as { claude?: ClaudeHost }).claude
        : undefined
    downloadsP = host?.use
      ? (host.use('downloads') as Promise<DownloadsNs | null>).catch(() => null)
      : Promise.resolve(null)
  }
  return downloadsP
}
// start resolving early so the first click isn't slow
queueMicrotask(() => void downloads())

function anchorDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/* ---------- pure save decisions (unit-tested without the DOM/host) ---------- */

/** How to react to a host save error: cancel quietly, retry zipped, or fail loudly. */
export function classifySaveError(code: string | undefined): 'cancelled' | 'retry-zip' | 'fail' {
  if (code === 'declined') return 'cancelled'
  if (code === 'rejected_extension') return 'retry-zip'
  return 'fail'
}

/** The .zip the file is wrapped in when the host rejects its extension (stored, uncompressed). */
export function zipWrap(
  filename: string,
  data: Uint8Array | string,
): { name: string; bytes: Uint8Array } {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  return {
    name: filename.replace(/\.[^.]+$/, '') + '.zip',
    bytes: zipSync({ [filename]: [bytes, { level: 0 }] }),
  }
}

/**
 * Save a file. Inside a claude.ai artifact, saves go through the host's download prompt, which doesn't
 * accept .3mf — in that case the file is wrapped in a .zip. Returns a short status line for the UI.
 */
export async function saveFile(
  filename: string,
  data: Uint8Array | string,
  mime = 'application/octet-stream',
): Promise<string> {
  const blob = new Blob([data as BlobPart], { type: mime })
  const dl = await downloads()
  if (!dl) {
    anchorDownload(filename, blob)
    return `Saved ${filename}`
  }
  try {
    await dl.save({ filename, data: blob })
    return `Saved ${filename}`
  } catch (e) {
    const action = classifySaveError((e as { code?: string }).code)
    if (action === 'cancelled') return 'Save cancelled'
    if (action === 'fail') throw new Error((e as Error).message || 'Save failed')
  }
  const zip = zipWrap(filename, data)
  try {
    await dl.save({ filename: zip.name, data: new Blob([zip.bytes as BlobPart]) })
    return `Saved ${zip.name} — unzip it to get ${filename}`
  } catch (e) {
    if (classifySaveError((e as { code?: string }).code) === 'cancelled') return 'Save cancelled'
    throw new Error((e as Error).message || 'Save failed')
  }
}

/** open a file picker and read the chosen file as text */
export function pickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const f = input.files?.[0]
      if (!f) return resolve(null)
      f.text().then(resolve, () => resolve(null))
    }
    input.click()
  })
}
