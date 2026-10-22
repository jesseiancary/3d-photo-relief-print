import 'server-only'

import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

// Per-user printer geometry — the bed size (DEFAULT_BED_MM fallback) plus the print defaults as
// saveable, per-user config. Selecting a profile (usePrinter) drives the tool's print settings + the
// 3MF plate centering.
const PrinterProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    name: { type: String, required: true, trim: true },
    bedMm: { type: Number, required: true },
    layerMm: { type: Number, required: true },
    firstLayerMm: { type: Number, required: true },
    pitchMm: { type: Number, required: true },
    cornerRadius: { type: Number, required: true },
  },
  { timestamps: true, collection: 'printerProfiles' },
)

export type PrinterProfileDoc = InferSchemaType<typeof PrinterProfileSchema>

export const PrinterProfile: Model<PrinterProfileDoc> =
  (mongoose.models.PrinterProfile as Model<PrinterProfileDoc>) ??
  mongoose.model<PrinterProfileDoc>('PrinterProfile', PrinterProfileSchema)
