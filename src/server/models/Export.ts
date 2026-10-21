import 'server-only'

import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

// One saved 3MF in a project's export history: a Vercel Blob URL for the bytes plus a snapshot of
// the exact Settings that produced it (stored as Mixed — a point-in-time record, not a live doc).
// Scoped by both userId (ownership) and projectId (which project's history).
const ExportSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    filename: { type: String, required: true },
    threeMfUrl: { type: String, required: true },
    triangles: { type: Number, default: 0 },
    byteSize: { type: Number, default: 0 },
    settingsSnapshot: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, collection: 'exports' },
)

export type ExportDoc = InferSchemaType<typeof ExportSchema>

export const Export: Model<ExportDoc> =
  (mongoose.models.Export as Model<ExportDoc>) ?? mongoose.model<ExportDoc>('Export', ExportSchema)
