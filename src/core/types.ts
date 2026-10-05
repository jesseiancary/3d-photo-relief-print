export interface Filament {
  id: string
  name: string
  /** display color, #rrggbb */
  color: string
  /** HueForge-style transmission distance */
  td: number
  /** layers in this filament's band; null = auto (enough to become opaque). Ignored for the base filament. */
  layers: number | null
}

export interface PrintSettings {
  heightIn: number
  /** top of the base (first filament) in mm; snapped to a layer boundary */
  baseMm: number
  layerMm: number
  firstLayerMm: number
  /** mesh grid spacing in mm (size of one "pixel" in the model) */
  pitchMm: number
  /** corner rounding radius, as a percent (0–10) of the longer footprint dimension */
  cornerRadius: number
}

export interface AdjustSettings {
  /** median blur radius in mm at print size */
  blurMm: number
  /** 0..255 */
  blackPoint: number
  /** 0..255 */
  whitePoint: number
  /** >1 brightens midtones, <1 darkens */
  gamma: number
  /** unsharp-mask amount, 0 = off */
  sharpen: number
}

export type ToneMode = 'photo' | 'graphic'

export interface ToneSettings {
  mode: ToneMode
  /** number of printed tones (photo mode) */
  count: number
}

/** Crop rectangle in normalized fractions of the source image (0..1); full frame = {0,0,1,1}. */
export interface CropSettings {
  x: number
  y: number
  w: number
  h: number
}

export interface Settings {
  print: PrintSettings
  adjust: AdjustSettings
  tones: ToneSettings
  crop: CropSettings
  filaments: Filament[]
}

export type RGB = [number, number, number]
