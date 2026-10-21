import 'server-only'

import type {
  ExportDTO,
  ExportInput,
  FilamentProfileDTO,
  FilamentProfileInput,
  PreferencesDTO,
  PrinterInput,
  PrinterProfileDTO,
  ProjectDTO,
  ProjectInput,
  TemplateDTO,
  TemplateFull,
  TemplateInput,
} from '@/lib/library-types'

import { blobStore } from './blob'
import { connectMongoose } from './db'
import {
  exportToDTO,
  filamentProfileToDTO,
  preferencesToDTO,
  printerProfileToDTO,
  projectToDTO,
  templateToDTO,
} from './mappers'
import { Export, FilamentProfile, Preferences, PrinterProfile, Project, Template } from './models'

// Server-side data access, every query scoped by `userId` so one user can never read or mutate
// another's documents. Shared by the API route handlers and the server-component library pages, so
// the ownership filter lives in exactly one place. All DTOs returned are client-safe (see mappers).

const byName = { name: 1 as const }

/* ---------------- templates ---------------- */

export async function listTemplates(userId: string): Promise<TemplateDTO[]> {
  await connectMongoose()
  const docs = await Template.find({ userId }).sort(byName).lean()
  return docs.map(templateToDTO)
}

export async function createTemplate(userId: string, input: TemplateInput): Promise<TemplateDTO> {
  await connectMongoose()
  const doc = await Template.create({ userId, ...input })
  return templateToDTO(doc.toObject())
}

export async function renameTemplate(
  userId: string,
  id: string,
  name: string,
): Promise<TemplateDTO | null> {
  await connectMongoose()
  const doc = await Template.findOneAndUpdate({ _id: id, userId }, { name }, { new: true }).lean()
  return doc && templateToDTO(doc)
}

export async function deleteTemplate(userId: string, id: string): Promise<boolean> {
  await connectMongoose()
  const res = await Template.deleteOne({ _id: id, userId })
  return res.deletedCount === 1
}

/* ---------------- filament profiles ---------------- */

export async function listFilamentProfiles(userId: string): Promise<FilamentProfileDTO[]> {
  await connectMongoose()
  const docs = await FilamentProfile.find({ userId }).sort(byName).lean()
  return docs.map(filamentProfileToDTO)
}

export async function createFilamentProfile(
  userId: string,
  input: FilamentProfileInput,
): Promise<FilamentProfileDTO> {
  await connectMongoose()
  // Filament ids are already stripped by the Zod schema, and the Mongoose sub-schema has no id path,
  // so a stray id (e.g. from a live stack passed by a server caller) is dropped on write anyway.
  const doc = await FilamentProfile.create({ userId, ...input })
  return filamentProfileToDTO(doc.toObject())
}

export async function updateFilamentProfile(
  userId: string,
  id: string,
  patch: Partial<FilamentProfileInput>,
): Promise<FilamentProfileDTO | null> {
  await connectMongoose()
  const doc = await FilamentProfile.findOneAndUpdate({ _id: id, userId }, patch, {
    new: true,
  }).lean()
  return doc && filamentProfileToDTO(doc)
}

export async function deleteFilamentProfile(userId: string, id: string): Promise<boolean> {
  await connectMongoose()
  const res = await FilamentProfile.deleteOne({ _id: id, userId })
  return res.deletedCount === 1
}

/* ---------------- printer profiles ---------------- */

export async function listPrinterProfiles(userId: string): Promise<PrinterProfileDTO[]> {
  await connectMongoose()
  const docs = await PrinterProfile.find({ userId }).sort(byName).lean()
  return docs.map(printerProfileToDTO)
}

export async function createPrinterProfile(
  userId: string,
  input: PrinterInput,
): Promise<PrinterProfileDTO> {
  await connectMongoose()
  const doc = await PrinterProfile.create({ userId, ...input })
  return printerProfileToDTO(doc.toObject())
}

export async function updatePrinterProfile(
  userId: string,
  id: string,
  patch: Partial<PrinterInput>,
): Promise<PrinterProfileDTO | null> {
  await connectMongoose()
  const doc = await PrinterProfile.findOneAndUpdate({ _id: id, userId }, patch, {
    new: true,
  }).lean()
  return doc && printerProfileToDTO(doc)
}

export async function deletePrinterProfile(userId: string, id: string): Promise<boolean> {
  await connectMongoose()
  const res = await PrinterProfile.deleteOne({ _id: id, userId })
  return res.deletedCount === 1
}

/* ---------------- preferences (singleton per user) ---------------- */

export async function getPreferences(userId: string): Promise<PreferencesDTO> {
  await connectMongoose()
  const doc = await Preferences.findOne({ userId }).lean()
  return preferencesToDTO(doc)
}

export async function updatePreferences(
  userId: string,
  patch: Partial<PreferencesDTO>,
): Promise<PreferencesDTO> {
  await connectMongoose()
  const doc = await Preferences.findOneAndUpdate({ userId }, patch, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  }).lean()
  return preferencesToDTO(doc)
}

/* ---------------- full template (for the tool's picker + reopening a project) ---------------- */

export async function getTemplate(userId: string, id: string): Promise<TemplateFull | null> {
  await connectMongoose()
  const doc = await Template.findOne({ _id: id, userId }).lean()
  if (!doc) return null
  return { id: String(doc._id), name: doc.name, application: doc.application, config: doc.config }
}

/* ---------------- projects ---------------- */

export async function listProjects(userId: string): Promise<ProjectDTO[]> {
  await connectMongoose()
  const docs = await Project.find({ userId }).sort({ updatedAt: -1 }).lean()
  return docs.map(projectToDTO)
}

export async function getProject(userId: string, id: string): Promise<ProjectDTO | null> {
  await connectMongoose()
  const doc = await Project.findOne({ _id: id, userId }).lean()
  return doc && projectToDTO(doc)
}

export async function createProject(userId: string, input: ProjectInput): Promise<ProjectDTO> {
  await connectMongoose()
  const doc = await Project.create({ userId, ...input })
  return projectToDTO(doc.toObject())
}

export async function updateProject(
  userId: string,
  id: string,
  patch: Partial<ProjectInput>,
): Promise<ProjectDTO | null> {
  await connectMongoose()
  const existing = await Project.findOne({ _id: id, userId }).lean()
  if (!existing) return null
  const doc = await Project.findOneAndUpdate({ _id: id, userId }, patch, { new: true }).lean()
  if (!doc) return null
  // A replaced image/thumbnail leaves an orphaned blob — delete the old one (best-effort).
  const stale: (string | null | undefined)[] = []
  if (patch.imageUrl && patch.imageUrl !== existing.imageUrl) stale.push(existing.imageUrl)
  if (patch.thumbUrl && patch.thumbUrl !== existing.thumbUrl) stale.push(existing.thumbUrl)
  await Promise.all(
    stale.filter(Boolean).map((u) =>
      blobStore()
        .del(u as string)
        .catch(() => {}),
    ),
  )
  return projectToDTO(doc)
}

export async function deleteProject(userId: string, id: string): Promise<boolean> {
  await connectMongoose()
  const doc = await Project.findOne({ _id: id, userId }).lean()
  if (!doc) return false
  // Sweep the project's entire blob folder by prefix — catches the image, thumbnail, every export,
  // and any blob a failed save orphaned. Best-effort: a blob error must not block the DB delete.
  if (doc.assetKey)
    await blobStore()
      .delByPrefix(`${doc.assetKey}/`)
      .catch(() => {})
  await Export.deleteMany({ userId, projectId: id })
  await Project.deleteOne({ _id: id, userId })
  return true
}

/* ---------------- export history ---------------- */

export async function listExports(userId: string, projectId: string): Promise<ExportDTO[]> {
  await connectMongoose()
  const docs = await Export.find({ userId, projectId }).sort({ createdAt: -1 }).lean()
  return docs.map(exportToDTO)
}

export async function createExport(
  userId: string,
  projectId: string,
  input: ExportInput,
): Promise<ExportDTO | null> {
  await connectMongoose()
  // Ownership check: the project must belong to this user before an export is attached to it.
  // null → the route's `found()` maps it to a 404.
  const project = await Project.findOne({ _id: projectId, userId }).select('_id').lean()
  if (!project) return null
  const doc = await Export.create({
    userId,
    projectId,
    filename: input.filename,
    threeMfUrl: input.threeMfUrl,
    triangles: input.triangles,
    byteSize: input.byteSize,
    settingsSnapshot: input.settings,
  })
  return exportToDTO(doc.toObject())
}

export async function deleteExport(userId: string, id: string): Promise<boolean> {
  await connectMongoose()
  const doc = await Export.findOne({ _id: id, userId }).lean()
  if (!doc) return false
  if (doc.threeMfUrl)
    await blobStore()
      .del(doc.threeMfUrl)
      .catch(() => {})
  await Export.deleteOne({ _id: id, userId })
  return true
}
