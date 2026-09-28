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
    const host = (window as unknown as { claude?: ClaudeHost }).claude
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
    const code = (e as { code?: string }).code
    if (code === 'declined') return 'Save cancelled'
    if (code !== 'rejected_extension') throw new Error((e as Error).message || 'Save failed')
  }
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const zipName = filename.replace(/\.[^.]+$/, '') + '.zip'
  try {
    await dl.save({
      filename: zipName,
      data: new Blob([zipSync({ [filename]: [bytes, { level: 0 }] }) as BlobPart]),
    })
    return `Saved ${zipName} — unzip it to get ${filename}`
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'declined') return 'Save cancelled'
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
