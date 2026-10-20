import 'server-only'

import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

// A named slicer template in the user's library: the `{ application, config }` pair extracted from a
// real Bambu/Orca project (see core/template.ts). `config` is stored as Mixed — VERBATIM, with no
// key transform — so the British `colour` keys (filament_colour, extruder_colour, …) survive the
// Mongo round-trip. If this were a typed sub-schema, Mongoose would strip unknown keys and Bambu
// would silently drop all colors on re-export. Never model `config` as anything but Mixed.
const TemplateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    name: { type: String, required: true, trim: true },
    application: { type: String, required: true },
    config: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, collection: 'templates', minimize: false },
)

export type TemplateDoc = InferSchemaType<typeof TemplateSchema>

// Guard against re-registration across hot-reload / lambda reuse (model() throws on a second call).
export const Template: Model<TemplateDoc> =
  (mongoose.models.Template as Model<TemplateDoc>) ??
  mongoose.model<TemplateDoc>('Template', TemplateSchema)
