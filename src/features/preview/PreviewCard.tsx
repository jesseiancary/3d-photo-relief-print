import type { RefObject } from 'react'
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
    <div className="preview-card">
      <div className="preview-head">
        <Segmented
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
          <span className="dims num">
            {(widthMm / 25.4).toFixed(2)} × {heightIn.toFixed(2)} in ·{' '}
            {plan ? plan.maxZ.toFixed(2) : '–'} mm tall
          </span>
        )}
      </div>
      <div
        className={`stage${dragging ? ' over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          onFiles(e.dataTransfer.files)
        }}
      >
        {view === 'original' && imageUrl ? (
          <img src={imageUrl} alt="Original" />
        ) : (
          <canvas ref={canvasRef} aria-label="Preview" />
        )}
        {!hasPreview && <p className="stage-empty">Preparing preview…</p>}
        {isSample && hasPreview && (
          <span className="sample-tag">Sample scene · choose a photo to start</span>
        )}
      </div>
    </div>
  )
}
