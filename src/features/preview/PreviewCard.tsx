import type { RefObject } from 'react'

import { Card } from '@/components/Card'
import { DropZone } from '@/components/DropZone'
import { Segmented } from '@/components/Segmented'
import type { TonePlan } from '@/core/tones'

export type View = 'print' | 'adjusted' | 'original'

interface Props {
  view: View
  setView: (v: View) => void
  hasPreview: boolean
  plan: TonePlan | undefined
  widthMm: number
  heightIn: number
  imageUrl: string | null
  isSample: boolean
  dragging: boolean
  setDragging: (v: boolean) => void
  onFiles: (files: FileList | null) => void
  canvasRef: RefObject<HTMLCanvasElement | null>
}

export function PreviewCard({
  view,
  setView,
  hasPreview,
  plan,
  widthMm,
  heightIn,
  imageUrl,
  isSample,
  dragging,
  setDragging,
  onFiles,
  canvasRef,
}: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-3 py-2.5">
        <Segmented
          className="shrink grow-0 basis-75"
          label="Preview"
          value={view}
          options={[
            { value: 'print', label: 'Print' },
            { value: 'adjusted', label: 'Adjusted' },
            { value: 'original', label: 'Original' },
          ]}
          onChange={setView}
        />
        {hasPreview && (
          <span className="num text-caption text-muted">
            {(widthMm / 25.4).toFixed(2)} × {heightIn.toFixed(2)} in ·{' '}
            {plan ? plan.maxZ.toFixed(2) : '–'} mm tall
          </span>
        )}
      </div>
      <DropZone
        className="relative flex h-[min(62vh,760px)] min-h-80 items-center justify-center bg-stage p-4 max-side:aspect-3/4 max-side:h-auto max-side:max-h-[70vh] max-side:min-h-0"
        activeClassName="outline outline-2 outline-dashed outline-primary -outline-offset-8"
        dragging={dragging}
        setDragging={setDragging}
        onFiles={onFiles}
      >
        {view === 'original' && imageUrl ? (
          <img
            src={imageUrl}
            alt="Original"
            className="block h-auto max-h-full w-auto max-w-full object-contain shadow-stage"
          />
        ) : (
          <canvas
            ref={canvasRef}
            aria-label="Preview"
            className="block h-auto max-h-full w-auto max-w-full object-contain shadow-stage"
          />
        )}
        {!hasPreview && <p className="text-muted">Preparing preview…</p>}
        {isSample && hasPreview && (
          <span className="absolute bottom-3 left-3 rounded-sm border border-line bg-surface-overlay px-2 py-1 text-caption">
            Sample Scene · choose a photo to start
          </span>
        )}
      </DropZone>
    </Card>
  )
}
