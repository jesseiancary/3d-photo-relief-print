import 'server-only'

import type {
  FilamentProfileDTO,
  FilamentProfileInput,
  PreferencesDTO,
  PrinterInput,
  PrinterProfileDTO,
  TemplateDTO,
  TemplateInput,
} from '@/lib/library-types'

import { connectMongoose } from './db'
import {
  filamentProfileToDTO,
  preferencesToDTO,
  printerProfileToDTO,
  templateToDTO,
} from './mappers'
import { FilamentProfile, Preferences, PrinterProfile, Template } from './models'

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
