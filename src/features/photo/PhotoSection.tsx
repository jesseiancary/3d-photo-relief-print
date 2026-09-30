import { useRef } from 'react'
import { Button } from '@/components/Button'
import { DropZone } from '@/components/DropZone'
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
      <DropZone
        className="dropzone"
        dragging={dragging}
        setDragging={setDragging}
        onFiles={onFiles}
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
        <Button onClick={() => fileRef.current?.click()}>Choose Photo</Button>
        <span className="drop-note">
          {isSample ? 'or drop one here · showing a sample scene' : imageName}
        </span>
      </DropZone>
    </Section>
  )
}
