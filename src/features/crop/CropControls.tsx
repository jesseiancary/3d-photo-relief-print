import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'

import { ASPECT_IDS, type AspectId } from './geometry'

const LABELS: Record<AspectId, string> = {
  free: 'Free',
  '16:9': '16:9',
  '5:4': '5:4',
  '4:3': '4:3',
  '3:2': '3:2',
  square: 'Square',
}

export type Orientation = 'landscape' | 'portrait'

interface Props {
  aspectId: AspectId
  onAspect: (id: AspectId) => void
  orientation: Orientation
  onOrientation: (o: Orientation) => void
  /** Hide the orientation toggle for ratios where it's meaningless (free, square). */
  canOrient: boolean
  /** Enable reset only when the crop differs from the full frame (otherwise it's a no-op). */
  canReset: boolean
  onReset: () => void
  onDone: () => void
}

/** The crop toolbar: aspect presets, portrait/landscape, reset, done. Rendered inline in the
 *  preview header (replacing the view switcher) while cropping. */
export function CropControls({
  aspectId,
  onAspect,
  orientation,
  onOrientation,
  canOrient,
  canReset,
  onReset,
  onDone,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        label="Aspect ratio"
        value={aspectId}
        options={ASPECT_IDS.map((id) => ({ value: id, label: LABELS[id] }))}
        onChange={onAspect}
      />
      {canOrient && (
        <Segmented
          label="Orientation"
          value={orientation}
          options={[
            { value: 'landscape', label: 'Landscape' },
            { value: 'portrait', label: 'Portrait' },
          ]}
          onChange={onOrientation}
        />
      )}
      <Button variant="ghost" onClick={onReset} disabled={!canReset}>
        Reset
      </Button>
      <Button variant="primary" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}
