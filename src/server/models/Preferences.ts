import 'server-only'

import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

// Per-user preferences, a singleton keyed by a unique userId. Kept in its own small collection
// rather than embedded on the adapter-managed `users` doc (the Auth.js schema isn't ours to extend).
const PreferencesSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, unique: true },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    units: { type: String, enum: ['mm', 'in'], default: 'in' },
  },
  { timestamps: true, collection: 'preferences' },
)

export type PreferencesDoc = InferSchemaType<typeof PreferencesSchema>

export const Preferences: Model<PreferencesDoc> =
  (mongoose.models.Preferences as Model<PreferencesDoc>) ??
  mongoose.model<PreferencesDoc>('Preferences', PreferencesSchema)
