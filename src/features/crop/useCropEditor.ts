import { useState } from 'react'

import type { CropSettings } from '@/core/types'

import type { Orientation } from './CropControls'
import { applyAspect, ASPECTS, isFullFrame, swapOrientation, type AspectId } from './geometry'

interface Params {
  /** The image's own pixel aspect (width ÷ height); 1 until an image has loaded. */
  imgAspect: number
  /** The current crop rectangle (normalized fractions), so the editor can tell when reset is a no-op. */
  crop: CropSettings
  /** Commit a new crop rectangle (normalized fractions) to the settings. */
  onChange: (rect: CropSettings) => void
  /** The full-frame crop to restore on reset. */
  fullFrame: CropSettings
}

export interface CropEditorState {
  aspectId: AspectId
  orientation: Orientation
  /** Whether the orientation toggle is meaningful (hidden for free / square). */
  canOrient: boolean
  /** Locked width ÷ height as an image fraction, or null when unconstrained ("free"). */
  fracAspect: number | null
  /** Whether the crop is already the full frame (reset would be a no-op). */
  isFull: boolean
  chooseAspect: (id: AspectId) => void
  chooseOrientation: (o: Orientation) => void
  reset: () => void
}

const ratioFor = (id: AspectId, o: Orientation): number | null => {
  const r = ASPECTS[id]
  return r == null ? null : o === 'portrait' ? swapOrientation(r) : r
}

/**
 * Owns the ephemeral crop-editing state (selected aspect preset + orientation) and the handlers
 * that reframe the crop. Kept separate from the stage overlay so the toolbar (in the preview
 * header) and the overlay (over the image) can share one source of truth.
 */
export function useCropEditor({ imgAspect, crop, onChange, fullFrame }: Params): CropEditorState {
  const [aspectId, setAspectId] = useState<AspectId>('free')
  const [orientation, setOrientation] = useState<Orientation>('landscape')

  const ratio = ratioFor(aspectId, orientation)
  const fracAspect = ratio == null ? null : ratio / imgAspect
  const canOrient = aspectId !== 'free' && aspectId !== 'square'
  const isFull = isFullFrame(crop)

  const chooseAspect = (id: AspectId) => {
    setAspectId(id)
    // "free" only unlocks the aspect, keeping the current rect; a real ratio reframes to a
    // centered max-fit of that ratio.
    const r = ratioFor(id, orientation)
    if (r != null) onChange(applyAspect(r, imgAspect))
  }
  const chooseOrientation = (o: Orientation) => {
    setOrientation(o)
    const r = ratioFor(aspectId, o)
    if (r != null) onChange(applyAspect(r, imgAspect))
  }
  const reset = () => {
    setAspectId('free')
    setOrientation('landscape')
    onChange(fullFrame)
  }

  return {
    aspectId,
    orientation,
    canOrient,
    fracAspect,
    isFull,
    chooseAspect,
    chooseOrientation,
    reset,
  }
}
