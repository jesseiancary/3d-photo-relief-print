import type { Filament, Settings } from './types'

let n = 0
export const newId = () => `f${Date.now().toString(36)}${(n++).toString(36)}`

/**
 * TD values: Bambu Black / Blue Gray / Jade White come from a published HueForge project that printed well
 * with them. Elegoo Silk Silver is a PLACEHOLDER — silk filaments read by sheen more than translucency,
 * so calibrate it with the step wedge.
 */
export const FILAMENT_PRESETS: Omit<Filament, 'id'>[] = [
  { name: 'Elegoo Black', color: '#111111', td: 0.6, layers: null },
  { name: 'Elegoo Silk Silver', color: '#A8ABB0', td: 2.0, layers: null },
  { name: 'Bambu Basic Blue Gray', color: '#5B6579', td: 3.0, layers: null },
  { name: 'Bambu Basic Jade White', color: '#FFFFFF', td: 5.0, layers: null },
]

export const defaultFilaments = (): Filament[] =>
  [FILAMENT_PRESETS[0], FILAMENT_PRESETS[1], FILAMENT_PRESETS[3]].map((f) => ({
    ...f,
    id: newId(),
  }))

export const defaultSettings = (): Settings => ({
  print: { heightIn: 8, baseMm: 0.56, layerMm: 0.08, firstLayerMm: 0.16, pitchMm: 0.1 },
  adjust: { blurMm: 0.3, blackPoint: 10, whitePoint: 245, gamma: 1, sharpen: 0.5 },
  tones: { mode: 'photo', count: 8 },
  filaments: defaultFilaments(),
})

export const MIN_FILAMENTS = 2
export const MAX_FILAMENTS = 4
export const MIN_TONES = 2
export const MAX_TONES = 10
