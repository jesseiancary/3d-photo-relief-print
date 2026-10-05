/**
 * Pure crop-rectangle math in normalized image fractions (0..1). Framework-free and
 * unit-testable — the editor UI drives these and never recomputes rect geometry inline.
 *
 * A `Rect` is `{ x, y, w, h }` where (x, y) is the top-left corner and w/h the size, all as
 * fractions of the source image. A "ratio" is width ÷ height in the *image's pixel aspect*, so a
 * ratio is only meaningful together with the image's own aspect (see `applyAspect`). `null` ratio
 * means unconstrained ("free").
 */
import type { CropSettings as Rect } from '@/core/types'

export type { Rect }

export const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 }

/** Smallest crop extent (as a fraction) we allow, so a rect can't collapse to nothing. */
const MIN = 0.05

/** The eight drag handles: four corners + four edge midpoints. */
export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Preset aspect ratios (width : height), keyed by id. `free` is unconstrained. */
export const ASPECTS = {
  free: null,
  '16:9': 16 / 9,
  '5:4': 5 / 4,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  square: 1,
} as const

export type AspectId = keyof typeof ASPECTS

export const ASPECT_IDS = Object.keys(ASPECTS) as AspectId[]

/** Swap a ratio's orientation (landscape ⇄ portrait). `null` and square are unchanged. */
export function swapOrientation(ratio: number | null): number | null {
  return ratio == null ? null : 1 / ratio
}

/**
 * Center a crop of the given pixel-aspect `ratio` (w:h in display pixels) inside the image,
 * sized as large as it fits. `imgAspect` is the image's own width÷height. `null` ratio returns
 * the full frame. The result is clamped to [0, 1].
 */
export function applyAspect(ratio: number | null, imgAspect: number): Rect {
  if (ratio == null) return { ...FULL }
  // target w/h as image fractions: a crop whose displayed aspect equals `ratio` has
  // (w·imgAspect) / h === ratio  ⇒  w/h === ratio / imgAspect.
  const fracAspect = ratio / imgAspect
  let w = 1
  let h = w / fracAspect
  if (h > 1) {
    h = 1
    w = h * fracAspect
  }
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h }
}

/** Translate a rect by (dx, dy) fractions, clamped so it stays fully inside [0, 1]. */
export function moveWithinBounds(rect: Rect, dx: number, dy: number): Rect {
  const x = clamp01(Math.min(rect.x + dx, 1 - rect.w))
  const y = clamp01(Math.min(rect.y + dy, 1 - rect.h))
  return { x: Math.max(0, x), y: Math.max(0, y), w: rect.w, h: rect.h }
}

const movesX = (h: Handle) => h === 'nw' || h === 'w' || h === 'sw'
const movesRightX = (h: Handle) => h === 'ne' || h === 'e' || h === 'se'
const movesY = (h: Handle) => h === 'nw' || h === 'n' || h === 'ne'
const movesBottomY = (h: Handle) => h === 'sw' || h === 's' || h === 'se'

/**
 * Resize `rect` by dragging `handle` by (dx, dy) fractions. The opposite edge/corner is the fixed
 * anchor. When `fracAspect` is non-null the rect keeps that width÷height fraction (so the on-screen
 * aspect is preserved); otherwise each axis moves independently. Always clamped to [0, 1] with a
 * minimum size.
 */
export function resizeFromHandle(
  rect: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  fracAspect: number | null,
): Rect {
  let left = rect.x
  let right = rect.x + rect.w
  let top = rect.y
  let bottom = rect.y + rect.h

  if (movesX(handle)) left = clamp01(Math.min(left + dx, right - MIN))
  if (movesRightX(handle)) right = clamp01(Math.max(right + dx, left + MIN))
  if (movesY(handle)) top = clamp01(Math.min(top + dy, bottom - MIN))
  if (movesBottomY(handle)) bottom = clamp01(Math.max(bottom + dy, top + MIN))

  let w = right - left
  let h = bottom - top

  if (fracAspect != null) {
    // Drive the aspect-correct size off whichever axis this handle actually changes, then re-derive
    // the other, anchoring the fixed edge. Edge handles still grow both dimensions (from the center
    // of the unchanged axis) so the ratio holds.
    const horizontal = movesX(handle) || movesRightX(handle)
    const vertical = movesY(handle) || movesBottomY(handle)
    if (horizontal && !vertical) {
      h = w / fracAspect
    } else if (vertical && !horizontal) {
      w = h * fracAspect
    } else {
      // corner: let width lead, height follows
      h = w / fracAspect
    }

    // Anchor: x grows left when a west handle moved, y grows up when a north handle moved; edge
    // handles that don't touch an axis stay centered on it.
    let x: number
    let y: number
    if (movesX(handle)) x = right - w
    else if (movesRightX(handle)) x = left
    else x = rect.x + (rect.w - w) / 2
    if (movesY(handle)) y = bottom - h
    else if (movesBottomY(handle)) y = top
    else y = rect.y + (rect.h - h) / 2

    return fitInside({ x, y, w, h }, fracAspect)
  }

  return { x: left, y: top, w, h }
}

/** Scale a rect down (keeping its fraction-aspect) until it fits inside [0, 1], then clamp origin. */
function fitInside(rect: Rect, fracAspect: number): Rect {
  let { w, h } = rect
  if (w > 1) {
    w = 1
    h = w / fracAspect
  }
  if (h > 1) {
    h = 1
    w = h * fracAspect
  }
  const x = clamp01(Math.min(Math.max(0, rect.x), 1 - w))
  const y = clamp01(Math.min(Math.max(0, rect.y), 1 - h))
  return { x, y, w, h }
}

/** Is this rect (near) the full frame? Used to label the "reset" affordance. */
export function isFullFrame(rect: Rect): boolean {
  return rect.x <= 1e-4 && rect.y <= 1e-4 && rect.w >= 1 - 1e-4 && rect.h >= 1 - 1e-4
}
