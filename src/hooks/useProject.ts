import { useSession } from 'next-auth/react'
import { useCallback, useState } from 'react'

import { settingsFromDoc } from '@/core/settings'
import type { Settings } from '@/core/types'
import { uploadBlob } from '@/lib/blobUpload'
import type { ExportDTO } from '@/lib/library-types'
import { libraryApi } from '@/lib/store'
import { thumbnailFromPreview } from '@/lib/thumbnail'
import type { PreviewResult } from '@/worker/client'

export interface LoadedProject {
  id: string
  name: string
  settings: Settings
  templateId: string | null
  image: { blob: Blob; name: string }
}

interface SaveArgs {
  name: string
  settings: Settings
  templateId: string | null
  imageBlob: Blob
  imageName: string
  preview: PreviewResult
}

// Best-effort delete of blobs that uploaded but were never referenced by a saved doc (the follow-up
// write failed). The browser can't delete blobs directly, so it goes through the auth-gated route.
async function cleanupBlobs(...urls: (string | undefined)[]): Promise<void> {
  await Promise.all(
    urls.filter((u): u is string => !!u).map((u) => libraryApi.blob.remove(u).catch(() => {})),
  )
}

/**
 * Owns the signed-in user's current project identity + the server round-trips for saving a project,
 * reopening one into the tool, and the 3MF export history. Project features require auth (the tool
 * itself works anonymously); `isAuthed` drives whether the save UI is shown.
 */
export function useProject() {
  const { status } = useSession()
  const isAuthed = status === 'authenticated'
  const [projectId, setProjectId] = useState<string | null>(null)
  // The project's blob-folder key: null until the first save mints one (or a load supplies it), then
  // reused for every subsequent upload/export so they share one folder.
  const [assetKey, setAssetKey] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<ExportDTO[]>([])

  const refreshExports = useCallback(async (id: string) => {
    try {
      setHistory(await libraryApi.projects.exports.list(id))
    } catch {
      /* non-fatal: history just stays as-is */
    }
  }, [])

  // Reopen a project into the tool: fetch the doc, pull the image from Blob, re-mint filament ids.
  const load = useCallback(
    async (id: string): Promise<LoadedProject> => {
      const dto = await libraryApi.projects.get(id)
      const res = await fetch(dto.imageUrl)
      if (!res.ok) throw new Error('Could not load the project image')
      const blob = await res.blob()
      const settings = settingsFromDoc(dto.settings) // re-mints volatile filament ids
      setProjectId(dto.id)
      setAssetKey(dto.assetKey)
      setName(dto.name)
      void refreshExports(dto.id)
      return {
        id: dto.id,
        name: dto.name,
        settings,
        templateId: dto.templateId,
        image: { blob, name: dto.imageName ?? 'project' },
      }
    },
    [refreshExports],
  )

  // Save (create or update). Always (re)uploads the source image + a fresh thumbnail into the
  // project's asset folder (<assetKey>/…); the server deletes the replaced blobs on update, so the
  // folder stays clean. assetKey is minted on the first save and sent only on create (immutable).
  const save = useCallback(
    async (args: SaveArgs): Promise<boolean> => {
      setBusy(true)
      setError(null)
      const key = assetKey ?? crypto.randomUUID()
      let imageUrl: string | undefined
      let thumbUrl: string | undefined
      try {
        const thumb = await thumbnailFromPreview(
          args.preview.sim,
          args.preview.cols,
          args.preview.rows,
        )
        ;[imageUrl, thumbUrl] = await Promise.all([
          uploadBlob(args.imageBlob, key, args.imageName || 'image'),
          uploadBlob(thumb, key, 'thumb.webp'),
        ])
        const base = {
          name: args.name,
          imageUrl,
          thumbUrl,
          imageName: args.imageName,
          imageSize: args.imageBlob.size,
          settings: args.settings,
          templateId: args.templateId,
        }
        const dto = projectId
          ? await libraryApi.projects.update(projectId, base)
          : await libraryApi.projects.create({ ...base, assetKey: key })
        setProjectId(dto.id)
        setAssetKey(dto.assetKey)
        setName(dto.name)
        return true
      } catch (e) {
        setError((e as Error).message)
        // The doc write failed after the uploads succeeded — delete the orphaned blobs.
        await cleanupBlobs(imageUrl, thumbUrl)
        return false
      } finally {
        setBusy(false)
      }
    },
    [projectId, assetKey],
  )

  // Upload a 3MF export and record it in the open project's history.
  const saveExport = useCallback(
    async (bytes: Uint8Array, filename: string, triangles: number, settings: Settings) => {
      if (!projectId || !assetKey) return false
      setBusy(true)
      setError(null)
      let threeMfUrl: string | undefined
      try {
        const blob = new Blob([bytes as BlobPart], { type: 'model/3mf' })
        threeMfUrl = await uploadBlob(blob, assetKey, filename) // same folder as the project
        await libraryApi.projects.exports.create(projectId, {
          filename,
          threeMfUrl,
          triangles,
          byteSize: bytes.length,
          settings,
        })
        await refreshExports(projectId)
        return true
      } catch (e) {
        setError((e as Error).message)
        await cleanupBlobs(threeMfUrl) // the export doc write failed after upload
        return false
      } finally {
        setBusy(false)
      }
    },
    [projectId, assetKey, refreshExports],
  )

  const removeExport = useCallback(
    async (exportId: string) => {
      try {
        await libraryApi.projects.exports.remove(exportId)
        if (projectId) await refreshExports(projectId)
      } catch (e) {
        setError((e as Error).message)
      }
    },
    [projectId, refreshExports],
  )

  return {
    isAuthed,
    projectId,
    name,
    setName,
    busy,
    error,
    exports: history,
    load,
    save,
    saveExport,
    removeExport,
  }
}
