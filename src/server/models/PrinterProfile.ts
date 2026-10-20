import 'server-only'

import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

// Per-user printer geometry — surfaces the today-hardcoded BED_MM (= 250) in src/App.tsx plus the
// print defaults as saveable, per-user config.
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
