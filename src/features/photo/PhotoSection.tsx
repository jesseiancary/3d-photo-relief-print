import { useRef } from 'react'
import { Section } from '@/components/Section'

interface Props {
  isSample: boolean
  imageName: string
  dragging: boolean
  setDragging: (v: boolean) => void
  onFiles: (files: FileList | null) => void
}

export function PhotoSection({ isSample, imageName, dragging, setDragging, onFiles }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <Section title="Photo">
      <div
        className={`dropzone${dragging ? ' over' : ''}`}
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
        <input
          ref={fileRef}
          id="photo-input"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            onFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Choose Photo
        </button>
        <span className="drop-note">
          {isSample ? 'or drop one here · showing a sample scene' : imageName}
        </span>
      </div>
    </Section>
  )
}
