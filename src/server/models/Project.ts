import 'server-only'

import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

// A saved project: the source image (a Vercel Blob reference — bytes never go in Mongo) plus the
// full app `Settings` that reproduce the relief. The settings sub-doc mirrors Settings from
// core/types.ts; embedded filaments drop their volatile `id` (see mappers.ts). Projects are wired
// into the UI in Phase 4 — the model + mappers land now so the shape is pinned and unit-tested.
const sub = { _id: false } as const

const FilamentSchema = new Schema(
  {
    name: String,
    color: String,
    td: Number,
    layers: { type: Number, default: null },
  },
  sub,
)

const SettingsSchema = new Schema(
  {
    print: new Schema(
      {
        heightIn: Number,
        baseMm: Number,
        layerMm: Number,
        firstLayerMm: Number,
        pitchMm: Number,
        cornerRadius: Number,
      },
      sub,
    ),
    adjust: new Schema(
      { blurMm: Number, blackPoint: Number, whitePoint: Number, gamma: Number, sharpen: Number },
      sub,
    ),
    tones: new Schema({ mode: { type: String, enum: ['photo', 'graphic'] }, count: Number }, sub),
    crop: new Schema({ x: Number, y: Number, w: Number, h: Number }, sub),
    filaments: { type: [FilamentSchema], default: [] },
  },
  sub,
)

const ProjectSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    name: { type: String, required: true, trim: true },
    imageKey: { type: String, default: null },
    imageName: { type: String, default: null },
    imageSize: { type: Number, default: null },
    thumbKey: { type: String, default: null },
    settings: { type: SettingsSchema, required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'Template', default: null },
  },
  { timestamps: true, collection: 'projects' },
)

export type ProjectDoc = InferSchemaType<typeof ProjectSchema>

export const Project: Model<ProjectDoc> =
  (mongoose.models.Project as Model<ProjectDoc>) ??
  mongoose.model<ProjectDoc>('Project', ProjectSchema)
