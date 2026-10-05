import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'

import { moveWithinBounds, resizeFromHandle, type Handle, type Rect } from './geometry'

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/** Position (as a percentage of the frame) and resize cursor for each handle. */
const HANDLE_POS: Record<Handle, { left: string; top: string; cursor: string }> = {
  nw: { left: '0%', top: '0%', cursor: 'nwse-resize' },
  n: { left: '50%', top: '0%', cursor: 'ns-resize' },
  ne: { left: '100%', top: '0%', cursor: 'nesw-resize' },
  e: { left: '100%', top: '50%', cursor: 'ew-resize' },
  se: { left: '100%', top: '100%', cursor: 'nwse-resize' },
  s: { left: '50%', top: '100%', cursor: 'ns-resize' },
  sw: { left: '0%', top: '100%', cursor: 'nesw-resize' },
  w: { left: '0%', top: '50%', cursor: 'ew-resize' },
}

interface Props {
  imageUrl: string
  /** Current crop as normalized fractions (controlled by Settings.crop). */
  value: Rect
  onChange: (rect: Rect) => void
  /** Locked width ÷ height as an image fraction, or null when unconstrained ("free"). */
  fracAspect: number | null
}

/** Rendered content box of the letterboxed image, in overlay-root coordinates. */
interface Box {
  left: number
  top: number
  width: number
  height: number
}

interface Drag {
  handle: Handle | 'move'
  startX: number
  startY: number
  startRect: Rect
}

/**
 * Interactive crop overlay shown over the full source image while cropping. Maps pointer drags to
 * normalized crop fractions via the measured image box; all rect math is delegated to the pure
 * `geometry` helpers. The in-progress rect is buffered in `draft` and committed to `onChange` on
 * pointer-up (discrete controls commit immediately) so the worker isn't re-run on every move.
 */
export function CropEditor({ imageUrl, value, onChange, fracAspect }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [draft, setDraft] = useState<Rect | null>(null)

  const measure = () => {
    const img = imgRef.current
    const root = rootRef.current
    if (!img || !root) return
    const i = img.getBoundingClientRect()
    const r = root.getBoundingClientRect()
    if (i.width === 0 || i.height === 0) return
    setBox({ left: i.left - r.left, top: i.top - r.top, width: i.width, height: i.height })
  }

  useLayoutEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (imgRef.current) ro.observe(imgRef.current)
    if (rootRef.current) ro.observe(rootRef.current)
    return () => ro.disconnect()
    // Refs are stable and `measure` only reads refs, so one setup is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rect = draft ?? value

  const startDrag = (handle: Handle | 'move') => (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    setDrag({ handle, startX: e.clientX, startY: e.clientY, startRect: rect })
    setDraft(rect)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!drag || !box) return
    const dx = (e.clientX - drag.startX) / box.width
    const dy = (e.clientY - drag.startY) / box.height
    setDraft(
      drag.handle === 'move'
        ? moveWithinBounds(drag.startRect, dx, dy)
        : resizeFromHandle(drag.startRect, drag.handle, dx, dy, fracAspect),
    )
  }
  const endDrag = (e: PointerEvent) => {
    if (!drag) return
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    if (draft) onChange(draft)
    setDraft(null)
    setDrag(null)
  }

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden p-4"
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Crop"
        onLoad={measure}
        className="block h-auto max-h-full w-auto max-w-full object-contain shadow-stage"
      />
      {box && (
        <div
          className="absolute"
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        >
          <div
            className="pointer-events-auto absolute cursor-move"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
              boxShadow: '0 0 0 9999px var(--crop-shade)',
              outline: '1px solid var(--crop-line)',
            }}
            onPointerDown={startDrag('move')}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* rule-of-thirds grid (2 vertical + 2 horizontal lines) */}
            <div className="pointer-events-none absolute inset-0">
              {[1 / 3, 2 / 3].map((f) => (
                <div
                  key={`v${f}`}
                  className="absolute top-0 bottom-0 w-px"
                  style={{ left: `${f * 100}%`, background: 'var(--crop-line)' }}
                />
              ))}
              {[1 / 3, 2 / 3].map((f) => (
                <div
                  key={`h${f}`}
                  className="absolute right-0 left-0 h-px"
                  style={{ top: `${f * 100}%`, background: 'var(--crop-line)' }}
                />
              ))}
            </div>
            {HANDLES.map((h) => {
              const p = HANDLE_POS[h]
              return (
                <div
                  key={h}
                  className="pointer-events-auto absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border"
                  style={{
                    left: p.left,
                    top: p.top,
                    cursor: p.cursor,
                    background: 'var(--crop-line)',
                    borderColor: 'var(--crop-shade)',
                  }}
                  onPointerDown={startDrag(h)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
