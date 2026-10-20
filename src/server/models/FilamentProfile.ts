import 'server-only'

import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

// A saved filament stack. Mirrors `Profile` from features/filaments/profiles.ts: the volatile
// client-minted filament `id` is NOT stored (it's re-minted when a stack is loaded into the tool).
const FilamentSchema = new Schema(
  {
    name: { type: String, required: true },
    color: { type: String, required: true },
    td: { type: Number, required: true },
    // null = auto (enough layers to become opaque); ignored for the base filament.
    layers: { type: Number, default: null },
  },
  { _id: false },
)

const FilamentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    name: { type: String, required: true, trim: true },
    filaments: { type: [FilamentSchema], required: true },
  },
  { timestamps: true, collection: 'filamentProfiles' },
)

export type FilamentProfileDoc = InferSchemaType<typeof FilamentProfileSchema>

export const FilamentProfile: Model<FilamentProfileDoc> =
  (mongoose.models.FilamentProfile as Model<FilamentProfileDoc>) ??
  mongoose.model<FilamentProfileDoc>('FilamentProfile', FilamentProfileSchema)
